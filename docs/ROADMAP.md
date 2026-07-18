# Projekt-Roadmap

Neue Features/Funktionen, die es im Code noch nicht gibt — keine Fixes oder Erweiterungen an
bereits bestehenden Features (die gehören in [TODO.md](./TODO.md)). Umgesetzte Punkte wandern
ins [ROADMAP_ARCHIVE.md](./ROADMAP_ARCHIVE.md).

## Codebase-Qualität: Type-Safety & Modularität (Priorität: zuerst)

Bewusst vor allen anderen Roadmap-Punkten eingeordnet — Ziel ist eine saubere Codebasis als
Grundlage für alle weiteren Features unten. Ausgangsfrage war ein möglicher ES6/ESNext-Umbau;
Recherche vom 2026-07-09 hat ergeben, dass `tsconfig.json` bereits durchgängig `ESNext`/`strict`
verwendet und der Code praktisch keine Legacy-JS-Patterns enthält (0× `var`, 0× alte
`function()`-Expressions, 0× `require()`, async/await bereits dominantes Pattern in 86 von
89 Dateien) — ein Syntax-Umbau entfällt damit. Die Recherche hat stattdessen zwei echte,
quantifizierte Hebel gefunden:

- [x] **Type-Safety: `any`-Escapes systematisch reduzieren** (2026-07-09) — ✅ ERLEDIGT.
  Alle 78 explizit annotierten `any`-Escapes (`: any`/`as any`) in Nicht-Test-`.ts`-Dateien durch
  präzise Typen ersetzt (v.a. `SourceSpecification`/`LayerSpecification`/`ExpressionSpecification`
  aus `maplibre-gl` sowie `Feature`/`FeatureCollection`/`Point`/`LineString`/`Position` aus
  `geojson` — beide bereits Projektabhängigkeiten). 20 Tasks, subagent-driven-development mit
  Task-Review + finalem Whole-Branch-Review (Ready to merge: Yes). Dabei drei echte Bugs gefunden
  und mit sauberer Discriminated-Union-Narrowing behoben (kein Cast): `OverlayLoader.ts`
  (`'source' in newLayer`), `TrackingDataService.ts` (`definition.type === 'geojson'`),
  `TrackingMapLayers.ts` (`shipColorProp`-Typisierung). Zwei neue lokale Interfaces eingeführt für
  bisher ungetypte externe API-Responses (`Sidebar.ts`: `LayerMetaEntry`/`LayerMetaGroup` für den
  Tile-Server; `RegionsModule.ts`: `RegionStation`). Verifiziert: `npx tsc --noEmit` 0 Fehler,
  `npm test` 112/112, `grep -rln ": any\b\|as any\b" src/ --include="*.ts" | grep -v ".test.ts"`
  leer — projektweit.
  **Bekannte Restarbeit (bewusst außerhalb dieses Punkts, siehe Recherche-Scope oben):** `any`
  *innerhalb* generischer Typen (z.B. `Record<string, any>` in `PopupManager.ts`/`MapCore.ts`) war
  nie Teil des Grep-Patterns (`: any`/`as any`) und bleibt offen — kleiner Folge-Scope, kein
  Blocker. Linting-Regel (`@typescript-eslint/no-explicit-any`) weiterhin nicht eingerichtet (kein
  ESLint im Projekt) — eigener Folgepunkt falls gewünscht.
- [x] **`NahMapLayers.ts` (427 Zeilen) — Popup-HTML-Building auslagern** (2026-07-09) — ✅ ERLEDIGT.
  `buildStationPopupHtml()`/`buildMultiStationPopupHtml()` (inkl. `computeStationStatus()` und der
  Badge-Class/Text-Mappings, die nur dafür gebraucht werden) nach `NahPopupBuilder.ts` ausgelagert;
  `NahMapLayers.ts` 429→329 Zeilen. Zugehörige Tests nach `NahPopupBuilder.test.ts` mitverschoben
  (`NahMapLayers.computeGroupStatus` bleibt in `NahMapLayers.test.ts`, da `computeGroupStatus`
  selbst nicht verschoben wurde — reine Layer-/Gruppierungs-Logik, kein Popup-Building). Dabei
  einen kleinen, identischen Copy-Paste-Block (Öffnungszeiten-HTML) in beiden Popup-Funktionen zu
  `buildHoursHtml()` zusammengefasst. Live verifiziert (Playwright gegen echte NAH-Stationsdaten,
  `map.fire('click', …)` auf einen echten Mehrfach-Stationen-Standort): Multi-Popup rendert
  korrekt (Badges, Betriebszeiten, Callsigns). `npx tsc --noEmit` 0 Fehler, `npm test` 112/112.
- [x] **`NahStatusModule.ts` (309 Zeilen) — eine große Funktion aufteilen** (2026-07-09) — ✅
  ERLEDIGT. Die beiden bisher inline in `renderNahStatusModule` steckenden Blöcke ausgelagert:
  statisches Seiten-HTML (Header, Stats-Card-Slot, drei Tabellen-Panels — keine Interpolation, war
  1:1 als reine Funktion extrahierbar) nach `buildNahStatusPageHtml()`; Event-Wiring
  (Sort-Header-Klicks, Refresh-Button, Abort-Listener) nach `wireEvents()` (bleibt als benannte
  Funktion innerhalb des Closures, da sie auf `sortColumn`/`sortDir`/`refreshTimeout` zugreift —
  kein Datei-übergreifendes Splitting nötig, wie im Rechercheergebnis vorgesehen).
  `scheduleNextRefresh`/`renderStatsCards`/`renderTable`/`fetchData` waren bereits benannt und
  blieben unverändert. Live verifiziert (Playwright gegen `/info/nah` mit echten Stationsdaten):
  Stats-Cards rendern korrekt, Sortierung per Spalten-Klick (inkl. Richtungs-Umkehr bei
  Zweitklick) funktioniert, Refresh-Button triggert `fetchData` erneut. `npx tsc --noEmit`
  0 Fehler, `npm test` 112/112.
- [x] **Gemeinsames Status-Badge-Color-Mapping** (2026-07-09) — ✅ ERLEDIGT, Scope beim Umsetzen
  erweitert: Recherche ergab, dass mehr als die 3 ursprünglich genannten Dateien betroffen waren
  (auch `NahStatusModule.ts`, `DebugModule.ts`, `RegionsModule.ts` hatten Badge-Klassen als
  Literal-Strings), und dass `RoutingSidebar.ts` gar kein echtes Status→Farbe-Vokabular hat
  (nur feste Badges pro UI-Zweck: Laden/Fehler/Warnung/Schritt-Anzahl). Nutzer-Entscheidung:
  trotzdem alle Stellen vereinheitlichen, damit alle Seiten denselben Helfer/Typ verwenden statt
  mehrerer Varianten. Neuer `src/lib/BadgeStyles.ts` exportiert `BadgeClass` (die 6 kanonischen
  Klassen aus `oe5ith-ci/docs/badges.md`); alle 6 betroffenen Dateien nutzen jetzt entweder ein
  `Record<Status, BadgeClass>` (echte Vokabulare: NAH-Stationsstatus, Tracking-Entity-Typ,
  RD/NEF-Stationstyp) oder benannte `BadgeClass`-Konstanten (feste Einzelfall-Badges:
  Loading/Error/Warnung/Schritt-Anzahl in Routing, HTTP-OK/Error in Debug, Betriebstyp/
  Standby/Offseason/Aktiv in NahStatus) statt Inline-Literal-Strings. Live verifiziert
  (Playwright): `/routing` zeigt Mautstraßen-Warnbadge (gelb) + Schritt-Anzahl-Badge (grau)
  korrekt; `/info/debug` zeigt HTTP-Status-Badge korrekt grün. `npx tsc --noEmit` 0 Fehler,
  `npm test` 112/112. Damit sind alle vier ursprünglichen Codebase-Qualität-Teilpunkte
  abgeschlossen.

**Nicht gefunden / kein Handlungsbedarf laut Recherche:** Datei-Duplikate/redundante
Utility-Implementierungen sind praktisch nicht vorhanden — die `lib/`-Konvention wird konsequent
eingehalten, `PopupManager.ts` wird korrekt geteilt statt dupliziert, `computeStationStatus`
existiert nur einmal. Die großen Feature-Dateien (`TrackingDataService.ts` 486 Zeilen,
`MapCore.ts` 318 Zeilen) sind laut CLAUDE.md-Konvention (`*DataService`/`*MapLayers`/
`*SidebarAdapter`) erwartungsgemäß groß, keine "God-File"-Verletzung.

## Karten-Interaktion & Such-Features

Neue Funktionen für bessere Karten-Bedienung und Suche.

- [x] **Geocoder-Widget auf Kartenseiten** (2026-07-09) — ✅ ERLEDIGT, Scope beim Brainstorming
  eingegrenzt: statt aller Kartenseiten (ursprünglicher Vorschlag) nur `/karte` neu (dort gab es
  bisher keine Ortssuche), `/coords` (`AddressBlock.ts`) und `/routing`
  (`RoutingSidebar.ts`, Start+Ziel) blieben UI-seitig unverändert, nutzen intern aber jetzt
  dasselbe Modul. Neues `src/lib/GeocoderSearchField.ts` kapselt die bisher dreifach fast
  identisch dupliziert Debounce/Fetch/Dropdown/Outside-Click-Logik hinter einem
  `onSelect`-Callback — Listener an `AbortSignal` gebunden, behebt dabei einen bestehenden
  Listener-Leak (nie entfernte `document`-Click-Handler in `AddressBlock.ts`/`RoutingSidebar.ts`)
  und eine nirgends definierte CSS-Klasse (`form-field-relative` in `RoutingSidebar.ts`, ersetzt
  durch die vorhandene `.pos-relative`-Utility). Auf `/karte` (`src/components/Sidebar.ts`,
  `src/pages/MapPage.ts`): neues Suchfeld oberhalb der Layer-Accordions, Auswahl fliegt die Karte
  zum Ergebnis (`flyTo`) und setzt einen temporären Pin (analog zum bestehenden Coords-Pin-Pattern
  über `MapCore.createPinLayer`/`setPointSource`). Verifiziert: `npx tsc --noEmit` 0 Fehler,
  `npm test` 112/112. **Bekannte Restarbeit (erledigt 2026-07-18):** automatisierter Test für
  `GeocoderSearchField` nachgezogen, siehe TODO.md → „DOM-Testumgebung".
- [x] **MapLibre GL Geolocation-Button** (2026-07-09) — ✅ ERLEDIGT. `maplibregl.GeolocateControl`
  zentral in `MapCore.init()` neben dem bestehenden `NavigationControl` ergänzt (`top-right`),
  gilt dadurch automatisch für alle 5 Kartenseiten ohne Änderung an den einzelnen
  Page-Controllern. Einmaliges Hinspringen (`trackUserLocation: false`), kein kontinuierliches
  Tracking. Verifiziert: `npx tsc --noEmit` 0 Fehler, `npm test` 112/112.

## NAH: Anschlussfeatures

- [ ] **NAH: Betreiber-spezifische Icons** — Von TODO.md hierher verschoben (2026-07-18): eher
  ein Komfort-Update als eine reine Erweiterung, braucht einen tieferen Eingriff in die Logik
  (neues Datenfeld + eigene Layer-Architektur für die Status-Anzeige), kein mechanisches Anhängen
  an Bestehendes. Im Sprite-Set `oe5ith-markers` liegen bereits 9 Betreiber-Logos
  (`nah-adac-luftrettung`, `nah-oeamtc-flugrettung`, `nah-drf-luftrettung`, …), aktuell ungenutzt.
  Ziel: NAH-Stationsmarker zeigen das Icon ihres Betreibers statt eines generischen Symbols.
  Braucht (a) ein neues `operator`-Feld in `NahStation`/`api/nah.php` (aktuell nur `name`/
  `callsign` vorhanden, keine Zuordnung zu den Sprite-Keys), und (b) eine separate Lösung für die
  Status-Anzeige (grün/rot/grau), da diese Sprites nicht-SDF sind und sich nicht per `icon-color`
  einfärben lassen (z.B. zusätzlicher Status-Dot-Layer neben dem Betreiber-Icon). Bewusst aus der
  U5-Migration
  ([docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md](./superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md))
  herausgehalten, die auf ein generisches Status-Icon setzt.

## Routing: Anschlussfeatures

Kontext: [docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md](./superpowers/specs/2026-07-04-routing-sidebar-details-design.md)
(Fahrmodus-Badge, Warn-Badges, Turn-by-Turn für A→B — Phase 1 in TODO.md/CHANGELOG.md).

- [ ] **Gleiche Detailanzeige für SEW/NEF-Einzelstation** — Fahrmodus-Badge,
  Maut-/Zufahrts-Warn-Badges und (sobald verfügbar) Turn-by-Turn-Anweisungen
  zusätzlich für die aktuell hervorgehobene Station im SEW/NEF-Modus anzeigen
  (`RoutingSidebarAdapter.ts`, `onHighlight`-Callback). Bewusst nicht Teil der
  A→B-Umsetzung (2026-07-04) — dort zeigt die Liste bereits Dauer/Distanz pro
  Station, Turn-by-Turn pro Station wäre zusätzlicher Scope.
- [x] **URL-Parameter für Routing-Deep-Links** (2026-07-18) — ✅ ERLEDIGT.
  `/routing?mode=ab|sew|nef&target=<lat>,<lon>&start=<lat>,<lon>&profile=<profilId>` — Koordinaten
  im selben `lat,lon`-Format wie die Eingabefelder selbst (`parseCoords()` in `RoutingSidebar.ts`,
  jetzt exportiert und wiederverwendet statt dupliziert). Neue, DOM-freie Parse-Funktion
  `parseRoutingDeepLink()` in `src/features/routing/RoutingDeepLink.ts` (11 Unit-Tests); Anwendung
  auf die Sidebar über neue `RoutingSidebarAdapter.applyDeepLink()` (Modus per echtem `.click()`
  auf den passenden `.segmented-btn` gesetzt, Profil nur falls in der geladenen Profil-Liste
  vorhanden, Koordinaten über das bestehende `setCoord()`). **Nutzer-Entscheidung:** bei
  `mode=ab` nur Felder vorausfüllen (Start-Button bleibt manueller Trigger); bei `mode=sew`/`nef`
  (Nächste-Station-Suche, konzeptionell wie `/nah`) wird automatisch berechnet, da reiner
  Lesezugriff ohne Risiko. Kein URL-Parameter-Handling im Router (`src/main.ts`) nötig —
  `RoutingPageController.mount()` liest `window.location.search` selbst. Dafür musste
  `RoutingSidebarAdapter.init()` von "feuert und vergisst" auf awaited/async umgestellt werden
  (Voraussetzung, damit die Sidebar-DOM inkl. geladener Profile steht, bevor Werte gesetzt
  werden) — behebt nebenbei eine potenzielle Race Condition (Map-Klicks vor fertigem
  Sidebar-Rendering griffen zuvor ins Leere). 196 Tests grün, 0 TypeScript-Fehler. **Hinweis:**
  Browser-Verifikation weiterhin ausstehend (keine Playwright-Umgebung hier).

## Neue Seiten

Aus `docs/proposals/todo.txt` übernommen (2026-07-05).

- [ ] **Hilfeseite** — Übersicht/Beschreibung der App-Funktionen, Einstieg vermutlich über einen
  neuen Topbar-Link (analog zu den bestehenden `.nav-link`-Einträgen in `src/main.ts`).
- [ ] **Isochronen-Abfrage-Seite** — neue Karten-Seite für Erreichbarkeitsanalyse (z.B. über die
  ORS-Isochrones-API, analog zur bestehenden ORS-Routing-Anbindung in `api/ors.php`), strukturell
  an den bestehenden Karten-Seiten orientiert (siehe `docs/page-types.md`/`sidebar-types.md` in
  `oe5ith-ci` für passende Sidebar-/Layout-Patterns).

## Repo-Pflege & Dokumentation

Keine Code-Features im engeren Sinn, aber größere, planbare Initiativen — deshalb hier statt in
TODO.md erfasst. Hintergrund: `CLAUDE.md` referenziert seit 2026-07-01 explizit die Standards
hinter Versionierung/Changelog/Commits/Code-Stil/Geodaten/Accessibility/Security/Performance
(siehe dortige Sektion „Standards-Referenzen"). Kleinere, direkt umsetzbare Angleichungen
(PSR-12-Audit, OWASP-Self-Check) stehen als eigene Punkte in TODO.md, nicht hier.

- [x] **Bestehende Dokumente an referenzierte Standards angleichen** (2026-07-18) — ✅ ERLEDIGT.
  `CLAUDE.md` dokumentiert jetzt das vollständige, offizielle 6-Kategorien-Set von Keep a
  Changelog (`Hinzugefügt`/`Geändert`/`Veraltet`/`Entfernt`/`Behoben`/`Sicherheit`) statt bisher
  nur 4 — per Proposal-Zyklus (`docs/proposals/archive/2026-07-18-changelog-full-categories-{draft,review}.md`),
  da es eine `CLAUDE.md`-Konvention ändert. Auslöser: 2 historische Security-Fixes (2026-07-08,
  hardcoded DB-Passwort/API-Key, `diag.php`-Info-Disclosure) liefen mangels Kategorie unter
  `Hinzugefügt`/`Behoben`; `Veraltet` wird ergänzt, obwohl noch nie gebraucht (Nutzer-Entscheidung:
  strikt nach Spec, nicht nur bisher genutzte Kategorien dokumentieren). Keine rückwirkende
  Umkategorisierung bestehender Einträge. Nebenbei: ein einzelner historischer Eintrag
  (`CHANGELOG.md` v3.3.1) nutzte `### Aktualisiert` statt einer der 4 (jetzt 6) dokumentierten
  Kategorien — korrigiert zu `### Geändert`. Der `release: vX.Y.Z`-Commit-Typ war bereits als
  bewusste Abweichung dokumentiert, kein weiterer Handlungsbedarf. `TODO_ARCHIVE.md`/
  `ROADMAP_ARCHIVE.md`: einzige gefundene Inkonsistenz war der Überschriften-Stil
  (`## Unreleased (DATUM)` vs. `## DATUM — Beschreibung`) — auf einheitliches
  `## YYYY-MM-DD — Beschreibung` (bzw. `## YYYY-MM` für den älteren monatsweisen Block ohne
  Tagesgranularität) vereinheitlicht.
- [ ] **Continuous-Integration-Pipeline (Build-Automatisierung, z.B. GitHub Actions)** — aktuell
  läuft `npx tsc --noEmit && npm test` (sowie die neuen `composer run lint` /
  `bash scripts/security-audit.sh` / `npm run validate:openapi` aus der Standards-Angleichung,
  siehe [docs/superpowers/specs/2026-07-08-standards-angleichung-design.md](./superpowers/specs/2026-07-08-standards-angleichung-design.md))
  nur lokal/manuell vor jedem Commit. Ziel: bei jedem Push/PR automatisch ausführen. Nicht zu
  verwechseln mit dem `oe5ith-ci`-Submodul (Corporate Identity) — hier geht es um eine
  Build-/Test-Pipeline. Bewusst als eigener ROADMAP-Punkt (nicht Teil der Standards-Angleichung
  selbst), da eine neue Infrastruktur-Entscheidung (welcher CI-Anbieter, Secrets-Handling für
  DB-Zugriff in der Pipeline etc.) nötig ist.
- [x] **Vite-/PHP-Dev-Server: Robustheit & Health-Check** (2026-07-18) — ✅ ERLEDIGT. Root Cause
  geklärt: `concurrently --kill-others` (package.json `dev`) greift nur, solange der
  `concurrently`-Elternprozess selbst noch läuft — stirbt/verwaist der (z.B. weil eine frühere
  Session beendet wurde, ohne die Kindprozesse zu stoppen), laufen Vite/PHP unabhängig weiter,
  ohne dass noch etwas sie beendet. Kein automatischer `predev`-Hook (Nutzer-Entscheidung: auf
  Abruf statt bei jedem Start, kein Perf-/Risiko-Overhead im Normalfall) — stattdessen neuer
  `npm run dev:reset` (`scripts/dev-reset.sh`): killt gezielt nur Prozesse auf Port 8000/8081
  (nicht pauschal alles was „vite"/„php" heißt — kein Kollateralschaden bei anderen
  Prozessen auf der Maschine), leert `node_modules/.vite`. In `CLAUDE.md` bei den Commands
  dokumentiert (Symptom `504 Outdated Optimize Dep` → `npm run dev:reset` → `npm run dev` neu
  starten). Manuell getestet (mit/ohne laufende Prozesse auf den Ports). 196 Tests grün, 0
  TypeScript-Fehler (reine Tooling-Änderung, kein App-Code betroffen).
- [x] **Bausteine-Katalog für wiederverwendbare interne Module** (2026-07-18) — ✅ ERLEDIGT.
  `docs/architecture/bausteine.md`, automatisiert generiert (`npm run docs:bausteine`,
  `scripts/generate-bausteine-catalog.mjs`) aus Exports + JSDoc-Kommentaren in `src/lib/` —
  Nutzer-Entscheidung: automatisiert statt manuell gepflegt, damit es nicht veraltet. Bewusst nur
  `src/lib/` (seitenübergreifend wiederverwendbare Bausteine, 25 Dateien) — `src/features/*/`
  folgt bereits dem in `CLAUDE.md` dokumentierten, seitenspezifischen
  `*DataService`/`*MapLayers`/`*SidebarAdapter`-Muster und ist kein "wiederverwendbarer
  Baustein" im Sinne des Tickets. Pro Datei: Beschreibung (erster Export mit direkt darüber
  stehendem JSDoc-Block), Import-Pfad, Liste der Exports. Nützlicher Nebeneffekt: deckt auf,
  wo Doku fehlt — 10 von 25 Dateien haben aktuell keinen JSDoc-Kommentar und zeigen
  `_TODO: Beschreibung ergänzen_` (als eigener TODO.md-Punkt erfasst, nicht in diesem Rahmen
  nachgezogen). `CLAUDE.md` verweist bei „Map infrastructure" jetzt auf den Katalog. 196 Tests
  grün, 0 TypeScript-Fehler (reine Tooling-/Doku-Änderung, kein App-Code betroffen).
- [x] **Repo-Root-Ordnerstruktur aufräumen** (2026-07-18) — ✅ ERLEDIGT, Scope beim Brainstorming
  auf die **Dokumente** eingegrenzt (Nutzer-Entscheidung: `deploy-website.sh`/`nginx.conf`/
  `phpcs.xml` bleiben am Root, dafür kein eigener `deploy/`-Ordner). Verschoben nach `docs/`:
  `TODO.md`/`TODO_ARCHIVE.md`/`ROADMAP.md`/`ROADMAP_ARCHIVE.md`/`CHANGELOG.md`.
  `AGENT_INSTRUCTIONS.md` bleibt bewusst am Root (Korrektur nach initialem Proposal-Missverständnis:
  nur TODO/ROADMAP/CHANGELOG sollten ziehen, nicht die Regel-Datei selbst). `GEMINI.md` komplett
  entfernt (Gemini CLI wird für dieses Projekt nicht genutzt). Dabei **die generische Regel in
  `AGENT_INSTRUCTIONS.md` §3 selbst geändert** („am Repo-Root" → „unter `docs/`", bezieht sich
  nur auf TODO/ROADMAP-Dateipaare) statt nur repo-spezifisch abzuweichen — Nutzer-Entscheidung:
  die Datei ist bisher erst in 2 Repos übernommen, `docs/`-Platzierung ist eine klare
  Verbesserung. Per Proposal-Zyklus
  (`docs/proposals/archive/2026-07-18-docs-root-cleanup-{draft,review}.md`). `CLAUDE.md`/
  `README.md` (bleiben am Root) auf die neuen `docs/`-Pfade umgebogen; interne Querverweise der
  verschobenen Dateien angepasst (u.a. einen dabei gefundenen, schon vorher kaputten
  `../docs/...`-Link in `ROADMAP.md` mitkorrigiert). Historische Dokumente (Specs, Pläne,
  archivierte Proposals) bewusst **nicht** rückwirkend angepasst — referenzieren weiterhin die
  zum jeweiligen Erstellungszeitpunkt gültigen Pfade. 196 Tests grün, 0 TypeScript-Fehler (reine
  Datei-/Doku-Verschiebung, kein App-Code betroffen).

## Karten-Legende: weitere Optimierung

Anschluss an TODO.md → „Map-Subsystem: Anschlussfeatures" (Legende Schritt 1+2, v3.9.0) und die
`layers.json`-Konsumierung (2026-07-12, unreleased,
[docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md](./superpowers/specs/2026-07-12-map-legend-granularity-design.md)).
Bewusst hier statt in TODO.md — die folgenden Punkte sind keine konkret spezifizierten
Erweiterungen, sondern offene Richtungen, die erst einen eigenen Brainstorming-Durchgang
brauchen. Die Schritte 3-5 (Legende auf `/nah`/`/routing`/`/tracking` anwenden) sind bereits
konkret in TODO.md erfasst und **nicht** Teil dieses Punkts.

- [ ] **`legend_items`-Kuratierung auf weitere Overlay-Templates ausweiten** — aktuell liefert
  `layers.json` nur beim `anfahrtszeit`-Template kuratierte `legend_items` (die 6-stufige
  Farbskala); alle anderen 7 Templates (Autobahnen, Bezirke, Leitstellen-Bereiche, RD/NEF-Zonen,
  NAH-Stützpunkte, …) zeigen weiterhin einen Legenden-Eintrag pro einzeln getoggelter
  Gruppe/Instanz statt einen pro semantischer Kategorie (z.B. „A1"/„A10"/„A11" statt einem
  einzigen „Autobahn"-Eintrag) — das ursprüngliche Granularitätsproblem aus dem Live-Test
  2026-07-09 ist damit nur für Anfahrtszeit gelöst, nicht generell. Zwei Stoßrichtungen offen:
  (a) weitere Templates extern in `layers.json` mit `legend_items` kuratieren (analog
  Anfahrtszeit), oder (b) client-seitig Gruppen mit identischer `color`/`type` zu einer Zeile
  zusammenfassen (die ursprünglich verworfene Alternative (a) aus dem 2026-07-09-Design, jetzt
  ggf. neu zu bewerten).
- [ ] **`opacity`-Feld aus `layers.json` für Swatches nutzen** — bewusst außerhalb der
  2026-07-12-Umsetzung gelassen (siehe Spec, „Out of Scope"). Legenden-Swatches rendern aktuell
  immer volldeckend, unabhängig von der tatsächlichen Layer-Opacity auf der Karte (z.B.
  Anfahrtszeit-Flächen mit 0.4 Opacity zeigen einen kräftigeren Swatch, als auf der Karte zu
  sehen ist) — könnte die Legende irreführend wirken lassen, sobald mehr Overlays mit
  niedriger Opacity dazukommen.
- [ ] **Legenden-Gruppierung/Section-Header** — `MapLegend.ts` kennt aktuell nur eine flache
  Liste von Einträgen ohne Überschriften. Bei vielen gleichzeitig aktiven Overlays (z.B. mehrere
  Autobahnen + Anfahrtszeit-Ringe + Bezirke) könnte eine Legende ohne erkennbare Gruppierung
  unübersichtlich werden. Noch nicht validiert, ob das in der Praxis tatsächlich ein Problem ist
  — vor einer Umsetzung erst live beobachten.
