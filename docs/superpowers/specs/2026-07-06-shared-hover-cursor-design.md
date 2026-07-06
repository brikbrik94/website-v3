# Gemeinsamer Hover-Cursor-Helper (U6)

Datum: 2026-07-06. Kontext: [TODO.md](../../../TODO.md) „U6 Hover-Cursor vereinheitlichen" aus dem
Map-Subsystem-Cleanup ([docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](../plans/2026-06-30-map-subsystem-cleanup.md)).

## Ist-Zustand (verifiziert, vollständige Inventur)

Grep über `src/**/*.ts` nach `style.cursor`/`mouseenter`/`mouseleave`/`getCanvas` findet genau
drei Stellen — keine weiteren:

1. **`src/pages/RoutingPage.ts`** (`setupMapListeners()`, Zeile 69-74): Hover-Cursor für
   `routing-path` komplett inline, kein Guard, **kein Cleanup in `destroy()`**.
2. **`src/features/tracking/TrackingMapLayers.ts`** (Zeile 11-15, 219-227, 268-278):
   Instanzfelder (`cursorListenersAttached`-Boolean-Guard, `hoverLayerIds`, `onHoverEnter`/
   `onHoverLeave`), Guard nötig weil `ensureLayers()` bei jedem Basemap-Wechsel erneut läuft;
   explizites `off()` in `destroy()`. `hoverLayerIds` enthält nur `adsb-icons`/`ais-icons` —
   `ais-dots-moving`/`ais-dots-static` sind zwar klickbar (`handleMapClick`s
   `queryRenderedFeatures`-Layer-Liste), zeigen aber **keinen** Hover-Cursor.
3. **`src/features/nah/NahMapLayers.ts`** (Zeile 29-40): Modul-scoped `WeakSet<maplibregl.Map>`
   als Guard (nötig aus demselben Grund wie bei Tracking), `attachStationHoverCursor()`.

**`src/pages/MapPage.ts`** (togglebare Overlay-Layer) und **`src/pages/CoordsPage.ts`**
(Koordinaten-Pin) haben **keine** Hover-Cursor-Logik — aber nicht als Lücke in diesem Sinn:
MapPage-Overlays sind aktuell komplett ohne Klick-Verdrahtung (das ist der separate,
bestehende ROADMAP.md-Punkt „Karten-Klick + Overlay-Infos seitenübergreifend"), CoordsPage
verzichtet bewusst auf Klick am Pin (Rechtsklick-Kontextmenü-Pattern, Linksklick bleibt fürs
Kartenverschieben frei, Rechtsklick fürs 3D-Kippen reserviert). Beide bleiben **außerhalb** des
Scopes dieser Vereinheitlichung.

## Scope

Nur die drei bestehenden Implementierungen (Tracking, Routing, NAH) auf einen gemeinsamen
Helper umstellen. Dabei werden die zwei gefundenen Nebenbugs miterledigt, da sie sich durch
eine korrekt gebaute gemeinsame Implementierung ohnehin von selbst auflösen:

- Tracking bekommt `ais-dots-moving`/`ais-dots-static` mit in die Hover-Layer-Liste.
- Routing bekommt automatisch ein korrektes Cleanup, weil der Helper keines braucht (siehe
  unten) — das Leak-Risiko verschwindet, ohne dass Routing selbst etwas Zusätzliches tun muss.

MapPage/CoordsPage bleiben unangetastet.

## Design

Neue, eigenständige Datei **`src/lib/HoverCursor.ts`** — ein Export, eine Aufgabe, passend zum
Rest des Projekts (TypeScript, ES6-Modul-Stil): kein Objekt-Wrapper, eine benannte Funktion.

```ts
import maplibregl from 'maplibre-gl';

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
```

**Migration der drei Stellen:**

- **`RoutingPage.ts`**: Die inline `mouseenter`/`mouseleave`-Blöcke in `setupMapListeners()`
  entfallen, ersetzt durch `attachHoverCursor(this.map, ['routing-path']);`.
- **`TrackingMapLayers.ts`**: `hoverLayerIds`, `cursorListenersAttached`,
  `onHoverEnter`/`onHoverLeave` sowie der Registrierungs-Block in `ensureLayers()` und das
  `off()`-Cleanup in `destroy()` entfallen vollständig. Stattdessen ein Aufruf
  `attachHoverCursor(m, ['adsb-icons', 'ais-icons', 'ais-dots-moving', 'ais-dots-static']);`
  am Ende von `ensureLayers()`.
- **`NahMapLayers.ts`**: `attachStationHoverCursor()` und ihr modul-scoped `WeakSet` entfallen,
  ersetzt durch `attachHoverCursor(map, [STATIONS_LAYER]);` in `initLayers()`.

## Dokumentation für neue Seiten

**`CLAUDE.md`** („Map infrastructure"-Absatz) wird um den neuen Helfer ergänzt, analog zu den
dort bereits gelisteten Utilities:

> `MapCore` initializes MapLibre GL. `MapRegistry` is a central store of map sources/layers/images
> that survives basemap style changes … `TerrainManager` handles 3D terrain. `MapLegend`,
> `PopupManager`, **`HoverCursor` (`attachHoverCursor`, pointer cursor on hover for clickable
> layers)**, `GeocoderService`, `Toast` (central feedback), `GlobalModals` are shared
> singletons/utilities.

Eine neue Seite mit einem klickbaren Layer ruft künftig einfach
`attachHoverCursor(map, ['mein-layer'])` in ihrer Layer-Setup-Funktion auf — die Doku-Zeile in
`CLAUDE.md` (dem ersten Ort, den ein Agent/Dev für die Architektur liest) macht das Pattern
auffindbar, der ausführliche JSDoc-Kommentar an der Funktion selbst erklärt Idempotenz und
Cleanup-Verzicht im Detail.

## Testing

`attachHoverCursor` selbst bekommt einen Vitest-Test — anders als die Popup-/DOM-Fälle aus den
vorherigen Sessions braucht diese Funktion **keine** echte DOM/Canvas-Instanz: `map.getCanvas()`
wird nur *innerhalb* der Callback-Funktionen aufgerufen (beim tatsächlichen Hover-Event), nicht
beim Registrieren selbst. Ein einfacher Mock-`map`
(`{ on: (...) => calls.push(...), }`, wie in `MapCore.test.ts`/`NahMapLayers.test.ts` bereits
etabliert) reicht, um zu prüfen:

- Für `n` Layer-IDs werden `2n` Listener registriert (je ein `mouseenter`+`mouseleave` pro Layer).
- Ein zweiter Aufruf mit derselben Map-Instanz registriert nichts erneut (Idempotenz-Guard).
- Zwei verschiedene Map-Instanzen (zwei Mock-Objekte) registrieren unabhängig voneinander.

Manuelle Browser-Verifikation (Playwright, wie in den vorherigen U5-/Popup-Sessions):
Hover-Cursor auf `/tracking` (inkl. AIS-Dots — das war vorher kaputt), `/routing`, `/nah`
jeweils prüfen; zusätzlich Seitenwechsel-Test (z.B. `/tracking` → `/nah` → zurück), dass der
Cursor auf der neuen Seite korrekt funktioniert und keine JS-Fehler durch übrig gebliebene
Listener auftreten.
