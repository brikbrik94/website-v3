export interface Aircraft {
    hex: string;
    flight?: string;
    lat: number;
    lon: number;
    alt_baro?: number;
    gs?: number;
    track?: number;
    [key: string]: any;
}

export class AdsbInterpreter {
    private url: string;
    private maxTrackPoints: number;
    private tracks: Map<string, [number, number, number][]>;

    constructor(url: string, options: { maxTrackPoints?: number } = {}) {
        this.url = url;
        this.maxTrackPoints = options.maxTrackPoints || 60;
        this.tracks = new Map();
    }

    async fetch(): Promise<GeoJSON.FeatureCollection<GeoJSON.Point, Aircraft>> {
        const response = await fetch(this.url);
        const data = await response.json();
        const aircraft: Aircraft[] = (data.aircraft || []).filter((a: any) => a.lat != null && a.lon != null);

        const activeHexes = new Set<string>();
        aircraft.forEach(a => {
            activeHexes.add(a.hex);
            const track = this.tracks.get(a.hex) || [];
            const alt = typeof a.alt_baro === 'number' ? a.alt_baro : 0;
            track.push([a.lon, a.lat, alt]);
            if (track.length > this.maxTrackPoints) track.shift();
            this.tracks.set(a.hex, track);
        });

        for (const hex of this.tracks.keys()) {
            if (!activeHexes.has(hex)) this.tracks.delete(hex);
        }

        return {
            type: 'FeatureCollection',
            features: aircraft.map(a => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
                properties: a
            }))
        };
    }

    getTracksAsGeoJson(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
        const features: GeoJSON.Feature[] = [];
        for (const [hex, points] of this.tracks.entries()) {
            if (points.length < 2) continue;
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: points.map(p => [p[0], p[1]])
                },
                properties: { hex }
            });
        }
        return { type: 'FeatureCollection', features } as any;
    }
}
