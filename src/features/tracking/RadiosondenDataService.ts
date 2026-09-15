import {
    RadiosondeFlight,
    RadiosondeTrackFeature,
    RadiosondeFeature,
    RadiosondeFeatureCollection,
    TrackingItem
} from '../../types/tracking';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 20000;

export type RadiosondenDataCallback = (data: {
    radiosondeData: RadiosondeFeatureCollection;
    radiosondeTracks: GeoJSON.FeatureCollection<GeoJSON.LineString>;
    radiosondeItems: TrackingItem[];
}) => void;

export type RadiosondenStatusCallback = (online: boolean) => void;

export class RadiosondenDataService {
    private signal: AbortSignal;
    private flights = new Map<string, RadiosondeFlight>();
    private tracks = new Map<string, RadiosondeTrackFeature>();
    private activePositions = new Map<string, RadiosondeFeature>();

    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private onData: RadiosondenDataCallback | null = null;
    private onStatus: RadiosondenStatusCallback | null = null;

    constructor(signal: AbortSignal) {
        this.signal = signal;
        this.signal.addEventListener('abort', () => this.stop());
    }

    public setCallbacks(onData: RadiosondenDataCallback, onStatus: RadiosondenStatusCallback): void {
        this.onData = onData;
        this.onStatus = onStatus;
    }

    public async start(): Promise<void> {
        if (this.signal.aborted) return;
        await this.refresh();
        this.pollInterval = setInterval(() => this.refresh(), POLL_INTERVAL_MS);
    }

    public stop(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    public getInitialData() {
        return {
            radiosondeData: this.getPointsGeoJson(),
            radiosondeTracks: this.getTracksGeoJson(),
            radiosondeItems: this.getItems()
        };
    }

    private async fetchJson<T>(url: string): Promise<T> {
        const response = await fetch(url, { signal: this.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    }

    private async refresh(): Promise<void> {
        if (this.signal.aborted) return;

        try {
            const flights = await this.fetchJson<RadiosondeFlight[]>('/api/radiosonden-flights.php');
            const needsTrackFetch = this.applyFlights(flights);
            const hasActive = Array.from(this.flights.values()).some(f => f.active);

            const trackFetches = needsTrackFetch.map(async (callsign) => {
                try {
                    const track = await this.fetchJson<RadiosondeTrackFeature>(
                        `/api/radiosonden-track.php?callsign=${encodeURIComponent(callsign)}&hours=24`
                    );
                    this.tracks.set(callsign, track);
                } catch (e) {
                    if ((e as Error).name === 'AbortError') throw e;
                    console.warn(`[RadiosondenDataService] Track fetch failed for ${callsign}`, e);
                }
            });

            if (hasActive) {
                const sondes = await this.fetchJson<RadiosondeFeatureCollection>('/api/radiosonden-sondes.php');
                this.activePositions.clear();
                for (const feature of sondes.features) {
                    this.activePositions.set(feature.properties.callsign, feature);
                }
            } else {
                this.activePositions.clear();
            }

            await Promise.all(trackFetches);

            if (this.onData) this.onData(this.getInitialData());
            if (this.onStatus) this.onStatus(true);
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            console.error('[RadiosondenDataService] Refresh failed', err);
            if (this.onStatus) this.onStatus(false);
        }
    }

    private applyFlights(flights: RadiosondeFlight[], now: number = Date.now()): string[] {
        this.flights.clear();
        const inWindow = new Set<string>();

        for (const f of flights) {
            if (now - Date.parse(f.last_seen) <= WINDOW_MS) {
                this.flights.set(f.callsign, f);
                inWindow.add(f.callsign);
            }
        }

        for (const callsign of this.tracks.keys()) {
            if (!inWindow.has(callsign)) this.tracks.delete(callsign);
        }

        const needsTrackFetch: string[] = [];
        for (const f of this.flights.values()) {
            if (f.active || !this.tracks.has(f.callsign)) {
                needsTrackFetch.push(f.callsign);
            }
        }
        return needsTrackFetch;
    }

    // Die radiosonden-api liefert pro Track-Punkt eine 3D-Koordinate [lon, lat, altitude_meters]
    // (RFC-7946-Höhe als 3. Element). MapLibre kann eine einzelne LineString-Feature aber nur mit
    // EINER Farbe für die gesamte Linie einfärben (line-color liest Feature-Properties, nicht
    // Vertex-Daten) — für einen echten Höhenfarbverlauf entlang des Pfads wird der Track deshalb
    // in 2-Punkt-Segmente zerlegt, jedes mit der mittleren Höhe seiner beiden Endpunkte als
    // `alt_mid` (analog TrackingMapLayers.ts' ADS-B-Tracks, dort `alt_mid` aus echten
    // Pro-Punkt-Höhen statt hier aus [lon,lat,alt]-Koordinaten).
    private getTracksGeoJson(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
        const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

        for (const [callsign, track] of this.tracks.entries()) {
            const coords = track.geometry.coordinates;
            const active = this.flights.get(callsign)?.active ?? false;

            for (let i = 0; i < coords.length - 1; i++) {
                const altA = coords[i][2] ?? 0;
                const altB = coords[i + 1][2] ?? 0;
                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [coords[i], coords[i + 1]] },
                    properties: { callsign, active, alt_mid: (altA + altB) / 2 }
                });
            }
        }

        return { type: 'FeatureCollection', features };
    }

    private getPointsGeoJson(): RadiosondeFeatureCollection {
        return { type: 'FeatureCollection', features: Array.from(this.activePositions.values()) };
    }

    private getItems(): TrackingItem[] {
        const items: TrackingItem[] = [];
        for (const f of this.flights.values()) {
            const live = this.activePositions.get(f.callsign);
            const track = this.tracks.get(f.callsign);
            const lastPoint = track?.geometry.coordinates[track.geometry.coordinates.length - 1];

            const lon = live?.geometry.coordinates[0] ?? lastPoint?.[0];
            const lat = live?.geometry.coordinates[1] ?? lastPoint?.[1];
            if (lon === undefined || lat === undefined) continue;

            items.push({
                id: f.callsign,
                label: f.callsign,
                info: `${f.model || 'Radiosonde'} | ${Math.round(f.max_altitude || 0)} m`,
                type: 'radiosonde',
                lat,
                lon,
                details: {
                    'Callsign': f.callsign,
                    'Modell': f.model || '----',
                    'Max. Höhe': `${Math.round(f.max_altitude || 0)} m`,
                    'Status': f.active ? 'Aktiv' : 'Beendet'
                }
            });
        }
        return items;
    }

    public destroy(): void {
        this.stop();
    }
}
