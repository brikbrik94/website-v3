# Projekt TODOs

Aufgaben im **aktuellen Scope**: Fixes, Cleanup, Erweiterungen an bereits bestehendem Code/Features.
Neue, noch nicht existierende Features/Funktionen gehören in [ROADMAP.md](./ROADMAP.md), nicht hierher.
Abgeschlossene Aufgaben wandern ins [TODO_ARCHIVE.md](./TODO_ARCHIVE.md).

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
- [ ] **Farbkontrast `.topbar-search-btn` (~2,06:1).** 🟡 In Arbeit — als GitHub-Issue gemeldet
  (2026-08-30): [oe5ith-ci#6](https://github.com/brikbrik94/oe5ith-ci/issues/6). Root Cause liegt
  in `oe5ith-ci`s `topbar.css` (hardcodiertes `color: #555`, gesynct nach
  `src/styles/topbar.css`), nicht in website-v3-eigenem Code — Fix wartet auf externe Umsetzung
  im Submodul. Details: `docs/ci/bug-reports.md` (Punkt 3).
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

Siehe [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) für den zuletzt abgearbeiteten Stand (2026-07-09).
Bekannte, aber außerhalb dieses Repos liegende Probleme stehen in
[docs/external-blockers.md](./external-blockers.md).
