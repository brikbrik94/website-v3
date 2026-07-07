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
      if (typeof url === 'string' && url.includes('stations.php')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(stations) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(routeGeoJson) });
    }));

    const result = await RoutingService.findNearestStations([48.3, 14.2], 'sew', 'driving-emergency');

    expect(result).toHaveLength(1);
    // Contract consumed by RoutingMapLayers.updateRoutesLayer: route.features[0].geometry
    expect(result[0].route?.features?.[0]?.geometry).toBeDefined();
    expect(result[0].route.features[0].geometry.type).toBe('LineString');
    // Summary still surfaced for the result list
    expect(result[0].duration).toBe(120);
    expect(result[0].distance).toBe(1000);
  });
});
