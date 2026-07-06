# MapRegistry-Buchhaltung vereinfachen (U7 + U1b)

Datum: 2026-07-06. Kontext: [TODO.md](../../../TODO.md) „U7 MapRegistry-Buchhaltung
vereinfachen" und „U1b `MapPage.toggleLayer` in `OverlayLoader` generalisieren" aus dem
Map-Subsystem-Cleanup ([docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](../plans/2026-06-30-map-subsystem-cleanup.md)).

## Warum U7 und U1b zusammen

Recherche ergab: Die in U7 kritisierte Dreifach-Buchhaltung (`activeLayers` + `overlayMetadata`
+ `MapRegistry`) existiert **ausschließlich** in `src/pages/MapPage.ts` (`toggleLayer`/
`reapplyActiveOverlays`) — sonst nirgends im Code. `src/lib/OverlayLoader.ts` (der bereits
vereinheitlichte Weg, den `CoordsPage.ts` für sein Wanderwege-Overlay nutzt) hat dasselbe
Grundproblem längst gelöst, nur mit einer einzigen, schlankeren Buchhaltung (`loaded`-Map).
U1b („`MapPage.toggleLayer` in `OverlayLoader` generalisieren") und U7 sind damit derselbe
Umbau: Migriert man `MapPage.toggleLayer` auf `OverlayLoader`, verschwindet die
Dreifach-Buchhaltung als Nebeneffekt.

**Nebenfund während der Recherche:** `CoordsPage.ts`s `onRestore`-Callback ruft nach einem
Basemap-Wechsel erneut `toggleHikingOverlay(true)` auf — das trifft aber auf
`OverlayLoader.add()`s `if (loaded.has(overlayId)) return;`-Guard (das Overlay gilt nach einem
Basemap-Wechsel weiterhin als „loaded") und ist dadurch faktisch ein No-op. Die tatsächliche
Wiederherstellung der Sources/Layer läuft bereits vollständig über `MapRegistry.restore()`
(automatisch nach jedem `onRestore`-Callback in `MapCore.init`s Restore-Sequenz). Das bestätigt:
`MapPage` braucht nach der Migration ebenfalls **keine** eigene Reapply-Logik mehr.

## Scope

1. Neuer, gemeinsamer Guard+Clone+Add-Helper (behebt „Tripel-Guards,
   `JSON.parse(JSON.stringify())` je Restore" — aktuell 4x dupliziert in `MapRegistry.restore`,
   `MapPage.toggleLayer`, `OverlayLoader.add`, `MapCore.ensureGeoJsonLayer`).
2. `OverlayLoader` generalisieren: optionale Layer-Untermenge pro `add()`/`remove()`-Aufruf,
   kumulative Buchhaltung über mehrere Aufrufe für dasselbe Overlay hinweg, Style-JSON-Cache pro
   Overlay, und das aus `MapPage.toggleLayer` übernommene `isStyleLoaded()`-Polling (siehe unten).
3. `MapPage.ts` auf den generalisierten `OverlayLoader` migrieren — `activeLayers`,
   `overlayMetadata`, `cachedStyles`, `styleFetchPromises`, `getStyle()`,
   `reapplyActiveOverlays()` entfallen vollständig.

**Bewusst nicht Teil dieser Migration:** jede Verhaltensänderung an `CoordsPage.ts` über die
reine Wiederverwendung des generalisierten `OverlayLoader` hinaus — die dort gefundene
No-op-Reapply-Redundanz wird nicht separat aufgeräumt (harmlos, kein Bug, außerhalb des
aktuellen Scopes).

## Design

### 1. Gemeinsamer Helper — neue Datei `src/lib/MapDefinitionOps.ts`

```ts
import maplibregl from 'maplibre-gl';

/**
 * Fügt eine Source hinzu, falls noch nicht vorhanden. Klont die Definition vorher (MapLibre
 * mutiert das übergebene Objekt beim Hinzufügen; ohne Klon würde das die in MapRegistry/
 * OverlayLoader gespeicherte kanonische Kopie korrumpieren, siehe MapRegistry.restore).
 */
export function addSourceIfMissing(map: maplibregl.Map, id: string, definition: any): void {
  if (map.getSource(id)) return;
  try {
    map.addSource(id, JSON.parse(JSON.stringify(definition)));
  } catch (e) {
    console.warn(`[Map] Konnte Source ${id} nicht hinzufügen`, e);
  }
}

/**
 * Fügt einen Layer hinzu, falls noch nicht vorhanden (gleiche Klon-Begründung wie oben).
 */
export function addLayerIfMissing(map: maplibregl.Map, definition: any, beforeId?: string): void {
  if (map.getLayer(definition.id)) return;
  try {
    map.addLayer(JSON.parse(JSON.stringify(definition)), beforeId);
  } catch (e) {
    console.warn(`[Map] Konnte Layer ${definition.id} nicht hinzufügen`, e);
  }
}
```

Eigene, fokussierte Datei statt Erweiterung von `MapCore.ts` oder `MapRegistry.ts`: `MapCore.ts`
importiert bereits von `MapRegistry.ts`, eine Erweiterung von `MapCore.ts` würde bei Nutzung aus
`MapRegistry.ts` eine zirkuläre Abhängigkeit erzeugen. Ersetzt die 4x duplizierte
Guard+Clone+Add-Stelle in `MapRegistry.restore` (Sources + Layer je ein Aufruf),
`OverlayLoader.add` (Sources + Layer je ein Aufruf), `MapCore.ensureGeoJsonLayer` (Source +
Layer).

### 2. `OverlayLoader.ts` generalisieren

```ts
interface LoadedOverlay {
  style: any;                        // gecachtes, geparstes Style-JSON
  sourceIdMap: Map<string, string>;  // original sourceId -> geprefixte uniqueSourceId
  sourceIds: string[];
  layerIds: string[];                // kumulativ über mehrere add()-Aufrufe für dieses Overlay
  hasImage: boolean;
}

async add(
  map: maplibregl.Map,
  overlayId: string,
  styleUrl: string,
  opts?: { signal?: AbortSignal; layerIds?: string[] }
): Promise<void>

remove(map: maplibregl.Map, overlayId: string, opts?: { layerIds?: string[] }): void
```

**`add()`:**
1. `isStyleLoaded()`-Polling (aus `MapPage.toggleLayer` übernommen, siehe Begründung unten) am
   Anfang, vor jedem Source-/Layer-Zugriff.
2. Wenn das Overlay noch nicht in `loaded` steht: Style fetchen+parsen, Sprite laden (falls
   vorhanden), **alle** Sources aus dem Style auflösen+registrieren+hinzufügen (Sources sind
   gemeinsame Infrastruktur für das ganze Overlay, unabhängig von der Layer-Untermenge — deckt
   sich mit dem heutigen `MapPage`-Verhalten), Style + `sourceIdMap` in einen neuen
   `LoadedOverlay`-Eintrag cachen.
3. Wenn das Overlay schon in `loaded` steht: das gecachte Style-JSON wiederverwenden (kein
   erneuter Fetch).
4. Layer hinzufügen: `opts?.layerIds` (falls angegeben) oder alle Layer des Styles (Default,
   heutiges Coords-Verhalten unverändert) — dabei nur die noch nicht in `entry.layerIds`
   enthaltenen tatsächlich hinzufügen (kumulativ, ein zweiter `add()`-Aufruf mit einer anderen
   Teilmenge ergänzt statt zu ersetzen).

**`remove()`:**
1. Ohne `opts.layerIds`: wie bisher — alle Layer, dann Sources, dann Sprite-Image entfernen,
   Eintrag löschen (Coords' heutiges Verhalten unverändert).
2. Mit `opts.layerIds`: nur die angegebene Teilmenge aus Karte + `entry.layerIds` entfernen.
   Wird `entry.layerIds` dadurch leer, werden automatisch auch Sources + Sprite-Image entfernt
   und der Eintrag gelöscht — das ist die heutige „letzter Layer aus → Source aufräumen"-Logik
   aus `MapPage.toggleLayer`, jetzt zentral in `OverlayLoader`.

**`isStyleLoaded()`-Polling wandert in `OverlayLoader.add()`:** behebt einen früher gefundenen
Bug (RD-Overlay-Pins verschwanden dauerhaft bei Basemap-Wechsel auf die große
PMTiles-„Basemap At", weil `isStyleLoaded()` an dieser Stelle noch `false` war und ein
`style.load`-Event-Wait für immer hing). Durch die Verschiebung profitieren auch Coords'
Wanderwege-Overlay und künftige `OverlayLoader`-Nutzer von derselben Robustheit, statt dass der
Bug dort erst erneut auftreten müsste, um bemerkt zu werden.

### 3. `MapPage.ts` migrieren

`toggleLayer` wird ein dünner Wrapper:

```ts
private async toggleLayer(overlayId: string, overlayUrl: string, layerIds: string[], checked: boolean, m: maplibregl.Map) {
  try {
    if (checked) {
      await OverlayLoader.add(m, overlayId, overlayUrl, { signal: this.signal, layerIds });
    } else {
      OverlayLoader.remove(m, overlayId, { layerIds });
    }
    m.triggerRepaint();
  } catch (err) {
    console.error(`[MapPageController] toggleLayer error:`, err);
  }
}
```

Entfällt vollständig: `activeLayers`, `overlayMetadata`, `cachedStyles`,
`styleFetchPromises`, `getStyle()`, `reapplyActiveOverlays()`. `MapCore.init`s dritter
Parameter (`onRestore`) ist bereits optional (`onRestore?: (map) => Promise<void> | void`) —
der Aufruf in `MapPage.mount()` lässt ihn künftig einfach weg, statt einen No-op zu übergeben.
Die Wiederherstellung läuft rein über `MapRegistry.restore()`, konsistent mit
Coords/Tracking/NAH/Routing.

## Testing

`MapDefinitionOps.ts`s zwei Funktionen sind mit einem einfachen Mock-`map`-Objekt testbar
(gleiches Muster wie `MapCore.test.ts`s `mockMap()`): Guard greift bei bereits vorhandener
Source/Layer (kein `addSource`/`addLayer`-Aufruf), Klon verhindert, dass das übergebene
Definitions-Objekt nach dem Aufruf mit dem intern verwendeten identisch ist.

`OverlayLoader`s erweiterte `add()`/`remove()`-Logik bekommt **keinen** automatisierten Test —
wie schon zuvor (keine bestehenden Tests für `OverlayLoader.ts`/`MapRegistry.ts`/`MapPage.ts`,
konsistent mit dem repo-weiten Muster, dass MapLibre-Instanz-gekoppelter Code manuell statt
automatisiert verifiziert wird. Stattdessen manuelle Browser-Verifikation (Playwright):

1. `/karte`: zwei verschiedene Layer-Checkboxen desselben Overlays einzeln an-/abschalten,
   dabei prüfen, dass die gemeinsame Source nur beim letzten Abschalten entfernt wird (Network-
   Tab: Style-JSON nur einmal gefetcht, nicht pro Checkbox).
2. `/karte`: Overlay an → Basemap-Wechsel auf „Basemap At" → Overlay bleibt sichtbar (Regression
   des früher gefixten Bugs).
3. `/coords`: Wanderwege-Toggle an/aus/an — unverändertes Verhalten nach der `OverlayLoader`-
   Generalisierung.
4. Keine Konsolenfehler in allen drei Fällen.
