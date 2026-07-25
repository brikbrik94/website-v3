import * as maplibregl from 'maplibre-gl';

const _attached = new WeakSet<maplibregl.Map>();

/**
 * Zeigt einen Pointer-Cursor, solange der Mauszeiger über einem Feature der angegebenen
 * Layer steht (z.B. für klickbare Symbol-/Circle-Layer). Idempotent: mehrfache Aufrufe für
 * dieselbe Map-Instanz (z.B. weil initLayers()/ensureLayers() bei jedem Basemap-Wechsel
 * erneut läuft) registrieren die Listener nur einmal.
 *
 * Kein explizites Cleanup nötig: jede Seite bekommt bei jedem Besuch eine neue Map-Instanz
 * (siehe MapCore.init() / CLAUDE.md Page-Lifecycle), eine neue Instanz steckt automatisch
 * nicht im WeakSet und die Listener der alten Instanz verschwinden mit ihr.
 */
export function attachHoverCursor(map: maplibregl.Map, layerIds: string[]): void {
  if (_attached.has(map)) return;
  _attached.add(map);

  for (const layerId of layerIds) {
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  }
}
