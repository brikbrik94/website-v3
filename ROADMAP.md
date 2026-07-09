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

- [ ] **Type-Safety: `any`-Escapes systematisch reduzieren** — 121 Stellen im Code umgehen
  striktes Typing trotz `strict: true` in `tsconfig.json`: 73× `: any`-Annotationen, 48×
  `as any`-Casts (Stand 2026-07-09). Beispiele: `let lastResponse: any = null`
  (`DebugModule.ts:88`), wiederkehrendes `catch (error: any)`-Muster in den Info-Modulen. Ein Teil
  davon in `.test.ts`-Dateien fürs Mocking ist vertretbar und muss nicht zwingend mit angefasst
  werden. Ziel: Datei für Datei durchgehen, wo möglich echte Typen einführen. **Danach** prüfen,
  ob eine Linting-Regel (z.B. ESLint mit `@typescript-eslint/no-explicit-any` — aktuell ist kein
  ESLint im Projekt installiert, das wäre eine neue Abhängigkeit) sinnvoll ist, damit neue
  `any`-Nutzung künftig auffällt statt sich unbemerkt einzuschleichen.
- [ ] **`NahMapLayers.ts` (427 Zeilen) — Popup-HTML-Building auslagern** — die Datei bündelt
  aktuell Canvas-Icon-Rendering, Status-Berechnung, Single- und Multi-Station-Popup-HTML-Building,
  Layer-Init und Flugpfad-Updates. `buildStationPopupHtml()`/`buildMultiStationPopupHtml()` sind
  ein plausibler Kandidat für eine eigene Datei (z.B. `NahPopupBuilder.ts`), um die Kopplung beim
  Arbeiten an der Datei zu reduzieren.
- [ ] **`NahStatusModule.ts` (309 Zeilen) — eine große Funktion aufteilen** — kein
  Datei-übergreifendes Problem, sondern eine einzelne ~300-Zeilen-`async`-Funktion (Fetch +
  DOM-Aufbau + Event-Wiring inline). In kleinere, benannte Funktionen zerlegen.
- [ ] **Optional/niedrige Priorität: gemeinsames Status-Badge-Color-Mapping** — Badge-CSS-Klassen
  (`badge-green`/`badge-red`/`badge-gray`/…) werden aktuell in 3 Dateien (`TrackingSidebar.ts`,
  `RoutingSidebar.ts`, `NahMapLayers.ts`) als Literal-Strings verwendet, allerdings für 3
  unterschiedliche Status-Vokabulare (NAH-Stationsstatus, Tracking-Entity-Typ,
  Routing-Warnungstyp) — kein echtes Duplikat, aber ein gemeinsames typsicheres Enum/Mapping
  könnte die Konsistenz erhöhen. Explizit niedrigste Priorität der vier Punkte hier, kein
  akutes Problem.

**Nicht gefunden / kein Handlungsbedarf laut Recherche:** Datei-Duplikate/redundante
Utility-Implementierungen sind praktisch nicht vorhanden — die `lib/`-Konvention wird konsequent
eingehalten, `PopupManager.ts` wird korrekt geteilt statt dupliziert, `computeStationStatus`
existiert nur einmal. Die großen Feature-Dateien (`TrackingDataService.ts` 486 Zeilen,
`MapCore.ts` 318 Zeilen) sind laut CLAUDE.md-Konvention (`*DataService`/`*MapLayers`/
`*SidebarAdapter`) erwartungsgemäß groß, keine "God-File"-Verletzung.

## Map-Subsystem: Anschlussfeatures (nach dem Cleanup)

Voraussetzung: [Map-Subsystem Cleanup](./TODO.md#map-subsystem-cleanup) abgeschlossen (U1–U7).
Hintergrund/Herleitung: [docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](./docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md).

- [ ] **Legende mit Funktion befüllen** — `MapLegend` (`src/lib/`) existiert, zeigt aber noch keine
  echten, pro Seite aktiven Layer an. Ziel: Legende pro Seite dynamisch aus den registrierten
  `MapRegistry`-Layern befüllen, Einträge interaktiv (Toggle-Sichtbarkeit per Klick). Interaktive
  Einträge am ARIA-APG-Pattern für Listbox/Toggle-Buttons orientieren (siehe CLAUDE.md →
  Standards-Referenzen, Accessibility).
- [ ] **Karten-Klick + Overlay-Infos seitenübergreifend** — Klick-auf-Feature-Popups gibt es aktuell
  nur auf der Tracking-Seite (`PopupManager` dort verdrahtet). Ziel: generisches Klick-Handling für
  alle Overlay-Layer (NAH, RD/NEF, Contours/Hiking) mit Popup-Infos, nicht Tracking-spezifisch.
- [ ] **Routing-Kontextmenü: Touchsteuerung** — Das Zielwahl-Kontextmenü in `RoutingPage.ts:76`
  reagiert nur auf Rechtsklick (Desktop). Ziel: Long-Press-Geste als Touch-Äquivalent für
  Tablet/Smartphone. Menüstruktur/Tastaturbedienung am ARIA-APG-Menu-Pattern orientieren (siehe
  CLAUDE.md → Standards-Referenzen, Accessibility).
- [ ] **NAH: Betreiber-spezifische Icons** — Im Sprite-Set `oe5ith-markers` liegen bereits 9
  Betreiber-Logos (`nah-adac-luftrettung`, `nah-oeamtc-flugrettung`, `nah-drf-luftrettung`, …),
  aktuell ungenutzt. Ziel: NAH-Stationsmarker zeigen das Icon ihres Betreibers statt eines
  generischen Symbols. Braucht (a) ein neues `operator`-Feld in `NahStation`/`api/nah.php`
  (aktuell nur `name`/`callsign` vorhanden, keine Zuordnung zu den Sprite-Keys), und (b) eine
  separate Lösung für die Status-Anzeige (grün/rot/grau), da diese Sprites nicht-SDF sind und
  sich nicht per `icon-color` einfärben lassen (z.B. zusätzlicher Status-Dot-Layer neben dem
  Betreiber-Icon). Bewusst aus der U5-Migration
  ([docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md](./docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md))
  herausgehalten, die auf ein generisches Status-Icon setzt.

## Karten-Interaktion & Such-Features

Neue Funktionen für bessere Karten-Bedienung und Suche.

- [ ] **Geocoder-Widget auf Kartenseiten** — Adressensuche/Koordinatensuche (analog zur bestehenden
  `/coords`-Seite) auf die Map-Seiten (`/nah`, `/routing`, `/tracking` etc.) als kleines
  Overlay-Widget integrieren, um schnelle Ortssuche ohne Seitenwechsel zu ermöglichen. Übernommen
  aus `docs/proposals/todo.txt` (2026-07-08).
- [ ] **MapLibre GL Geolocation-Button** — Benutzer-Position mittels Browser-Geolocation-API
  abfragen und Karte dorthin verschieben (mit Zoom-Level passend zur Genauigkeit). MapLibre GL hat
  ein natives `GeolocateControl`, das man anbinden könnte. Übernommen aus `docs/proposals/todo.txt`
  (2026-07-08).

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
