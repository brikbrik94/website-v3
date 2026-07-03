# TODO Archiv

Abgeschlossene Punkte aus [TODO.md](./TODO.md), chronologisch nach Release/Monat. Umgesetzte
Punkte aus [ROADMAP.md](./ROADMAP.md) landen separat in [ROADMAP_ARCHIVE.md](./ROADMAP_ARCHIVE.md).
Einträge unten stammen aus der Zeit vor dem TODO/ROADMAP-Split (Cleanup- und Feature-Arbeit war
noch nicht getrennt) und sind entsprechend gemischt.

## Unreleased (2026-07-03)

### U1+U2 visuell verifiziert (Map-Subsystem Cleanup) — 2 Bugs gefunden + behoben
6-Punkte-Checkliste aus [docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](./docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md)
manuell durchgetestet (`npm run dev`, Basemap „Basemap At"). 4/6 Punkte bestanden direkt
(Tracking-Restore, Terrain-Leak, Wanderwege-Toggle, Seitenwechsel-Persistenz); 2 Punkte
schlugen fehl und wurden per systematischer Fehlersuche (Root-Cause + Live-Reproduktion via
Playwright) auf zwei unabhängige Bugs zurückgeführt und gefixt:

- [x] **Bug A — RD-Pins verschwinden dauerhaft bei Wechsel auf „Basemap At"** (`src/pages/MapPage.ts`,
  `toggleLayer`). `isStyleLoaded()` wird erst `true`, wenn alle Sources ihre initialen Tiles
  geladen haben, nicht nur wenn der Style-JSON geparst ist. Bei „Basemap At" (~2,4 GB PMTiles,
  deutlich größer als die übrigen Basemaps) war das zum Restore-Zeitpunkt oft noch `false`. Der
  Code wartete dann per `m.once('style.load', resolve)` auf ein **erneutes** `style.load` —
  das Event hatte aber schon gefeuert (wir liefen im style.load-Restore-Callback) und feuert ohne
  weiteren `setStyle()`-Aufruf nicht erneut → der `await` hing für immer, und da `isRestoring` in
  `MapCore.ts` dadurch dauerhaft `true` blieb, war jede weitere Restore-Sequenz dieser
  Karteninstanz blockiert. Fix: Wartelogik durch Polling auf `isStyleLoaded()`
  (`requestAnimationFrame`-Loop) ersetzt statt auf ein ggf. bereits verstrichenes Event zu warten.
- [x] **Bug B — Höhenlinien rendern/entfernen sich nicht auf „Basemap At"** (`src/lib/OverlayLoader.ts`).
  Zufällige ID-Kollision: Sowohl der „Basemap At"-Basemap-Style als auch der
  Höhenlinien-Overlay-Style (`basemap-at-contours`) definieren unabhängig voneinander eine
  Source namens `esri`. `OverlayLoader.add()` prüfte nur `!map.getSource(sourceId)` — die
  existierte durch den Basemap schon, das eigentliche Höhenlinien-Source wurde nie hinzugefügt
  (Contour-Layer zeigten auf die falschen, Basemap-eigenen Vektordaten → nichts sichtbar).
  Beim Ausschalten scheiterte `removeSource('esri')`, weil die Source noch von
  Basemap-eigenen Layern gebraucht wurde (MapLibre `error`-Event statt Exception, sichtbar als
  Konsolenfehler). Fix: `OverlayLoader.add()`/intern verwendete IDs jetzt immer mit der
  `overlayId` geprefixt (gleiches Muster wie bereits in `MapPageController.toggleLayer`) —
  Overlay-Sources/-Layer können dadurch nie mehr mit Basemap-eigenen IDs kollidieren.

Beide Fixes mit `npx tsc --noEmit && npm test` (grün) und Live-Reproduktion vor/nach Fix
(Playwright gegen laufenden Dev-Server) verifiziert.

## Abgeschlossene Aufgaben (Mai 2026)
### Release v3.3.0 - Tracking Gateway Migration & BBox Deactivation
- [x] Tracking Gateway V2 Migration (Types, Service, Tracks)
- [x] BBox-Filtering Implementation & Deactivation (for Desktop Optimization)
- [x] Map Bounds Sync Implementation & Cleanup
- [x] Protocol Expansion (Ack, Error, System Telemetry)
- [x] Vessel Track History Persistence
- [x] Final Verification & SemVer Release

### Map Registry & Overlay Fixes
- [x] Basemap Persistence Store
- [x] Map Resource Registry
- [x] MapCore Integration & triggerRestore logic
- [x] Topbar Basemap Sync
- [x] MapPage Refactoring
- [x] NAH and Routing Page Refactoring
- [x] Deep Cloning in MapRegistry (Safety)
- [x] Robust URL Resolution in MapCore
- [x] MapPage/CoordsPage/TerrainManager Integration
- [x] Resilience with Promise.allSettled

### Frühere Aufgaben (Mai 2026)
- [x] Task 1: Style Synchronization
- [x] Task 2: Create MapStyles Library
- [x] Task 3: Create MapLegend Library
- [x] Task 4: Extend Topbar Component
- [x] Task 5: Integrate Legend and Styles into NahPage
- [x] Task 6: Integrate Legend and Styles into RoutingPage
- [x] Task 7: Database Migration to New Schema (rd_stations, nef_stations)
- [x] Task 8: Security Update: Switch to web_api_user
- [x] Task 9: Expand Regions Analysis with RD & NEF stats
- [x] Task 10: Implement secure API Debugger module
- [x] Task 11: TrackingPage Debugging & Stabilisierung (v3.2.0a2)
    - Ursachen für Rendering-Fehler behoben (Sprite Loading Resilience).
    - Proxy-Robustheit für ADS-B/AIS verbessert.
    - Refresh-Loop auf rekursives setTimeout umgestellt.
    - CI-Konformität für Farben und Layer-Management sichergestellt.
