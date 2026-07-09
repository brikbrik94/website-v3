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
  `npm test` 112/112. **Bekannte Restarbeit:** kein automatisierter Test für
  `GeocoderSearchField` selbst (Projekt hat kein jsdom/happy-dom eingerichtet) — siehe
  TODO.md.
- [x] **MapLibre GL Geolocation-Button** (2026-07-09) — ✅ ERLEDIGT. `maplibregl.GeolocateControl`
  zentral in `MapCore.init()` neben dem bestehenden `NavigationControl` ergänzt (`top-right`),
  gilt dadurch automatisch für alle 5 Kartenseiten ohne Änderung an den einzelnen
  Page-Controllern. Einmaliges Hinspringen (`trackUserLocation: false`), kein kontinuierliches
  Tracking. Verifiziert: `npx tsc --noEmit` 0 Fehler, `npm test` 112/112.

## Routing: Anschlussfeatures

Kontext: [docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md](./docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md)
(Fahrmodus-Badge, Warn-Badges, Turn-by-Turn für A→B — Phase 1 in TODO.md/CHANGELOG.md).

- [ ] **Gleiche Detailanzeige für SEW/NEF-Einzelstation** — Fahrmodus-Badge,
  Maut-/Zufahrts-Warn-Badges und (sobald verfügbar) Turn-by-Turn-Anweisungen
  zusätzlich für die aktuell hervorgehobene Station im SEW/NEF-Modus anzeigen
  (`RoutingSidebarAdapter.ts`, `onHighlight`-Callback). Bewusst nicht Teil der
  A→B-Umsetzung (2026-07-04) — dort zeigt die Liste bereits Dauer/Distanz pro
  Station, Turn-by-Turn pro Station wäre zusätzlicher Scope.
- [ ] **URL-Parameter für Routing-Deep-Links** — Koordinaten (sowie Modus A→B/SEW/NEF und Profil
  inkl. Sondersignal) sollen per URL an `/routing` übergeben werden können, damit z.B. ein Link
  aus dem Umrechner heraus eine vorausgefüllte Route öffnet. Aktuell kein URL-Parameter-Handling
  im Router (`src/main.ts`) vorhanden — komplett neue Fähigkeit. Aus `docs/proposals/todo.txt`
  übernommen (2026-07-05).

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

- [ ] **Bestehende Dokumente an referenzierte Standards angleichen** — `CHANGELOG.md` fehlen die
  Keep-a-Changelog-Kategorien `Deprecated`/`Security` (deutsch: „Veraltet"/„Sicherheit"); prüfen,
  ob sie gebraucht werden und wie sie benannt werden. Den `release: vX.Y.Z` Commit-Typ gegen
  Conventional Commits abgleichen (kein offizieller Typ — entweder dokumentieren warum bewusst
  abweichend, oder auf `chore(release):` umstellen). Danach `TODO_ARCHIVE.md`/`ROADMAP_ARCHIVE.md`
  auf einheitliche, selbstständig lesbare Darstellung prüfen.
- [ ] **Continuous-Integration-Pipeline (Build-Automatisierung, z.B. GitHub Actions)** — aktuell
  läuft `npx tsc --noEmit && npm test` (sowie die neuen `composer run lint` /
  `bash scripts/security-audit.sh` / `npm run validate:openapi` aus der Standards-Angleichung,
  siehe [docs/superpowers/specs/2026-07-08-standards-angleichung-design.md](../docs/superpowers/specs/2026-07-08-standards-angleichung-design.md))
  nur lokal/manuell vor jedem Commit. Ziel: bei jedem Push/PR automatisch ausführen. Nicht zu
  verwechseln mit dem `oe5ith-ci`-Submodul (Corporate Identity) — hier geht es um eine
  Build-/Test-Pipeline. Bewusst als eigener ROADMAP-Punkt (nicht Teil der Standards-Angleichung
  selbst), da eine neue Infrastruktur-Entscheidung (welcher CI-Anbieter, Secrets-Handling für
  DB-Zugriff in der Pipeline etc.) nötig ist.
- [ ] **Vite-/PHP-Dev-Server: Robustheit & Health-Check** — bei der Live-Verifikation der
  `NahMapLayers.ts`-Popup-Extraktion (2026-07-09) mehrfach beobachtet: ein von einer früheren
  Session zurückgelassener `npm run dev`-Prozess lief teilweise "halb tot" weiter — der
  PHP-API-Server (`api/router.php`, Port 8081) war bereits abgestürzt (kein laufender Prozess
  mehr), während der Vite-Server (Port 8000/100.64.0.1) noch lief, aber mit veraltetem
  Dependency-Optimize-Cache (`node_modules/.vite`), was zu `504 Outdated Optimize Dep`-Fehlern im
  Browser führte, bis der Vite-Prozess manuell gekillt und mit geleertem `.vite`-Cache neu
  gestartet wurde. Kein Health-Check/Auto-Restart vorhanden, der das erkennen und melden würde.
  Ziel: robusteres `npm run dev`-Setup — z.B. PHP-Server-Health-Check vor dem Vite-Start, klarer
  Fehler statt stillem Absturz, und/oder Dokumentation eines Standard-Verfahrens ("bei
  Dev-Server-Problemen: `pkill -f 'vite|php -S'`, `.vite`-Cache leeren, neu starten") in
  CLAUDE.md/AGENT_INSTRUCTIONS.md, damit das nicht bei jeder Live-Verifikation neu diagnostiziert
  werden muss.
- [ ] **Bausteine-Katalog für wiederverwendbare interne Module** (2026-07-09, aus Diskussion beim
  Geocoder-Widget entstanden) — `CLAUDE.md` beschreibt die Feature-Struktur bisher nur auf
  Konventionsebene (`*DataService`/`*MapLayers`/`*SidebarAdapter`-Muster), nicht welche konkreten
  wiederverwendbaren Bausteine es in `src/lib/` und `src/features/` bereits gibt. Beispiel: das
  neue `src/lib/GeocoderSearchField.ts` (Ortssuche mit Dropdown, docs/superpowers/specs fehlt
  noch) taucht sonst nirgends auf, außer man liest den Code oder das CHANGELOG durch. Ziel: ein
  Katalog/Register (z.B. `docs/architecture/bausteine.md` oder Ergänzung eines bestehenden Docs)
  mit knappem Eintrag pro Baustein — was er tut, wo er liegt, wie man ihn einbindet (analog zum
  `oe5ith-ci/docs/registry.json`-Prinzip, aber für website-v3-interne Engineering-Bausteine statt
  CI-Komponenten) — damit neue Seiten/Features vorhandene Bausteine finden statt sie unwissentlich
  neu zu bauen. Pflege-Frage noch offen: manuell bei jedem neuen Baustein nachtragen, oder
  automatisiert aus `src/lib/`/`src/features/` generiert?
- [ ] **Repo-Root-Ordnerstruktur aufräumen** — im Repo-Root liegen aktuell u.a. Config-Dateien
  (`composer.json`/`.lock`, `phpcs.xml`, `nginx.conf`, `tsconfig.json`, `vite.config.ts`),
  Deploy-Tooling (`deploy-website.sh`), acht Markdown-Dateien
  (`CLAUDE.md`/`GEMINI.md`/`AGENT_INSTRUCTIONS.md`/`README.md`/`CHANGELOG.md`/`ROADMAP.md`/
  `ROADMAP_ARCHIVE.md`/`TODO.md`/`TODO_ARCHIVE.md`) und mehr nebeneinander — unübersichtlich.
  **Harte Grenze für eine Umsetzung:** mehrere dieser Root-Platzierungen sind nicht frei wählbar,
  sondern durch Tool-Konventionen bzw. eigene Regeln vorgegeben und dürfen nicht angetastet
  werden — `CLAUDE.md`/`GEMINI.md` (zwingend Repo-Root, werden dort automatisch von den jeweiligen
  Tools geladen), `package.json`/`tsconfig.json`/`vite.config.ts`/`composer.json`/`.gitignore`/
  `.gitmodules`/`.editorconfig` (Ökosystem-Standardpfade), sowie `TODO.md`/`ROADMAP.md` +
  `*_ARCHIVE.md` (laut `AGENT_INSTRUCTIONS.md` §3 explizit als Dateipaare **am Repo-Root**
  festgelegt). Realistische Kandidaten für eine Aufräumung wären eher `deploy-website.sh` +
  `nginx.conf` (z.B. nach `deploy/`) und ggf. `phpcs.xml`. Braucht einen eigenen
  Brainstorming-/Design-Durchgang statt einer mechanischen Verschiebung, u.a. weil
  Deploy-Skript-Pfade (`./deploy-website.sh`) und CI/Editor-Tool-Erwartungen (editorconfig,
  phpcs) an bestimmten Stellen fest verdrahtet sein könnten.
