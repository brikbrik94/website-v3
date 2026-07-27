import { describe, it, expect, vi, afterEach } from 'vitest';
import { GraphExportService } from './GraphExportService';

describe('GraphExportService.queryExport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts bbox and geometry to the json path (no suffix) for format=json', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ nodes: [], edges: [], nodes_count: 0, edges_count: 0 }),
      });
    }));

    const bbox: [[number, number], [number, number]] = [[16.3, 48.2], [16.31, 48.205]];
    await GraphExportService.queryExport('driving-car', 'json', bbox, true);

    expect(capturedUrl).toBe('/api/ors.php?path=export/driving-car');
    expect(capturedBody.bbox).toEqual(bbox);
    expect(capturedBody.geometry).toBe(true);
  });

  it('posts to the topojson path (with suffix) for format=topojson', async () => {
    let capturedUrl = '';
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ type: 'Topology' }) });
    }));

    await GraphExportService.queryExport('driving-car', 'topojson', [[16.3, 48.2], [16.31, 48.205]], false);

    expect(capturedUrl).toBe('/api/ors.php?path=export/driving-car/topojson');
  });

  it('returns { ok: true, payloadBytes } derived from the response size', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ nodes: [1, 2, 3], edges: [] }),
    })));

    const result = await GraphExportService.queryExport('driving-car', 'json', [[0, 0], [1, 1]], true);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payloadBytes).toBeGreaterThan(0);
      expect(result.format).toBe('json');
    }
  });

  it('returns { ok: false, status } when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 504 })));

    const result = await GraphExportService.queryExport('driving-car', 'json', [[0, 0], [1, 1]], true);

    expect(result).toEqual({ ok: false, status: 504 });
  });

  it('returns { ok: false, status: null } on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));

    const result = await GraphExportService.queryExport('driving-car', 'json', [[0, 0], [1, 1]], true);

    expect(result).toEqual({ ok: false, status: null });
  });
});
