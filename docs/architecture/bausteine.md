# Bausteine-Katalog: `src/lib/`

**Automatisch generiert** aus den Exports/JSDoc-Kommentaren in `src/lib/` — nicht von
Hand pflegen, Änderungen gehen beim nächsten Lauf verloren. Neu erzeugen nach
Änderungen an `src/lib/`:

```bash
npm run docs:bausteine
```

Umfasst nur `src/lib/` (seitenübergreifend wiederverwendbare Bausteine) — `src/features/*/`
folgt dem in `CLAUDE.md` dokumentierten, seitenspezifischen `*DataService`/`*MapLayers`/
`*SidebarAdapter`-Muster und ist bewusst nicht Teil dieses Katalogs.

## `BadgeStyles.ts`

Kanonische Badge-CSS-Klassen aus oe5ith-ci (docs/badges.md, "6 Varianten").
Zentraler Typ, damit Status→Badge-Mappings in den Feature-Dateien (NahPopupBuilder,
TrackingSidebar, RoutingSidebar, …) gegen dieselbe, tippfehler-sichere Klassenliste
geprüft werden, statt jede Datei ihre eigenen Literal-Strings pflegen zu lassen.

Import: `from '.../lib/BadgeStyles'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `BadgeClass` (type)

## `BasemapStore.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/BasemapStore'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `BasemapStore` (const)

## `FlightMath.ts`

OE5ITH Flight Math Utility
Berechnungen für Luftrettung (Luftlinie, Flugzeit, ETA)

Import: `from '.../lib/FlightMath'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `calculateDistance` (const)
- `calculateFlightTime` (const)
- `formatDuration` (const)
- `formatETA` (const)

## `GenericFeaturePopup.ts`

Baut ein generisches Feature-Popup aus rohen GeoJSON-properties — für die heterogenen,
unkuratierten Overlay-Layer auf /karte (Autobahnen, Gemeinden, Höhenlinien, …), bei denen ein
kuratiertes Feld-Mapping pro Layer (wie PopupManager.POPUP_CONFIGS) angesichts hunderter
Sub-Layer nicht praktikabel ist. Titel per Heuristik (erste vorhandene Property aus
name/title/ref/id), sonst die Layer-ID. Restliche properties als Key-Value-Liste, mit
Basis-Filterung (keine internen _-Felder, keine leeren/sehr langen Werte).

Import: `from '.../lib/GenericFeaturePopup'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `buildGenericFeaturePopupHtml` (function)

## `GeocoderSearchField.ts`

Kapselt Debounce/Fetch/Dropdown-Rendering/Outside-Click-Dismiss für ein bestehendes
Input+Ergebnis-Container-Paar. Rendert bewusst kein eigenes Markup (siehe Aufrufer für
Details) - unterschiedliche Konsumenten (Coords-Tabelle, Routing-Felder, Karte-Sidebar)
haben unterschiedliches umgebendes HTML/CSS-Klassen für das Input-Element selbst.

Import: `from '.../lib/GeocoderSearchField'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `GeocoderSelection` (interface)
- `GeocoderSearchFieldOptions` (interface)
- `GeocoderSearchField` (class)

## `GeocoderService.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/GeocoderService'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `GeocoderService` (const)

## `GlobalModals.ts`

GlobalModals - Zentrales Management für Changelog und Copyright Modals.
Wird einmalig in main.ts initialisiert.

Import: `from '.../lib/GlobalModals'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `initGlobalModals` (const)

## `HoverCursor.ts`

Zeigt einen Pointer-Cursor, solange der Mauszeiger über einem Feature der angegebenen
Layer steht (z.B. für klickbare Symbol-/Circle-Layer). Idempotent: mehrfache Aufrufe für
dieselbe Map-Instanz (z.B. weil initLayers()/ensureLayers() bei jedem Basemap-Wechsel
erneut läuft) registrieren die Listener nur einmal.

Kein explizites Cleanup nötig: jede Seite bekommt bei jedem Besuch eine neue Map-Instanz
(siehe MapCore.init() / CLAUDE.md Page-Lifecycle), eine neue Instanz steckt automatisch
nicht im WeakSet und die Listener der alten Instanz verschwinden mit ihr.

Import: `from '.../lib/HoverCursor'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `attachHoverCursor` (function)

## `LayoutHelper.ts`

LayoutHelper
Zentralisiert das Basis-Layout (Topbar, Sidebar, Map) für alle Pages.

Import: `from '.../lib/LayoutHelper'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `LayoutOptions` (interface)
- `LayoutMounts` (interface)
- `LayoutHelper` (class)

## `LongPressGesture.ts`

Öffnet denselben Trigger-Pfad wie MapLibres 'contextmenu'-Event, aber über eine eigene
Touch-Long-Press-Erkennung — das native contextmenu-Event feuert auf Touch nicht zuverlässig,
weil MapLibre bei aktivem Touch-Pan+Zoom `touch-action: none` auf den Canvas setzt (siehe
docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md).
Idempotent: mehrfache Aufrufe für dieselbe Map-Instanz registrieren die Listener nur einmal —
ein zweiter Aufruf mit einem anderen Callback ist ein No-Op, der erste Callback gewinnt.
Kein explizites Cleanup nötig (siehe HoverCursor.ts — neue Seite = neue Map-Instanz).

Import: `from '.../lib/LongPressGesture'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `LongPressEvent` (interface)
- `attachLongPress` (function)

## `ManeuverIcons.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/ManeuverIcons'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `getManeuverIconMarkup` (function)

## `MapCore.ts`

Zentraler Orchestrator für MapLibre Instanzen im Projekt.
Verhindert Code-Duplizierung und stellt CI-Konformität sicher.

Import: `from '.../lib/MapCore'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `MARKERS_SPRITE_BASE` (const)
- `MapCore` (const)

## `MapDefinitionOps.ts`

Fügt eine Source hinzu, falls noch nicht vorhanden. Klont die Definition vorher (MapLibre
mutiert das übergebene Objekt beim Hinzufügen; ohne Klon würde das die in MapRegistry/
OverlayLoader gespeicherte kanonische Kopie korrumpieren).

Import: `from '.../lib/MapDefinitionOps'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `addSourceIfMissing` (function)
- `addLayerIfMissing` (function)

## `MapLegend.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/MapLegend'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `AddLegendEntryOptions` (interface)
- `MapLegend` (class)

## `MapRegistry.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/MapRegistry'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `MapRegistry` (const)

## `MapStyles.ts`

Dynamic map styles that resolve colors from CI tokens.

Import: `from '.../lib/MapStyles'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `MAP_ROUTE_STYLES` (const)
- `MAP_COLORS` (const)

## `OverlayLoader.ts`

Gemeinsamer Loader für entfernte MapLibre-Style-Overlays (z.B. Wanderwege, Höhenlinien,
Karten-Layer-Toggles). Vereinheitlicht das zuvor an mehreren Stellen kopierte
fetch → resolveSourceUrls → registerImage+loadSprites → register/add sources+layers.

Sprites/Sources/Layer werden in der MapRegistry eingetragen und überleben so
Style-Wechsel (MapRegistry.restore fügt sie erneut hinzu).

Import: `from '.../lib/OverlayLoader'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `OverlayLoader` (const)

## `PopupManager.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/PopupManager'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `PopupField` (interface)
- `LayerPopupConfig` (interface)
- `POPUP_CONFIGS` (const)
- `PopupManager` (class)

## `RoutingService.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/RoutingService'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `RoutingService` (const)

## `ShipTypeMapper.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/ShipTypeMapper'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `ShipTypeMapper` (class)

## `SidebarUtils.ts`

OE5ITH Sidebar Toggle Utility
Shared logic for desktop collapse and mobile expansion.

Import: `from '.../lib/SidebarUtils'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `getSidebarFooterHtml` (const)
- `setupSidebarToggle` (const)

## `TerrainManager.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/TerrainManager'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `ELEVATION_SOURCE_ID` (const)
- `HILLSHADE_LAYER_ID` (const)
- `CONTOURS_OVERLAY` (const)
- `initTerrainManager` (function)
- `toggleTerrain` (function)
- `toggleHillshade` (function)
- `toggleContours` (function)

## `Toast.ts`

_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._

Import: `from '.../lib/Toast'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `Toast` (const)

## `UIUtils.ts`

Maps Nominatim class/type to FontAwesome icons

Import: `from '.../lib/UIUtils'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `getIconForGeocodeResult` (const)
- `renderGeocodeItemHtml` (const)
- `formatTime` (const)

## `resolveLegendSwatch.ts`

Löst die Legenden-Swatch-Farbe eines MapLibre-Layers auf — deckt nur die im Projekt
tatsächlich vorkommenden Muster ab (Literal-Farbe, `match`-/`case`-Expression-Fallback,
ggf. verschachtelt), keine vollständige Style-Spec-Expression-Engine (siehe
docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md, Entscheidung 5).

Import: `from '.../lib/resolveLegendSwatch'` (Pfad relativ zum aufrufenden Modul anpassen)

Exports:
- `SwatchType` (type)
- `LegendSwatch` (interface)
- `resolveLegendSwatch` (function)
- `LegendSwatchBranch` (interface)
- `resolveLegendSwatchBranches` (function)
- `swatchTypeForLayerType` (function)
- `resolveSwatchFromLayersMetaColor` (function)
