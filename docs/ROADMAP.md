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
- [ ] **Valhalla-Manöver-Typ-Abdeckung über 29-Einträge-Tabelle hinaus erweitern** (gemeldet
  2026-08-22, finale Branch-Review der Turn-by-Turn-Parität) — die bestehende
  `VALHALLA_TYPE_TO_KIND`-Tabelle (`src/lib/ValhallaRouteInterpreter.ts`) wurde gegen die zur
  Planungszeit dokumentierten Typen 0-36 entworfen; Live-Verifikation gegen die produktiv
  erreichbare Instanz (v3.8.3) hat bestätigt, dass real weitere Typen jenseits 36 existieren
  (39/40/41 = Aufzug/Treppe/Rolltreppe im `pedestrian`-Costing, das im UI bereits als Profil
  angeboten wird; vermutlich auch 37/38, wahrscheinlich `kMergeRight`/`kMergeLeft`, unbestätigt).
  Nicht gemappte Typen fallen aktuell sicher auf `'straight'` zurück (kein Fehlverhalten, aber
  keine vollständige Abdeckung). Braucht: (a) Live-Re-Ableitung des tatsächlich vollständigen
  Enums gegen die deployte Instanz statt sich auf den dokumentierten Bereich zu verlassen, (b)
  eine Design-Entscheidung, ob diese neu entdeckten Konzepte eigene `ManeuverKind`-Werte/Icons
  brauchen — bei einer App für Einsatzfahrzeug-Routing ist fraglich, ob Aufzug-/Treppen-/
  Rolltreppen-Navigation überhaupt relevant ist, das verdient eine bewusste Prüfung statt
  reflexhaftem Ergänzen, (c) falls ja: Folgeeintrag zum bereits gestellten
  [oe5ith-ci#2](https://github.com/brikbrik94/oe5ith-ci/issues/2)-Icon-Request. Kontext:
  `docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md`.
  **Update 2026-08-22:** oe5ith-ci#2 (die ursprüngliche 16-Icon-Anfrage) wurde inzwischen zügig
  umgesetzt (`oe5ith-ci` v1.26.0) — senkt die Hürde für einen möglichen Folge-Request, falls (b)
  positiv entschieden wird. Dabei außerdem
  [oe5ith-ci#3](https://github.com/brikbrik94/oe5ith-ci/issues/3) gefunden/gemeldet (unabhängiger
  Bug: `ci-maneuver-uturn-left` dupliziert `ci-maneuver-uturn`), siehe `docs/ci/open-items.md`.

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
- [x] **Continuous-Integration-Pipeline (Build-Automatisierung, GitHub Actions)** (2026-07-18) —
  ✅ ERLEDIGT. `.github/workflows/ci.yml`, 2 parallele Jobs: `frontend` (`npx tsc --noEmit`,
  `npm test`, `npm run validate:openapi`) und `backend` (`composer run lint`,
  `bash scripts/security-audit.sh`). Trigger: Push auf `master` + alle Pull Requests. Vor der
  Umsetzung geprüft: **kein** Secrets-/DB-Zugriffs-Handling nötig — alle Checks sind entweder
  statische Analyse (`api/*.php`-Secret-Scan, PSR-12) oder laufen mit gemockten Daten (alle 196
  Tests nutzen Fake-URLs, kein echter Fetch/DB-Zugriff). Das im ursprünglichen Punkt befürchtete
  Infrastruktur-Problem existierte also nicht. Kein `submodules: true` beim Checkout nötig —
  `oe5ith-ci` wird von keinem Check angefasst (nur Doku-Kommentare referenzieren es, `vite.config.ts`
  ignoriert es explizit im Watcher). Alle Workflow-Schritte lokal mit frischem `npm ci`/
  `composer install` verifiziert (identische Kommandos wie im Workflow). Nicht zu verwechseln mit
  dem `oe5ith-ci`-Submodul (Corporate Identity) — hier geht es um eine Build-/Test-Pipeline.
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
- [ ] **Lokale Dev-Config vereinheitlichen + Endpoint-Info-Datei** — Auslöser: Test-Setup auf
  einer zweiten Maschine, `vite.config.ts:8` hat den Vite-Dev-Server-Host hart auf `100.64.0.1`
  (Tailscale/VPN-Adresse der Original-Dev-Maschine) codiert — auf anderen Rechnern bindet Vite
  damit nicht. `loadEnv()` wird in `vite.config.ts:4` bereits importiert/aufgerufen, das Ergebnis
  aber aktuell nirgends verwendet (toter Code) — naheliegender Ansatzpunkt, um den Host stattdessen
  über eine gitignorte `.env.local` konfigurierbar zu machen (Twelve-Factor-Config-Prinzip, das
  `CLAUDE.md` bereits für `api/config.local.php` referenziert). Ziel geht aber über den einen
  Host-Wert hinaus: eine neue Info-Datei (z.B. `docs/LOCAL_DEV_SETUP.md`) soll pro externem
  Endpoint dokumentieren, was für einen anderen Rechner/eine andere Umgebung anzupassen ist —
  u.a. `ORS_URL`/`NOMINATIM_URL`/`DB_HOST` in `api/config.local.php` (Beispiel bereits vorhanden:
  `config.local.php.example`), Tile-Server-URL, ADS-B/AIS-Endpunkte — inkl. dem konkreten
  Anwendungsfall „lokale ORS-Instanz zum Testen einbinden" (Nachbar-Route, wenn kein eigener
  ORS-Server läuft: Fallback auf den Produktions-`ORS_URL`?). Braucht vorab Klärung, ob/wie die
  neue `.env.local` mit dem bereits bestehenden `config.local.php`-Mechanismus sauber
  zusammenspielt, statt einen zweiten, parallelen Config-Weg zu etablieren.
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

- [x] **`legend_items`-Kuratierung auf weitere Overlay-Templates ausweiten** (2026-08-12) — ✅
  ERLEDIGT über Alternative (b) (client-seitiges Zusammenfassen). **Zwischenzeitlich auch
  serverseitig weiter fortgeschritten als hier vermerkt:** `legend_items` deckt inzwischen 8
  Templates ab (nicht nur `anfahrtszeit`), verifiziert bei der Prüfung gegen
  `geodata-plugin-standard` (siehe `docs/geodata/open-items.md`). Für die verbleibenden
  Templates ohne `legend_items` (Autobahnen/`strassen`, `gebiete`, `leitstellen`, `rd`, `nah`,
  `linz-ag-linien`, `ski-areas-*`) wurde jetzt clientseitiges Dedup ergänzt:
  `computeSwatchDedupKey()` (`src/lib/resolveLegendSwatch.ts`) fasst Gruppen mit identischem
  `overlayId`+`template`+`color`+`type` zu einer Legenden-Zeile zusammen (z.B. alle Autobahnen zu
  „Autobahnen" statt 36 einzelnen „A1"/„A10"/…-Zeilen), ref-gezählt analog zum bestehenden
  `legendItemsRefCount`-Muster (`MapPage.ts`). Bewusst *nicht* rein nach `template`+`color`
  dedupliziert (hätte `gemeinden`/`bezirke` — verschiedene Overlays, zufällig gleiche Randfarbe —
  fälschlich zusammengefasst) und *nicht* rein nach `overlayId`+`template` (hätte
  `leitstellen-bereiche` — ein Overlay, ein Template, 5 echte Zonenfarben — fälschlich auf eine
  Zeile reduziert) — beide Fälle mit echten Live-Daten verifiziert, siehe Tests in
  `resolveLegendSwatch.test.ts`. Live per Playwright gegen `/karte` verifiziert: 3 Autobahn-
  Instanzen → 1 Zeile „Autobahnen"; Gemeinden+Bezirke bleiben 2 getrennte Zeilen. Die
  „echte" Kuratierung für kategorisierte Mehrfarb-Skalen (z.B. Ski-Pisten/-Loipen mit gemeinsamer
  Schwierigkeitsgrad-Farbskala, kompakt als mehrere Swatches + ein Label) ist jetzt als
  Schema-Anfrage bei `geodata-plugin-standard` verfolgt (Issue
  [#1](https://github.com/brikbrik94/geodata-plugin-standard/issues/1), Punkt 5/7 dort) statt
  hier weitergeführt.
- [x] **`opacity`-Feld aus `layers.json` für Swatches nutzen** (2026-08-12) — ✅ ERLEDIGT.
  `LayerMetaGroup.opacity`/`LayerToggleEvent.opacity` (`Sidebar.ts`) → `LegendEntry.opacity`
  (`src/types/common.ts`) → `MapLegend.addEntry()` setzt `marker.style.opacity` inline (überschreibt
  `oe5ith-ci`s bis dahin statisch fixe `opacity: 0.8` auf `.map-legend-area`, die unabhängig von
  echten Daten war). Live verifiziert: Leitstellen-Bereiche-Swatch zeigt echte `opacity: 0.25` statt
  fix 0.8. 7 neue Tests (`MapLegend.test.ts`, `resolveLegendSwatch.test.ts`).
- [x] **Geteilte Farbskalen (`legend_scale_id`/`legend_sections`) + `icon`-Feld konsumiert**
  (2026-08-12) — ✅ ERLEDIGT (`docs/superpowers/plans/2026-08-12-legend-v1.1-fields.md`). Löst
  die im vorigen Punkt aufgeschobene „echte Kuratierung" für kategorisierte Mehrfarb-Skalen
  (`geodata-plugin-standard`-Issue #1, Punkt 5/7): `resolveLegendItemsForGroup()`
  (`resolveLegendSwatch.ts`) löst `legend_scale_id` gegen den Top-Level-`legend_sections`-Block
  auf (gated durch `isLegendSchemaAtLeast(version, 1, 1)`, numerisch verglichen laut Standard
  §5.6), mit Fallback auf klassische `legend_items`, wenn Version/Skala fehlt. Ref-Zählung
  generalisiert von `overlayId` auf `legendGroupKey` (`scale:<id>` für geteilte Skalen) — dedupliziert
  jetzt auch **über Overlay-Grenzen hinweg** (mehrere Datasets mit derselben `legend_scale_id`
  ergeben eine Zeile, nicht eine pro Overlay). Live per Playwright gegen `/karte` verifiziert:
  Ski-Pisten+Loipen zeigen 8 Schwierigkeitsgrad-Zeilen (nicht 16), Zeilen bleiben erhalten
  solange mindestens ein beitragendes Overlay aktiv ist. `type: "icon"`-Gruppen bekommen einen
  generischen Fallback-Marker (`fa-solid fa-location-dot`) statt echtem Sprite-Rendering (kein
  Sprite-Name in `layers.json` ist für die Legende auflösbar); Live-Daten haben aktuell noch
  keine `type: "icon"`-Gruppe, daher End-to-End nur per Netzwerk-Mock verifiziert (Unit-Tests
  decken die Logik ab). Nebenbei ein Bug in `MapLegend.ts` gefixt: Icon-Einträge mit `color: null`
  (laut Standard-Beispiel der Normalfall) rendern jetzt das Icon statt den „Farbe nicht
  auflösbar"-Fallback. **`width`/`dasharray`/`outline_color`/`outline_width` bewusst NICHT
  Teil dieser Runde** — brauchen neue `oe5ith-ci`-Swatch-Varianten (gestrichelte Linie,
  Linie-mit-Casing, Fläche-mit-Rand), die noch nicht existieren; Inline-Styles dafür sind laut
  `oe5ith-ci/docs/for-coding-agents.md` nicht zulässig (neues visuelles Muster, keine zur
  Laufzeit berechnete Größe). Folgt als separates `oe5ith-ci`-Issue + Folge-Runde.
- [x] **`width`/`dasharray`/`outline_color`/`outline_width` aus `layers.json` in der Legende
  darstellen** (2026-08-12) — ✅ ERLEDIGT
  (`docs/superpowers/plans/2026-08-12-legend-line-cased-outline-fields.md`), nachdem `oe5ith-ci`
  v1.25.0 (+ Doku-Fix `0092387`) die nötigen Swatch-Varianten lieferte (schließt
  [oe5ith-ci#1](https://github.com/brikbrik94/oe5ith-ci/issues/1)).
  `resolveSwatchFromLayersMetaColor()` (`resolveLegendSwatch.ts`) entscheidet zwischen einem
  neuen Typ `line-cased` (Innen-/Außenfarbe, z.B. Skilift-Symbole) und einfachem `line`
  (`width`/`dasharray`) — `line-cased` nur, wenn ALLE 4 Felder auflösbar sind, sonst Fallback auf
  `line` ohne die Umrandung zu erfinden (z.B. `ski-lifts`, wo `color` durch eine
  Zoom-`interpolate`-Expression unauflösbar ist). `area` bekommt `outline_color`/`outline_width`
  nur, wenn beide gesetzt sind (ein einzelnes Feld — wie live bei `ski-runs-downhill`/`-nordic`
  — wird verworfen statt zu werfen). `MapLegend.addEntry()` 1:1 nach der `oe5ith-ci`-
  Referenzimplementierung portiert (gleiche Clamp-Bereiche, gleiche Dasharray-Skalierung, gleiche
  Validierung). `computeSwatchDedupKey()` erweitert um die 4 neuen Felder. Wie beim
  `legend_scale_id`/`icon`-Punkt zuvor: keine Live-Gruppe erreicht aktuell den
  Einzel-Swatch-Pfad mit diesen Feldern (alle 3 realen Kandidaten gehen über `legend_items`/
  `legend_scale_id`) — End-to-End per Playwright-Netzwerk-Mock verifiziert (line-cased-DOM-
  Struktur, Dasharray-Gradient, Flächen-Rand), Unit-Tests decken die Entscheidungslogik ab.
- [x] **`legend_items`/`legend_sections`-Items im echten Kartenstil statt generischem Punkt
  rendern** (gemeldet 2026-08-13) — ✅ ERLEDIGT (2026-08-16), aber anders als ursprünglich geplant.
  Der Blocker (kategorisierte Casing-Farbe pro Schwierigkeitsgrad nicht ausdrückbar) wurde nicht
  durch eine kleine Standard-Erweiterung gelöst, sondern durch das größere `render`/`variants`-
  Modell aus [geodata-plugin-standard#2](https://github.com/brikbrik94/geodata-plugin-standard/issues/2)
  (Schema v2.0→v2.1, siehe `docs/geodata/open-items.md`): jede Gruppe trägt jetzt `render[]`
  (ein `Part` pro echtem Style-Layer, `kind`/`color`/`width`/`dasharray`/`radius`/`stroke_*`) und
  optional `variants[]` (filter-basierte, sich ausschließende Formen wie Pisten-„Buckelpiste"
  oder Lifte-Status). Client-Konsum neu implementiert, nicht die alte `legend_items`-Punkt-Legende
  erweitert: `src/lib/renderPartsLegend.ts` (`resolveRenderPartsRows()`, pure Funktion, testbar)
  baut **eine Legenden-Zeile pro Form-Variante** statt einer Zeile pro Skalen-Item (löst dabei
  auch den ursprünglich befürchteten Zeilen-Explosions-Effekt — Farbabwandlungen laufen als
  Chip-Streifen innerhalb der einen Zeile, siehe `docs/superpowers/specs/2026-08-16-legend-render-parts-design.md`).
  `MapLegend.addPartsRow()` rendert jeden Chip als echtes SVG (nicht CSS-Näherung) mit den realen
  `width`/`radius`/`stroke_width`-Werten und korrekter MapLibre-`dasharray`-Semantik (Pixel-Länge
  = `dasharray`-Wert × `width`). Zusätzlich, sofern die Gruppe eine geteilte Skala referenziert,
  läuft **derselbe** bestehende `legendItems`/`legendGroupKey`-Ref-Zähl-Mechanismus (kein
  MapPage.ts-Änderungsbedarf) für einen einmaligen Farb-Erklärungs-Block. Gated auf Schema-Version
  ≥2.0 (`isLegendSchemaAtLeast`), alle anderen Overlays unverändert auf dem alten Pfad. `.map-legend-parts-*`
  ist ein lokales, noch nicht in `oe5ith-ci` generalisiertes Pattern (analog `.map-legend-unknown`).
  Live gegen `/karte` mit Playwright verifiziert (Pisten/Lifte aktiviert, Zeilen/Chips korrekt,
  sauberes Add/Remove, keine Konsolenfehler).
- [ ] **Legenden-Gruppierung/Section-Header** — `MapLegend.ts` kennt aktuell nur eine flache
  Liste von Einträgen ohne Überschriften. Bei vielen gleichzeitig aktiven Overlays (z.B. mehrere
  Autobahnen + Anfahrtszeit-Ringe + Bezirke) könnte eine Legende ohne erkennbare Gruppierung
  unübersichtlich werden. Noch nicht validiert, ob das in der Praxis tatsächlich ein Problem ist
  — vor einer Umsetzung erst live beobachten. Teilweise überschneidend mit
  `geodata-plugin-standard`-Issue [#1](https://github.com/brikbrik94/geodata-plugin-standard/issues/1)
  Punkt 6 (Trennzeilen/Überschriften als Export-Strukturkonzept für geteilte Farbskalen) — dort
  aber schema-getrieben, hier eher pures Client-Rendering-Thema; Zusammenhang bei Umsetzung neu
  bewerten.
  **Teilweise erledigt für den `legend[]`-Pfad (2026-08-22):** `legend[].heading` wird seit der
  v3.0-Umstellung (`MapLegend.addHeading()`, wiederverwendet `.overlay-section-label` aus
  `oe5ith-ci`) als Section-Header gerendert — siehe
  `docs/superpowers/plans/2026-08-22-legend-v3-groups-legend-split.md`. Das allgemeine Problem
  (Gruppierung *beliebiger* Overlays, nicht nur `legend[]`-Quellen) bleibt offen.
- [ ] **Farb-Erklärungs-Block für `legend[]`-Skalen fehlt** (gemeldet 2026-08-22, finale
  Branch-Review der v3.0-Umstellung) — `legend[].rows[].render`-Parts mit `color.mode: "scale"`
  werden korrekt als eingefärbte Chips gerendert (`resolveVisibleLegend()`/`buildChipsForRow()`),
  aber es gibt keinen separaten Block, der zeigt, welche Farbe welche Kategorie bedeutet (z.B.
  „Novice"/„Easy"/... bei `ski-difficulty-v1`) — der `render-parts-guide.md` im Standard-Submodul
  sieht das explizit vor („einen eigenen Legenden-Block ... mit denselben Kategorien"). Bausteine:
  für jede in aktuell sichtbaren `legend[]`-Zeilen referenzierte `scale_id`
  (`findDrivingScaleId()`/`buildChipsForRow()` kennen das bereits pro Zeile) einmalig über
  `legend_scales` iterieren und `id`/`label`/`items` anzeigen — analog zum alten, bereits
  bestehenden `legendItems`-Mechanismus für den v1.1-Pfad, aber neu für den v3.0-Pfad zu bauen,
  da `legend[]`/`legend_scales` global und unabhängig von `groups[]` sind (siehe
  `docs/superpowers/specs/2026-08-22-legend-v3-groups-legend-split-design.md`).

## Neue Kartenseite: GeoJSON-Viewer

- [ ] **Lokaler GeoJSON-Viewer** (Idee 2026-08-21) — Neue Kartenseite, auf der Nutzer lokale
  GeoJSON-Dateien laden (File-Picker + Drag&Drop) und auf der Karte darstellen können, ohne
  Backend-Anbindung. Aufwand grob vergleichbar mit einer bestehenden Feature-Seite
  (`Graph`/`Isochrones`, je ~700-720 Zeilen inkl. Tests) — kein Backend nötig, aber mehr UI
  (Datei-Liste, pro Layer sichtbar/entfernen/Farbe) als bei den API-getriebenen Seiten. Bausteine:
  neue Route/Page nach bestehendem Pattern (`BasePageController`+`LayoutHelper`+`MapCore.init`,
  siehe `CoordsPage.ts`); File-Input+Drag&Drop (aktuell nirgends im Repo vorhanden — neu);
  `FileReader`/`JSON.parse` mit Fehlerbehandlung (kaputtes JSON, kein Feature/FeatureCollection);
  dynamisches Styling nach Geometrietyp (Standard-MapLibre-`$type`-Filter-Pattern, kein Neuland) +
  Farbzuweisung pro geladener Datei; Popup mit Properties-Anzeige (kann `GenericFeaturePopup.ts`
  wiederverwenden); Zoom-to-bounds beim Laden. Offene Risiken vor Umsetzung zu klären:
  Performance/Memory bei sehr großen Dateien im Main-Thread, und ob es für das neue
  Sidebar-Panel-Pattern (Datei-Liste mit Toggle/Remove) schon ein Muster in
  `oe5ith-ci/docs/for-coding-agents.md` gibt oder eines neu abgestimmt werden muss. Braucht vor
  Umsetzung einen eigenen `superpowers:brainstorming`-Durchgang (Scope/UI-Details).
