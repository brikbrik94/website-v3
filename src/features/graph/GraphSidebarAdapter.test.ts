// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphSidebarAdapter, rectangleFeatureToBbox } from './GraphSidebarAdapter';
import { MapRegistry } from '../../lib/MapRegistry';
import type { Feature, Polygon } from 'geojson';
import type * as maplibregl from 'maplibre-gl';

function rectangle(coords: [number, number][]): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] }
  };
}

describe('rectangleFeatureToBbox', () => {
  it('extracts the axis-aligned bounding box from a closed rectangle ring', () => {
    const feature = rectangle([
      [16.30, 48.20], [16.31, 48.20], [16.31, 48.205], [16.30, 48.205], [16.30, 48.20]
    ]);
    expect(rectangleFeatureToBbox(feature)).toEqual([[16.30, 48.20], [16.31, 48.205]]);
  });

  it('works even if the ring is not perfectly axis-aligned (e.g. a rotated/pitched map)', () => {
    const feature = rectangle([
      [16.300, 48.2001], [16.3105, 48.2000], [16.3110, 48.2049], [16.2995, 48.2050], [16.300, 48.2001]
    ]);
    expect(rectangleFeatureToBbox(feature)).toEqual([[16.2995, 48.2000], [16.3110, 48.2050]]);
  });
});

/**
 * Fake maplibregl.Map, ausreichend für TerraDrawMapLibreGLAdapter (echte terra-draw-Library, kein
 * Mock) + GraphMapLayers.ensureBaseLayers(). removeSource() bildet absichtlich die echte
 * maplibre-gl-Semantik nach (wirft bei fehlender Source, siehe node_modules/maplibre-gl/dist/
 * maplibre-gl-dev.mjs Style.removeSource) — das ist genau das Verhalten, das den Bug auslöst.
 */
function createFakeGraphMap(options: { isStyleLoaded?: boolean } = {}) {
  const sources = new Map<string, unknown>();
  const layers = new Map<string, { id: string; layout?: Record<string, unknown> }>();
  const canvas = document.createElement('canvas');

  const map = {
    isStyleLoaded: () => options.isStyleLoaded ?? true,
    // Absichtlich no-op: bildet den Konstruktor-Fall nach, bei dem der Style beim Mount noch
    // nicht geladen ist und draw.start() auf 'load' wartet — hier nie gefeuert, damit der Test
    // das exakte Zeitfenster reproduziert, in dem this.draw nie gestartet wurde.
    once: () => {},
    getContainer: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) }),
    getCanvas: () => canvas,
    dragRotate: { isEnabled: () => false, enable() {}, disable() {} },
    dragPan: { isEnabled: () => false, enable() {}, disable() {} },
    doubleClickZoom: { enable() {}, disable() {} },
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, def: unknown) => {
      if (sources.has(id)) throw new Error(`Source "${id}" already exists in the map's style and cannot be added again.`);
      sources.set(id, { ...(def as object), setData(d: unknown) { (this as { data: unknown }).data = d; } });
    },
    removeSource: (id: string) => {
      if (!sources.has(id)) throw new Error(`There is no source with this ID=${id}`);
      sources.delete(id);
    },
    getLayer: (id: string) => layers.get(id),
    addLayer: (def: { id: string }) => { layers.set(def.id, def); },
    removeLayer: (id: string) => { layers.delete(id); },
    moveLayer: () => {},
    setLayoutProperty: (id: string, prop: string, value: unknown) => {
      const l = layers.get(id);
      if (l) l.layout = { ...l.layout, [prop]: value };
    },
  };

  return { map: map as unknown as maplibregl.Map, sources, layers, canvas };
}

describe('GraphSidebarAdapter.reapplyLayers — terra-draw Event-Listener-Leak nach Basemap-Wechsel', () => {
  beforeEach(() => {
    MapRegistry.clear();
  });

  it('entfernt die DOM-Event-Listener der alten TerraDraw-Instanz, wenn reapplyLayers() sie nach einem Basemap-Wechsel ersetzt', () => {
    const { map, sources, layers, canvas } = createFakeGraphMap();
    const adapter = new GraphSidebarAdapter(map, new AbortController().signal);

    const removeSpy = vi.spyOn(canvas, 'removeEventListener');

    // Simuliert map.setStyle() (Basemap-Wechsel): der komplette Style inkl. aller
    // td-*-Sources/Layer der bestehenden TerraDraw-Instanz verschwindet — MapCore ruft danach
    // reapplyLayers() auf DERSELBEN Adapter-Instanz auf (nicht auf einer neuen).
    sources.clear();
    layers.clear();

    expect(() => adapter.reapplyLayers()).not.toThrow();

    // Die alte Instanz muss gestoppt worden sein (removeEventListener für ihre
    // pointerdown/pointermove/pointerup/keydown/keyup/contextmenu-Listener) — sonst bleibt sie
    // als verwaiste Instanz mit aktiven Listenern am Canvas hängen (der eigentliche Leak).
    expect(removeSpy).toHaveBeenCalled();
  });

  it('baut nach dem Ersetzen eine funktionsfähige neue Instanz auf (td-polygon-Source wieder vorhanden)', () => {
    const { map, sources, layers } = createFakeGraphMap();
    const adapter = new GraphSidebarAdapter(map, new AbortController().signal);

    sources.clear();
    layers.clear();
    adapter.reapplyLayers();

    expect(map.getSource('td-polygon')).toBeDefined();
    expect(map.getSource('td-linestring')).toBeDefined();
    expect(map.getSource('td-point')).toBeDefined();
  });

  it('wirft nicht "Source already exists", wenn reapplyLayers() läuft, bevor der Konstruktor draw.start() aufrufen konnte (Style beim Mount noch nicht geladen)', () => {
    // Regression: der Konstruktor verzögert draw.start() auf das 'load'-Event, falls
    // map.isStyleLoaded() beim Mount false ist (hier: once() feuert nie). MapCores
    // 'style.load'-getriebene restore() kann reapplyLayers() aber schon vorher auslösen — dann
    // ist this.draw nie gestartet (enabled === false), draw.stop() in stopDrawSafely() wird zum
    // No-op und die dort angelegten Dummy-Sources blieben unentfernt liegen, was mit der direkt
    // danach gebauten neuen Instanz kollidierte (live im Browser gefunden, nicht durch die
    // beiden Tests oben abgedeckt, da dort isStyleLoaded stets true war).
    const { map } = createFakeGraphMap({ isStyleLoaded: false });
    const adapter = new GraphSidebarAdapter(map, new AbortController().signal);

    expect(() => adapter.reapplyLayers()).not.toThrow();
    expect(map.getSource('td-polygon')).toBeDefined();
    expect(map.getSource('td-linestring')).toBeDefined();
    expect(map.getSource('td-point')).toBeDefined();
  });
});
