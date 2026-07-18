# Projekt TODOs

Aufgaben im **aktuellen Scope**: Fixes, Cleanup, Erweiterungen an bereits bestehendem Code/Features.
Neue, noch nicht existierende Features/Funktionen gehören in [ROADMAP.md](./ROADMAP.md), nicht hierher.
Abgeschlossene Aufgaben wandern ins [TODO_ARCHIVE.md](./TODO_ARCHIVE.md).

## Map-Subsystem: Anschlussfeatures

Von ROADMAP.md hierher verschoben (2026-07-09) — Erweiterungen an bereits bestehenden Komponenten
(`MapLegend`, `RoutingPage`-Kontextmenü, `NahMapLayers`), keine komplett neuen Features, daher im
Zweifel hier statt in der Roadmap (siehe `AGENT_INSTRUCTIONS.md` §3). Die Legende ist bewusst in
Einzelschritte zerlegt statt als ein großer Punkt — Machbarkeits-Check (2026-07-09) hat gezeigt,
dass `MapRegistry` aktuell keinerlei Legenden-Semantik kennt (nur rohe MapLibre-Layer-Definitionen,
kein Label, keine Zuordnung Layer→Legenden-Zeile) und `/karte` mit ihren dynamisch aus
`layers.json`/Overlay-Style-JSONs geladenen Layer-Gruppen der komplexeste Fall ist. Reihenfolge:
zuerst Infrastruktur + `/karte` als Machbarkeitsnachweis, danach erst die übrigen Seiten — nicht
alle vier auf einmal anfassen.

- [x] **Schritt 1: MapLegend interaktiv + Registry-Metadata** (2026-07-09) — ✅ ERLEDIGT
  `MapLegend.addEntry()`-Einträge sind jetzt klickbar (×-Button zum Ausblenden). Neuer Farb-Resolver
  für MapLibre-Paint-Expressions (`resolveLegendSwatch()` + `swatchTypeForLayerType()` in
  `src/lib/resolveLegendSwatch.ts`), mit „?"-Fallback für nicht aufgelöste Farben. Bewusst
  **keine** `MapRegistry`-Legend-Metadata-Abstraktion gebaut (Entscheidung 4 im Spec-Doc) —
  `MapRegistry.ts` selbst wurde nicht angefasst. Reine Infrastruktur, dokumentiert in
  [docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md](./superpowers/specs/2026-07-09-map-legend-interactive-design.md).
  129 Tests grün, 0 TypeScript-Fehler.
- [x] **Schritt 2: Anwendung auf `/karte`** (2026-07-09, Nachbesserung nach Live-Test 2026-07-09) —
  ✅ ERLEDIGT. Legende auf `/karte` zeigt nur aktive Layer (Sidebar-Accordion → Legende automatisch
  bei Ein-/Ausschalten). Klick auf „×" in der Legende löst einen echten `.click()` auf das
  zugehörige Accordion-Item aus (derselbe bestehende Toggle-Pfad, keine zweite Implementierung) —
  die Legende kann Layer nur ausblenden, nicht einschalten, das bleibt Sache der Sidebar. **Nach
  Live-Test durch den Nutzer (echte Overlays: Autobahnen, OpenSkiMap, Contours) drei reale Lücken
  gefunden und behoben** (Details: CHANGELOG.md, 2026-07-09 22:57) — u.a. fehlten für alle
  `layers.json`-kuratierten Overlays (14 Stück) komplett die Legenden-Einträge, da deren
  `template`-Feld keine echten MapLibre-Typen enthält; behoben durch bedarfsweises Nachladen des
  echten `style.json` (gecacht) für die Farbauflösung, `layers.json` bleibt weiter für die
  Gruppierung zuständig. Spec-Abdeckung: alle 7 Entscheidungen umgesetzt. Alle Fixes gegen echte,
  live abgerufene Overlay-Style-Daten verifiziert (nicht nur synthetische Testfälle). 133 Tests
  grün, 0 TypeScript-Fehler.
  **Hinweis: vollständige interaktive Browser-Verifikation weiterhin ausstehend** (keine
  Playwright/Headless-Browser in dieser Umgebung) — die drei jetzt behobenen Lücken wurden vom
  Nutzer manuell im Browser gefunden; ein erneuter Durchlauf nach diesem Fix steht noch aus.
- [x] **Legenden-Granularität: neues `layers.json`-Schema konsumieren** (2026-07-09 aufgemacht,
  2026-07-12 externe Seite geliefert + hier umgesetzt) — ✅ ERLEDIGT. Ursprünglich: die Legende auf
  `/karte` zeigte einen Eintrag pro *einzeln getoggeltem Layer/Gruppe* (z.B. „A1", „A10", „A11", …),
  nicht einen Eintrag pro *semantischer Kategorie*. Option (b) aus der ursprünglichen Formulierung
  — kuratierte Legenden-Infos direkt in `layers.json` ergänzen — wurde extern umgesetzt
  (`https://tiles.oe5ith.at/layers.json` liefert seither pro Gruppe `type`/`color`/`legend_items`)
  und hier konsumiert: neue `resolveSwatchFromLayersMetaColor()` in `src/lib/resolveLegendSwatch.ts`,
  `buildToggleEvent()` in `src/components/Sidebar.ts` bevorzugt `layersMeta.color`/`legend_items`
  vor dem teuren `style.json`-Fallback (der zuvor durch einen Bug immer griff), `MapPageController`
  in `src/pages/MapPage.ts` dedupliziert `legend_items` pro Overlay per Referenzzählung (die 6
  Anfahrtszeit-Ringe zeigen ihre 6-stufige Farbskala jetzt genau einmal statt mehrfach dupliziert).
  Subagent-driven-development mit Task-Reviews (alle „Approved") + finaler Whole-Branch-Review
  (Opus, „Ready to merge: Yes", keine Critical/Important-Funde). Spec:
  [docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md](./superpowers/specs/2026-07-12-map-legend-granularity-design.md).
  156 Tests grün, 0 TypeScript-Fehler. Vom Nutzer live auf `/karte` verifiziert und bestätigt.
  Weitere Optimierungsrichtungen (Kuratierung auf mehr Templates ausweiten, `opacity` nutzen,
  Legenden-Gruppierung) als eigener Punkt in ROADMAP.md → „Karten-Legende: weitere Optimierung"
  festgehalten.
- [x] **Schritt 3: Anwendung auf `/nah`** (2026-07-18) — ✅ ERLEDIGT. Die 3 hardcodierten
  Status-`legend.addEntry()`-Aufrufe wurden auf einen erweiterten Resolver umgestellt: neue
  `resolveLegendSwatchBranches()` in `src/lib/resolveLegendSwatch.ts` liest — anders als
  `resolveLegendSwatch()`, das nur den Fallback-Arm einer `match`-Expression liest — **alle**
  Branches aus und mappt sie über ein Label-Dictionary auf Legenden-Zeilen (Sonderfall: **ein**
  Layer → **drei** Zeilen). Farbe kommt jetzt aus der echten Stations-Layer-Definition
  (`NahMapLayers.getStationsLayerDefinition()`, extrahiert aus der bisher nur lokal in
  `initLayers()` gebauten Literal) statt separat gepflegten `MAP_COLORS`-Konstanten — eine Quelle
  der Wahrheit, Fallback auf die alten hardcodierten Werte falls die Layer-Definition sich künftig
  unerwartet ändert. Zusätzlich: Status-Einträge zeigen jetzt ein Helikopter-Icon
  (`fa-solid fa-helicopter`) statt eines Farbpunkts, passend zum tatsächlichen Kartensymbol —
  neuer `icon`-Eintragstyp in `MapLegend`/`LegendEntry`, dafür vorher `.map-legend-icon` per
  CI-Request in `oe5ith-ci` v1.21.0 umgesetzt (`docs/ci/legend-icon-swatch-request.md`). 8 neue
  Tests (`resolveLegendSwatch.test.ts`, `NahMapLayers.test.ts`), 174 Tests grün, 0
  TypeScript-Fehler. **Hinweis:** Browser-Verifikation auf `/nah` weiterhin ausstehend (keine
  Playwright-Umgebung hier).
- [x] **Schritt 4: Anwendung auf `/routing`** (2026-07-18) — ✅ ERLEDIGT. `RoutingPage.ts`
  befüllt die Legende jetzt mit 4 Einträgen: 2 Routen-Linien (Gewählte/Alternative Route, aus
  `MAP_ROUTE_STYLES`) + Start-/Zielpunkt (Dots, aus `MAP_COLORS.success`/`.danger`) — beide
  Quellen waren schon vorher die einzige Quelle für die jeweiligen Kartenlayer (`RoutingMapLayers.ts`),
  keine neue Resolver-Logik nötig (keine `match`-Expression wie bei Schritt 3). Bewusst **kein**
  Legenden-Eintrag für die Stations-Icons — die kommen pro Rettungsorganisation
  (`rd-<org>`/`nef-<org>`, `api/stations.php:78-80`), keine kleine geschlossene Aufzählung wie
  bei `/nah`s Status, ein Eintrag pro Organisation wäre unbegrenzt/unpraktisch. 174 Tests grün,
  0 TypeScript-Fehler. **Hinweis:** Browser-Verifikation auf `/routing` weiterhin ausstehend
  (keine Playwright-Umgebung hier).
- [x] **Schritt 5: Anwendung auf `/tracking`** (2026-07-18) — ✅ ERLEDIGT. `/tracking` hatte
  bisher gar keine Legende (`withLegend` fehlte, kein `MapLegend`, kein Legend-Toggle im Topbar).
  Jetzt 7 Einträge: 4 ADS-B-Höhenstufen (`MAP_COLORS.alt0/alt5k/alt15k/alt35k`, direkt aus dem
  bestehenden `interpolate`-Ausdruck in `TrackingMapLayers.ts:64-71`) + 3 AIS-Schiffstyp-Farben
  (`MAP_COLORS.danger/warning/accent`, entsprechend der 3-Bucket-Zuordnung in
  `ShipTypeMapper.getColor()`). Keine neue Resolver-Logik nötig — beide Farbsätze waren schon
  über bestehende, geteilte Konstanten direkt referenzierbar (kein `match`-Sonderfall wie bei
  Schritt 3). 174 Tests grün, 0 TypeScript-Fehler. **Hinweis:** Browser-Verifikation auf
  `/tracking` weiterhin ausstehend (keine Playwright-Umgebung hier).
- [x] **Karten-Klick + Overlay-Infos auf `/karte`** (2026-07-09) — ✅ ERLEDIGT (Scope beim
  Brainstorming korrigiert: `/nah` hatte bereits einen eigenen, funktionierenden Popup-Builder
  — der ursprüngliche TODO-Text war hier veraltet — die echte Lücke war ausschließlich `/karte`,
  wo es noch gar kein Klick-Handling für Overlay-Layer gab). Klick auf ein Feature eines aktiven
  Overlays zeigt ein generisches Popup mit dessen rohen `properties` (`GenericFeaturePopup.ts`),
  keine Kuratierung pro Layer nötig — praktikabel bei den z.T. hunderten Sub-Layern (109 allein
  bei Autobahnen). `OverlayLoader.getActiveLayerIds()` neu ergänzt. Details: CHANGELOG.md,
  2026-07-09 23:45. 145 Tests grün, 0 TypeScript-Fehler. `/nah`s bestehender Popup-Builder bewusst
  unangetastet. **Nach erstem Live-Test (Nutzer meldete: kein Popup erscheint trotz aktivem
  Overlay)** Klick-Toleranz nachgebessert — `queryRenderedFeatures` fragte nur den exakten
  Klick-Pixel ab, bei dünnen Linien-Layern (Autobahnen 1-3px, Höhenlinien 0.5-2.7px) praktisch
  nie treffbar; jetzt ±4px-Toleranz-Box (Details: CHANGELOG.md, 2026-07-09 23:53). **Nach zweitem
  Live-Test (Nutzer meldete: funktioniert bei Flächen, nicht bei RD/NEF-Pins oder Zonen-Flächen)**
  mit gezieltem Debug-Logging echte Root Cause gefunden und behoben: Race Condition in
  `OverlayLoader.add()` bei parallelen Aufrufen für dieselbe, noch nicht geladene Overlay-ID
  (ausgelöst durch Sidebar.ts' „Alle an"-Bulk-Toggle, das `onLayerToggle()` nicht awaitet — Muster
  bereits vor dieser Session vorhanden, aber erst durch die neue `getActiveLayerIds()`-Aggregation
  sichtbar geworden). Details + Regressionstest: CHANGELOG.md, 2026-07-10 00:06. 148 Tests grün,
  0 TypeScript-Fehler. **Nach drittem Live-Test** (Nutzer meldete: Gemeinden-Klick funktioniert nur
  auf Umrisslinie/Namens-Label, nicht innerhalb der Fläche) Root Cause identifiziert (Gemeinden/
  Bezirke rendern nur `line`, kein `fill`, obwohl die Vektordaten echte Polygon-Geometrie haben)
  — liegt im Style-JSON auf dem Tile-Server, nicht im Repo-Code; wird vom Nutzer direkt dort
  behoben statt mit einem Workaround hier (Details:
  [docs/external-blockers.md](./external-blockers.md)). **Hinweis:** erneute
  Browser-Verifikation nach dem Race-Condition-Fix noch ausstehend (keine Playwright-Umgebung).
- [x] **Routing-Kontextmenü: Touchsteuerung** (2026-07-12) — ✅ ERLEDIGT. Long-Press öffnet das
  Zielwahl-Kontextmenü jetzt auch auf Touch-Geräten, auf `/routing` und `/coords` (beide nutzen
  denselben `ContextMenu`-Baustein). Root Cause recherchiert: kein CI-/CSS-Bug, sondern MapLibres
  eigenes `touch-action: none` (nötig für Pan/Zoom per Touch) unterdrückt die native
  `contextmenu`-Long-Press-Erkennung — daher neue, eigene Erkennung in
  `src/lib/LongPressGesture.ts` (`attachLongPress()`, analog `HoverCursor.ts`), unabhängig vom
  nativen Event. Rechtsklick auf Desktop bleibt unverändert. Spec:
  [docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md](./superpowers/specs/2026-07-12-routing-context-menu-touch-design.md).
  166 Tests grün, 0 TypeScript-Fehler. **Bewusst nicht Teil dieses Punkts:** volle
  ARIA-APG-Tastaturnavigation fürs Menü (Pfeiltasten, Roving Tabindex) — eigener Folge-Punkt bei
  Bedarf; visuelles Hold-Feedback während des Haltens — bei Bedarf nach Live-Test nachziehen.

## Sonstiges

- [x] **DOM-Testumgebung (jsdom/happy-dom) einrichten** (2026-07-18) — ✅ ERLEDIGT. `happy-dom`
  als Dev-Dependency ergänzt, aber bewusst **nicht** global konfiguriert — nur
  `GeocoderSearchField.test.ts` aktiviert es per `// @vitest-environment happy-dom`-Kommentar,
  die restlichen 22 Testdateien bleiben auf dem schnelleren `node`-Default (kein Risiko für
  bestehende Tests, keine Vitest-Config-Änderung nötig). 11 neue Tests für
  `GeocoderSearchField` (Mindestlänge, Debounce inkl. Reset bei erneuter Eingabe,
  `suppressWhen`, Rendern/Leerergebnis, `onSelect`, Outside-Click-Dismiss vs. Klick auf
  Input/Ergebnis-Container, verworfenes Ergebnis nach `AbortSignal`, Listener-Cleanup nach
  Abort) — mit `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync()` und `vi.spyOn(GeocoderService, 'search')`.
  185 Tests grün, 0 TypeScript-Fehler.
- [ ] **`npm audit`: 3 Schwachstellen in Dev-Dependencies** (2026-07-18, beim Ergänzen von
  `happy-dom` aufgefallen — nicht dadurch verursacht, bereits vorher vorhanden) — 1× `critical`
  (`shell-quote`, über `concurrently` — Quote-Escaping unvollständig bei `object`-`op`-Werten),
  1× `critical` + 1× `high` (`vite`: `launch-editor` NTLMv2-Hash-Leak über UNC-Pfade auf Windows,
  sowie `server.fs.deny`-Bypass über alternative Pfade auf Windows). Beide nur Dev-/Build-Tooling
  (nicht im produktiven `dist/`-Output), Windows-spezifisch bzw. nur bei laufendem Dev-Server
  relevant — kein akuter Produktions-Impact, aber noch nicht geprüft, ob `npm audit fix` ohne
  Breaking Changes an `vite`/`concurrently` möglich ist.
- [ ] **10 `src/lib/`-Dateien ohne JSDoc-Kommentar** (2026-07-18, beim Erstellen von
  `docs/architecture/bausteine.md` aufgefallen) — `BasemapStore.ts`, `GeocoderService.ts`,
  `ManeuverIcons.ts`, `MapLegend.ts`, `MapRegistry.ts`, `PopupManager.ts`, `RoutingService.ts`,
  `ShipTypeMapper.ts`, `TerrainManager.ts`, `Toast.ts` zeigen im automatisch generierten
  Bausteine-Katalog `_TODO: Beschreibung ergänzen_`, da keiner ihrer Exports einen
  JSDoc-Kommentar (`/** ... */` direkt darüber) hat. Ziel: je einen kurzen JSDoc-Kommentar über
  dem jeweiligen Haupt-Export ergänzen, danach `npm run docs:bausteine` erneut laufen lassen.
- [ ] **Koordinaten-Umrechner (`/coords`, WGS84): Komma als Dezimaltrennzeichen wird verschluckt**
  (2026-07-18, aus `docs/proposals/fixes.md` übernommen) — bestätigt: `Wgs84Block.ts` parst alle
  DD-/DDM-/DMS-Eingabefelder mit rohem `parseFloat(input.value)` (`Wgs84Block.ts:169-199`, u.a.
  `lat`/`lon`/`lat-d`/`lat-m`/`lon-d`/`lon-m`/DMS-Sekunden), ohne Komma vorher durch Punkt zu
  ersetzen — `parseFloat("48,3")` liefert `48` (bricht am Komma ab), statt `48.3` oder einen
  Parse-Fehler zu liefern. Nutzer erwartet, dass auch das im Deutschen übliche Komma als
  Dezimaltrennzeichen funktioniert. Zusätzlich gemeldet: die Eingabelänge sei zu stark begrenzt
  und verursache Probleme — dafür konnte ich **kein** explizites `maxlength`-Attribut oder
  Zeichenlimit im Code finden (weder in `Wgs84Block.ts` noch in `oe5ith-ci/css/coords.css`);
  könnte an der `.coord-vals`/`.coord-input-dms`-Breite liegen (visuell abgeschnitten statt
  wirklich begrenzt) — braucht Live-Reproduktion zur Root-Cause-Bestimmung, bevor das gefixt wird.

Siehe [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) für den zuletzt abgearbeiteten Stand (2026-07-09).
Bekannte, aber außerhalb dieses Repos liegende Probleme stehen in
[docs/external-blockers.md](./external-blockers.md).
