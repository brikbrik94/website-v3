import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OverlayLoader } from './OverlayLoader';

function createFakeMap() {
  const sources = new Set<string>();
  const layers = new Set<string>();
  return {
    isStyleLoaded: () => true,
    getSource: (id: string) => (sources.has(id) ? {} : undefined),
    addSource: (id: string) => { sources.add(id); },
    getLayer: (id: string) => (layers.has(id) ? {} : undefined),
    addLayer: (def: { id: string }) => { layers.add(def.id); },
    removeLayer: (id: string) => { layers.delete(id); },
    removeSource: (id: string) => { sources.delete(id); },
  } as unknown as import('maplibre-gl').Map;
}

function fakeStyleJson(prefix: string, groupNames: string[]) {
  return {
    sources: { s: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
    layers: groupNames.flatMap((g) => ([
      { id: `${prefix}-${g}-line`, type: 'line', source: 's', paint: { 'line-color': '#000000' } },
      { id: `${prefix}-${g}-labels`, type: 'symbol', source: 's' },
    ])),
  };
}

describe('OverlayLoader concurrency', () => {
  beforeEach(() => {
    OverlayLoader.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accumulates layerIds across sequential add() calls for the same overlayId', async () => {
    const map = createFakeMap();
    const style = fakeStyleJson('rd', ['a', 'b']);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => style }));

    await OverlayLoader.add(map, 'rd', 'https://example/rd/style.json', { layerIds: [`rd-a-line`, `rd-a-labels`] });
    await OverlayLoader.add(map, 'rd', 'https://example/rd/style.json', { layerIds: [`rd-b-line`, `rd-b-labels`] });

    expect(OverlayLoader.getActiveLayerIds().sort()).toEqual(
      ['rd-a-line', 'rd-a-labels', 'rd-b-line', 'rd-b-labels'].sort()
    );
    vi.unstubAllGlobals();
  });

  it('accumulates layerIds correctly when add() is called concurrently for the same NEW overlayId (regression: "Alle an" fire-and-forget race)', async () => {
    const map = createFakeMap();
    const style = fakeStyleJson('rd', ['a', 'b', 'c']);
    // Simuliert echte Netzwerklatenz, damit sich die concurrent add()-Aufrufe tatsächlich
    // überlappen (ohne Verzögerung würde die erste fetch()-Auflösung ggf. schon vor dem
    // zweiten Aufruf passieren und die Race nicht reproduzieren).
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => style }), 5))
    ));

    // Wie Sidebar.ts's "Alle an"-Schleife: onLayerToggle() wird nicht awaited, mehrere add()
    // für dieselbe, noch nicht geladene overlayId "rd" laufen parallel.
    await Promise.all([
      OverlayLoader.add(map, 'rd', 'https://example/rd/style.json', { layerIds: ['rd-a-line', 'rd-a-labels'] }),
      OverlayLoader.add(map, 'rd', 'https://example/rd/style.json', { layerIds: ['rd-b-line', 'rd-b-labels'] }),
      OverlayLoader.add(map, 'rd', 'https://example/rd/style.json', { layerIds: ['rd-c-line', 'rd-c-labels'] }),
    ]);

    expect(OverlayLoader.getActiveLayerIds().sort()).toEqual(
      ['rd-a-line', 'rd-a-labels', 'rd-b-line', 'rd-b-labels', 'rd-c-line', 'rd-c-labels'].sort()
    );
    vi.unstubAllGlobals();
  });

  it('getActiveLayerIds flattens across multiple different loaded overlays', async () => {
    const map = createFakeMap();
    const rdStyle = fakeStyleJson('rd', ['a']);
    const nefStyle = fakeStyleJson('nef', ['x']);
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) =>
      Promise.resolve({ ok: true, json: async () => (url.includes('nef') ? nefStyle : rdStyle) })
    ));

    await OverlayLoader.add(map, 'rd', 'https://example/rd/style.json', { layerIds: ['rd-a-line', 'rd-a-labels'] });
    await OverlayLoader.add(map, 'nef', 'https://example/nef/style.json', { layerIds: ['nef-x-line', 'nef-x-labels'] });

    expect(OverlayLoader.getActiveLayerIds().sort()).toEqual(
      ['nef-x-line', 'nef-x-labels', 'rd-a-line', 'rd-a-labels'].sort()
    );
    vi.unstubAllGlobals();
  });
});
