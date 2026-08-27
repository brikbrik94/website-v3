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
- [ ] **`MapPage.ts`s `legendItemsRefCount` gruppiert falsch, wenn zwei Gruppen desselben
  Overlays unterschiedliche `legend_items` tragen** (2026-08-12, Fund aus finalem
  Whole-Branch-Review der `legend_scale_id`/`legend_sections`/`icon`-Runde). **Vorbestehender
  Bug** — nicht durch diese Runde eingeführt, nur generalisiert (Ref-Zählungs-Key war vorher
  ausschließlich `overlayId`, jetzt `legendGroupKey ?? overlayId`; das Problem besteht für den
  `overlayId`-Fall unverändert). `toggleLayer()` zählt aktive Gruppen pro `groupKey`
  (`legendItemsRefCount`) und rendert `event.legendItems` nur beim Übergang 0→1 aktiver Gruppen —
  das setzt voraus, dass alle Gruppen eines `groupKey` denselben `legend_items`-Satz tragen. Live
  gegen `https://tiles.oe5ith.at/layers.json` verifiziert (2026-08-12), dass das **heute bereits
  nicht zutrifft**: `openskimap` hat die Gruppen „Ski-Spots" (6 `legend_items`) und „Lifte"
  (7 `legend_items`), beide ohne `legend_scale_id` → beide bekommen `groupKey = "openskimap"`
  (`resolveLegendItemsForGroup()`, `resolveLegendSwatch.ts`). Ebenso `zonen-nef` (6 Gruppen unter
  `groupKey = "zonen-nef"`, je 7-15 `legend_items`, unterschiedlich pro Gruppe: NEF-AM 8,
  NEF-HRV 11, NEF-INN 8, NEF-RLZ 15, NEF-SKG 10, NEF-SrKi 7) und `zonen-sew` (8 Gruppen unter
  `groupKey = "zonen-sew"`, je 23-63 `legend_items`: SEW-HRV 26, SEW-INN 32, SEW-NÖ 61, SEW-RLZ 63,
  SEW-SBG 25, SEW-SKG 27, SEW-STMK 23, SEW-SrKi 23). Werden zwei solche Gruppen eines Overlays
  gleichzeitig aktiviert: (a) nur die Legenden-Zeilen der zuerst aktivierten Gruppe rendern
  (0→1-Gate lässt die zweite Aktivierung nichts mehr anzeigen), und (b) wird danach die
  zuerst aktivierte Gruppe wieder abgeschaltet während die zweite aktiv bleibt, iteriert
  `removeEntry` über `event.legendItems` des GERADE abschaltenden Toggle-Events — dessen Länge/
  Reihenfolge zu den tatsächlich gerenderten IDs (`${groupKey}:legend-item:${idx}`) nicht passt,
  was orphaned Legenden-Zeilen hinterlassen kann, die nie wieder entfernt werden. Betrifft
  `src/pages/MapPage.ts` (`legendItemsRefCount`, `toggleLayer()`, Kommentar dort korrigiert im
  finalen Fix-Round). **Bewusst nicht in diesem Fix-Round behoben** — ein echter Fix bräuchte
  einen Content-Hash- oder anderen kollisionsfreien Key statt reinem `groupKey`-Ref-Count; erst
  angehen, wenn ein konkreter Live-Fall (zwei solche Gruppen gleichzeitig aktiv) tatsächlich
  beobachtet/reproduziert wird.

## Sonstiges

- [ ] **`/graph`: verwaiste terra-draw-Event-Listener nach mehrfachem Basemap-Wechsel.**
  Gefunden im finalen Whole-Branch-Review der `/graph`-Seite (2026-07-27):
  `GraphSidebarAdapter.reapplyLayers()` (`src/features/graph/GraphSidebarAdapter.ts`) baut die
  `TerraDraw`-Instanz neu auf, wenn ein Basemap-Wechsel (`setStyle()`) deren eigene, nicht in
  `MapRegistry` verwaltete Sources/Layer gelöscht hat — nötig, da `terra-draw-maplibre-gl-adapter`
  selbst keine `style.load`-Behandlung hat. Die dabei verworfene alte Instanz wird aber nie
  `.stop()`t, wodurch ihre DOM-Event-Listener (`pointerdown`/`pointermove`/`pointerup`/
  `keydown`/`keyup`/`contextmenu` auf dem Karten-Canvas) bis zum Verlassen der Seite
  (`map.remove()`) bestehen bleiben — bei mehrfachem Basemap-Wechsel in einer Sitzung sammeln
  sich so mehrere inerte Instanzen an. Bestätigt harmlos (jede verworfene Instanz bleibt
  dauerhaft im `'render'`-Modus, dessen Handler No-Ops sind; kein Doppel-Registrieren, kein
  Crash) und durch die Seitenlebensdauer begrenzt — deshalb bewusst nicht sofort behoben.
  **Korrektur (2026-07-28):** der hier ursprünglich vorgeschlagene „mechanische Fix" (`this.draw.stop()`
  vor dem Neuaufbau) ist falsch und würde einen Crash reintroduzieren — genau das wird im Code
  bereits bewusst vermieden (`GraphSidebarAdapter.ts:122-134`, Commit `0e6aba4`, zeitlich *vor*
  diesem TODO-Eintrag entstanden): `stop()` ruft intern `adapter.unregister()` auf, das ungeprüft
  `map.removeSource('td-point'/'td-linestring'/'td-polygon')` aufruft. In `maplibre-gl`
  (`Style.removeSource()`) wirft das synchron einen echten `Error` ("There is no source with
  this ID=…"), wenn die Source nicht existiert — und genau das ist der Zustand, in dem
  `reapplyLayers()` läuft (Sources sind durch `setStyle()` bereits weg, siehe Guard
  `if (!this.map.getSource('td-polygon'))` direkt davor). Ein echter Fix bräuchte einen anderen
  Ansatz (z.B. Dummy-Sources mit den `td-*`-IDs vor `stop()` anlegen, damit `removeSource()` nicht
  ins Leere greift) — mehr Aufwand, hängt an internen, nicht offiziell dokumentierten
  terra-draw-Source-IDs. Weiterhin bewusst nicht umgesetzt, da bestätigt harmlos.
- [ ] **GitHub-Actions-Deprecation-Warnung: `actions/checkout@v4`/`actions/setup-node@v4` laufen
  erzwungen auf Node 24 statt Node 20.** Gefunden beim Prüfen des CI-Runs von Commit `7b32f56`
  (2026-08-11): beide CI-Jobs (`.github/workflows/ci.yml`) zeigen die Annotation „Node.js 20 is
  deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24".
  Betroffen: `actions/checkout@v4` (beide Jobs, `frontend` + `backend`), `actions/setup-node@v4`
  (nur `frontend`) — `shivammathur/setup-php@v2` ist nicht betroffen. Aktuell nur eine Warnung,
  kein Fehler (Runs laufen durch); falls GitHub Node 20 endgültig abschaltet, würde das den
  CI-Run brechen. Mechanischer Fix: beide Actions in `.github/workflows/ci.yml` auf `@v5`
  anheben (bzw. aktuell verfügbare Major-Version prüfen), danach `gh run watch` gegenprüfen, dass
  die Warnung verschwindet und beide Jobs weiterhin grün sind.
- [x] **`curl_request()` (`api/config.php`) ohne Timeout** (2026-07-28) — ✅ ERLEDIGT. Gefunden
  beim OWASP-Re-Audit (2026-07-25): die gemeinsame Helper-Funktion für `ors.php`/`geocoder.php`
  setzte kein `CURLOPT_TIMEOUT`/`CURLOPT_CONNECTTIMEOUT`, im Unterschied zu `adsb.php`/`ais.php`,
  die beide 5s Timeout setzen (inkonsistentes Pattern). Ein hängender Upstream (ORS/Nominatim)
  konnte einen PHP-FPM-Worker unbegrenzt blockieren. Fix: `CURLOPT_TIMEOUT, 5` ergänzt (analog
  `adsb.php`/`ais.php`), Commit `8b73bde`. Details:
  [docs/security/owasp-top10-checklist.md](./security/owasp-top10-checklist.md) Kategorie A05.
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
- [x] **`npm audit`: 3 Schwachstellen in Dev-Dependencies** (2026-07-18) — ✅ ERLEDIGT.
  `npm audit fix` (ohne `--force`, keine Major-Bumps nötig) behebt alle 3: `vite` 8.0.13→8.1.5,
  `concurrently` 9.2.1→9.2.4, `shell-quote` 1.8.3→1.9.0 (transitiv). `npm audit` zeigt danach
  0 Schwachstellen. `npx tsc --noEmit`, `npm test` (196/196) und `npm run build` nach dem Update
  erneut grün.
- [x] **10 `src/lib/`-Dateien ohne JSDoc-Kommentar** (2026-07-18) — ✅ ERLEDIGT. Je ein kurzer
  JSDoc-Kommentar über dem Haupt-Export ergänzt: `BasemapStore.ts`, `GeocoderService.ts`,
  `ManeuverIcons.ts`, `MapLegend.ts`, `MapRegistry.ts`, `PopupManager.ts`, `RoutingService.ts`,
  `ShipTypeMapper.ts`, `TerrainManager.ts`, `Toast.ts`. `npm run docs:bausteine` neu generiert —
  0 verbleibende `_TODO: Beschreibung ergänzen_`-Einträge im Katalog. 196 Tests grün, 0
  TypeScript-Fehler (reine Kommentar-Ergänzung, kein Verhalten geändert).
- [x] **Koordinaten-Umrechner (`/coords`, WGS84): Komma als Dezimaltrennzeichen wird verschluckt**
  (2026-07-18) — ✅ ERLEDIGT. Systematisches Debugging: Root Cause bestätigt (`Wgs84Block.ts`
  parste alle DD-/DDM-/DMS-Felder mit rohem `parseFloat()`, das bei einem Komma abbricht —
  `parseFloat("48,3") === 48` statt `48.3`, ohne Fehler). Fix per TDD: neuer, isoliert getesteter
  `parseDecimalInput()`-Helper (`src/features/coords/parseDecimalInput.ts`, 6 Tests, RED→GREEN
  gesehen) ersetzt alle 12 `parseFloat()`-Aufrufe in `Wgs84Block.ts`. Eingabelängen-Beschwerde:
  Root Cause gefunden (`oe5ith-ci/css/coords.css` `.coord-vals .coord-input-dms` teilt die
  Zeilenbreite gleichmäßig auf alle Felder auf — bei DMS bekommt das Sekunden-Dezimalfeld nur
  1/3, obwohl es die meisten Zeichen braucht). Nutzer-Entscheidung: Grad-/ganzzahlige
  Minuten-Felder (bekannte kleine Ziffernanzahl: Grad max. 3, Minuten max. 2) bekommen jetzt eine
  feste, schmale Breite, das Dezimalfeld den Rest. CI-Request gestellt und in `oe5ith-ci` v1.21.1
  umgesetzt (`:not([inputmode="decimal"])`-Selektor), `src/styles/coords.css` per Mirror-Sync
  übernommen, kein lokaler Override nötig. Request-Datei archiviert:
  `docs/ci/archive/coord-vals-decimal-field-width-request.md`. 202 Tests grün, 0 TypeScript-Fehler.
  **Out-of-Scope-Fund (nicht mitgefixt):** derselbe `parseFloat`-Komma-Bug existiert auch in
  `UtmBlock.ts` und `BmnBlock.ts` — siehe neuer Punkt unten.
- [x] **UTM-/BMN-Eingabefelder: derselbe Komma-Bug wie bei WGS84** (2026-07-18) — ✅ ERLEDIGT.
  `UtmBlock.ts` (`e`/`n`-Felder) und `BmnBlock.ts` (`rw`/`hw`-Felder) auf den bereits vorhandenen,
  getesteten `parseDecimalInput()`-Helper umgestellt (analog `Wgs84Block.ts`) — mechanischer Swap,
  keine neuen Tests nötig, da der Helper selbst schon 6 Tests hat. 202 Tests grün, 0
  TypeScript-Fehler.
- [x] **`package.json`s `version`-Feld hängt seit `3.3.1` fest** (2026-07-18) — ✅ ERLEDIGT.
  `package.json` auf `3.10.0` nachgezogen (war seit `3.3.0`→`3.3.1` nicht mehr mitgezogen worden,
  `src/version.ts` blieb korrekt). Nutzer-Entscheidung: ab jetzt bei jedem Release mitziehen —
  `CLAUDE.md`s Release-Checkliste (Schritt 2) und der „Versioning"-Absatz entsprechend ergänzt.

## Neue Seiten (nächste Schritte)

Von ROADMAP.md → „Neue Seiten" hierher verschoben (2026-07-18, Nutzer-Entscheidung) — beide Punkte
sind der Sache nach neue Features (kein bestehender Code wird erweitert), stehen hier trotzdem als
konkret geplante nächste Arbeitsschritte statt der übrigen, noch unverbindlichen Roadmap-Punkte.
Noch nicht brainstormed/spezifiziert — vor der Umsetzung jeweils durch den Brainstorming-Prozess
(Design/Spec) laufen lassen, siehe `docs/superpowers/specs/`. Zwei unabhängige Features, getrennt
zu bearbeiten (nicht in einem Rutsch).

- [x] **Hilfeseite** (2026-07-19) — ✅ ERLEDIGT, aber anders als ursprünglich hier notiert: statt
  einer eigenen `/hilfe`-Seite gibt es jetzt einen „?"-Button in der Topbar (neben der Legende)
  auf den 6 Kartenseiten, der ein seitenspezifisches Kurzhilfe-Modal öffnet
  (`src/content/HelpContent.ts` + Erweiterung von `GlobalModals.ts`/`Topbar.ts`). Nutzer-
  Entscheidung während des Brainstormings (2026-07-19): kontextbezogene Hilfe statt separater
  Übersichtsseite. Spec:
  [docs/superpowers/specs/2026-07-19-page-help-modal-design.md](./superpowers/specs/2026-07-19-page-help-modal-design.md).
- [x] **Isochronen-Abfrage-Seite** (2026-07-18) — ✅ ERLEDIGT. Neue Karten-Seite `/isochrones`
  (Alias `/isochronen`, redirected clientseitig per `history.replaceState`) für generische
  Erreichbarkeitsanalyse: Punkt per Kartenklick, Geocoder-Suche oder manueller Koordinaten-Eingabe
  setzen, ORS-Fahrprofil sowie Zeit- oder Distanz-Ringe wählen — die resultierenden
  Isochronen-Polygone erscheinen auf der Karte. Mehrere Abfragen lassen sich gleichzeitig stapeln
  und einzeln per Augen-Icon ein-/ausblenden (Vergleich mehrerer Standorte). Abgegrenzt von den
  bestehenden, statisch kuratierten „Anfahrtszeit-Ringen" auf `/karte`
  (`anfahrtszeit-linz`-Overlay, serverseitig vom Tile-Server vorberechnet) — diese Seite ist eine
  Live-Abfrage für beliebige Punkte, analog zu `/routing`. Dateistruktur 1:1 an
  `src/features/routing/`/`src/pages/RoutingPage.ts` gespiegelt: `src/lib/IsochronesService.ts`
  (eigenständiges Modul für den ORS-Aufruf, ruft für Health-Check/Profile-Liste aber direkt
  `RoutingService.checkHealth()`/`.getProfiles()` auf statt zu duplizieren),
  `src/features/isochrones/IsochronesDataService.ts` (reiner State-Container),
  `IsochronesMapLayers.ts`, `IsochronesSidebarAdapter.ts`, `parseRangeList.ts` (Parser für die
  Ring-Werte-Eingabe), `src/components/IsochronesSidebar.ts` (Formular + Ergebnis-Liste, Sidebar-
  Typ 4 „Tool-Panel + Ergebnis-Liste" laut `oe5ith-ci/docs/sidebar-types.md`),
  `src/pages/IsochronesPage.ts`. Kein neuer PHP-Endpoint — nutzt den bestehenden generischen
  `api/ors.php?path=isochrones/{profile}`-Proxy (derselbe Mechanismus wie bei
  `path=directions/{profile}/geojson` in `/routing`). `MapStyles.ts` um `getIsochroneRingColor()`
  ergänzt. Neue Landing-Page-Kachel (`src/main.ts`, `.card-grid`, `fa-solid fa-bullseye`). Spec:
  [docs/superpowers/specs/2026-07-18-isochrones-page-design.md](./superpowers/specs/2026-07-18-isochrones-page-design.md),
  Plan: `docs/superpowers/plans/2026-07-18-isochrones-page.md`. 243 Tests grün, 0
  TypeScript-Fehler. **Hinweis:** Browser-Verifikation weiterhin ausstehend (keine
  Playwright-Umgebung hier).

## Performance (Baseline-Audit 2026-07-28)

Priorisierte Befunde aus dem ersten `npm run perf:audit`/`npm run perf:bundle`-Lauf gegen alle 6
Kartenseiten. Details (Zahlen, Methodik-Einschränkungen des Dev-Server-Laufs, ausgeschlossene
Dev-Server-Artefakte) in [docs/performance/2026-07-28-baseline-audit.md](./performance/2026-07-28-baseline-audit.md).
Umsetzung ist bewusst nicht Teil der Audit-Runde selbst.

- [x] **Fehlende Accessible Names bei Buttons** (2026-08-11) — ✅ ERLEDIGT (Farbkontrast-Teil
  weiterhin offen, siehe eigener Punkt unten). `button-name`-Lighthouse-Audit schlug global auf
  allen 6 Kartenseiten fehl. **Root-Cause-Korrektur:** die ursprüngliche Vermutung (Topbar
  Mobile-Hamburger-Button ohne Label, `Topbar.ts:106-108`) war falsch — dieser Button wurde zwar
  vorsorglich mit `aria-label="Tools"` versehen (eigener Test:
  `src/components/Topbar.test.ts`), war aber laut Lighthouses `details.items` nie das tatsächlich
  fehlschlagende Element. Echte Ursache: die 3 Modal-Close-Buttons in `src/lib/GlobalModals.ts`
  (Changelog-/Copyright-/Hilfe-Modal, global auf jeder Seite gemountet) hatten nur ein
  Icon (`<i class="fa-xmark">`) ohne Text/`aria-label`. Fix: `aria-label="Schließen"` auf allen
  3 Buttons ergänzt (`GlobalModals.ts:19,244,294`), Test: `src/lib/GlobalModals.test.ts`. Per
  echtem `npm run perf:audit`-Re-Lauf verifiziert: `button-name` jetzt `1` auf allen 6 Seiten
  (vorher `0`), Accessibility-Score global von 0,91–0,92 auf 0,96–0,97 gestiegen. 284 Tests grün,
  0 TypeScript-Fehler.
- [ ] **Farbkontrast `.topbar-search-btn` (~2,06:1).** Weiterhin offen — Root Cause liegt in
  `oe5ith-ci`s `topbar.css` (hardcodiertes `color: #555`, gesynct nach
  `src/styles/topbar.css`), nicht in website-v3-eigenem Code. Nicht hier gefixt, siehe
  `docs/ci/bug-reports.md` (Punkt 3).
- [x] **`/coords`: Formularelemente ohne Label** (2026-08-11) — ✅ ERLEDIGT. `label`-/
  `select-name`-Audits schlugen auf `/coords` fehl (0,82 statt 0,91–0,92 Accessibility-Score).
  Alle Inputs/Selects in `src/features/coords/blocks/*.ts` (7 Dateien, `BmnBlock`/`UtmBlock`/
  `MgrsBlock`/`Wgs84Block`/`MaidenheadBlock`/`PlusCodeBlock`/`AddressBlock`) hatten bisher nur ein
  rein visuelles `<span class="coord-label">`, kein `<label>`/`aria-label`. `aria-label` ergänzt,
  Text entspricht dem sichtbaren Label (WCAG 2.5.3 „Label in Name"); `AddressBlock`s
  `placeholder`-only-Input bekam zusätzlich `aria-label="Adresse"` (Placeholder allein erfüllt die
  Accessible-Name-Anforderung nicht). Test: `src/features/coords/blocks/accessibleNames.test.ts`
  (7 Fälle, ein Test pro Block). Per echtem `npm run perf:audit`-Re-Lauf verifiziert: `label`/
  `select-name` jetzt `1` auf `/coords` (vorher `0`), Accessibility-Score dort von 0,82 auf 0,97
  gestiegen.
- [x] **Kaputte externe Assets (404) — `/nah`-Teil** (2026-08-11) — ✅ ERLEDIGT (`/tracking`-Teil
  extern, siehe `docs/external-blockers.md`). `/nah` lud die Glyph-Schrift „Open Sans
  Regular,Arial Unicode MS Regular" (`0-255.pbf`) von `tiles.oe5ith.at` mit 404 — Root Cause:
  `NahMapLayers.ts`s `nah-stations-count-label`-Symbol-Layer setzte `text-field`, aber kein
  `text-font`, wodurch MapLibre auf seinen Style-Spec-Default (Leerzeichen-Variante des Namens)
  zurückfiel, den der Tile-Server nicht hostet. Fix: `'text-font': ['Open-Sans-Regular']` ergänzt
  (Bindestrich-Variante, analog zum bereits korrekten `TrackingMapLayers.ts`). Layer-Definition
  dabei aus `initLayers()` in eine eigene, testbare `buildStationsCountLayerDef()`-Funktion +
  `NahMapLayers.getStationsCountLayerDefinition()`-Getter extrahiert (analog
  `getStationsLayerDefinition()`). Test: `src/features/nah/NahMapLayers.test.ts`. Per echtem
  `npm run perf:audit`-Re-Lauf verifiziert: `/nah`s `errors-in-console`-Audit jetzt `1` (vorher
  `0`, 0 statt 1 Konsolenfehler). `/tracking`s AIS-Sprite-404 bleibt bestehen (externes
  Tile-Server-Problem, keine Repo-Code-Ursache) — dokumentiert in `docs/external-blockers.md`.
- [x] **`maplibre-gl` lädt eager auf jeder Route, auch ohne Karte** (2026-08-12) — ✅ ERLEDIGT.
  Verifiziert per echtem Netzwerk-Trace (Playwright gegen Produktions-Build via `vite preview`):
  `/info` fetchte tatsächlich `MapCore-*.js`/`MapRegistry-*.js` (~259 KB gzip), trotz `hasMap =
  false`. **Zwei unabhängige Ursachen gefunden, beide gefixt:**
  1. `src/main.ts` importierte `MapRegistry`/`OverlayLoader` statisch statt per `import()` und
     rief sie auf jedem Routenwechsel unbedingt auf (`MapRegistry.clear()`/`OverlayLoader.reset()`).
     Fix: beide Module werden jetzt nur noch dynamisch importiert, und nur dann, wenn die
     *vorherige* Seite tatsächlich eine Kartenseite war (neues `previousPageUsedMap`-Flag,
     pro Route gesetzt) — sonst gibt es nichts aufzuräumen.
  2. **Der eigentliche Haupttreiber, in der ursprünglichen Analyse nicht erkannt:** `Topbar.ts`
     (auf jeder Seite mit `initTopbar()` eingebunden, auch `/info`) importiert `TerrainControls.ts`
     statisch. `TerrainControls.ts` importierte `TerrainManager.ts`, das wiederum `Map` aus
     `maplibre-gl` als **Wert**-Import (nie zur Laufzeit gebraucht, nur als TS-Typ verwendet) und
     `OverlayLoader` als Modul-Top-Level-Import zog — Letzteres zieht `MapCore`/`MapRegistry`/
     `maplibre-gl` nach sich. Fix in `TerrainManager.ts`: `import { Map }` → `import type { Map }`
     (laufzeitfrei); `OverlayLoader`-Import in die einzige Stelle verschoben, die ihn braucht
     (`applyTerrainInfrastructure()`, dynamischer `import()`, Funktion war bereits async/awaited).
     `Topbar.ts`/`initTopbar()` selbst musste dadurch **nicht** angefasst werden (keine
     Async-Signatur-Änderung, kein Risiko für die 8 Call-Sites).
  **Ergebnis** (Produktions-Build, `npm run build`): Haupt-Entry-Chunk 271,07 KB gzip →
  **10,94 KB gzip**; `/info` lädt laut echtem Playwright-Netzwerk-Trace (Dev- und Preview-Server)
  **null** Karten-bezogene Requests mehr. Funktionscheck bestanden: `/karte` rendert weiterhin
  einen Canvas, Terrain-Button-Klick funktioniert live (dynamischer `OverlayLoader`-Import greift
  korrekt), Client-Navigation `/karte` ↔ `/info` fehlerfrei. 284 Tests grün, 0 TypeScript-Fehler.
  Details: `docs/performance/2026-07-28-baseline-audit.md`, Befund 4.
- [ ] **`/routing` + `/isochrones`: identischer CLS von 0,063.** Beide Seiten liefern exakt
  denselben Layout-Shift-Wert — gemeinsame Ursache noch nicht abschließend lokalisiert; beide
  Seiten teilen sich zumindest den Seiten-Shell (Layout/Topbar) und strukturell ähnliche
  Koordinaten-Eingabezeilen, konkrete Komponente müsste bei Umsetzung erst identifiziert werden.
  Niedrige Priorität (unter der „poor"-Schwelle von 0,1), aber reproduzierbar. Details:
  `docs/performance/2026-07-28-baseline-audit.md`, Befund 5.
- [ ] **Wiederholungslauf gegen echten Produktiv-Build (`vite preview`) statt Dev-Server.** Der
  bisherige `npm run perf:audit`-Lauf misst gegen den unminifizierten Vite-Dev-Server (bewusste
  Design-Entscheidung, siehe Spec) — LCP/TBT-Absolutwerte und die „Minify JavaScript"/„Reduce
  unused JavaScript"-Opportunities sind dadurch Dev-Server-Artefakte, keine Produktionswerte. Für
  belastbare absolute Werte müsste `perf-audit.mjs` (oder ein neuer Lauf-Modus) gegen `vite
  preview` statt `vite` laufen — Tooling-Änderung, kein reiner Doku-Punkt. Details:
  `docs/performance/2026-07-28-baseline-audit.md`, Abschnitt „Wichtiger Hinweis zur Methodik".

Siehe [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) für den zuletzt abgearbeiteten Stand (2026-07-09).
Bekannte, aber außerhalb dieses Repos liegende Probleme stehen in
[docs/external-blockers.md](./external-blockers.md).
