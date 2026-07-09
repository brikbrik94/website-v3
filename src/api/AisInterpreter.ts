import { Ship } from '../types/tracking';

export class AisInterpreter {
    private url: string;
    private maxTrackPoints: number;
    private tracks: Map<number, [number, number][]>;

    private lastResult: GeoJSON.FeatureCollection<GeoJSON.Point, Ship> | null = null;

    constructor(url: string, options: { maxTrackPoints?: number } = {}) {
        this.url = url;
        this.maxTrackPoints = options.maxTrackPoints || 60;
        this.tracks = new Map();
    }

    getLastResult() {
        return this.lastResult;
    }

    async fetch(): Promise<GeoJSON.FeatureCollection<GeoJSON.Point, Ship>> {
        try {
            const response = await fetch(this.url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const ships: Ship[] = (data.ships || []).map((s: Ship) => ({
                ...s,
                speed: s.speed ?? s.sog ?? 0 // Map sog to speed for consistency
            })).filter((s: Ship) => s.lat != null && s.lon != null);

            const activeIds = new Set<number>();
            ships.forEach(s => {
                activeIds.add(s.mmsi);
                const track = this.tracks.get(s.mmsi) || [];
                const last = track[track.length - 1];
                
                // Nur hinzufügen wenn Position sich signifikant geändert hat (> 0.0001 grad ~ 10m)
                const hasMoved = !last || 
                    Math.abs(last[0] - s.lon) > 0.0001 || 
                    Math.abs(last[1] - s.lat) > 0.0001;

                if (hasMoved) {
                    track.push([s.lon, s.lat]);
                    if (track.length > this.maxTrackPoints) track.shift();
                    this.tracks.set(s.mmsi, track);
                }
            });

            for (const mmsi of this.tracks.keys()) {
                if (!activeIds.has(mmsi)) this.tracks.delete(mmsi);
            }

            this.lastResult = {
                type: 'FeatureCollection',
                features: ships.map(s => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
                    properties: s
                }))
            };
            return this.lastResult;
        } catch (error) {
            console.error('Failed to fetch or parse AIS data:', error);
            return { type: 'FeatureCollection', features: [] };
        }
    }

    getTracksAsGeoJson(): GeoJSON.FeatureCollection<GeoJSON.LineString, { mmsi: number }> {
        const features: GeoJSON.Feature<GeoJSON.LineString, { mmsi: number }>[] = [];
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
        return { type: 'FeatureCollection', features };
    }
}
