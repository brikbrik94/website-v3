# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unreleased] - 2026-08-12 12:07

### Hinzugefügt
- **`geodata-updater` als Git-Submodul eingebunden** — die Pipeline, die die Geodata-Plugin-Repos
  orchestriert und deren `dist/layer-list.json` zur unter `tiles.oe5ith.at` ausgelieferten
  `layers.json` aggregiert. Rein zum Nachvollziehen der Pipeline, nicht zur Ausführung von hier.
  `CLAUDE.md`/`docs/geodata/` entsprechend erweitert (deckt jetzt beide Geodata-Repos ab, mit
  Hinweis pro Fund, welches Repo betroffen ist).

### Sicherheit
- **Widerspruch zwischen `geodata-updater`-Code und Live-Verhalten gefunden** (nicht in diesem
  Repo behebbar): `scripts/inventory/layers.py` verwirft laut Git-Historie beim Aggregieren
  `type`/`color`/`opacity`/`legend_items` (und die neuen v1.1.0-Felder) — die live ausgelieferte
  `layers.json` hat diese Felder aber. Falls der committete Code tatsächlich produktiv läuft,
  würde ein künftiges Redeploy die aktuell funktionierende Legenden-Darstellung brechen. Details:
  `docs/geodata/bug-reports.md`, Punkt 1 — bewusst noch nicht als GitHub-Issue gemeldet, da die
  Diskrepanz erst geklärt werden muss.

## [Unreleased] - 2026-08-12 11:42

### Geändert
- **`geodata-plugin-standard` Submodul auf v1.1.0 aktualisiert.** Deckt alle 6 Punkte aus
  [geodata-plugin-standard#1](https://github.com/brikbrik94/geodata-plugin-standard/issues/1) ab
  (`width`, `dasharray`, `outline_color`/`outline_width`, `type: "icon"`+`icon`,
  `legend_scale_id`, `legend_sections`-Block) — Issue geschlossen. Live-`tiles.oe5ith.at/layers.json`
  liefert dieses Schema noch nicht (kein `version`-Feld, kein `legend_sections`); website-v3-seitige
  Konsumierung bleibt daher zurückgestellt, siehe `docs/geodata/open-items.md`.

## [Unreleased] - 2026-08-12 08:33

### Hinzugefügt
- **Legenden-Swatches zeigen jetzt echte Opacity statt immer volldeckend.** `opacity`-Feld aus
  `layers.json` fließt durch `Sidebar.ts`/`MapLegend.ts` bis in ein Inline-Style, das
  `oe5ith-ci`s bisher statisch fixe `opacity: 0.8` auf `.map-legend-area` überschreibt.

### Geändert
- **Legenden-Zeilen für einfarbige Overlay-Templates ohne `legend_items` werden dedupliziert.**
  Autobahnen, Gemeinden, Leitstellen-Bereiche u.a. erzeugten bisher eine Legenden-Zeile pro
  einzeln getoggelter Instanz (z.B. „A1"/„A10"/„A11" statt „Autobahnen"). Neues
  `computeSwatchDedupKey()` (`overlayId`+`template`+`color`+`type`) fasst identische Instanzen zu
  einer Zeile zusammen, ohne unterschiedliche Overlays mit zufällig gleicher Farbe (Gemeinden vs.
  Bezirke) oder unterschiedliche Farben innerhalb eines Overlays (Leitstellen-Zonen)
  fälschlicherweise zu vermischen. Live per Playwright verifiziert. 7 neue Tests, 291 Tests grün,
  0 TypeScript-Fehler. Details: `docs/ROADMAP.md` → „Karten-Legende: weitere Optimierung".

## [Unreleased] - 2026-08-12 08:22

### Geändert
- **Änderungsanfragen an externe Submodule (`oe5ith-ci`, `geodata-plugin-standard`) laufen jetzt
  primär über GitHub Issues** statt nur lokale Markdown-Dateien — geräteunabhängig lösbar. Lokale
  `docs/ci/`/`docs/geodata/`-Dateien werden zu schlanken Tracking-Einträgen (Issue-Link +
  Checkliste), keine Volltext-Duplikate mehr. `CLAUDE.md` entsprechend aktualisiert. Erste Anfrage
  nach diesem Muster: [geodata-plugin-standard#1](https://github.com/brikbrik94/geodata-plugin-standard/issues/1)
  (Legend-Rendering-Erweiterungen: Linienbreite, Strichmuster, Umrandung/Casing, Icon-Auflösung,
  geteilte Farbskalen) — Ergebnis der Prüfung, ob die live ausgelieferte `layers.json` dem
  `geodata-plugin-standard`-Schema entspricht (ja, strukturell nahezu identisch).

## [Unreleased] - 2026-08-12 07:45

### Hinzugefügt
- **`geodata-plugin-standard` als Git-Submodul eingebunden.** Dokumentiert den Architektur-/
  Layer-Metadaten-Standard der `geodata-updater`-Ökosystem-Repos, die die von diesem Repo
  konsumierten Tile-Server-Daten (`tiles.oe5ith.at`) erzeugen — analog `oe5ith-ci`/
  `oe5ith-coding-rules`, extern gepflegt, nicht hier geändert. Neue `docs/geodata/`-Konvention
  (`bug-reports.md`, `open-items.md`, `archive/`) für gezielte Änderungsanfragen, analog
  `docs/ci/`. `CLAUDE.md` entsprechend ergänzt.

## [Unreleased] - 2026-08-12 07:25

### Geändert
- **`maplibre-gl` lädt nicht mehr eager auf kartenlosen Seiten (`/info`).** Zwei unabhängige
  Ursachen behoben: `src/main.ts` importierte `MapRegistry`/`OverlayLoader` statisch und rief sie
  auf jedem Routenwechsel unbedingt auf — jetzt dynamischer Import, nur wenn die vorherige Seite
  eine Kartenseite war. Haupttreiber war aber `TerrainManager.ts` (via `Topbar.ts` →
  `TerrainControls.ts` auf jeder Seite eingebunden): ein ungenutzter Wert-Import von `Map` aus
  `maplibre-gl` (jetzt `import type`) sowie ein Modul-Top-Level-Import von `OverlayLoader` (jetzt
  dynamischer Import nur innerhalb der einen Funktion, die ihn braucht). Haupt-Entry-Chunk:
  271,07 KB gzip → 10,94 KB gzip. Per echtem Playwright-Netzwerk-Trace verifiziert: `/info` lädt
  jetzt null Karten-bezogene Requests. Details: `docs/TODO.md`.

## [3.13.1] - 2026-08-11

### Hinzugefügt
- **Lokales Performance-Audit-Tooling.** `npm run perf:audit` (Lighthouse gegen alle 6
  Kartenseiten, startet Vite+PHP-Dev-Server selbst) und `npm run perf:bundle`
  (Bundle-Größen-Analyse via `rollup-plugin-visualizer`, hinter `ANALYZE=1` gated, kein Einfluss
  auf `npm run build`). Erster Baseline-Report:
  [docs/performance/2026-07-28-baseline-audit.md](./performance/2026-07-28-baseline-audit.md),
  Folge-Punkte in TODO.md. Spec:
  [docs/superpowers/specs/2026-07-28-perf-audit-tooling-design.md](./superpowers/specs/2026-07-28-perf-audit-tooling-design.md).

### Geändert
- **`/graph`-Seite: gezeichnete Bbox transparenter.** `fill-opacity` der per `terra-draw`
  gezeichneten/angezeigten Bbox von `0.3` (Library-Default) auf `0.15` reduziert
  (`src/features/graph/GraphSidebarAdapter.ts`, sowohl Render- als auch Rectangle-Mode).
- **`AGENT_INSTRUCTIONS.md` als Git-Submodul ausgelagert.** Die bisher lokal gepflegte Datei
  lebt jetzt im eigenständigen Repo [`oe5ith-coding-rules`](https://github.com/brikbrik94/oe5ith-coding-rules)
  (analog `oe5ith-ci`) und wird hier als Submodul unter `oe5ith-coding-rules/` konsumiert,
  gepinnt auf `v1.0.0`. Inhalt unverändert. `CLAUDE.md`/`README.md`-Verweise auf den neuen Pfad
  umgebogen. Hintergrund: `AGENT_INSTRUCTIONS.md` war unabhängig in vier Repos
  (website-v3, vdl-tracker-ui, tracking-gateway, geodata-osmdb) auseinandergedriftet — ein
  zentrales, versioniertes Repo löst das für künftige Änderungen. Migration der übrigen drei
  Repos ist ein separater, späterer Schritt (siehe `oe5ith-coding-rules`s README,
  Migrations-Status-Tabelle).

### Behoben
- **Erste 3 priorisierte Befunde aus dem Performance-Baseline-Audit umgesetzt.** (1)
  `button-name`-Audit schlug global auf allen 6 Kartenseiten fehl — Root Cause waren 3
  Modal-Close-Buttons ohne `aria-label` (`src/lib/GlobalModals.ts`, Changelog-/Copyright-/
  Hilfe-Modal), nicht der ursprünglich vermutete Topbar-Mobile-Toggle (der vorsorglich trotzdem
  ein `aria-label` bekam). (2) `/coords`: alle Eingabefelder/Selects in
  `src/features/coords/blocks/*.ts` (7 Dateien) hatten nur ein rein visuelles Label, kein
  `aria-label` — ergänzt. (3) `/nah`: fehlendes `text-font` im Stations-Count-Label-Layer
  (`src/features/nah/NahMapLayers.ts`) ließ MapLibre auf einen beim Tile-Server nicht gehosteten
  Font-Namen zurückfallen (404) — ergänzt, Layer-Definition dabei in eine eigene testbare
  Funktion extrahiert. Accessibility-Scores gestiegen: `/coords` 0,82→0,97, übrige Seiten
  0,91–0,92→0,96–0,97 (per `npm run perf:audit`-Re-Lauf verifiziert). Details:
  [docs/performance/2026-07-28-baseline-audit.md](./performance/2026-07-28-baseline-audit.md),
  TODO.md „Performance"-Sektion. Zwei Funde bewusst nicht hier gefixt (dokumentiert statt
  behoben): Farbkontrast `.topbar-search-btn` (Ursache in `oe5ith-ci`, siehe
  `docs/ci/bug-reports.md` Punkt 3) und AIS-Sprite-404 auf `/tracking` (Tile-Server, siehe
  `docs/external-blockers.md`).

### Sicherheit
- **`curl_request()` (`api/config.php`) hat jetzt einen Timeout.** `CURLOPT_TIMEOUT` auf 5s gesetzt
  (analog `adsb.php`/`ais.php`), behebt die beim OWASP-Re-Audit (2026-07-25) gefundene
  Inkonsistenz — ein hängender Upstream (ORS/Nominatim) konnte zuvor einen PHP-FPM-Worker
  unbegrenzt blockieren.

## [3.13.0] - 2026-07-27

### Hinzugefügt
- **Neue, versteckte Seite `/graph` ("Routing-Graph").** Visualisiert den internen
  ORS-Routing-Graphen (Nodes/Edges) für eine per Karte gesetzte Bbox — frei gezeichnet
  (Klick-Zieh-Interaktion via `terra-draw`) oder aktueller Kartenausschnitt — mit Profil-,
  Format- (JSON/TopoJSON) und Geometrie-Auswahl (Luftlinie vs. echter Straßenverlauf, nur bei
  TopoJSON wirksam). Hartes Flächenlimit von 25 km² verhindert die vom ORS-`/export`-Endpoint
  bekannten 504-Timeouts bei zu großen Bboxes. Nur über Direkt-URL erreichbar (kein
  Nav-Link/Homepage-Card, analog `/info`). `api/ors.php`-Allowlist um `export/{profil}` bzw.
  `export/{profil}/topojson` erweitert. Spec:
  [docs/superpowers/specs/2026-07-27-ors-graph-export-design.md](./superpowers/specs/2026-07-27-ors-graph-export-design.md),
  Plan: `docs/superpowers/plans/2026-07-27-ors-graph-export.md`. 273 Tests grün, 0
  TypeScript-Fehler, manuell im Browser end-to-end verifiziert (Zeichnen, Viewport-Button,
  beide Formate, Geometrie-Toggle, Größenlimit, Basemap-Wechsel, Popup, Seitenwechsel).

### Sicherheit
- **OWASP-Top-10-Re-Audit der ausgelieferten Seite.** Aktualisiert
  [docs/security/owasp-top10-checklist.md](./security/owasp-top10-checklist.md) (initial
  2026-07-08). Bestätigt: HTTP-Security-Header (inkl. CSP) korrekt ausgeliefert, `npm audit` und
  `composer audit` 0 Funde, keine Secrets im Client-Bundle, `diag.php`-Block weiterhin wirksam
  (403), SSRF-/Injection-Bewertung nach dem Isochronen-Feature unverändert gültig. Zwei neue,
  offene Funde dokumentiert (siehe TODO.md): `api/db.php` exponiert PostgreSQL-Versionsstring +
  Uptime ohne Zugriffsschutz (kein reiner nginx-Block möglich, da vom Info-Portal aktiv genutzt);
  `curl_request()` (`api/config.php`) ohne Timeout, inkonsistent zu `adsb.php`/`ais.php`. Nebenbei
  einen eigenen Fehler korrigiert: ein TODO.md-Eintrag der letzten Session behauptete fälschlich,
  `map.oe5ith.at` hätte keinen CSP-Header — Live-Check zeigt, der Header existiert bereits seit
  Commit `2a70c7a` und war korrekt auf die App zugeschnitten; Eintrag entfernt statt weitergeführt.
- **API-Hardening (Folgearbeit aus dem obigen OWASP-Re-Audit).** `api/db.php` exponierte live den
  vollen PostgreSQL-Versionsstring + Uptime ohne Zugriffsschutz — liefert jetzt nur noch einen
  reinen Status-Code (200/500) ohne Body. Die `DebugModule.ts`-Seite (`/info/debug`, freies
  API-Request-Playground) wurde komplett entfernt. `stations.php`/`region_stations.php` wurden in
  `nearest-stations.php`/`stations-by-region.php` umbenannt (die alten Namen waren nicht
  unterscheidbar), `test.php` (Duplikat von `ping.php`) entfernt. Neun read-only API-Endpoints
  akzeptieren jetzt nur noch `GET` (405 sonst). `ors.php` validiert den `path`-Parameter gegen
  eine Allowlist bekannter ORS-Routen (verhindert Missbrauch des serverseitigen ORS-API-Keys für
  beliebige Pfade), `nearest-stations.php` validiert das `profile`-Format, `geocoder.php`
  validiert `lat`/`lon` als numerisch (Adress-Freitextsuche bleibt unverändert offen).
- **API-Dokumentation konsolidiert.** `docs/API_ENDPOINTS.md` (unvollständig, teils veraltet)
  gelöscht — `docs/openapi.yaml` (vollständig, maschinell validiert) ist jetzt die alleinige
  Quelle für alle `api/*.php`-Endpoints.

## [3.12.0] - 2026-07-25

### Hinzugefügt
- **Seiten-Hilfe:** Neuer „?"-Button in der Topbar (neben der Legende) auf den 6 Kartenseiten
  (`/karte`, `/routing`, `/nah`, `/coords`, `/tracking`, `/isochrones`). Öffnet ein Modal mit
  kurzer, seitenspezifischer Bedienhilfe (`src/content/HelpContent.ts`, generisches Modal in
  `GlobalModals.ts` analog zu Changelog/Copyright). Ersetzt die ursprünglich in `TODO.md`
  geplante eigene `/hilfe`-Seite durch einen kontextbezogenen Ansatz. Spec:
  [docs/superpowers/specs/2026-07-19-page-help-modal-design.md](./superpowers/specs/2026-07-19-page-help-modal-design.md).
- **Seiten-Hilfe: Work-in-Progress-Hinweis.** Die Hilfetexte (`src/content/HelpContent.ts`) sind
  automatisch generierte Erstentwürfe und noch nicht redaktionell überarbeitet. Bis dahin zeigt
  jedes Hilfe-Modal (`GlobalModals.ts`, `open-help`-Handler) einen Hinweis-Badge
  (`.badge-yellow.badge-wrap`, dasselbe CI-Pattern wie bei Routing-Warnhinweisen) über den
  Inhalten. Vor der inhaltlichen Überarbeitung der Texte wieder entfernen.

### Geändert
- **Dependency-Updates (`npm outdated`-Audit):** risikolose In-Range-Updates (`@fontsource/jetbrains-mono`,
  `@fortawesome/fontawesome-free`, `happy-dom`, `mgrs`, `proj4`, `vite`, `vitest`) via `npm update`.
  Zusätzlich zwei Major-Upgrades: `concurrently` 9→10 (Node ≥22 vorausgesetzt, hier bereits erfüllt;
  `--kill-others`-Flag unverändert nutzbar) und `maplibre-gl` 5→6 (kein Default-Export mehr — alle 20
  betroffenen Importe in `src/lib/` und `src/features/*/` von `import maplibregl from` auf
  `import * as maplibregl from` umgestellt). `typescript` 6→7 bewusst zurückgestellt (Release ist
  erst wenige Tage alt, kein öffentliches Compiler-API vor 7.1).
- **maplibre-gl 6: Worker-Ladepfad für Vite explizit konfiguriert.** v6 leitet die Worker-URL relativ
  zu `import.meta.url` der eigenen Bundle-Datei her, statt sie wie v5 per `Blob`/`createObjectURL`
  selbstständig zu inlinen. Vite erkennt diese dynamisch berechnete `new URL()`-Referenz nicht statisch
  und emittiert die Worker-Datei nicht — Ergebnis: leere Karte ohne sichtbaren Fehler in der
  Haupt-Konsole (Worker startet, importiert aber sein eigenes `maplibre-gl-shared.mjs`-Sibling-Chunk
  nicht und terminiert sofort wieder). Fix in `src/lib/MapCore.ts`: Worker-Datei über einen statischen
  `?worker&url`-Import auflösen (nicht `?url` — das kopiert nur die Rohdatei ohne ihre Abhängigkeit)
  und `maplibregl.setWorkerUrl()` vor jeder Map-Instanz aufrufen. Verifiziert mit `vite preview`
  (echter Produktions-Build) auf `/karte`, `/nah`, `/routing`, `/tracking`.

## [3.11.1] - 2026-07-19

### Behoben
- **Isochronen (`/isochrones`): Ring-Farben schlecht sichtbar/unterscheidbar.** `getIsochroneRingColor()`
  (`src/lib/MapStyles.ts`) mischte bisher `--accent` Richtung Weiß (max. 75%) — auf hellen
  Basemaps kaum Kontrast zwischen den Ringen. Nutzt jetzt die neue, dafür vorgesehene
  CI-Erreichbarkeits-Skala `--scale-reach-1..10` (10-stufig Rot→Grün, oe5ith-ci v1.22.0,
  Submodul aktualisiert von v1.21.1): innerster/schnellster Ring = Stufe 10 (Grün), äußerster
  Ring = Stufe 1 (Rot). Tests entsprechend angepasst (`MapStyles.test.ts`), 245 Tests grün, 0
  TypeScript-Fehler.
- **Isochronen (`/isochrones`): Sichtbar- und Löschen-Button in der Ergebnisliste lagen exakt
  übereinander.** Beide teilten sich über die gemeinsame `.result-action`-Basisklasse dieselbe
  absolute Position (`bottom:7px; right:8px`) — diese Klasse ist für genau 1 Action pro Item
  ausgelegt (siehe `RoutingSidebar`), die Isochronen-Ergebnisliste hat aber 2. Neue
  `.delete-iso-btn`-Regel (`src/styles/page.css`) versetzt den Löschen-Button auf `right:34px`
  und färbt seinen Hover-Zustand in `--danger` statt `--accent`.

## [3.11.0] - 2026-07-19

### Hinzugefügt
- Neue Karten-Seite `/isochrones` (Alias `/isochronen`) für Erreichbarkeitsanalyse: Punkt per
  Kartenklick/Geocoder/Koordinaten setzen, ORS-Fahrprofil + Zeit- oder Distanz-Ringe wählen,
  Isochronen-Polygone erscheinen auf der Karte. Mehrere Abfragen können gestapelt und einzeln
  per Augen-Icon ein-/ausgeblendet werden (Sidebar-Typ 4). Kein neuer PHP-Endpoint — nutzt den
  bestehenden generischen `api/ors.php`-Proxy. Spec:
  [docs/superpowers/specs/2026-07-18-isochrones-page-design.md](./superpowers/specs/2026-07-18-isochrones-page-design.md).

### Behoben
- **Isochronen (`/isochrones`): Kartenklick zeigte keinen Pin.** `setIsochronesPoint()` aktualisierte
  bisher nur das Sidebar-Eingabefeld, nie die Karte — der Pin erschien erst nach erfolgreicher
  Berechnung (`updatePointsLayer`, pro Query). Neuer, gedämpft eingefärbter Pending-Point-Pin
  (`IsochronesMapLayers.updatePendingPoint()`, eigene Source/Layer, analog
  `RoutingMapLayers.updateStartPin`) zeigt den gesetzten Punkt sofort bei Kartenklick, wird nach
  erfolgreicher Berechnung wieder entfernt (der bestätigte Query-Pin übernimmt). 2 neue Tests,
  245 Tests grün, 0 TypeScript-Fehler.
- **Externer Blocker behoben: ORS-Isochronen-Anfragen mit mehreren Ring-Werten.** Die self-hosted
  ORS-Instanz (`ors.oe5ith.at`) war server-seitig auf `maximum_intervals: 1` limitiert — jede
  Anfrage mit mehr als einem Ring-Wert (z.B. Standard-Vorbelegung „5 10 15") schlug mit `HTTP 400`
  fehl. Kein Repo-Code-Bug (`IsochronesService.calculateIsochrones()` unterstützte beliebig viele
  Ringe pro Query bereits vollständig); die ORS-Server-Config wurde extern aktualisiert und am
  2026-07-19 per direktem Proxy-Test gegen `api/ors.php` gegengetestet (3 Ringe → `HTTP 200`,
  gültiges GeoJSON). Details/Historie: [docs/external-blockers.md](./external-blockers.md).

## [3.10.1] - 2026-07-18

### Hinzugefügt
- **JSDoc-Kommentare für 10 `src/lib/`-Dateien ergänzt** (TODO.md → Sonstiges) — `BasemapStore.ts`,
  `GeocoderService.ts`, `ManeuverIcons.ts`, `MapLegend.ts`, `MapRegistry.ts`, `PopupManager.ts`,
  `RoutingService.ts`, `ShipTypeMapper.ts`, `TerrainManager.ts`, `Toast.ts` — vom automatisch
  generierten Bausteine-Katalog (`docs/architecture/bausteine.md`) als fehlend aufgedeckt.
  `npm run docs:bausteine` zeigt jetzt 0 verbleibende Lücken.

### Behoben
- **`package.json`s `version`-Feld war seit `3.3.1` nicht mehr mitgezogen worden** (TODO.md →
  Sonstiges) — auf `3.10.0` nachgezogen, `src/version.ts` blieb die ganze Zeit korrekt. Ab jetzt
  wird `package.json` bei jedem Release mit gebumpt (`CLAUDE.md`-Release-Checkliste ergänzt).
- **Koordinaten-Umrechner (`/coords`, WGS84): Komma als Dezimaltrennzeichen wurde verschluckt**
  (TODO.md → Sonstiges) — `Wgs84Block.ts` parste alle DD-/DDM-/DMS-Eingabefelder mit rohem
  `parseFloat()`, das bei einem Komma abbricht (`parseFloat("48,3") === 48` statt `48.3`, ohne
  Fehler). Neuer, isoliert getesteter `parseDecimalInput()`-Helper
  (`src/features/coords/parseDecimalInput.ts`) ersetzt alle 12 `parseFloat()`-Aufrufe.
  Zusätzlich: Grad-/ganzzahlige Minuten-Felder bekommen jetzt eine feste, schmale Breite statt
  sich die Zeile gleichmäßig mit dem Dezimalfeld (Minuten bei DDM, Sekunden bei DMS) zu teilen —
  das Dezimalfeld hat dadurch mehr Platz. 6 neue Tests, 202 Tests grün, 0 TypeScript-Fehler.
- **UTM-/BMN-Eingabefelder: derselbe Komma-Bug wie bei WGS84** (TODO.md → Sonstiges) —
  `UtmBlock.ts`/`BmnBlock.ts` auf den bereits vorhandenen `parseDecimalInput()`-Helper
  umgestellt, analog zum WGS84-Fix.

### Sicherheit
- **3 `npm audit`-Schwachstellen in Dev-Dependencies behoben** (TODO.md → Sonstiges) — `npm audit
  fix` (ohne `--force`) aktualisiert `vite` (8.0.13→8.1.5), `concurrently` (9.2.1→9.2.4) und
  transitiv `shell-quote` (1.8.3→1.9.0). Betraf nur Dev-/Build-Tooling (nicht den produktiven
  `dist/`-Output), 1× `high` + 2× `critical`. `npm audit` zeigt danach 0 Schwachstellen;
  `tsc`/`test`/`build` erneut grün.

## [3.10.0] - 2026-07-18

### Hinzugefügt
- **Legenden-Rollout abgeschlossen (`/nah`, `/routing`, `/tracking`, TODO.md → Map-Subsystem:
  Anschlussfeatures, Schritte 3-5)** — alle 4 Kartenseiten (`/karte`, `/nah`, `/routing`,
  `/tracking`) zeigen jetzt eine befüllte Legende:
  - `/nah`: die 3 hardcodierten Status-Legendeneinträge lesen die Farbe jetzt aus der echten
    Stations-Layer-Definition (neue `resolveLegendSwatchBranches()` in
    `src/lib/resolveLegendSwatch.ts`, extrahiert alle Branches einer `match`-Expression statt
    nur den Fallback-Arm; neu exportierte `NahMapLayers.getStationsLayerDefinition()`) statt
    separat gepflegter `MAP_COLORS`-Konstanten. Status-Einträge zeigen jetzt ein
    Helikopter-Icon statt eines Farbpunkts, passend zum tatsächlichen Kartensymbol (neuer
    `icon`-Eintragstyp in `MapLegend`/`LegendEntry`).
  - `/routing`: `RoutingPage.ts` zeigt jetzt 4 Legendeneinträge (Gewählte/Alternative Route,
    Start-/Zielpunkt), vorher wurde die Legende instanziiert, aber nie befüllt. Bewusst kein
    Eintrag für die Stations-Icons (ein Icon pro Rettungsorganisation, keine kleine
    geschlossene Aufzählung).
  - `/tracking` hatte bisher gar keine Legende. Jetzt 7 Einträge: 4 ADS-B-Höhenstufen (Boden/
    5.000/15.000/35.000+ ft, `MAP_COLORS.alt0-35k`) + 3 AIS-Schiffstyp-Farben (Tanker/Gefahrgut,
    Passagierschiff, Sonstige — entsprechend `ShipTypeMapper.getColor()`s 3-Bucket-Zuordnung).
- **URL-Parameter für Routing-Deep-Links (ROADMAP.md → Routing: Anschlussfeatures)** —
  `/routing?mode=ab|sew|nef&target=<lat>,<lon>&start=<lat>,<lon>&profile=<profilId>` füllt die
  Sidebar vor (neue `parseRoutingDeepLink()` in `src/features/routing/RoutingDeepLink.ts`,
  `RoutingSidebarAdapter.applyDeepLink()`). Bei `mode=ab` nur Vorausfüllen, bei `mode=sew`/`nef`
  automatische Berechnung (reiner Lesezugriff).
- **Routing-Kontextmenü: Touchsteuerung** (TODO.md → Map-Subsystem: Anschlussfeatures) — Long-Press
  öffnet das Zielwahl-Kontextmenü jetzt auch auf Touch-Geräten (`/routing`, `/coords`), nicht mehr
  nur per Rechtsklick. Neuer Baustein `src/lib/LongPressGesture.ts` erkennt die Geste unabhängig
  vom nativen `contextmenu`-Event (das auf Touch wegen MapLibres `touch-action: none` nicht
  zuverlässig feuert). Spec:
  [docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md](./superpowers/specs/2026-07-12-routing-context-menu-touch-design.md).
- **DOM-Testumgebung für `GeocoderSearchField` (TODO.md → Sonstiges)** — `happy-dom` als
  Dev-Dependency ergänzt, nur per `// @vitest-environment happy-dom`-Kommentar in
  `GeocoderSearchField.test.ts` aktiviert (nicht global). 11 neue Tests (Debounce,
  `suppressWhen`, Rendern/Leerergebnis, `onSelect`, Outside-Click-Dismiss, `AbortSignal`).
- **Bausteine-Katalog für `src/lib/` (ROADMAP.md → Repo-Pflege & Dokumentation)** —
  `docs/architecture/bausteine.md`, automatisiert generiert (`npm run docs:bausteine`,
  `scripts/generate-bausteine-catalog.mjs`) aus Exports + JSDoc-Kommentaren der 25 Dateien in
  `src/lib/`. `CLAUDE.md` verweist bei „Map infrastructure" darauf. Nebenbei aufgedeckt: 10 der
  25 Dateien haben keinen JSDoc-Kommentar über ihrem Haupt-Export — als neuer TODO.md-Punkt
  erfasst, nicht in diesem Rahmen nachgezogen.
- **`npm run dev:reset` (ROADMAP.md → Repo-Pflege & Dokumentation)** — neues
  `scripts/dev-reset.sh` beendet gezielt hängen gebliebene Dev-Server-Prozesse (Vite Port 8000,
  PHP-API Port 8081) und leert den Vite-Dependency-Optimize-Cache. Root Cause: `concurrently
  --kill-others` (package.json `dev`) greift nicht mehr, wenn der `concurrently`-Elternprozess
  selbst schon weg ist (z.B. beendete Session ohne sauberen Stop der Kindprozesse) — führte zu
  „504 Outdated Optimize Dep"-Fehlern im Browser bei weiterlaufendem Vite trotz abgestürztem
  PHP-Server. Bewusst kein automatischer `predev`-Hook, nur auf Abruf. In `CLAUDE.md` bei den
  Commands dokumentiert.
- **CI-Pipeline via GitHub Actions (ROADMAP.md → Repo-Pflege & Dokumentation)** —
  `.github/workflows/ci.yml`, 2 parallele Jobs (`frontend`: `tsc`/`vitest`/OpenAPI-Validierung,
  `backend`: PSR-12-Lint/Security-Audit), Trigger bei Push auf `master` + allen Pull Requests.
  Kein Secrets-/DB-Handling nötig — alle Checks sind statisch oder laufen mit gemockten Daten.

### Geändert
- **Legenden-Granularität: kuratierte `layers.json`-Metadata konsumiert** (TODO.md → Map-Subsystem:
  Anschlussfeatures) — `/karte` nutzt jetzt die neuen `type`/`color`/`legend_items`-Felder aus
  `https://tiles.oe5ith.at/layers.json` direkt für die Legenden-Swatches
  (`resolveSwatchFromLayersMetaColor()` in `src/lib/resolveLegendSwatch.ts`), statt bei jedem
  Toggle das volle `style.json` nachzuladen. Gruppen mit kuratierten `legend_items` (aktuell nur
  die 6 Anfahrtszeit-Ringe) zeigen ihre Farbskala genau einmal pro Overlay, unabhängig davon, wie
  viele der zugehörigen Gruppen gleichzeitig aktiv sind (Referenzzählung in
  `MapPageController.toggleLayer()`, `src/pages/MapPage.ts`). Spec:
  [docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md](./superpowers/specs/2026-07-12-map-legend-granularity-design.md).
- **`oe5ith-ci`-Submodul auf v1.21.0 aktualisiert** — enthält 4 aus website-v3 gemeldete Punkte:
  neuer `MapLegend`-Eintragstyp `icon` (`.map-legend-icon`), neues Badge-Modifier `.badge-wrap`
  (behebt den `white-space: nowrap`-Umbruch-Bug), sowie `--map-bg`-Token sowie
  `.coord-row-wgs`/`.coord-vals` (beide bereits lokal vorhanden, jetzt auch im Design-System).
  `src/styles/badges.css`/`modal.css`/`utils.css` entsprechend nachgezogen; redundanter lokaler
  `background: var(--map-bg)`-Override in `src/app.css`s `.full-map` entfernt (kommt jetzt aus
  dem gesyncten `utils.css`); Routing-Sidebar-Warn-Badges nutzen jetzt `.badge-wrap` statt eines
  lokalen CSS-Overrides.
- **`RoutingSidebarAdapter.init()` jetzt async/awaited** — Voraussetzung für die Deep-Link-
  Anwendung (Sidebar-DOM muss inkl. geladener Profile stehen, bevor Werte gesetzt werden);
  behebt nebenbei eine potenzielle Race Condition bei Map-Klicks vor fertigem
  Sidebar-Rendering.
- **CI-Meldedateien liegen jetzt in `docs/ci/`** statt unversioniert im `oe5ith-ci`-Arbeitsverzeichnis
  (`bug-reports.md`, `open-items.md`, `routing-disclosure-request.md`, `legend-icon-swatch-request.md`,
  `handoff-2026-06-20-map-bg-wgs84.md`) — committete, dauerhaft nachvollziehbare Dokumentation statt
  Dateien, die bei einem frischen Submodul-Checkout verloren gegangen wären.
- **„NAH: Betreiber-spezifische Icons" von TODO.md nach ROADMAP.md verschoben** — eher ein
  Komfort-Update mit tieferem Logik-Eingriff (neues `operator`-Feld, eigene Layer-Architektur
  für die Status-Anzeige) als eine mechanische Erweiterung.
- **Dokumente an referenzierte Standards angeglichen (ROADMAP.md → Repo-Pflege &
  Dokumentation)** — `CLAUDE.md` dokumentiert jetzt das vollständige, offizielle
  6-Kategorien-Set von Keep a Changelog (`Hinzugefügt`/`Geändert`/`Veraltet`/`Entfernt`/
  `Behoben`/`Sicherheit`) statt bisher nur 4 (per Proposal-Zyklus, siehe
  `docs/proposals/archive/2026-07-18-changelog-full-categories-*`). Ein historischer Eintrag
  (v3.3.1) nutzte `### Aktualisiert` statt einer dokumentierten Kategorie — korrigiert zu
  `### Geändert`. `TODO_ARCHIVE.md`/`ROADMAP_ARCHIVE.md`-Überschriften auf ein einheitliches
  `## YYYY-MM-DD — Beschreibung`-Format vereinheitlicht (vorher gemischt mit
  `## Unreleased (DATUM)`).
- **Repo-Root aufgeräumt (ROADMAP.md → Repo-Pflege & Dokumentation)** — `TODO.md`/
  `TODO_ARCHIVE.md`/`ROADMAP.md`/`ROADMAP_ARCHIVE.md`/`CHANGELOG.md` (diese Datei) von Repo-Root
  nach `docs/` verschoben. `AGENT_INSTRUCTIONS.md` bleibt am Root. `GEMINI.md` komplett entfernt
  (Gemini CLI nicht genutzt). `AGENT_INSTRUCTIONS.md` §3 selbst geändert (generische Regel für
  die TODO/ROADMAP-Dateipaare jetzt `docs/` statt Repo-Root, per Proposal-Zyklus) statt nur
  repo-spezifisch abzuweichen. `CLAUDE.md`/`README.md` und alle internen Querverweise der
  verschobenen Dateien entsprechend angepasst; ein dabei gefundener, vorbestehender kaputter
  Link in `ROADMAP.md` mitkorrigiert. Historische Dokumente (Specs/Pläne/archivierte Proposals)
  bewusst nicht rückwirkend angepasst.

`npx tsc --noEmit && npm test` grün (196/196) für den gesamten Umfang dieses Releases.

## [3.9.0] - 2026-07-11

### Hinzugefügt
- **Geocoder-Suchfeld auf `/karte`-Sidebar** (ROADMAP.md → Karten-Interaktion & Such-Features) —
  neuer Suchbereich oberhalb der Layer-Accordions (`src/components/Sidebar.ts`); Auswahl fliegt
  die Karte zum Ergebnis (`flyTo`) und setzt einen temporären Pin (`src/pages/MapPage.ts`, analog
  zum bestehenden Coords-Pin-Pattern).
- **`GeolocateControl` auf allen 5 Kartenseiten** (ROADMAP.md → Karten-Interaktion &
  Such-Features) — zentral in `MapCore.init()` neben dem bestehenden `NavigationControl`
  ergänzt (`src/lib/MapCore.ts`), kein einmaliges Positions-Tracking (`trackUserLocation: false`).
- **Interaktive Legende auf `/karte`** (TODO.md → Map-Subsystem: Anschlussfeatures, Schritt 1+2) —
  Legendeneinträge sind klickbar (×-Button blendet einzelne Layer aus). Neuer Farb-Resolver
  (`src/lib/resolveLegendSwatch.ts`) extrahiert Farben aus MapLibre-Paint-Expressions (Literal +
  `match`-Fallback-Arm), zeigt „?" wenn nicht auflösbar. Legende auf `/karte` zeigt nur aktive
  Layer, synchron mit der Sidebar-Accordion — Klick auf „×" in der Legende triggert einen echten
  `.click()` auf das zugehörige Accordion-Item (derselbe bestehende Toggle-Pfad, keine zweite
  Implementierung; die Legende kann Layer nur ausblenden, nicht einschalten). Spec:
  [docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md](./superpowers/specs/2026-07-09-map-legend-interactive-design.md).
- **Klick-Popups für Overlay-Layer auf `/karte`** (TODO.md → Map-Subsystem: Anschlussfeatures)
  — Klick auf ein Feature eines aktiven Overlays (Autobahnen, Gemeinden, Höhenlinien, RD/NEF, …)
  zeigt ein Popup mit dessen Eigenschaften. Neue `OverlayLoader.getActiveLayerIds()` liefert alle
  aktuell aktiven Overlay-Layer-IDs für `queryRenderedFeatures`. Neues
  `src/lib/GenericFeaturePopup.ts` baut den Popup-Inhalt generisch aus den rohen
  GeoJSON-`properties` (Titel-Heuristik: erste vorhandene Property aus `name`/`title`/`ref`/`id`,
  Rest als Key-Value-Liste; interne `_`-Felder und sehr lange Werte gefiltert; HTML-escaped gegen
  XSS aus Fremddaten) — bewusst **keine** Kuratierung pro Layer (wie bei Trackings
  `POPUP_CONFIGS`), da `/karte`s Overlays zu heterogen/zahlreich dafür sind (z.B. 109 einzelne
  Autobahn-Layer). Popup-Anker ist die tatsächliche Klick-Position (`e.lngLat`), nicht von der
  Feature-Geometrie abgeleitet — nötig, weil `/karte`-Overlays gemischte Geometrietypen haben
  (Linien, Polygone), anders als die reinen Punkt-Layer bei Tracking/NAH. `/nah`s bestehender,
  eigenständiger Popup-Builder bleibt unverändert (bewusst nicht Teil dieses Punkts).

### Geändert
- **Geocoder-Suche in ein gemeinsames Modul extrahiert** — neues `src/lib/GeocoderSearchField.ts`
  kapselt Debounce/Fetch/Dropdown-Rendering/Outside-Click-Dismiss, bisher dreifach fast identisch
  in `AddressBlock.ts` (Coords), `RoutingSidebar.ts` (Start/Ziel) und jetzt neu auf `/karte`
  dupliziert. Alle internen Listener sind an ein `AbortSignal` gebunden (behebt dabei einen
  bisherigen Listener-Leak beim Seitenwechsel in `AddressBlock.ts`/`RoutingSidebar.ts`, die
  ihre `document`-Click-Listener nie entfernt hatten). `RoutingSidebar.ts` nutzte zudem die nirgends
  definierte CSS-Klasse `form-field-relative` (Dropdown dadurch am falschen Element positioniert)
  — ersetzt durch die bereits vorhandene lokale Utility `.pos-relative` (schon in `AddressBlock.ts`
  fürs selbe Problem im Einsatz). Kein Verhaltensunterschied bei Coords/Routing, nur DRY-Refactor.
  **Bekannte Restarbeit:** kein automatisierter Test für `GeocoderSearchField` selbst — Projekt
  hat kein jsdom/happy-dom eingerichtet (bestehende DOM-Tests nutzen handgebaute Fake-Elemente
  statt echtem DOM), neue Test-Dependency wäre eigene Infrastruktur-Entscheidung außerhalb dieses
  Scopes.

### Behoben
- **Legenden-Swatch-Auflösung auf `/karte` — drei reale Lücken nach Live-Test behoben**
  (`src/lib/resolveLegendSwatch.ts`, `src/components/Sidebar.ts`). Live-Test gegen echte
  Overlays hat gezeigt: (1) Für alle 14 über `layers.json` kuratierten Overlays (Autobahnen,
  Bezirke, RD, NEF, …) erschien **gar kein** Legenden-Eintrag — `layers.json`s `template`-Feld
  (z.B. `"strassen"`) ist eine Kategorie-Bezeichnung für die UI, kein MapLibre-Layer-Typ, wie
  fälschlich angenommen. Fix: `Sidebar.ts` lädt beim Toggle einer solchen Gruppe zusätzlich
  (einmalig pro Overlay, gecacht) das zugehörige `style.json` nach, um Typ+Farbe aus der echten
  Layer-Definition zu holen — `layers.json` bleibt weiterhin allein zuständig für die
  Gruppierung/Benennung in der Sidebar. (2) `resolveLegendSwatch()` kannte nur `match`-
  Expressions, nicht `case` (z.B. OpenSkiMap-Pistenfarben) — jetzt unterstützt, inkl. rekursiver
  Auflösung verschachtelter `match`/`case`-Fallback-Arme (reales Muster: `case` mit
  `match`-Expression als Fallback). (3) Reine Text-Label-`symbol`-Layer ohne `icon-color` (nur
  `text-color`) lieferten „?" statt Farbe — jetzt als Fallback berücksichtigt. Alle drei Fixes
  gegen echte, live abgerufene Style-Daten verifiziert (Autobahnen A1 → `#0000FF`, OpenSkiMap-
  Pistenfläche → `#95a5a6`, Ski-Label → `#333`).
- **Klick-Toleranz für Overlay-Popups auf `/karte`** (`src/pages/MapPage.ts`) — Nutzer meldete
  nach Live-Test, dass beim Klicken auf Overlays (auch bei sichtbar aktivem Layer) gar nichts
  passierte. `queryRenderedFeatures` fragte bisher nur den exakten Klick-Pixel ab; bei dünnen
  Linien-Layern (Autobahnen 1-3px, Höhenlinien 0.5-2.7px) ist ein pixelgenauer Treffer praktisch
  unmöglich. Jetzt wird eine kleine Toleranz-Bounding-Box (±4px) statt eines Einzelpixels
  abgefragt.
- **Race Condition in `OverlayLoader.add()` — Root Cause für „RD/NEF-Klick zeigt nichts"**
  (`src/lib/OverlayLoader.ts`). Nutzer meldete nach dem Klick-Toleranz-Fix: funktioniert bei
  Flächen wie Gemeinden, aber nicht bei RD/NEF-Pins oder Zonen-Flächen (zonen-nef/zonen-sew).
  Mit gezieltem Debug-Logging (statt einer weiteren ungeprüften Hypothese) belegt: Sidebar.ts'
  „Alle an"-Bulk-Toggle ruft `onLayerToggle()` pro Layer-Gruppe auf, ohne die async-Kette
  abzuwarten (bestehendes, vor dieser Session schon vorhandenes Muster). Bei einer noch nicht
  geladenen Overlay-ID lösten dadurch mehrere parallele `OverlayLoader.add()`-Aufrufe jeweils
  ihren eigenen `fetch()` aus und erzeugten JEWEILS eine eigene, unabhängige Overlay-Entry —
  die zuletzt aufgelöste gewann und überschrieb die `loaded`-Map, wodurch die `layerIds` aller
  vorherigen, parallel gestarteten Aufrufe verloren gingen. Die Layer selbst wurden trotzdem
  korrekt auf der Karte gerendert (`addLayerIfMissing` schreibt direkt auf die Map-Instanz) —
  nur `OverlayLoader`-intern verlor sich die Buchführung, weshalb `getActiveLayerIds()` (neu
  aus dem vorherigen Punkt) nur die letzte Gruppe sah und `queryRenderedFeatures` für alle
  anderen Layer nichts fand. Fix: paralleles `add()` für dieselbe, noch nicht geladene
  Overlay-ID teilt sich jetzt ein gemeinsames Erstellungs-Promise (`creating`-Map) statt jeweils
  eine eigene Entry zu erzeugen. Bestehende Race unabhängig von dieser Session, aber erstmals
  durch die neue `getActiveLayerIds()`-Aggregation sichtbar geworden. Neue
  `src/lib/OverlayLoader.test.ts` (3 Tests, davon einer als direkter Regressionstest für die
  Race mit `Promise.all()` + verzögertem Fake-`fetch()`).
- **Tracking-Karte (`/tracking`) nutzte für Flugzeug-Sprites eine eigene, unvollständige
  ICAO-Klassifizierung statt der vom Server gelieferten** (`src/features/tracking/
  TrackingDataService.ts`, `TrackingMapLayers.ts`). Live-Testabfrage gegen
  `wss://api.oe5ith.at/tracking/ws/v2` zeigte: der Server sendet pro Flugzeug bereits ein
  fertiges `spriteType`-Feld (z.B. `plane-a5`) mit dem exakten Sprite-Namen — dieses Feld war
  im `AircraftEntity`-Typ nicht deklariert und wurde beim Parsen implizit verworfen. Stattdessen
  berechnete `mapIcaoToCategory()` clientseitig eine eigene, grobe Kategorie
  (nur `A1`/`A2`/`A3`/`B1`) aus `icaoType` per Regex/Whitelist — wodurch der Großteil des
  Sprite-Atlas (`plane-a4`-`plane-a7`, `plane-b2`-`plane-b6`, `plane-c1`-`plane-c3`) vom
  Frontend aus nie erreichbar war. Fix: `spriteType` zu `AircraftEntity` ergänzt
  (`src/types/tracking.ts`), `getAdsbGeoJson()` gibt jetzt `sprite: a.spriteType ||
  'plane-unknown'` direkt weiter, `mapIcaoToCategory()` komplett entfernt. Das
  `icon-image`-Match in `TrackingMapLayers.ts` (16 Zeilen) wurde durch
  `['coalesce', ['get', 'sprite'], 'plane-unknown']` ersetzt — analog zum bestehenden
  AIS-Muster (`ui_sprite`). Neuer `src/features/tracking/TrackingDataService.test.ts`
  (2 Tests: Sprite-Passthrough + Fallback).

**Noch nicht erneut vom Nutzer im Browser bestätigt:** Klick-Toleranz für Overlay-Popups (aus dem
Behoben-Punkt oben) sowie die interaktive Legende (keine Playwright-Umgebung verfügbar).

`npx tsc --noEmit && npm test` grün (150/150) für den gesamten Umfang dieses Releases.

## [3.8.1] - 2026-07-09

### Geändert
- **Type-Safety: `any`-Escapes systematisch reduziert** (ROADMAP.md → Codebase-Qualität) — alle 78
  explizit annotierten `any`-Escapes (`: any`/`as any`) in Nicht-Test-`.ts`-Dateien durch präzise
  Typen ersetzt, kein Verhaltensunterschied. Vor allem `SourceSpecification`/`LayerSpecification`/
  `ExpressionSpecification` (`maplibre-gl`) und `Feature`/`FeatureCollection`/`Point`/`LineString`/
  `Position` (`geojson`) statt `any` für Map-Definitionen/GeoJSON — beide Pakete waren bereits
  Projektabhängigkeiten (`RoutingMapLayers.ts` nutzte das Muster schon). Dabei drei echte,
  vorbestehende Typ-Lücken gefunden und mit Discriminated-Union-Narrowing (kein Cast) behoben:
  `OverlayLoader.ts` (`newLayer.source` nicht auf allen `LayerSpecification`-Varianten vorhanden),
  `TrackingDataService.ts` (`.definition.data` nicht auf allen `SourceSpecification`-Varianten
  vorhanden), `TrackingMapLayers.ts` (`shipColorProp`-Ausdruck). Zwei neue lokale Interfaces für
  bisher ungetypte externe API-Responses ergänzt (`Sidebar.ts`: `LayerMetaEntry`/`LayerMetaGroup`
  für den Tile-Server; `RegionsModule.ts`: `RegionStation`). Umgesetzt in 20 Tasks
  (subagent-driven-development, je mit Task-Review + finalem Whole-Branch-Review). Verifiziert:
  `npx tsc --noEmit` 0 Fehler, `npm test` 112/112, keine `any`/`as any`-Stellen mehr in
  Nicht-Test-`.ts`-Dateien (projektweit).
- **`NahMapLayers.ts` — Popup-HTML-Building nach `NahPopupBuilder.ts` ausgelagert**
  (ROADMAP.md → Codebase-Qualität) — `buildStationPopupHtml()`/`buildMultiStationPopupHtml()`
  (inkl. `computeStationStatus()` und der nur dafür gebrauchten Badge-Class/Text-Mappings) in eine
  eigene Datei verschoben (429→329 Zeilen). Dabei einen identischen Copy-Paste-Block
  (Öffnungszeiten-HTML) zu `buildHoursHtml()` zusammengefasst. Live verifiziert (Playwright, echter
  Mehrfach-Stationen-Klick).
- **`NahStatusModule.ts` — in benannte Funktionen zerlegt** (ROADMAP.md → Codebase-Qualität) —
  statisches Seiten-HTML nach `buildNahStatusPageHtml()`, Event-Wiring nach `wireEvents()`
  ausgelagert; die übrigen Teilfunktionen waren bereits benannt. Live verifiziert (Playwright
  gegen `/info/nah`): Sortierung inkl. Richtungs-Umkehr, Refresh-Button.
- **Gemeinsamer `BadgeClass`-Typ für Status-Badges** (ROADMAP.md → Codebase-Qualität) — neuer
  `src/lib/BadgeStyles.ts` exportiert die 6 kanonischen Badge-Klassen aus
  `oe5ith-ci/docs/badges.md` als geschlossene Union statt verstreuter Literal-Strings.
  Angewendet auf 6 Dateien (`NahPopupBuilder.ts`, `NahStatusModule.ts`, `TrackingSidebar.ts`,
  `RoutingSidebar.ts`, `DebugModule.ts`, `RegionsModule.ts`) — mehr als ursprünglich in der
  ROADMAP genannt, für volle Konsistenz. Live verifiziert (Playwright): `/routing`-Warnbadges,
  `/info/debug`-Statusbadge.
- **Release-Trigger in `AGENT_INSTRUCTIONS.md` §4 formalisiert** — über den Proposal-Zyklus
  ([docs/proposals/archive/2026-07-09-release-batching-draft.md](./proposals/archive/2026-07-09-release-batching-draft.md)):
  Die Release-Checkliste (Version/Changelogs/Build/Tag/Deploy) läuft nicht mehr automatisch nach
  jedem abgeschlossenen TODO-/ROADMAP-Punkt, sondern wird vom Agenten an natürlichen
  Arbeitsblock-Enden vorgeschlagen und erst nach Bestätigung ausgeführt (Ausnahme:
  akute/sicherheitsrelevante Fixes weiterhin sofort). Anlass: mehrere separate Same-Day-Releases
  (`3.5.0`/`3.5.1`/`3.5.2` am 2026-06-30, `3.6.0`/`3.6.1` am 2026-07-05) empfanden als Overhead.
  Verifikation (`tsc`/`test`) bleibt unverändert Pflicht pro Änderung.

### Entfernt
- **Zwei Tile-Server-Sprite-404-Punkte aus `TODO.md` entfernt** — betreffen `tiles.oe5ith.at`
  (Basemap „At Plus" und Overlay „Wanderwege"), das ist separate Server-Infrastruktur außerhalb
  dieses Repos (`nginx.conf` hier deckt nur `map.oe5ith.at` ab). Nach neuem
  [docs/external-blockers.md](./external-blockers.md) verschoben, da sie ohne
  Tile-Server-Zugriff nicht aus diesem Repo heraus behoben werden können; erneut gegengetestet
  (2026-07-09), beide weiterhin 404.

`npx tsc --noEmit && npm test` grün (112/112) für den gesamten Umfang dieses Releases.

## [3.8.0] - 2026-07-09 00:08

### Hinzugefügt
- **Standards-Angleichung: PSR-12, OWASP Top 10, OpenAPI** (2026-07-08) — Drei bisher offene
  TODO.md-Punkte umgesetzt: (1) PHP_CodeSniffer mit PSR-12-Ruleset für `api/*.php` eingerichtet
  (`composer run lint`), bestehende Verstöße gefixt; (2) hybrides OWASP-Top-10-Audit — automatisiertes
  Script (`bash scripts/security-audit.sh`) für Secret-/Injection-Heuristik-Checks plus vollständige
  manuelle Bewertung aller 10 Kategorien in `docs/security/owasp-top10-checklist.md`; dabei einen
  Info-Disclosure-Fund in `diag.php` entdeckt und als eigenen TODO.md-Punkt erfasst (nicht in diesem
  Rahmen gefixt); (3) OpenAPI-3.x-Spec für alle 12 API-Endpoints (`docs/openapi.yaml`), validiert via
  `npm run validate:openapi`. Zusätzlich während der Recherche gefunden und sofort behoben: hardcoded
  DB-Passwort/API-Key in `api/config.php` (Commit `87accec`, vor diesem Plan).
- **NAH: Mehrfach-Stationen mit Status-Aggregation und Badge** (2026-07-08) — 
  Stationen mit identischen Koordinaten (z.B. Christophorus 14/99, Martin 1/10) 
  werden jetzt aggregiert: ein gemeinsamer Marker mit Nummern-Badge zeigt an, 
  dass mehrere Stationen am Standort sind. Die Icon-Farbe widerspiegelt den 
  besten Status aller Stationen (aktiv > außer Saison > außer Dienst). 
  Klick auf den Marker zeigt alle Stationen mit vollständigen Details 
  (Betriebstyp, Zeiten, Nachtbereitschaft).

### Behoben
- **Logo auf Mobile-Bildschirmen sichtbar** — `.brand-logo` hatte auf Mobile (`@media max-width: 768px`) ein `display: none` in `topbar.css`; entfernt, Logo zeigt jetzt auf allen Breakpoints.
- **Tablet-Quicklinks-Bug behoben** — Auf Kartenseiten (`/nah` u.a.) bei ~900px Breite war nur 1 von 2 Quicklinks sichtbar; Root Cause war eine `nth-child`-Zählung der CI-Regel, die durch den Mobile-Toggle-Button vor den Nav-Links verschoben wurde. Fix: Reihenfolge in `.topbar-right` (`Topbar.ts`) getauscht, Nav-Links jetzt vor dem Button.
- **`diag.php`-Info-Disclosure in Produktion blockiert** — beim OWASP-Top-10-Audit gefunden:
  `api/diag.php` exponierte ohne Zugriffsschutz PHP-Version, DB-Host/Port/Name/User und
  ORS-Health-Status. Fix: `nginx.conf` blockt den Endpoint jetzt mit `location = /api/diag.php
  { deny all; }` im Produktions-Server-Block; der lokale Dev-Block bleibt bewusst offen (dort
  zum Debuggen nützlich). Auf dem Server angewendet und verifiziert (`https://map.oe5ith.at/api/diag.php` → 403).

### Entfernt
- **Tote Leaflet-CSS-Regeln entfernt** — `.leaflet-popup-*`-Overrides in `modal.css` waren Altlast aus der Zeit vor der MapLibre-GL-Migration (Leaflet-Dependency längst entfernt); 27 Zeilen toter Code gelöscht.

### Geändert
- **Topbar-Nav-Markup dedupliziert** — Identisches Nav-HTML war in `Topbar.ts` und `main.ts` dupliziert; in eine gemeinsame `src/components/TopbarNav.ts` (`renderTopbarNav()`) extrahiert.

## [3.7.0] - 2026-07-07 13:19

### Hinzugefügt
- **Turn-by-Turn-Wegbeschreibung für A→B-Routen** (Phase 2 von
  [docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md](./superpowers/specs/2026-07-04-routing-sidebar-details-design.md),
  Design: [docs/superpowers/specs/2026-07-07-turn-by-turn-design.md](./superpowers/specs/2026-07-07-turn-by-turn-design.md)).
  War blockiert auf einer generischen Disclosure-Komponente + Abbiege-Icons im `oe5ith-ci`-Submodul —
  beides seit `oe5ith-ci` v1.20.0 verfügbar (Submodul-Pointer aktualisiert). Neues Modul
  `src/lib/ManeuverIcons.ts` (ORS-Manöver-Code 0-13 → SVG-Icon-Markup, 14 `ci-maneuver-*`-Icons
  1:1 übernommen), `RoutingDetailsFormatter.formatSteps()` wandelt ORS' `segments[].steps[]`
  (kommt standardmäßig ohne Zusatzparameter mit) in Anzeige-Steps um (Icon + Instruction-Text +
  adaptiv formatierte Distanz). `RoutingSidebar.ts` rendert die Steps als eingeklapptes
  `oe5ith-ci`-Disclosure-Panel „Wegbeschreibung" unterhalb der Zusammenfassungs-Karte.
  `RoutingService.calculateRoute()` fragt jetzt `language: 'de'` an ORS an, damit die
  Anweisungstexte auf Deutsch statt Englisch erscheinen (Follow-up aus dem finalen
  Whole-Branch-Review). Live verifiziert (Playwright, `/routing`, A→B-Route: Panel eingeklappt
  beim Laden, klappt auf/zu, verschwindet beim Zurücksetzen; deutsche Anweisungstexte gegen den
  laufenden ORS-Server bestätigt).

### Geändert
- **Copyright-Modal überarbeitet und erweitert** (`src/lib/GlobalModals.ts`, Design:
  [docs/superpowers/specs/2026-07-07-copyright-modal-design.md](./superpowers/specs/2026-07-07-copyright-modal-design.md)).
  Sechs statt drei Abschnitte: „Karten & Daten" (Leaflet-Angabe entfernt — keine
  Projekt-Abhängigkeit), neuer Abschnitt „Bibliotheken" mit den tatsächlichen
  Runtime-Dependencies (MapLibre GL JS, proj4, mgrs, open-location-code, pmtiles, je mit
  korrekter Lizenz), „Design & Ressourcen" (präzisierte FontAwesome-Lizenzangabe, Versionslabel
  auf „Font Awesome 7" korrigiert), neue Abschnitte „Kontakt & Impressum" (Name + Mail) und
  „Datenschutz" (faktenbasiert: kein Tracking/Cookies/Analytics). Zusätzlich der bisher tote
  Landing-Page-Footer-Link „Lizenzen & Impressum" repariert (`src/main.ts`) — öffnet jetzt das
  Modal über das bestehende `open-copyright`-Event, analog zum Sidebar-Footer-Muster. Live
  verifiziert (Playwright): Modal öffnet sich sowohl von der Landing-Page als auch vom
  Sidebar-Footer (`/nah`), alle sechs Abschnitte korrekt, `mailto:`-Link korrekt gesetzt, keine
  Konsolenfehler.
- **`MapRegistry`-Dreifach-Buchhaltung vereinfacht** (U7 + U1b, [docs/superpowers/specs/2026-07-06-map-registry-bookkeeping-design.md](./superpowers/specs/2026-07-06-map-registry-bookkeeping-design.md)). `MapPage.toggleLayer` führte bisher eine eigene, parallele Buchhaltung (`activeLayers` + `overlayMetadata` + `cachedStyles` + `styleFetchPromises`) neben `MapRegistry` — Recherche ergab, dass das exakt dasselbe Problem ist, das `OverlayLoader` (genutzt von `CoordsPage`) bereits mit einer einzigen, schlankeren `loaded`-Map löst. `OverlayLoader` generalisiert: optionale Layer-Untermenge pro `add()`/`remove()`-Aufruf, kumulative Buchhaltung über mehrere Aufrufe für dasselbe Overlay, Style-JSON-Cache pro Overlay. `MapPage.toggleLayer` ist jetzt ein dünner Wrapper um `OverlayLoader`; `activeLayers`, `overlayMetadata`, `cachedStyles`, `styleFetchPromises`, `getStyle()`, `reapplyActiveOverlays()` entfallen vollständig. Neuer gemeinsamer Helper `src/lib/MapDefinitionOps.ts` (`addSourceIfMissing`/`addLayerIfMissing`) ersetzt die 4x duplizierte Guard+Klon+Add-Stelle in `MapRegistry.restore`, `OverlayLoader.add` und `MapCore.ensureGeoJsonLayer`. `CoordsPage.ts`s bestehende `OverlayLoader`-Nutzung (Wanderwege-Overlay, ohne Layer-Untermenge) bleibt unverändert kompatibel. Live verifiziert (Playwright, `/karte`: Mehrfach-Layer-Toggle innerhalb eines Overlays inkl. Source-Cleanup nur beim letzten Abschalten, Basemap-Wechsel-Regression gegen „Basemap At"; `/coords`: Wanderwege-Toggle unverändert).
- **Hover-Cursor-Logik vereinheitlicht** (U6, [docs/superpowers/specs/2026-07-06-shared-hover-cursor-design.md](./superpowers/specs/2026-07-06-shared-hover-cursor-design.md)). Drei unabhängige, duplizierte Implementierungen (`TrackingMapLayers`, `RoutingPage`, `NahMapLayers`) durch einen gemeinsamen Helper `attachHoverCursor` (`src/lib/HoverCursor.ts`) ersetzt. Dabei zwei Bugs behoben: `ais-dots-moving`/`ais-dots-static` (Tracking) waren klickbar, zeigten aber keinen Hover-Cursor; `RoutingPage` meldete seine Hover-Listener nie in `destroy()` ab (Leak-Risiko bei Seitenwechsel). Beide verschwinden automatisch durch die vereinheitlichte Implementierung. In `CLAUDE.md` dokumentiert für künftige neue Seiten. Live verifiziert (Playwright, `/tracking`, `/routing`, `/nah`, inkl. Seitenwechsel-Test).
- **NAH-Stationsmarker von DOM-Markern auf einen MapLibre-Symbol-Layer migriert** (U5, [docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md](./superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md)). NAH war die letzte Karten-Funktion mit `maplibregl.Marker`-DOM-Elementen statt eines Symbol-Layers (Tracking/Coords/Routing nutzen das Muster schon). Das Helikopter-Icon wird jetzt einmalig zur Laufzeit aus dem bestehenden `fa-helicopter`-Glyph als SDF-Icon gerendert (kein neues externes Sprite nötig), Klick/Hover folgen dem in `TrackingMapLayers` etablierten `queryRenderedFeatures`-Muster. Popup-Inhalt bleibt fachlich unverändert. Betreiber-spezifische Icons (bereits im Sprite-Set vorhanden) sind bewusst nicht Teil dieser Migration — siehe neuer ROADMAP.md-Punkt.

### Behoben
- **Mobile Topbar: Karte/Umrechner/Tracking waren nicht erreichbar** (`src/components/Topbar.ts`,
  `src/main.ts`, Design:
  [docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md](./superpowers/specs/2026-07-07-mobile-topbar-nav-design.md)).
  Die CI-Basis blendet `.topbar-nav-dropdown` auf Mobile (≤768px) komplett aus; ein bestehender
  website-v3-Override zeigte zwar die zwei Quicklinks (Routing/Luftrettung) wieder an, aber
  das „Mehr"-Dropdown blieb unsichtbar — die drei darin enthaltenen Seiten waren über die
  Topbar auf Mobile nicht erreichbar. Alle 5 Ziele erscheinen jetzt auf Mobile im „Mehr"-Dropdown
  (Routing, Luftrettung, Karte, Umrechner, Tracking); Desktop/Tablet unverändert (2 Quicklinks +
  3er-Dropdown). Betraf zwei Stellen (`Topbar.ts` für Kartenseiten, `main.ts` für die
  Landing-Page — beide haben eine eigene, unabhängige Kopie derselben Nav-Struktur, als
  TODO.md-Punkt dokumentiert). Live verifiziert (Playwright, Mobile/Tablet/Desktop-Viewports auf
  `/` und `/nah`).
- **„Kleinere Map-Bugs"-Sammeltask (TODO.md) abgearbeitet.** Fünf kleine, unabhängige Fixes:
  - `NahPageController.destroy()` ruft jetzt `PopupManager.closePopup()` auf (`src/pages/NahPage.ts`), analog zu `TrackingMapLayers.destroy()`. Kein aktueller Bug (Kartenwechsel entfernt das Popup ohnehin via `map.remove()`), aber Symmetrie zur Schwesterseite hergestellt.
  - Width-Desync in `TrackingMapLayers.ts` behoben: `ensureLayers` setzte für ADS-B-Tracks 5/3, `highlightItem` 4/1.5 — beim initialen Laden/Restore mit bereits gesetztem `selectedId` zeigte die Linie kurz 5/3, bis der nächste Klick auf 4/1.5 wechselte. Neue gemeinsame Konstante `ADSB_TRACK_WIDTH` an beiden Stellen referenziert (AIS-Track-Width war bereits konsistent, dort keine Änderung nötig).
  - `NahMapLayers.updateFlightPaths`s hardcodierter `for (i<5)`-Reset-Loop (stale `selected`-Feature-State bei einer künftigen Änderung des Ergebnis-Limits) durch `map.removeFeatureState({source: sourceId})` ersetzt — löscht den State für alle Features der Source, unabhängig von der Anzahl.
  - `TerrainManager.initTerrainManager()`s redundanter, un-awaited Direktaufruf von `applyTerrainInfrastructure()` entfernt — lief unkoordiniert parallel zum `isRestoring`-Lock in `MapCore.ts`s `restore()`, die diesen Aufruf ohnehin garantiert übernimmt (kalt via `style.load`, warm via `setTimeout`-Fallback). Race-Risiko ohne funktionalen Nutzen.
  - Lange Warn-Badge-Texte (z.B. „Zufahrtsbeschränkungen auf der Strecke") wurden am rechten Sidebar-Rand abgeschnitten statt umzubrechen — Root Cause `.badge { white-space: nowrap }` im `oe5ith-ci`-Submodul, dort nicht gefixt (siehe `oe5ith-ci/ci-bug-reports.md`, Eintrag 2). Lokaler Override `.result-badges .badge { white-space: normal }` in `src/styles/sidebar.css`.

  Live verifiziert (Playwright): `/nah` Kartenklick → Berechnung inkl. Feature-State-Reset ohne Fehler, Seitenwechsel (destroy) ohne Fehler; `/tracking` lädt fehlerfrei; `/routing` Badge-Umbruch visuell bestätigt (Testbadge bricht jetzt in 3 Zeilen um statt abgeschnitten zu werden).
- **Popup schloss sich beim Wechsel zu einer anderen Station/einem anderen Flugzeug/Schiff, statt sofort das neue zu zeigen** (`src/lib/PopupManager.ts`, `src/features/nah/NahMapLayers.ts`, `src/features/tracking/TrackingMapLayers.ts`). Ursprünglich vermutete Ursache (fehlendes `e.preventDefault()` in `NahMapLayers`, analog zu einem bereits bestehenden Aufruf in `TrackingMapLayers`) war beim Nachbau als gemeinsame Mechanik nachweislich falsch — ein Live-Test mit dem vermeintlichen Fix reproduzierte den Bug weiterhin. Root Cause per MapLibre-GL-JS-Quellcode bestätigt: `Popup._onClose` prüft `e.defaultPrevented` gar nicht, `preventDefault()` hat also nie etwas bewirkt; das eigentliche Problem ist, dass `Popup.addTo()` bei einem bereits offenen Popup den `closeOnClick`-Listener zwar neu registriert, `Map.fire()` aber die Listener-Liste vor der Verteilung einmalig kopiert — der alte (persistente) Listener bleibt dadurch in der aktuellen Klick-Verteilung erhalten und schließt das gerade erst wieder geöffnete Popup trotzdem. Fix: das gemeinsame Popup nutzt jetzt `closeOnClick: false`, jede Seite schließt es bei einem Fehltreffer explizit selbst (`PopupManager.closePopup()`) — `TrackingMapLayers` tat das für seinen Fehltreffer-Fall schon, `NahMapLayers` ergänzt das jetzt. Live verifiziert (Playwright, `/nah` und `/tracking`): neues Popup erscheint jetzt sofort beim Wechsel zwischen Features, Klick auf freie Fläche schließt weiterhin korrekt.
- **Klick auf eine Außer-Saison-NAH-Station warf einen TypeError, Popup blieb leer** (`src/features/nah/NahMapLayers.ts`, `findClickedStation`). MapLibre GL JS serialisiert nicht-primitive GeoJSON-Feature-Properties (Arrays) intern als JSON-String; `months_active` kam dadurch beim Klick als String `"[4,5,6]"` statt als echtes Array zurück, `.join(', ')` in der Saison-Zeile schlug fehl. `findClickedStation` parst `months_active` jetzt zurück in ein echtes Array. Bei der finalen Review der U5-Migration gefunden (Regressionstest deckt den MapLibre-Serialisierungs-Fall jetzt ab), live verifiziert (Playwright).
- **NAH-Stationsmarker: Inline-Style-Verstoß gegen CI-Konvention behoben** (`src/features/nah/NahMapLayers.ts`). Der Status-Text im Stations-Popup nutzte `style="color:…"` — jetzt über die bestehenden CI-Badge-Klassen (`badge-green`/`badge-red`/`badge-gray`), die exakt auf die drei Status-Farben passen.

`npx tsc --noEmit && npm test` grün (106/106) für den gesamten Umfang dieses Releases.

## [3.6.1] - 2026-07-05 16:14

### Geändert
- **Seitentitel „Cloud Portal" → „GeoPortal".** Browser-Tab-Titel (`index.html`) und Landing-Page-Überschrift (`src/main.ts`) umbenannt; `CLAUDE.md`-Projektbeschreibung mitgezogen. Live verifiziert.
- **Coords-Seite: Pin setzen auf Rechtsklick-Kontextmenü umgestellt** (`src/pages/CoordsPage.ts`). War bisher an Linksklick auf die Karte gebunden — inkonsistent zum Routing-Kontextmenü-Pattern und kollidierte konzeptionell mit der Rechtsklick-Drag-3D-Steuerung (Kippen/Rotieren). Jetzt analog zu `RoutingPage.ts`: Rechtsklick öffnet ein Kontextmenü mit den Koordinaten und der Aktion „Koordinate hier setzen"; Linksklick bleibt für normales Kartenverschieben frei. Live verifiziert (Linksklick ohne Effekt, Rechtsklick-Menü aktualisiert Adresse/alle Koordinatenformate in der Sidebar korrekt).

### Behoben
- **Versionsinfo-/Copyright-Modal wurde von der Topbar überdeckt** (`src/styles/modal.css`, `.modal-backdrop`). `z-index: var(--z-backdrop)` (1040) lag unter `--z-topbar` (1100); da `position: fixed` + `z-index` einen eigenen Stacking-Context bildet, sperrte das jedes Modal unter die Topbar, unabhängig vom eigenen `z-index` des `.modal`-Elements. Root Cause per Playwright bestätigt (`elementFromPoint` am Überlappungspunkt lieferte einen Topbar-Button statt das Modal). Fix: `.modal-backdrop` nutzt jetzt direkt `z-index: var(--z-modal)`; andere `--z-backdrop`-Verwendungen (Sidebar-/Controls-Backdrop, die bewusst unter der Topbar bleiben sollen) unverändert. Live verifiziert, keine Regression am mobilen Sidebar-Backdrop. Derselbe Bug besteht noch im `oe5ith-ci`-Submodul — dort nicht gefixt (extern verwaltet), Meldung in `oe5ith-ci/ci-bug-reports.md`.
- **TrackingPage-Timer nicht gecleart** (`src/features/tracking/TrackingPage.ts`). Ein `setTimeout` (Buttons „active" setzen, 100ms) wurde nirgends gespeichert und daher in `destroy()` nie gecleart — bei Seitenwechsel innerhalb der 100ms griff der Callback noch auf DOM-Elemente einer bereits verlassenen Seite zu. Timeout-ID jetzt in einer Property gespeichert und in `destroy()` gecleart.
- **Routing (A→B) zeigte leere Stationsliste** (`src/components/RoutingSidebar.ts`, `renderStationResults`). `clearAll()` (`RoutingSidebarAdapter.ts`) rief die Funktion beim Reset immer mit einem leeren Array auf; die Funktion rendere dafür unbedingt „0 Standorte gefunden"/„Nächste Stützpunkte", obwohl das Ergebnis für den A→B-Modus irrelevant ist. Root Cause: der Reset-Pfad ist der einzige Aufrufer mit leerem Array — eine echte Null-Treffer-Suche läuft bereits vorher über `renderRoutingError` und erreicht diese Funktion nie. `renderStationResults` blendet das Panel jetzt aus und leert es bei `stations.length === 0`, statt „0 gefunden" zu rendern — modusunabhängig, keine Sonderbehandlung für A→B nötig. Test-first (RED bestätigt), dann Fix; live per Playwright verifiziert (A→B zeigt keine Stationsliste mehr, SEW weiterhin korrekt).

`npx tsc --noEmit && npm test` grün (68/68) für den gesamten Umfang dieses Releases.

## [3.6.0] - 2026-07-05 07:16

### Hinzugefügt
- **Routing-Sidebar zeigt bei A→B-Routen jetzt Fahrmodus- und Warn-Badges** (Phase 1 von [docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md](./superpowers/specs/2026-07-04-routing-sidebar-details-design.md); Turn-by-Turn folgt als Phase 2, siehe TODO.md). Neues Modul `src/features/routing/RoutingDetailsFormatter.ts` (`getProfileBadge`, `getRouteWarnings`, 9 Unit-Tests) mappt das gewählte ORS-Profil auf ein Badge („Normalfahrt"/Auto bzw. „Blaulichtfahrt"/Rettungswagen, Fallback für unbekannte Profile) und wertet die ORS-`extras` (`tollways`, `roadaccessrestrictions`) zu Warn-Badges aus. `RoutingService.calculateRoute()` bekommt einen optionalen `extraInfo`-Parameter, `types/common.ts` additiv um `RouteExtra(s)`/`RouteFeatureProperties` erweitert. Bei der Live-Verifikation (Playwright, Linz→St. Pölten) einen Bug im eigenen Ansatz gefunden und behoben: `extra_info` unconditional für alle Profile anzufragen ließ `driving-emergency`-Routen mit HTTP 500 fehlschlagen (ORS-Fehlercode 2018, `way_type` ist im Graph dieses Profils nicht als Encoded Value geladen) — `RoutingSidebarAdapter.ts` fragt `extra_info` jetzt nur für `driving-car` an; das Fahrmodus-Badge selbst (unabhängig von `extras`) funktioniert für beide Profile unverändert. Nach Live-Test der Anordnung noch einmal überarbeitet, siehe „Fahrmodus-Anzeige … von Text-Badge auf Icon umgestellt" unten.
- **Unit-Tests für `MapCore.createPinLayer`/`MapCore.setPointSource`** (`src/lib/MapCore.test.ts`, 6 Tests): Defaults, Custom-Optionen, Halo-Paint nur bei gesetzter Farbe, Punkt setzen/leeren/No-Op bei fehlender Source.
- **TODO/Roadmap-Trennung + Standards-Referenzen (`CLAUDE.md`, `TODO.md`, `ROADMAP.md`).** `TODO.md` (aktueller Scope: Fixes/Cleanup/Erweiterungen) und neues `ROADMAP.md` (neue, noch nicht existierende Features) getrennt, je mit `*_ARCHIVE.md`-Gegenstück. `TODO.md` auf die offene Map-Subsystem-Cleanup-Roadmap (U1–U7) aktualisiert; die 4 alten CI-Token/Accessibility-Punkte entfernt, da sie tatsächlich zu `oe5ith-ci/docs/roadmap.md` gehören. `CLAUDE.md` bekam eine neue Sektion „Standards-Referenzen": referenziert die externen Standards hinter den Repo-Konventionen (Semantic Versioning, Keep a Changelog, Conventional Commits, PSR-12, EditorConfig, BEM, GeoJSON/RFC 7946, WGS84, ISO 8601, WCAG, ARIA APG, Twelve-Factor Config, ADR, OWASP Top 10, Core Web Vitals, OpenAPI) inkl. bekannter Abweichungen, plus eine Pflege-Regel für künftige neue Dienste/Sprachen. Neues `.editorconfig` an bestehenden Codestil angeglichen (2 Spaces JS/TS/CSS, 4 Spaces PHP). Konkrete Angleichungs-Aufgaben (PSR-12-Audit, OWASP-Self-Check, OpenAPI-Spec) als neue TODO.md-Sektion „Standards-Angleichung" erfasst.

### Geändert
- **Fahrmodus-Anzeige in der Routing-Zusammenfassung von Text-Badge auf Icon umgestellt** (`src/components/RoutingSidebar.ts`, `updateRoutingSummary`). Live-Test des Fahrmodus-/Warn-Badge-Features (siehe oben) zeigte eine unsaubere Anordnung: das Fahrmodus-Badge stand als eigene blaue Textzeile über der Distanz/Dauer-Box, die Warn-Badges (Maut/Zufahrtsbeschränkung) als getrennter Block danach ohne erkennbaren Bezug zur Route. Jetzt: reines Icon (Auto/Rettungswagen) links neben der unveränderten Distanz/Dauer-Kv-Zeile (Label nur noch als Tooltip), Warn-Badges direkt in derselben Karte darunter. Neue, scoped CSS-Regeln (`.result-summary-row`, `.result-mode-icon`, `.result-summary-row .result-kv`, `.result-summary-row + .result-badges`) in `sidebar.css`, bestehende `.result-kv`/`.result-badges`-Basisklassen (auch von Stationsliste/Tracking genutzt) unverändert. Design: [docs/superpowers/specs/2026-07-05-routing-summary-layout-design.md](./superpowers/specs/2026-07-05-routing-summary-layout-design.md). Beide Profile live gegen ORS verifiziert (Playwright, Linz→St. Pölten).
- **Sprite-Sheets werden gecacht statt bei jedem Style-Reload neu geladen (`MapCore.loadSprites`).** Fetch + Bild-Dekodierung eines Sprite-Sheets liefen bisher bei jedem Basemap-Wechsel erneut ab, obwohl der Inhalt pro Sprite-URL identisch ist — wirkt sich auf Core Web Vitals (LCP/INP) beim Karten-Init aus. Neuer Cache (`_spriteSheetCache`, keyed nach Sprite-URL inkl. HiDPI-Suffix) übernimmt jetzt nur noch den einmaligen Fetch/Decode; das (unvermeidbare) erneute `map.addImage()` pro Style-Instanz bleibt bestehen. Zusätzlich die 3 identisch duplizierten `SPRITE_BASE`-Konstanten (`NahMapLayers.ts`, `RoutingMapLayers.ts`, `CoordsPage.ts`) durch eine zentrale, aus `MapCore.ts` exportierte `MARKERS_SPRITE_BASE` ersetzt.
- **Pin-/Marker-Boilerplate zusammengefasst (`MapCore.createPinLayer`, `MapCore.setPointSource`).** Die Symbol-Layer-Definition für Einzel-Pins (NAH-Einsatzort, Routing-Start/-Ziel, Coords-Pin) und die „Pin-Position setzen/leeren"-Logik waren an drei Stellen fast identisch kopiert. Jetzt zwei gemeinsame `MapCore`-Helper (`createPinLayer` baut die `LayerSpecification`, `setPointSource` setzt/leert die Point-GeoJSON-Source); ersetzt die Duplikate in `NahMapLayers.ts`, `RoutingMapLayers.ts` (inkl. Wegfall der privaten `_updatePin`) und `CoordsPage.ts`.
- **`CLAUDE.md` in portable + repo-spezifische Teile aufgesplittet.** Neue Datei `AGENT_INSTRUCTIONS.md` enthält jetzt die repo-unabhängigen, standardbasierten Regeln (generische Standards-Referenzen-Auswahl, TODO/Roadmap-Split-Konvention, Releases/Versionierung/Git, Core Mandates) — 1:1 in andere Repos kopierbar, ohne website-v3-Dateipfade. `CLAUDE.md` verweist darauf statt die Regeln zu duplizieren und behält nur noch Repo-Spezifisches (Architektur, Commands, Geodaten-Standards, `oe5ith-ci`-Anwendung, konkrete Release-Dateipfade). `GEMINI.md` (von Gemini CLI zwingend unter diesem Namen geladen) auf einen kurzen Verweis auf `AGENT_INSTRUCTIONS.md` + `CLAUDE.md` reduziert statt eigenständig zu duplizieren — war zuvor veraltet (`api/config.php` statt `api/config.local.php`, verpflichtender `-dev`-Suffix). Entsprechender ROADMAP.md-Punkt nach `ROADMAP_ARCHIVE.md` verschoben.
- **`AGENT_INSTRUCTIONS.md` nach Review überarbeitet** (Entwurf + Review-Doku in `docs/proposals/archive/2026-07-03-agent-instructions-*.md`): neues Core Mandate „Out-of-Scope-Funde als TODO.md-Eintrag dokumentieren statt nebenbei mitfixen"; Nachfragen-Mandat um Fallback für non-interaktive Läufe ergänzt (minimalinvasivste Interpretation + Annahme dokumentieren); Changelog-Zeitstempel-Konvention explizit als bewusste Eigenregel markiert (Keep a Changelog kennt nur einen undatierten `[Unreleased]`-Block) plus Merge-Konflikt-Regel (immer zusammenführen, nie verwerfen); PSR-12-Zeile zu „Ökosystem-Style-Standard" generalisiert (PEP 8, rustfmt, gofmt, Prettier als weitere Beispiele); TODO/Roadmap-Tie-Breaker „im Zweifel TODO.md" ergänzt; `git add -A`-Verbot von Release-Kontext auf generell gehoben; Versions-Kriterium „minor" präzisiert.
- **`AGENT_INSTRUCTIONS.md` um Abschnitt „Meta-Dokument-Änderungen (Proposals)" ergänzt.** Formalisiert den gerade genutzten Draft-Review-Merge-Zyklus für Änderungen an Regel-/Prozessdokumenten selbst: Ablage in `docs/proposals/` (Naming `YYYY-MM-DD-<slug>.md` + `-review.md`), harte Grenze „nur explizit in der Review-Tabelle besprochene Punkte werden übernommen, keine stillschweigenden Zusatzänderungen", danach Archivierung nach `docs/proposals/archive/`. Generisch gehalten (kein website-v3-Bezug), damit die Konvention mit `AGENT_INSTRUCTIONS.md` in andere Repos mitwandert.

### Behoben
- **A→B-Route zeigte keine Zusammenfassung in der Sidebar an** (`src/features/routing/RoutingSidebarAdapter.ts`, `clearAll`). Setzte `#routing-details` bislang per Inline-Style (`style.display = "none"`) statt über die `hidden`-Klasse; `updateRoutingSummary()` entfernte danach nur die Klasse, das nie zurückgesetzte Inline-Style hielt die Box aber weiterhin unsichtbar — Distanz/Dauer aus der ORS-Antwort wurden berechnet, aber nie sichtbar. Jetzt konsistent `classList.add('hidden')`, passend zum Rest des Moduls. Regressionstest (`RoutingSidebarAdapter.test.ts`) ergänzt (schlägt gegen den alten Code fehl); live per Playwright gegen den laufenden Dev-Server verifiziert (Bug reproduziert, Fix bestätigt, echte ORS-Route 125.36 km/84 min sichtbar). Verwandte, vorbestehende UI-Ungereimtheit (leere „Nächste Stützpunkte"-Liste erscheint auch im A→B-Modus) als TODO.md-Eintrag dokumentiert, nicht mitgefixt.
- **RD-Overlay-Pins verschwinden dauerhaft bei Basemap-Wechsel auf „Basemap At"** (`src/pages/MapPage.ts`, `toggleLayer`). `isStyleLoaded()` wartete via `m.once('style.load', resolve)` auf ein bereits verstrichenes Event (feuert ohne erneuten `setStyle()`-Aufruf nicht wieder) → hing bei großen, langsam ladenden Basemaps (hier „Basemap At", ~2,4 GB PMTiles) für immer und blockierte wegen des dauerhaft `true` bleibenden `isRestoring`-Flags in `MapCore.ts` jede weitere Restore-Sequenz der Karteninstanz. Wartelogik jetzt ein Polling auf `isStyleLoaded()` (`requestAnimationFrame`-Loop) statt auf das Event.
- **Höhenlinien rendern/entfernen sich nicht auf „Basemap At"** (`src/lib/OverlayLoader.ts`). Der Höhenlinien-Overlay-Style (`basemap-at-contours`) und der „Basemap At"-Basemap-Style definieren unabhängig voneinander beide eine Source namens `esri` — `OverlayLoader.add()` prüfte nur `!map.getSource(sourceId)`, die existierte durch den Basemap bereits, wodurch die eigentliche Höhenlinien-Source nie hinzugefügt wurde (Contour-Layer zeigten auf die falschen, Basemap-eigenen Vektordaten). Beim Ausschalten scheiterte zusätzlich `removeSource('esri')`, weil die Source noch von Basemap-Layern gebraucht wurde. `OverlayLoader` prefixt Source-/Layer-IDs jetzt immer mit der `overlayId` (gleiches Muster wie in `MapPageController.toggleLayer`), damit Overlay-IDs nie mit Basemap-eigenen IDs kollidieren können.

Die beiden Basemap-At-Bugs wurden beim manuellen Durchtesten der U1/U2-Verifikations-Checkliste (Map-Subsystem Cleanup, siehe TODO_ARCHIVE.md) gefunden, per systematischer Fehlersuche (Root-Cause + Live-Reproduktion via Playwright) bestätigt und gefixt.

`npx tsc --noEmit && npm test` grün (132/132) für den gesamten Umfang dieses Releases.

## [3.5.2] - 2026-06-30 16:45

### Behoben
- **Doppelter Restore bei Basemap-Wechsel (`MapPage`, `TrackingPage`).** `setStyle()` löste den `style.load`-Listener aus **und** es lief zusätzlich ein expliziter `triggerRestore()` → die komplette Registry-Wiederherstellung inkl. Sprite-Laden lief 2×. Die expliziten Trigger sind entfernt; die Wiederherstellung läuft nur noch über den `style.load`-Listener aus `MapCore.init` (so wie es 3 der 5 Kartenseiten ohnehin schon taten).
- **Terrain-Zustand leckte über Seitenwechsel (`TerrainManager`).** Die modul-globalen Flags `terrainEnabled`/`hillshadeEnabled`/`contoursEnabled` wurden nie zurückgesetzt → auf einer Seite aktiviertes Terrain/Hillshade/Höhenlinien wurde auf der nächsten Seite (ohne passenden Toggle) still wieder angewandt. Werden jetzt bei jedem Karten-Init zurückgesetzt.

### Geändert
- **Overlay-Laden vereinheitlicht (`OverlayLoader`).** Neuer gemeinsamer `src/lib/OverlayLoader.ts` (`add`/`remove`/`isLoaded`/`reset`) für komplette Remote-Style-Overlays mit explizitem Source-/Layer-ID-Tracking (statt fragiler `l.source === id`-Scans). Höhenlinien (`TerrainManager`) und Wanderwege (`CoordsPage`) nutzen ihn jetzt — die je ~40 Zeilen kopierte Fetch/Add/Remove-Logik samt bespoke Contour-ID-Tracking entfällt.
- **Restore-Pfade konsolidiert (`MapCore`).** `triggerRestore` und das ungenutzte `reapplyBaseLayers` entfernt; es bleibt ein kanonischer Restore-Pfad (`style.load` → `restore()`).

## [3.5.1] - 2026-06-30 16:30

### Geändert
- **In-App-Changelog nachgezogen (`GlobalModals.ts`).** Das über die Versionsanzeige in der Sidebar erreichbare Changelog-Modal hing beim Stand `[3.3.1]`. Kuratierte, user-facing Einträge für `3.3.2`, `3.4.0` und `3.5.0` ergänzt. Hintergrund: Das Modal wird nicht aus `CHANGELOG.md` generiert und muss laut den neuen Release-Regeln (CLAUDE.md → „Releases, versioning & git") bei jedem Release separat gepflegt werden.

## [3.5.0] - 2026-06-30 15:10

### Behoben
- **Sprite-Nachladen (`MapCore.loadSprites`): Skalierung & HiDPI.** Beim manuellen Nachladen von Overlay-/Page-Sprites wurden zwei Dinge falsch gemacht, sichtbar v.a. beim `rd`-Overlay:
  - **`stretchX`/`stretchY`/`content` wurden verworfen** → `icon-text-fit` (Label-Hintergründe) hatte keine Content-Box, der Hintergrund klebte ohne Innenabstand am Text. Jetzt werden alle Sprite-Metadaten (inkl. `textFitWidth`/`textFitHeight`) an `map.addImage()` weitergereicht.
  - **Immer das 1×-Sprite geladen** → auf HiDPI-/Retina-Displays wurden Symbole (z.B. Dienststellen-Pins) doppelt so groß gerendert. `loadSprites` lädt jetzt analog zu MapLibre nativ das `@2x`-Sprite (mit Fallback auf 1× bei fehlendem `@2x`), wodurch der korrekte `pixelRatio` für die Anzeigegröße greift.
- **Höhenlinien-Overlay ließ sich nicht mehr ausschalten (`TerrainManager`).** Die Abschalt-Logik prüfte/entfernte gegen `CONTOURS_OVERLAY.id`, während Sources/Layer unter ihren Style-eigenen IDs (z.B. Source `esri`) registriert wurden → der Entfern-Block lief nie. `TerrainManager` trackt jetzt die tatsächlich hinzugefügten Source-/Layer-IDs und entfernt genau diese (Layer vor Sources). Nebenbei: kein erneutes Fetchen des Contours-Styles mehr bei jedem `applyTerrainInfrastructure`-Durchlauf.
- **Listener-Leak im Tracking (`TrackingMapLayers`).** `ensureLayers()` registrierte bei jedem Aufruf (u.a. bei jedem Basemap-/Style-Wechsel) neue `mouseenter`/`mouseleave`-Handler, die nie entfernt wurden. Handler werden jetzt einmalig registriert und in `destroy()` wieder abgemeldet.
- **Overlay-Style-Cache (`MapPage`).** Ein fehlgeschlagener/abgebrochener Style-Fetch blieb als rejektetes Promise im `styleFetchPromises`-Cache und ließ jeden weiteren Aufruf für dieselbe Overlay-ID dauerhaft fehlschlagen. Der In-Flight-Eintrag wird jetzt per `finally` immer entfernt (Erfolg wie Fehler), sodass Retries möglich sind.

### Geändert
- **CI-Pins (Routing, NAH, Coords):** MapLibre-Standard-Drop-Pins wurden durch CI-Sprites aus dem `oe5ith-markers` Sprite-Set ersetzt. Routing-Start: `ci-pin` (success), Routing-Ziel: `ci-pin` (danger), NAH-Einsatzort und Koordinaten: `ci-symbol-location` (accent). Alle Sprites sind SDF und werden via `icon-color` mit den CI-Tokens eingefärbt. Implementiert als GeoJSON-Source + Symbol-Layer (anstelle von `maplibregl.Marker`), kompatibel mit MapRegistry-Restore bei Kartenthemawechsel.
- **CI-Submodul auf v1.18.0** aktualisiert (map-icons SDF-Shapes, Split-View, Chart, Status-Msg, Width-Utilities u.a.).
- **`icon-halo-width` auf 2** erhöht für Routing-Pins (Start/Ziel) — nutzbar durch korrekten Safe-Area-Puffer in den neuen Sprite-Quellen.
- **NAH-/Coords-Marker `ci-symbol-location`** (accent, ohne Halo, `icon-size: 0.75`, Anchor `center`): Der weiße Halo übermalte den schmalen Fadenkreuz-Ring; die Symbole werden nur mit `icon-color: accent` gerendert. Der zwischenzeitliche Workaround `ci-marker-dot` (wegen fehlerhaftem `evenodd`-SDF-Rendering) entfällt, da das Sprite-Rendering gefixt ist.

## [3.4.0] - 2026-06-20 15:41

### Behoben
- **Routing (SEW/NEF + Sondersignal):** Beim Sondersignal-Routing (`driving-emergency`, „5 schnellste") wurden die berechneten Routen nicht auf der Karte angezeigt. Ursache: `findNearestStations` speicherte die Route als einzelnes GeoJSON-Feature statt als vollständige FeatureCollection, wodurch der Geometrie-Check in `updateRoutesLayer` fehlschlug und die Route übersprungen wurde (zudem verhinderte die falsch geformte Route das Nachladen der korrekten). Jetzt wird die vollständige FeatureCollection gespeichert – Anzeigen (Auge) und Highlight funktionieren wieder.

### Geändert
- **Karte (Container-Hintergrund):** Der Hintergrund des Karten-Containers (`.full-map`) ist jetzt standardmäßig weiß und über den neuen Token `--map-bg` (in `common.css`) bzw. per Stylesheet überschreibbar. Zuvor war er fest auf das dunkle `--bg` gesetzt.
- **Koordinaten (WGS84):** Die bisher getrennten Blöcke „WGS84 Dezimalgrad" und „WGS84 DMS" wurden zu einem einzigen WGS84-Block zusammengefasst. Darüber befindet sich nun ein Segment-Umschalter (`.segmented`, analog zum Modus-Umschalter A→B/SEW/NEF auf der Routing-Seite) zum Wechseln des Anzeige-/Eingabeformats zwischen **Dezimalgrad (DD)**, **Grad Dezimalminuten (DDM)** und **Grad Minuten Sekunden (DMS)**. Der Umschalter ist jederzeit bedienbar; die Eingabefelder werden – wie bei den übrigen Blöcken – erst durch Klick auf den Block editierbar.
- **Koordinaten (WGS84):** Einheitliche Darstellung über alle drei Formate – alle nutzen nun positive Werte mit klickbarem Himmelsrichtungs-Suffix (N/S, E/W), auch Dezimalgrad. Die Zeilen sind formatübergreifend gleich breit (Label · Felder · Suffix an festem Anschlag); die Felder teilen sich den verfügbaren Platz, wodurch das Dezimalminuten-Feld breit genug für mehr Nachkommastellen ist. Der Kopieren-Button übernimmt jetzt die Himmelsrichtung mit.

### Hinzugefügt
- **Koordinaten-Service:** Neues Format „Grad Dezimalminuten" (DDM) inkl. Konvertierungsmethoden (`toDdm`, `getDdm`, `setDdm`) und Round-Trip-Tests.
- **Koordinaten (Plus Code):** Neues Koordinatensystem „Plus Code" (Google Open Location Code, Apache-2.0, Paket `open-location-code`). Das Feld akzeptiert 10- und 11-stellige Codes; die Ausgabe nutzt 11 Stellen, wenn die zugrunde liegende Koordinate genau genug ist (alle numerischen Systeme), und fällt auf 10 Stellen zurück, wenn die Quelle grob ist (Maidenhead). Inkl. `getPlusCode`/`setPlusCode` und Tests.

## [3.3.2-dev] - 2026-06-08 14:14

### Behoben
- **Info-Modul (Regions):** Ein 500 Internal Server Error im neuen API-Endpunkt `/api/region_stations.php` wurde behoben. Die Datenbankverbindung (`$db`) war nicht initialisiert worden.

### Hinzugefügt
- **Info-Modul (Regions):** Interaktive Detailansicht für Bundesländer im Regions Analyse Modul hinzugefügt. Ein Klick auf ein Bundesland zeigt nun eine tabellarische Auflistung aller dortigen Rettungsdienst- und Notarzt-Stationen (RD/NEF), geladen über den neuen API-Endpunkt `/api/region_stations.php`.

### Geändert
- **Info-Modul (Health):** Das HealthModule wurde auf das neue Dashboard-Grid Layout (`.card-grid`, `.card-dashboard`) gemäß CI-Vorgaben umgestellt. Status-Indikatoren verwenden nun die gültigen Modifikatoren (`.online`, `.offline`, `.unknown`).
- **Info-Modul (Tracking):** Das TrackingEndpointsModule wurde in ein vollständiges "Tracking System Telemetrie" Dashboard umgewandelt. Die statische Liste der API-Endpunkte wurde entfernt. Stattdessen nutzt die Ansicht nun die neuen `.card-dashboard` Kacheln für Live-KPIs (Paketrate, Flugzeuge, Schiffe, Uptime), ein kompaktes `.svc-data-grid` für die Tagesstatistiken und detaillierte Paketraten-Metriken pro Receiver-Datenquelle. API-Antworten sind via TypeScript Interfaces streng typisiert und DOM Scoping Risiken wurden behoben.

## [3.3.1-dev] - 2026-05-21 20:01

### Behoben
- **Tracking-Telemetrie:** Anpassung des Interpreters für die Gateway-Telemetrie an das neue JSON-Format des Servers. Falsche Paket-Raten-Anzeigen auf der Tracking-Seite und leere Werte auf der Info-Seite wurden behoben.

### Geändert
- **Tracking-Service:** Vollständige Implementierung des Tracking Gateway V2.1 Lifecycle (`hello` -> `subscribe` -> `ack`) inklusive Map-Bounds-Filtering (Bounding Box der aktuellen Kartenansicht wird an das Gateway gesendet) und Debouncing (500ms).
- **Info-Modul (Gateway):** Erweiterung des TrackingGatewayModules auf der Info-Seite um detailliertere Informationen (Memory aufgeteilt in RSS und Heap, Entitäten aufgeteilt in Aircraft und Vessels, sowie Paket-Raten pro einzelner Datenquelle).
- **Info-Seite Umstrukturierung:** Das `TrackingGatewayModule` wurde entfernt und die `/info/health` Seite vereinfacht. Neu hinzugefügt wurde die `/info/tracking` Route, die ein reines HTTP-Dashboard (`TrackingEndpointsModule`) ohne WebSocket anzeigt.
- **CI-Compliance:** Überarbeitung des `TrackingEndpointsModule` (Austausch provisorischer Layout-Klassen durch offizielle CI-Klassen: `.card-grid`, `.card-dashboard`, `.ci-table`, `.badge-gray`, `.badge-blue`, `.badge-green` und `.badge-red` gemäß `oe5ith-ci` Vorgaben).
- **Tracking-Protokoll:** Ergänzung eines Übergangskommentars für `protocolVersion` in den Typ-Definitionen (`src/types/tracking.ts`).

## [3.3.1] - 2026-05-21 02:40

### Geändert
- **Kern-Abhängigkeiten-Upgrade:** Aktualisierung aller zentralen Build- und Laufzeit-Bibliotheken auf die neuesten Versionen (`typescript` v6.0.3, `vite` v8.0.13, `vitest` v4.1.7, `@fortawesome/fontawesome-free` v7.2.0, `maplibre-gl` v5.24.0, `pmtiles` v4.4.1) zur Verbesserung der Performance (inkl. WebGPU-Support in MapLibre 5) und zur langfristigen Wartbarkeit.
- **Typ-Kompatibilität:** Bereitstellung von `src/vite-env.d.ts` zur Behebung strengerer TypeScript 6-Prüfungen bei CSS-Import-Seiteneffekten.

### Geändert
- **Allgemeine CI-Anpassungen:** Vollständiges Refactoring aller Seiten, Komponenten und Helper zur vollständigen Eliminierung statischer/dynamischer inline CSS `style="..."`-Attribute gemäß CI-Richtlinien (`oe5ith-ci`). Dies umfasst auch die Synchronisation des `oe5ith-ci` Submoduls sowie die anschließende Bereinigung redundanter Hilfsklassen in `src/app.css` und `Sidebar.ts`.
- **Sichtbarkeitssteuerung:** Standardisierung des Sichtbarkeits-Hiding-Mechanismus unter Verwendung der modular in `src/app.css` definierten `.hidden` Utility-Klasse anstelle von inline `style="display: none;"` / `style="display: block;"` / `style="display: flex;"`. Toggling erfolgt nun sauber via `classList` in TypeScript.
- **Header-Navigation:** Hinzufügen der Klasse `.nav-link` zu allen Topbar- und Logo-Navigationslinks in `Topbar.ts` und `main.ts`, um clientseitiges SPA-Routing (ohne Neuladen der Seite) im gesamten Portal zu aktivieren.

### Behoben
- **CI-Konformität:** Beseitigung aller verbleibenden statischen Hex-Farben (`#fff` / `#ffffff`) in den geänderten UI-Dateien und vollständige Ausrichtung an den Farb-Tokens des CI-Submoduls.

### Hinzugefügt
- **CI-Strukturierung:** Erstellung (und anschließende Löschung nach erfolgreicher Upstream-Migration) eines temporären Vorschlagsregisters (`CI_MISSING_STYLES.md`) im Projekt-Root zur Migration der Layout-Utilities.

## [3.3.0] - 2026-05-20 17:30

### Hinzugefügt
- **Tracking-Service:** Migration auf Tracking Gateway Protokoll V2.1 mit Unterstützung für Live-Vessel-Tracks (Schifffahrt).
- **Protokoll-Erweiterung:** Unterstützung für `protocolVersion: 2`, sowie neue `AckMessage` und `ErrorMessage` Typen.
- **System-Telemetrie:** Integration detaillierter Gateway-Statusinformationen (Paketraten, Signalstärken) in die Info-Seite und das Tracking-Portal.

### Geändert
- **Tracking-Architektur:** Umstellung auf Gateway-V2 (`wss://api.oe5ith.at/tracking/ws/v2`) mit Unterstützung für globalen Snapshot + inkrementelle Updates.
- **Tracking-Service:** Refactoring von `TrackingDataService` zur Vermeidung von Code-Duplikaten bei der Track-Verarbeitung und Unterstützung des V2-Protokoll-Lebenszyklus (`hello` -> `subscribe` -> `ack`).
- **Tracking-UI:** Optimierung der Tracking-Seite für Desktop-Ansichten (Entfernung von BBox-Filtern).
- **Tracking-Protokoll:** Aktualisierung der TypeScript-Typen in `src/types/tracking.ts` auf Version 2.1.

### Behoben
- **Tracking-Stabilität:** Fix für verloren gegangene Track-Historie in Snapshots und lückenlose Darstellung der Pfade.
- **Tracking-UI:** Fix für fehlendes Event-Cleanup und Map-Removal in `TrackingPage`.

## [3.3.0] - 2026-05-19 20:45

### Behoben
- **Map Overlays (Hybrid-Logik):** Kritischer Fix für verschwindende Overlays auf der `/karte` Seite. Umstellung auf eine hybride Logik: Layer werden bei Interaktion sofort direkt zur Karte hinzugefügt, während die `MapRegistry` parallel die Persistenz für Basemap-Wechsel sicherstellt.
- **Overlay Persistenz:** Implementierung eines sequentiellen Wiederherstellungsprozesses in `MapCore` mit expliziter Triggerung. Dies garantiert, dass aktive Overlays auf den Seiten `/karte` und `/tracking` nach einem Wechsel der Hintergrundkarte zuverlässig wieder erscheinen.
- **PMTiles & URL-Auflösung:** Zentralisierung der URL-Auflösung in `MapCore.resolveSourceUrls`. Behebt Probleme mit relativen Pfaden in Styles und verhindert korrupte `pmtiles://` URIs durch fälschlicherweise angehängte Slashes.
- **MapRegistry Safety:** Einführung von Deep-Cloning (`JSON.parse(JSON.stringify())`) für alle Quellen- und Layer-Definitionen, um Korruption durch interne MapLibre-Zustandsänderungen zu verhindern.
- **Routing-Stabilität:** Umfassender Fix der Routing-Seite nach der Modularisierung. Wiederherstellung der Karten-Interaktionen, Context-Menüs und CI-konformen Marker.
- **Tracking-Stabilität:** Fix für System-Telemetrie-Abstürze auf der Info-Seite und Verbesserung der Pakete/Min-Anzeige.

### Geändert
- **Architektur-Migration:** Abschluss der vollständigen Migration aller Hauptseiten (`MapPage`, `NahPage`, `RoutingPage`, `CoordsPage`, `TrackingPage`) auf das neue `BasePageController` Pattern für systematisches Ressourcen-Management via `AbortSignal`.
- **Zentrale Steuerung:** Konsolidierung des Terrain- und Höhenlinien-Managements im `TerrainManager`.
- **MapCore Refactoring:** Umstellung auf ein automatisiertes Restaurierungs-System basierend auf der neuen `MapRegistry`.

### Hinzugefügt
- **Routing-Logik:** Implementierung des `RoutingDataService` zur zentralen Verwaltung von Koordinaten und Routenberechnungen.
- **ShipTypeMapper:** Neues Modul zur Klassifizierung von AIS- und ERIDM-Schiffstypen inklusive Unit-Tests.
- **System-Telemetrie:** Integration detaillierter Gateway-Statusinformationen (Paketraten, Signalstärken) in die Info-Seite und das Tracking-Portal.

## [3.2.9] - 2026-05-15 17:30

### Behoben
- **Routing:** Korrektur der Highlight-Logik in der Ergebnisliste; Stationen können nun durch erneuten Klick abgewählt werden.
- **CI-Konformität:** Strikte Anwendung der `MAP_ROUTE_STYLES` für alle Routen-Visualisierungen.

## [3.2.0] - 2026-05-08 14:00

### Hinzugefügt
- **CoordsPage:** Multi-System Umrechner (WGS84, UTM, BMN, MGRS) mit integriertem Geocoding und Topo-Konturen.
- **Global UI:** Standardisierte Scrollbars und Changelog/Copyright Modals.
