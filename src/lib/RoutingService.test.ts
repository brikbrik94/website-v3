import { describe, it, expect, vi, afterEach } from 'vitest';
import { RoutingService } from './RoutingService';

describe('RoutingService.calculateRoute extraInfo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('includes extra_info in the request body when extraInfo is passed', async () => {
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
      });
    }));

    await RoutingService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'driving-car', [
      'waytype', 'tollways', 'roadaccessrestrictions',
    ]);

    expect(capturedBody.extra_info).toEqual(['waytype', 'tollways', 'roadaccessrestrictions']);
  });

  it('omits extra_info from the request body when extraInfo is not passed', async () => {
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
      });
    }));

    await RoutingService.calculateRoute([48.1, 14.1], [48.2, 14.2]);

    expect(capturedBody.extra_info).toBeUndefined();
  });

  it('always requests German turn-by-turn instructions via language: de', async () => {
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
      });
    }));

    await RoutingService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'driving-emergency');

    expect(capturedBody.language).toBe('de');
  });
});

describe('RoutingService.calculateRoute maneuver type translation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('translates raw ORS numeric step types into ManeuverKind strings', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: {
            summary: { distance: 1000, duration: 60 },
            segments: [{
              distance: 1000, duration: 60,
              steps: [
                { distance: 500, duration: 30, type: 1, instruction: 'Turn right', name: 'X', way_points: [0, 5] },
                { distance: 500, duration: 30, type: 6, instruction: 'Continue', name: 'Y', way_points: [5, 10] },
              ],
            }],
          },
        }],
        metadata: {},
      }),
    })));

    const result = await RoutingService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'driving-car');

    const steps = result!.features[0].properties.segments![0].steps;
    expect(steps[0].type).toBe('turn-right');
    expect(steps[1].type).toBe('straight');
  });

  it('leaves the route intact when the response has no segments (e.g. a profile without turn-by-turn)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: { summary: { distance: 1000, duration: 60 } },
        }],
        metadata: {},
      }),
    })));

    const result = await RoutingService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'driving-car');
    expect(result!.features[0].properties.segments).toBeUndefined();
  });
});

describe('RoutingService.findNearestStations (driving-emergency / Sondersignal)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('stores each station route as a FeatureCollection consumable by the map layer', async () => {
    const stations = [{ id: 1, name: 'Stützpunkt A', org: 'SEW', lat: 48.1, lon: 14.1 }];
    const routeGeoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[14.1, 48.1], [14.2, 48.2]] },
        properties: { summary: { distance: 1000, duration: 120 } },
      }],
    };

    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (typeof url === 'string' && url.includes('nearest-stations.php')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(stations) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(routeGeoJson) });
    }));

    const result = await RoutingService.findNearestStations([48.3, 14.2], 'sew', 'driving-emergency');

    expect(result).toHaveLength(1);
    // Contract consumed by RoutingMapLayers.updateRoutesLayer: route.features[0].geometry
    const station = result[0];
    expect(station.route?.features?.[0]?.geometry).toBeDefined();
    expect(station.route!.features[0].geometry.type).toBe('LineString');
    // Summary still surfaced for the result list
    expect(station.duration).toBe(120);
    expect(station.distance).toBe(1000);
  });
});

describe('RoutingService.findNearestStations (provider)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('passes the provider through as a query parameter to nearest-stations.php', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    vi.stubGlobal('fetch', fetchMock);

    await RoutingService.findNearestStations([48.3, 14.2], 'sew', 'auto', 'valhalla');

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('provider=valhalla'));
  });

  it('does not run the driving-emergency two-pass fallback when provider is valhalla', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    vi.stubGlobal('fetch', fetchMock);
    const calculateRouteSpy = vi.spyOn(RoutingService, 'calculateRoute');

    await RoutingService.findNearestStations([48.3, 14.2], 'sew', 'driving-emergency', 'valhalla');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calculateRouteSpy).not.toHaveBeenCalled();

    calculateRouteSpy.mockRestore();
  });
});
