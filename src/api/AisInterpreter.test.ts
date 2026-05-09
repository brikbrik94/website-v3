import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AisInterpreter } from './AisInterpreter';

describe('AisInterpreter', () => {
    const mockUrl = 'https://api.example.com/ais';
    
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('should not add a track point for very small movements (< 0.0001 degrees)', async () => {
        const interpreter = new AisInterpreter(mockUrl);
        
        // Initial fetch
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                ships: [{ mmsi: 123, lat: 48.1234, lon: 16.1234 }]
            })
        });
        
        await interpreter.fetch();
        let tracks = interpreter.getTracksAsGeoJson();
        // Initially 0 features for tracks because 1 point is not a LineString
        expect(tracks.features.length).toBe(0);

        // Second fetch with small movement (0.00005)
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                ships: [{ mmsi: 123, lat: 48.12345, lon: 16.12345 }]
            })
        });

        await interpreter.fetch();
        tracks = interpreter.getTracksAsGeoJson();
        
        // SHOULD STILL BE 0 because movement was < 0.0001
        // BUT current implementation will have 2 points and thus 1 LineString feature
        expect(tracks.features.length).toBe(0);
    });

    it('should add a track point for significant movements (> 0.0001 degrees)', async () => {
        const interpreter = new AisInterpreter(mockUrl);
        
        // Initial fetch
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                ships: [{ mmsi: 123, lat: 48.1234, lon: 16.1234 }]
            })
        });
        
        await interpreter.fetch();

        // Second fetch with significant movement (0.0002)
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                ships: [{ mmsi: 123, lat: 48.1236, lon: 16.1236 }]
            })
        });

        await interpreter.fetch();
        const tracks = interpreter.getTracksAsGeoJson();
        
        expect(tracks.features.length).toBe(1);
        expect(tracks.features[0].geometry.coordinates.length).toBe(2);
    });

    it('should correctly include the heading property in GeoJSON features', async () => {
        const interpreter = new AisInterpreter(mockUrl);
        
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                ships: [{ 
                    mmsi: 123, 
                    lat: 48.1234, 
                    lon: 16.1234,
                    heading: 180
                }]
            })
        });
        
        const geojson = await interpreter.fetch();
        expect(geojson.features[0].properties.heading).toBe(180);
    });
});
