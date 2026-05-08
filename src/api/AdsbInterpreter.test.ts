import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdsbInterpreter } from './AdsbInterpreter';

describe('AdsbInterpreter', () => {
    const mockUrl = 'http://example.com/adsb.json';

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should fetch and process aircraft data', async () => {
        const mockData = {
            aircraft: [
                { hex: 'A1B2C3', lat: 48.1, lon: 16.1, alt_baro: 10000 },
                { hex: 'D4E5F6', lat: 48.2, lon: 16.2, alt_baro: 20000 }
            ]
        };

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData)
        }));

        const interpreter = new AdsbInterpreter(mockUrl);
        const result = await interpreter.fetch();

        expect(result.type).toBe('FeatureCollection');
        expect(result.features).toHaveLength(2);
        expect(result.features[0].geometry.type).toBe('Point');
        expect(result.features[0].properties.hex).toBe('A1B2C3');
    });

    it('should generate segmented tracks with average altitude', async () => {
        const interpreter = new AdsbInterpreter(mockUrl);

        // First fetch
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                aircraft: [{ hex: 'A1B2C3', lat: 48.1, lon: 16.1, alt_baro: 10000 }]
            })
        }));
        await interpreter.fetch();

        // Second fetch with moved aircraft
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                aircraft: [{ hex: 'A1B2C3', lat: 48.2, lon: 16.2, alt_baro: 12000 }]
            })
        }));
        await interpreter.fetch();

        // Third fetch with moved aircraft again
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                aircraft: [{ hex: 'A1B2C3', lat: 48.3, lon: 16.3, alt_baro: 14000 }]
            })
        }));
        await interpreter.fetch();

        const tracks = interpreter.getTracksAsGeoJson();
        
        // We expect 2 segments for 3 points
        expect(tracks.type).toBe('FeatureCollection');
        expect(tracks.features).toHaveLength(2);

        // Check first segment
        const s1 = tracks.features[0];
        expect(s1.geometry.type).toBe('LineString');
        expect(s1.geometry.coordinates).toHaveLength(2);
        expect(s1.geometry.coordinates[0]).toEqual([16.1, 48.1]);
        expect(s1.geometry.coordinates[1]).toEqual([16.2, 48.2]);
        expect(s1.properties?.alt_mid).toBe(11000); // (10000 + 12000) / 2

        // Check second segment
        const s2 = tracks.features[1];
        expect(s2.geometry.type).toBe('LineString');
        expect(s2.geometry.coordinates).toHaveLength(2);
        expect(s2.geometry.coordinates[0]).toEqual([16.2, 48.2]);
        expect(s2.geometry.coordinates[1]).toEqual([16.3, 48.3]);
        expect(s2.properties?.alt_mid).toBe(13000); // (12000 + 14000) / 2
    });
});
