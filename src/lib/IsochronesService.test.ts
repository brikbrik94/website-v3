import { describe, it, expect, vi, afterEach } from 'vitest';
import { IsochronesService } from './IsochronesService';

describe('IsochronesService.calculateIsochrones', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts locations as [lon, lat] and converts minutes to seconds for range_type=time', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
      });
    }));

    await IsochronesService.calculateIsochrones([48.3, 14.28], 'driving-car', [5, 10], 'time');

    expect(capturedUrl).toBe('/api/routing-proxy.php?provider=ors&path=isochrones/driving-car');
    expect(capturedBody.locations).toEqual([[14.28, 48.3]]);
    expect(capturedBody.range).toEqual([300, 600]);
    expect(capturedBody.range_type).toBe('time');
  });

  it('converts km to meters for range_type=distance', async () => {
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
      });
    }));

    await IsochronesService.calculateIsochrones([48.3, 14.28], 'driving-car', [2.5, 5], 'distance');

    expect(capturedBody.range).toEqual([2500, 5000]);
    expect(capturedBody.range_type).toBe('distance');
  });

  it('returns null when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500 })));

    const result = await IsochronesService.calculateIsochrones([48.3, 14.28], 'driving-car', [5], 'time');

    expect(result).toBeNull();
  });

  it('returns null on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));

    const result = await IsochronesService.calculateIsochrones([48.3, 14.28], 'driving-car', [5], 'time');

    expect(result).toBeNull();
  });
});
