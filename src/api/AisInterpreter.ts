export interface Ship {
    mmsi: number;
    name?: string;
    lat: number;
    lon: number;
    cog?: number;
    sog?: number;
    shipclass?: number;
    [key: string]: any;
}

export class AisInterpreter {
    private url: string;
    private maxTrackPoints: number;
    private tracks: Map<number, [number, number][]>;

    constructor(url: string, options: { maxTrackPoints?: number } = {}) {
        this.url = url;
        this.maxTrackPoints = options.maxTrackPoints || 60;
        this.tracks = new Map();
    }

    async fetch(): Promise<GeoJSON.FeatureCollection<GeoJSON.Point, Ship>> {
        const response = await fetch(this.url);
        const data = await response.json();
        const ships: Ship[] = (data.ships || []).filter((s: any) => s.lat != null && s.lon != null);

        const activeIds = new Set<number>();
        ships.forEach(s => {
            activeIds.add(s.mmsi);
            const track = this.tracks.get(s.mmsi) || [];
            const last = track[track.length - 1];
            if (!last || last[0] !== s.lon || last[1] !== s.lat) {
                track.push([s.lon, s.lat]);
                if (track.length > this.maxTrackPoints) track.shift();
                this.tracks.set(s.mmsi, track);
            }
        });

        for (const mmsi of this.tracks.keys()) {
            if (!activeIds.has(mmsi)) this.tracks.delete(mmsi);
        }

        return {
            type: 'FeatureCollection',
            features: ships.map(s => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
                properties: s
            }))
        };
    }

    getTracksAsGeoJson(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
        const features: GeoJSON.Feature[] = [];
        for (const [mmsi, points] of this.tracks.entries()) {
            if (points.length < 2) continue;
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: points
                },
                properties: { mmsi }
            });
        }
        return { type: 'FeatureCollection', features } as any;
    }
}
