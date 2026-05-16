import { Aircraft } from '../types/tracking';

export class AdsbInterpreter {
    private url: string;
    private maxTrackPoints: number;
    private tracks: Map<string, { lon: number, lat: number, alt: number }[]>;

    private lastResult: GeoJSON.FeatureCollection<GeoJSON.Point, Aircraft> | null = null;

    constructor(url: string, options: { maxTrackPoints?: number } = {}) {
        this.url = url;
        this.maxTrackPoints = options.maxTrackPoints || 60;
        this.tracks = new Map();
    }

    getLastResult() {
        return this.lastResult;
    }

    async fetch(): Promise<GeoJSON.FeatureCollection<GeoJSON.Point, Aircraft>> {
        try {
            const response = await fetch(this.url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const aircraft: Aircraft[] = (data.aircraft || []).filter((a: Aircraft) => a.lat != null && a.lon != null);

            const activeHexes = new Set<string>();
            aircraft.forEach(a => {
                activeHexes.add(a.hex);
                const track = this.tracks.get(a.hex) || [];
                const alt = typeof a.alt_baro === 'number' ? a.alt_baro : 0;
                
                // Nur hinzufügen wenn Position sich geändert hat
                const last = track[track.length - 1];
                if (!last || last.lon !== a.lon || last.lat !== a.lat) {
                    track.push({ lon: a.lon, lat: a.lat, alt });
                    if (track.length > this.maxTrackPoints) track.shift();
                    this.tracks.set(a.hex, track);
                }
            });

            for (const hex of this.tracks.keys()) {
                if (!activeHexes.has(hex)) this.tracks.delete(hex);
            }

            this.lastResult = {
                type: 'FeatureCollection',
                features: aircraft.map(a => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
                    properties: a
                }))
            };
            return this.lastResult;
        } catch (error) {
            console.error('Failed to fetch or parse ADS-B data:', error);
            return { type: 'FeatureCollection', features: [] };
        }
    }

    getTracksAsGeoJson(): GeoJSON.FeatureCollection<GeoJSON.LineString, { hex: string, alt_mid: number }> {
        const features: GeoJSON.Feature<GeoJSON.LineString, { hex: string, alt_mid: number }>[] = [];
        for (const [hex, points] of this.tracks.entries()) {
            if (points.length < 2) continue;
            
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i+1];
                const altMid = (p1.alt + p2.alt) / 2;
                
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[p1.lon, p1.lat], [p2.lon, p2.lat]]
                    },
                    properties: { hex, alt_mid: altMid }
                });
            }
        }
        return { type: 'FeatureCollection', features };
    }
}
