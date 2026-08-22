import { describe, it, expect, vi, afterEach } from 'vitest';
import * as polyline from '@mapbox/polyline';
import { ValhallaService } from './ValhallaService';

describe('ValhallaService.calculateRoute', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts locations/costing/units to the valhalla proxy and returns the interpreted RouteResult', async () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    let capturedUrl = '';
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          trip: { legs: [{ shape }], summary: { time: 300, length: 12.5 } },
        }),
      });
    }));

    const result = await ValhallaService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'bicycle');

    expect(capturedUrl).toBe('/api/valhalla.php?path=route');
    expect(capturedBody.costing).toBe('bicycle');
    expect(capturedBody.units).toBe('kilometers');
    expect(capturedBody.locations).toEqual([{ lat: 48.1, lon: 14.1 }, { lat: 48.2, lon: 14.2 }]);
    expect(capturedBody.directions_options).toEqual({ language: 'de-DE' });
    expect(result?.type).toBe('FeatureCollection');
    expect(result?.features[0].properties.summary.duration).toBe(300);
    expect(result?.features[0].properties.summary.distance).toBeCloseTo(12500, 1);
  });

  it('returns null when the proxy responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
    const result = await ValhallaService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'auto');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network error'))));
    const result = await ValhallaService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'auto');
    expect(result).toBeNull();
  });

  it('returns null when the response has no trip field', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })));
    const result = await ValhallaService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'auto');
    expect(result).toBeNull();
  });
});
