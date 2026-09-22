# Projekt TODOs

Aufgaben im **aktuellen Scope**: Fixes, Cleanup, Erweiterungen an bereits bestehendem Code/Features.
Neue, noch nicht existierende Features/Funktionen gehören in [ROADMAP.md](./ROADMAP.md), nicht hierher.
Abgeschlossene Aufgaben wandern ins [TODO_ARCHIVE.md](./TODO_ARCHIVE.md).

## Sicherheit

- [ ] **`DB_PASS` (PostGIS, `web_api_user`) rotieren.** Stand ~4,5 Monate als hardcodierter
  Fallback-Default in `api/config.php` öffentlich auf GitHub (siehe `docs/CHANGELOG.md`
  „Unreleased" → Sicherheit, 2026-09-22). Git-History wurde per `git filter-repo` bereinigt und
  force-gepusht, das macht die bereits erfolgte Exposition aber nicht ungeschehen (GitHub hält
  verwaiste Objekte teils noch länger per SHA abrufbar). Passwort auf dem Produktions-Postgres
  ändern und `config.local.php` auf dem Server entsprechend nachziehen. `ORS_API_KEY` war vom
  selben Fund betroffen, ist aber laut `2494567` (lokale VPS-Adressen, kein Key mehr nötig)
  vermutlich bereits funktionslos — trotzdem beim ORS-Betreiber prüfen/invalidieren, falls der
  Key dort noch aktiv hinterlegt ist.

## Sonstiges

- [ ] **`/tracking`: zwei widersprüchliche, unabhängige Sichtbarkeits-Controls für ADS-B/AIS/Radiosonden.**
  Gefunden beim visuellen Test des Radiosonden-Features (2026-09-15). Der Sidebar-Segmented-Filter
  „Alle/ADS-B/AIS/Radiosonden" (`src/components/TrackingSidebar.ts:78`, Event `tracking-filter-change`
  ausgewertet in `src/features/tracking/TrackingPage.ts:189-191`) filtert **nur die Sidebar-Liste**
  (`updateTrackingList()`, `src/components/TrackingSidebar.ts:232-239`) — er hat **nie** die
  Kartenlayer beeinflusst. Die 3 separaten Topbar-Icon-Buttons (Flugzeug/Schiff/Satellit,
  `src/features/tracking/TrackingPage.ts:157-180`) steuern unabhängig davon additiv die
  Kartenlayer-Sichtbarkeit (kein exklusives Verhalten). Nutzer erwartete beim Test ein exklusives
  Alle/ADS-B/AIS/Sonden-Verhalten analog dem Sidebar-Filter, das **auch** die Karte steuert — nutzer-
  seitig bewusst vertagt ("lassen wir das einmal so"), hier nur dokumentiert, damit die
  Diskrepanz nicht verloren geht. Zwei Lösungsrichtungen wurden mit dem Nutzer besprochen, aber
  keine gewählt: (a) Sidebar-Segmented-Filter steuert Liste UND Kartenlayer exklusiv, Topbar-Buttons
  entfallen; (b) Topbar-Buttons werden zur exklusiven Gruppe (+ "Alle") umgebaut, Sidebar-Filter
  bleibt reiner Listen-Filter.
- [ ] **`MapCore.ts`s globaler `map.on('error', ...)`-Handler loggt das volle Event-Objekt.**
  Gefunden als Nebenbefund beim Debuggen des terra-draw-Event-Listener-Leaks (2026-08-30):
  `console.error(`[MapCore] Map error: ${errMsg}`, e)` übergibt das komplette MapLibre-Event
  (`e`, mit Referenzen auf Style/Map und potenziell große Tile-/GL-Caches im bubbling `target`)
  als zweites Argument. Unter Chrome-DevTools-Protocol-Beobachtung (z.B. Playwright, das
  `page.on('console')` nutzt) führte das reproduzierbar zu ~1s Verzögerung *pro* Fehler-Event
  durch die Objekt-Serialisierung für die Remote-Inspektion — bei mehreren Fehlern in Folge
  (wie beim terra-draw-Fix, 5 `removeLayer`-ErrorEvents in einem Rutsch) summierte sich das auf
  mehrere Sekunden spürbarer Verzögerung. Ob/wie stark sich das auch in echten,
  lokal-geöffneten DevTools bemerkbar macht (ohne CDP-Remote-Overhead), nicht verifiziert — dort
  ist Objekt-Formatierung typischerweise günstiger, aber nicht kostenlos. Mechanischer Fix:
  `e` aus dem `console.error`-Aufruf entfernen (nur `errMsg` loggen, wie an anderer Stelle im
  Code bereits üblich) oder gezielt nur unkritische Felder (`e.error?.message`) übergeben, statt
  des ganzen Event-Objekts. Nicht in diesem Durchgang gefixt (Fund während laufender
  Root-Cause-Analyse eines anderen Bugs, außerhalb von dessen Scope) — hier nur dokumentiert,
  damit er nicht verloren geht.
- [x] **`router.php`/`router.log` auf dem Live-Server manuell löschen** (2026-08-30) —
  ✅ ERLEDIGT. Waren bis inkl. `v3.14.1` live auf `map.oe5ith.at` deployt und über nginx'
  generischen `.php`-Catch-all öffentlich erreichbar (siehe `docs/security/owasp-top10-checklist.md`,
  A01); `deploy-website.sh` schließt beide seit Commit `c7a0f11` per `--exclude` von künftigen
  Deploys aus, das entfernt aber nichts rückwirkend. Nutzer hat den bereits deployten Stand
  aufgeräumt (Datei-Listing des Servers zeigt kein `router.php`/`router.log` mehr). Live per
  `curl` gegen `map.oe5ith.at` verifiziert: `router.php` → 404, `router.log` liefert nur den
  SPA-Fallback (`index.html`, kein Log-Inhalt, egal ob physisch noch vorhanden). Zusätzliche
  Live-Sicherheits-Stichprobe im selben Zug: `diag.php` weiterhin 403, `db.php`/`config.php`/
  `config.local.php`/`http.php`/`ors-client.php`/`valhalla-client.php` liefern leeren Body (kein
  Secret-Leak), `routing-proxy.php`-Referer-Check (403 bei fremdem Referer) und
  Method-Restriktion (`nah.php` POST → 405) funktionieren wie dokumentiert — keine neuen Funde.
- [x] **CI-Backend-Job (`PSR-12-Lint`) schlägt fehl — vorbestehend, unabhängig vom
  Node-24/`@v7`-Fix** (2026-08-30) — ✅ ERLEDIGT. Root Cause: `api/ors-client.php` und
  `api/valhalla-client.php` mischten `require_once 'config.php';` (Side Effect) mit einer
  `function ...()`-Deklaration in derselben Datei — genau das flaggt PSR1s `SideEffects`-Sniff
  (Teil von PSR12). Geprüft, ob das ein breiteres Problem ist: alle anderen `api/*.php` mit
  `require_once` sind reine Ausführungs-Skripte ohne eigene Top-Level-Funktion, nur diese beiden
  „Client"-Helper-Dateien (aus `e1f9d14`, Valhalla-Rollout) mischen beides. Das
  `require_once 'config.php';` in beiden Dateien war zudem redundant — die einzigen beiden
  Aufrufer (`routing-proxy.php`, `nearest-stations.php`) requiren `config.php` bereits selbst,
  bevor sie diese Client-Dateien requiren. Fix: die redundante Zeile in beiden Dateien gestrichen
  (macht sie zu reinen Funktions-Deklarationen, passend zu ihrem eigenen Docblock-Kommentar
  „reine Funktion, kein eigener HTTP-Endpoint"). `composer run lint` und
  `scripts/security-audit.sh` lokal grün, `npx tsc --noEmit`/`npm test` (406 grün) unberührt.
- [x] **`/graph`: verwaiste terra-draw-Event-Listener nach mehrfachem Basemap-Wechsel**
  (2026-08-30) — ✅ ERLEDIGT. Gefunden im finalen Whole-Branch-Review der `/graph`-Seite
  (2026-07-27), siehe Historie zu den beiden zuvor verworfenen Fix-Versuchen unten. Root Cause
  des ursprünglich befürchteten Crashs bestätigt (per Live-Code-Lesen von `maplibre-gl`/
  `terra-draw`/`terra-draw-maplibre-gl-adapter` in `node_modules`): `TerraDraw.stop()` →
  `adapter.unregister()` ruft ungeprüft `map.removeSource('td-point'/'-linestring'/'-polygon')`
  auf, `maplibre-gl`s `Style.removeSource()` wirft dabei synchron einen echten `Error`, wenn die
  Source fehlt (anders als `removeLayer()`, das nur ein nicht-werfendes `ErrorEvent` feuert).
  **Fix:** neue private `GraphSidebarAdapter.stopDrawSafely()` legt vor `this.draw.stop()` leere
  Dummy-Sources unter den drei `td-*`-IDs an, falls sie durch einen Basemap-Wechsel bereits
  verschwunden sind — macht `removeSource()` ungefährlich, `unregister()` entfernt die Dummies
  selbst wieder. `reapplyLayers()` ruft das jetzt vor dem Neuaufbau auf (statt `stop()` wie
  bisher ganz zu vermeiden), `destroy()` nutzt denselben Pfad. TDD: 2 Unit-Tests gegen die echte
  `terra-draw`/`terra-draw-maplibre-gl-adapter`-Library (kein Mock, nur `maplibregl.Map` gefaked)
  bestätigen kein Throw + entfernte DOM-Listener nach dem Ersetzen.
  **Zweiter, live im Browser gefundener Bug (von den Unit-Tests nicht abgedeckt):** eine Race
  zwischen `map`s `'style.load'`-Event (treibt `MapCore`s Restore → `reapplyLayers()`) und dem
  `'load'`-Event (treibt den Konstruktor-`draw.start()`, verzögert falls `isStyleLoaded()` beim
  Mount noch `false` ist) — läuft `reapplyLayers()` zuerst, ist `this.draw` noch nie gestartet
  (`enabled === false`), `TerraDraw.stop()` wird dann laut Quelle zum No-op-Guard, die eben
  angelegten Dummy-Sources bleiben liegen und kollidieren mit der direkt danach gebauten neuen
  Instanz (`Error: Source "td-polygon" already exists`). Per Playwright gegen den echten
  Dev-Server reproduziert (deterministisch bei zwei Basemap-Wechseln), Root Cause per
  In-Page-`performance.now()`-Timestamps (nicht Vermutung) belegt. Fix:
  `stopDrawSafely()` prüft jetzt zuerst `this.draw.enabled` und überspringt alles, wenn nie
  gestartet. Dritter Unit-Test (RED→GREEN gesehen gegen den fehlenden Guard) deckt genau diesen
  Fall ab. Alle 3 Fixe live gegen `/graph` verifiziert (2 Basemap-Wechsel hintereinander, danach
  weiterhin funktionsfähiges Bbox-Zeichnen, Screenshot geprüft) — kein Crash mehr, 409 Tests
  grün, 0 TypeScript-Fehler.
  **Historie der beiden vorherigen, verworfenen Versuche:** ursprünglich als „harmlos, bewusst
  nicht behoben" eingestuft (jede verworfene Instanz bleibt dauerhaft im `'render'`-Modus, dessen
  Handler No-Ops sind — das stimmt weiterhin für den reinen Listener-Leak-Aspekt, war aber kein
  Grund, den jetzt gefundenen, tatsächlich fixbaren Crash-Pfad nicht anzugehen).
  **Korrektur (2026-07-28):** der damals ursprünglich vorgeschlagene „mechanische Fix" (nacktes
  `this.draw.stop()` ohne Dummy-Sources) wäre tatsächlich falsch gewesen und hätte den oben
  beschriebenen Crash reintroduziert — das jetzige `stopDrawSafely()` ist kein Rückfall auf
  diesen verworfenen Ansatz, sondern behebt genau die damals identifizierte Lücke.
- [x] **GitHub-Actions-Deprecation-Warnung: `actions/checkout@v4`/`actions/setup-node@v4` liefen
  erzwungen auf Node 24 statt Node 20** (2026-08-30) — ✅ ERLEDIGT. Beide Actions in
  `.github/workflows/ci.yml` auf `@v7` angehoben (nicht nur das Minimum `@v5`, das laut
  Release-Notes den `node24`-Runtime-Wechsel einführt). Per echtem `gh run watch` gegenverifiziert
  (Commit `a5c54a7`, Run `33312503226`): Vergleich gegen den Vorgänger-Run (vor diesem Fix)
  bestätigt, dass die Annotation dort noch auftrat und im neuen Run komplett fehlt. Frontend-Job
  läuft grün durch. **Nebenbefund (nicht behoben, außerhalb des Scopes dieses Punkts):**
  Backend-Job schlägt weiterhin fehl — vorbestehender PSR-12-Lint-Fehler (`phpcs` behandelt 2
  Warnings in `api/valhalla-client.php`/`api/ors-client.php` als Exit-Code 1), bereits im
  Vorgänger-Run vorhanden, unabhängig von diesem Fix.
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
