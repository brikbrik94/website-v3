# TODO Archiv

Abgeschlossene Punkte aus [TODO.md](./TODO.md), chronologisch nach Release/Monat. Umgesetzte
Punkte aus [ROADMAP.md](./ROADMAP.md) landen separat in [ROADMAP_ARCHIVE.md](./ROADMAP_ARCHIVE.md).
Einträge unten stammen aus der Zeit vor dem TODO/ROADMAP-Split (Cleanup- und Feature-Arbeit war
noch nicht getrennt) und sind entsprechend gemischt.

## Unreleased (2026-07-05)

### Versionsinfo-/Copyright-Modal wurde von der Topbar überdeckt
- [x] `.modal-backdrop` (`src/styles/modal.css`) setzte `z-index: var(--z-backdrop)` (1040) —
  niedriger als `--z-topbar` (1100). Da `position: fixed` + `z-index` einen eigenen
  Stacking-Context bildet, sperrte das jedes `.modal` (Changelog-/Copyright-Modal) unter die
  Topbar, egal welchen `z-index` `.modal` selbst trug (`var(--z-modal)`, 1500) — die Topbar
  überdeckte sichtbar den oberen Rand des Fensters. Root Cause per Playwright bestätigt:
  `elementFromPoint` am Überlappungspunkt lieferte einen Topbar-Button statt das Modal. Fix:
  `.modal-backdrop` bekommt direkt `z-index: var(--z-modal)` statt `--z-backdrop` — bestehende
  `--z-backdrop`-Verwendungen (`sidebar-backdrop`, `controls-backdrop`), die bewusst unter der
  Topbar bleiben sollen, bleiben unverändert. Live verifiziert: Überlappungspunkt zeigt jetzt das
  Modal, mobiles Sidebar-Backdrop weiterhin korrekt unter der Topbar. Gleicher Bug besteht noch im
  `oe5ith-ci`-Submodul (`css/modal.css`) — als eigener TODO.md-Punkt festgehalten, dort nicht
  gefixt (eigene Versionierung). `npx tsc --noEmit && npm test` grün (68/68).

### TrackingPage-Timer nicht gecleart
- [x] `setTimeout` in `TrackingPage.ts` (Buttons „active" setzen, 100ms) wurde nirgends
  gespeichert und daher in `destroy()` nie gecleart — bei Seitenwechsel innerhalb der 100ms lief
  der Callback nach der Navigation noch und griff auf DOM-Elemente einer bereits verlassenen
  Seite zu. Timeout-ID jetzt in `activateButtonsTimeout` gespeichert, in `destroy()` gecleart.
  Rein mechanischer Fix ohne sichtbares Verhalten, kein Browser-Test nötig. `npx tsc --noEmit &&
  npm test` grün (68/68).

### Seitentitel „Cloud Portal" → „GeoPortal"
- [x] `<title>` in `index.html:7` (war „OE5ITH - Cloud Portal") und Landing-Page-Überschrift
  `src/main.ts:55` (war „Willkommen im Cloud Portal") umbenannt. `CLAUDE.md`-Kopf (Zeile 5,
  Projektbeschreibung) mitgezogen. Historische Spec `docs/superpowers/specs/2026-05-19-functional-alignment.md`
  bewusst **nicht** angepasst — Zeitpunkt-Dokument, keine lebende Doku. Kein README vorhanden. Live
  per Playwright verifiziert (Tab-Titel + H1 zeigen „GeoPortal"). `npx tsc --noEmit && npm test`
  grün (68/68).

### Coords-Seite: Pin setzen auf Rechtsklick-Kontextmenü umgestellt
- [x] Pin setzen war an Linksklick auf die Karte gebunden (`CoordsPage.ts:72`,
  `map.on('click', ...)`) — inkonsistent zum Routing-Kontextmenü-Pattern und (laut Nutzer)
  potenziell verwirrend, da Rechtsklick-Drag bereits für die 3D-Steuerung (Kippen/Rotieren)
  reserviert ist. Umgestellt auf `map.on('contextmenu', ...)` mit `ContextMenu.show(...)`, exakt
  analog zu `RoutingPage.ts:76`: Rechtsklick öffnet ein Menü mit Koordinaten-Label und der Aktion
  „Koordinate hier setzen"; Linksklick bleibt für normales Kartenverschieben frei, `contextmenu`
  feuert nur bei Rechtsklick ohne Drag und kollidiert nicht mit der 3D-Steuerung. Aus
  `docs/proposals/todo.txt` übernommen (2026-07-05), noch am selben Tag umgesetzt. Live per
  Playwright verifiziert: Linksklick öffnet kein Menü, Rechtsklick öffnet das Menü mit korrekten
  Koordinaten, Klick auf „Koordinate hier setzen" aktualisiert Adresse/alle Koordinatenformate in
  der Sidebar. `npx tsc --noEmit && npm test` grün (68/68).

### Routing: A→B zeigte leere Stationsliste
- [x] `renderStationResults` (`src/components/RoutingSidebar.ts`) zeigte auch im A→B-Modus
  „0 Standorte gefunden"/„Nächste Stützpunkte" an, weil `clearAll()`
  (`RoutingSidebarAdapter.ts`) die Funktion beim Reset unbedingt mit einem leeren Array aufrief
  und die Funktion selbst eine leere Liste nicht von einer echten (aber leeren) Suche
  unterschied. Root Cause: der einzige Aufrufer mit leerem Array ist der Reset-Pfad — ein echtes
  Null-Treffer-Ergebnis läuft bereits vorher über `renderRoutingError` und erreicht
  `renderStationResults` gar nicht. Fix: `renderStationResults` blendet das Panel jetzt aus und
  leert es, statt „0 gefunden" zu rendern, wenn `stations.length === 0` — modusunabhängig,
  keine Sonderbehandlung für A→B nötig. Test zuerst geschrieben (RED bestätigt), dann Fix.
  Live per Playwright verifiziert: A→B zeigt jetzt keine Stationsliste mehr, SEW zeigt sie
  weiterhin korrekt an. `npx tsc --noEmit && npm test` grün (68/68).

## Unreleased (2026-07-03)

### U4 Pin-/Marker-Boilerplate zusammengefasst
- [x] Die fast identisch kopierte Symbol-Layer-Definition für Einzel-Pins (NAH-Einsatzort,
  Routing-Start/-Ziel, Coords-Pin: `icon-image`/`icon-size`/`icon-anchor`/`icon-color`/Halo) in
  `MapCore.createPinLayer(layerId, sourceId, opts)` zusammengefasst; ersetzt die drei Kopien in
  `NahMapLayers.ts`, `RoutingMapLayers.ts`, `CoordsPage.ts`.
- [x] Die mehrfach kopierte „Pin-Position setzen/leeren"-Logik (`getSource` + `setData` mit
  Point-Feature oder leerer FeatureCollection) in `MapCore.setPointSource(map, sourceId, lngLat)`
  zusammengefasst; ersetzt `NahMapLayers.setTargetPin`/`clearTargetPin`-Bodies,
  `RoutingMapLayers._updatePin` (entfällt, `updateStartPin`/`updateTargetPin` rufen jetzt direkt
  `MapCore.setPointSource` auf) und die zwei inline-Stellen in `CoordsPage.ts`.
- Live per Playwright verifiziert (Coords-Pin, Routing-Start-/Ziel-Pin je per Screenshot geprüft,
  keine Konsolenfehler). `npx tsc --noEmit && npm test` grün.
- [x] Nachträglich Unit-Tests ergänzt (`src/lib/MapCore.test.ts`): `createPinLayer` (Defaults,
  Custom-Optionen, Halo nur bei gesetzter Farbe) und `setPointSource` (Punkt setzen, leeren bei
  `null`, No-Op bei fehlender Source) — reine Funktionen, ohne DOM/MapLibre-Mock testbar.
  `loadSprites`-Caching (U3) bewusst nicht unit-getestet: hängt an `Image`/`canvas`/`getImageData`,
  die im Node-Testenvironment dieses Repos (kein jsdom/canvas-Package) nicht verfügbar sind —
  hierfür bleibt die Playwright-Live-Verifikation die Evidenzform.

### U3 Sprite-Handling gecacht + `SPRITE_BASE`-Konstante zentralisiert
- [x] `MapCore.loadSprites` fetchte/dekodierte das Sprite-Sheet (JSON-Atlas + Bild) bisher bei
  jedem Style-Reload (Basemap-Wechsel) neu, obwohl Inhalt pro Sprite-URL identisch ist — wirkt
  auf Core Web Vitals LCP/INP beim Karten-Init. Jetzt Cache (`_spriteSheetCache` in `MapCore.ts`,
  keyed nach Sprite-URL inkl. HiDPI-Suffix) für den Fetch+Decode-Schritt; der pro Map-Instanz
  nötige `addImage()`-Schritt bleibt unverändert (kann nicht cross-Style gecacht werden, da
  Style-Wechsel die vorherigen Bilder verwirft).
- [x] Die 3 identisch duplizierten `SPRITE_BASE`-Konstanten (`NahMapLayers.ts`,
  `RoutingMapLayers.ts`, `CoordsPage.ts`) durch eine zentrale, aus `MapCore.ts` exportierte
  `MARKERS_SPRITE_BASE`-Konstante ersetzt.
- Live per Playwright verifiziert: zweiter/dritter Basemap-Wechsel loggt „Reusing cached sprite
  sheet" statt erneut „Loading sprites from …". `npx tsc --noEmit && npm test` grün.
- Dabei unabhängigen 404 bei Basemap „At Plus" entdeckt (natives MapLibre-Style-Sprite, nicht
  `MapCore.loadSprites`) — als eigener TODO.md-Punkt erfasst, nicht mitgefixt.

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
