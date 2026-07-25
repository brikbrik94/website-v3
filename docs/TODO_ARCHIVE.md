# TODO Archiv

Abgeschlossene Punkte aus [TODO.md](./TODO.md), chronologisch nach Release/Monat. Umgesetzte
Punkte aus [ROADMAP.md](./ROADMAP.md) landen separat in [ROADMAP_ARCHIVE.md](./ROADMAP_ARCHIVE.md).
Einträge unten stammen aus der Zeit vor dem TODO/ROADMAP-Split (Cleanup- und Feature-Arbeit war
noch nicht getrennt) und sind entsprechend gemischt.

## 2026-07-25 — OWASP-Re-Audit: db.php-Info-Disclosure behoben, API-Fläche generell gehärtet

- [x] **`api/db.php`-Info-Disclosure behoben, Debug-Playground entfernt, API-Endpoints umbenannt
  und generell gehärtet** (2026-07-25) — beim OWASP-Re-Audit gefunden (siehe
  [docs/security/owasp-top10-checklist.md](./security/owasp-top10-checklist.md), Kategorien
  A01/A05): `api/db.php` exponierte live den vollen PostgreSQL-Versionsstring (inkl. OS-Build)
  und die DB-Uptime ohne Zugriffsschutz. Fix: `db.php` liefert jetzt nur noch einen reinen
  Status-Code (200/500) ohne Body — kein Frontend-Code las den Body ohnehin. Auf Nutzer-Wunsch
  im selben Arbeitsblock zusätzlich: komplette `DebugModule.ts` (`/info/debug`,
  API-Request-Playground) entfernt; `test.php` gelöscht (Duplikat von `ping.php`);
  `stations.php`/`region_stations.php` in `nearest-stations.php`/`stations-by-region.php`
  umbenannt (Namen allein waren nicht unterscheidbar); neuer `api/http.php`-Helper erzwingt
  GET-only bei neun Lese-Endpoints (405 sonst); `ors.php` validiert `path` gegen eine Allowlist
  bekannter ORS-Routen (verhindert Missbrauch des ORS-API-Keys für beliebige Pfade),
  `nearest-stations.php` validiert `profile`-Format, `geocoder.php` validiert `lat`/`lon` als
  numerisch (Adress-Freitextsuche bleibt bewusst offen). Doku konsolidiert: `docs/API_ENDPOINTS.md`
  (unvollständig, teils veraltet) gelöscht, `docs/openapi.yaml` (vollständig, maschinell validiert)
  als alleinige Quelle, `CLAUDE.md`s veraltete „keine OpenAPI-Spec vorhanden"-Behauptung korrigiert.
  Spec: [docs/superpowers/specs/2026-07-25-api-hardening-design.md](./superpowers/specs/2026-07-25-api-hardening-design.md).
  Plan: [docs/superpowers/plans/2026-07-25-api-hardening-debug-removal.md](./superpowers/plans/2026-07-25-api-hardening-debug-removal.md).

## 2026-07-18 — CI-Update v1.21.0 konsumiert

- [x] **CI-Bug: `.badge` erzwingt `white-space: nowrap`** — behoben in `oe5ith-ci` v1.21.0
  (neues Modifier `.badge-wrap`). In website-v3 konsumiert: `src/styles/badges.css` gesynct,
  `RoutingSidebar.ts`-Warn-Badges nutzen `badge-wrap`, lokaler Override in `src/styles/sidebar.css`
  entfernt. Details: [docs/ci/bug-reports.md](./ci/bug-reports.md) (Punkt 2),
  [docs/ci/open-items.md](./ci/open-items.md) (Punkt 4).

## 2026-07-09 — TODO.md vollständig abgearbeitet

Alle drei verbliebenen TODO.md-Abschnitte (Map-Subsystem Cleanup, UI/UX & Branding, Standards-
Angleichung) sind komplett erledigt; TODO.md ist damit leer und bereit für neue Einträge. Die
zwei zuvor offenen Sprite-404-Punkte (Tile-Server, außerhalb dieses Repos) wurden nicht
archiviert, sondern nach [docs/external-blockers.md](./external-blockers.md) verschoben —
sie sind kein abgeschlossener TODO-Punkt, sondern weiterhin offen, nur außerhalb der Reichweite
dieses Repos.

### Kleinere Map-Bugs (Sammeltask)
- [x] `NahPageController.destroy()` ruft jetzt `PopupManager.closePopup()` auf, analog zu `TrackingMapLayers.destroy()` (2026-07-07).
- [x] Width-Desync `TrackingMapLayers.ts` behoben — gemeinsame `ADSB_TRACK_WIDTH`-Konstante für `ensureLayers`/`highlightItem` (2026-07-07).
- [x] TerrainManager Double-Add-Race geprüft und behoben (2026-07-07) — redundanter un-awaited `applyTerrainInfrastructure()`-Direktaufruf aus `initTerrainManager()` entfernt; `MapCore.init()`s `restore()` deckt sowohl kalten (`style.load`) als auch warmen (`setTimeout`-Fallback) Fall bereits ab.
- [x] NAH-Feature-State-Reset hardcoded `for (i<5)` (`NahMapLayers.ts`) behoben — `map.removeFeatureState({source})` statt fixer Index-Schleife (2026-07-07).
- [x] Badge-Text-Umbruch behoben — lokaler CSS-Override (`.result-badges .badge { white-space: normal }`) in `src/styles/sidebar.css`; Root Cause liegt in `oe5ith-ci` (`css/badges.css` `.badge` erzwingt `white-space: nowrap`), dokumentiert in `oe5ith-ci/ci-bug-reports.md` (Eintrag 2, nicht im Submodul gefixt) (2026-07-07).
- [x] Turn-by-Turn-Anzeige für A→B-Routen (Phase 2) umgesetzt (2026-07-07) — siehe
  [docs/superpowers/specs/2026-07-07-turn-by-turn-design.md](./superpowers/specs/2026-07-07-turn-by-turn-design.md).
- [x] **NAH: Mehrfach-Stationen mit Status-Aggregation und Badge** (2026-07-08) — ✅ ERLEDIGT
  Stationen mit identischen Koordinaten (z.B. C14/C99, Martin 1/10) werden jetzt aggregiert:
  ein gemeinsamer Marker mit Nummern-Badge zeigt an, dass mehrere Stationen am Standort sind.
  Die Icon-Farbe widerspiegelt den besten Status aller Stationen (aktiv > außer Saison > außer Dienst).
  Klick zeigt alle Stationen mit vollständigen Details. 11 Commits, 112 Tests grün.
  Siehe [CHANGELOG.md](./CHANGELOG.md) für Details.

### UI/UX & Branding (Sammeltask)

Aus `docs/proposals/todo.txt` übernommen (2026-07-05) — kleinere, unabhängige UI-/Text-Anpassungen
an bereits bestehenden Features.

- [x] **Credits/Copyright-Modal überarbeitet und erweitert** (2026-07-07) — siehe
  [docs/superpowers/specs/2026-07-07-copyright-modal-design.md](./superpowers/specs/2026-07-07-copyright-modal-design.md).
  Kontakt-Mail + Impressum, Datenschutz-Hinweis, vollständige/korrigierte Lizenzangaben ergänzt;
  toter Landing-Page-Link zum Modal repariert. Kontaktformular bewusst nicht umgesetzt (kein
  Mail-Versand-Backend vorhanden) — bei Bedarf eigener ROADMAP.md-Punkt.
- [x] **`.leaflet-popup-*`-CSS-Regeln in `src/styles/modal.css` entfernt** (2026-07-08, commit ff62695) — beim
  Copyright-Modal-Audit (2026-07-07) gefunden: Das Projekt hat keine `leaflet`-Abhängigkeit
  mehr (fehlt in `package.json`, kein Import im Code), aber `modal.css:294-314` enthielt noch
  `.leaflet-popup-content-wrapper`/`.leaflet-popup-content`/`.leaflet-popup-tip-container`/
  `.leaflet-popup-close-button`-Regeln — vermutlich Altlast aus einer Zeit vor der Migration
  auf MapLibre GL JS. 27 Zeilen toter Code gelöscht.
- [x] **Mobilansicht: Quicklinks in der Topbar durch das Dropdown ersetzt** (2026-07-07) — siehe
  [docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md](./superpowers/specs/2026-07-07-mobile-topbar-nav-design.md).
  War tatsächlich kein „beengt"-Problem, sondern ein Reachability-Bug: Karte/Umrechner/Tracking
  waren auf Mobile über die Topbar gar nicht erreichbar (Dropdown komplett ausgeblendet).
- [x] **Logo bei Mobile auch anzeigen** (2026-07-08, commit 82fcf5e) — auf der Landing-Page ist das Logo/OE5ITH-Wort-Zeichen
  auf Mobile nicht sichtbar war (hatte `display: none` in einer Breakpoint-Regel in `topbar.css`); entfernt, Logo zeigt jetzt auf allen Breakpoints. Übernommen aus `docs/proposals/todo.txt` (2026-07-08).
- [x] **Topbar-Nav-Markup dedupliziert** (2026-07-08, commit 92fe3b1) — War dupliziert zwischen
  `src/components/Topbar.ts` und `src/main.ts` (Landing-Page nutzt `Topbar.ts` nicht, hat eine
  eigene Kopie derselben Nav-Struktur) — gefunden beim Mobile-Topbar-Nav-Fix (2026-07-07). In eine
  gemeinsame `src/components/TopbarNav.ts` (`renderTopbarNav()`) extrahiert, beide Stellen nutzen
  die Komponente jetzt.
- [x] **Tablet-Quicklinks-Bug behoben** (2026-07-08, commit 6fc60d6) — Auf Tablet-Breite bei
  Kartenseiten (`/nah` u.a., 900px) war nur 1 von 2 Quicklinks sichtbar („Luftrettung" fehlte,
  „Routing" blieb sichtbar). Root Cause: `Topbar.ts`s `.topbar-right`-Container hatte bei
  Kartenseiten (`hasMap`) einen `<button class="controls-toggle mobile-only">` als *erstes* Kind
  vor den beiden `.topbar-nav-link`-Elementen; die Tablet-Regel `.topbar-nav-link:nth-child(n+3)`
  (`oe5ith-ci/css/topbar.css`) zählt die Position unter *allen* Geschwister-Elementen — der Button
  schob „Luftrettung" auf Platz 3 und blendete es aus. Fix: Reihenfolge in `.topbar-right` getauscht
  (Nav-Links vor Button). Entdeckt beim Live-Test des Mobile-Topbar-Nav-Fixes (2026-07-07).
- [x] **Versionierungspraxis überdenken** (2026-07-09) — über den Proposal-Zyklus umgesetzt, siehe
  [docs/proposals/archive/2026-07-09-release-batching-draft.md](./proposals/archive/2026-07-09-release-batching-draft.md).
  `AGENT_INSTRUCTIONS.md` §4 hat jetzt einen „Release-Trigger"-Absatz: Die Release-Checkliste
  (Version/Changelogs/Build/Tag/Deploy) läuft nicht mehr automatisch nach jedem abgeschlossenen
  TODO-/ROADMAP-Punkt, sondern wird vom Agenten an natürlichen Arbeitsblock-Enden vorgeschlagen und
  erst nach Bestätigung ausgeführt (Ausnahme: akute/sicherheitsrelevante Fixes weiterhin sofort).
  Verifikation (`tsc`/`test`) bleibt davon unberührt weiterhin Pflicht pro Änderung.

### Standards-Angleichung

Bestehenden Code/bestehende Praxis an die in [CLAUDE.md](../CLAUDE.md#standards-referenzen) referenzierten
Standards angleichen bzw. dagegen prüfen (kein neuer Code, kein neues Feature).

- [x] **PHP (`api/*.php`) gegen PSR-12 prüfen** (2026-07-08) — PHP_CodeSniffer mit PSR-12-Ruleset
  eingerichtet (`phpcs.xml` + `composer.json` `lint`-Script), bestehende Verstöße gefixt.
  Siehe `composer run lint` zur Verifikation sowie `phpcs.xml`/`composer.json` in der Codebase.
- [x] **Security-Praxis gegen OWASP Top 10 gegenchecken** (2026-07-08) — Hybrid-Audit mit
  automatisiertem Security-Script (`bash scripts/security-audit.sh`) für Secret-/Injection-Heuristiken
  sowie umfassende manuelle Bewertung aller 10 Kategorien in `docs/security/owasp-top10-checklist.md`.
  Dabei Info-Disclosure in `diag.php` gefunden (siehe separater TODO.md-Punkt unten).
- [x] **`diag.php`-Info-Disclosure in Produktion blockiert** (2026-07-08) — beim
  OWASP-Top-10-Audit gefunden (siehe
  [docs/security/owasp-top10-checklist.md](./security/owasp-top10-checklist.md), Kategorien
  A01/A05): `api/diag.php` war ohne Zugriffsschutz öffentlich erreichbar und exponierte
  PHP-Version, geladene Extensions, DB-Host/Port/Name/User (Passwort maskiert) sowie den internen
  ORS-Health-Status. Fix: `location = /api/diag.php { deny all; return 403; }` in `nginx.conf`
  ergänzt — nur im Produktions-Server-Block (`map.oe5ith.at`, HTTPS), der lokale Dev-Block bleibt
  bewusst unverändert (dort ist der Endpoint zum Debuggen nützlich). Manuell auf dem Server
  angewendet und verifiziert (`https://map.oe5ith.at/api/diag.php` → 403, 2026-07-09). Hinweis:
  `deploy-website.sh` synced `nginx.conf` weiterhin nicht automatisch — bei künftigen
  nginx.conf-Änderungen erneut manuell deployen. `api/diag.php` selbst bleibt im Code bestehen
  (kein Entfernen/Absichern auf Code-Ebene) — die nginx-Sperre ist bewusst der gewählte Fix
  (Defense-in-Depth auf Code-Ebene bliebe ein möglicher Folgepunkt, aktuell nicht nötig).
- [x] **OpenAPI-Spec für `api/*.php` erstellen** (2026-07-08) — OpenAPI-3.x-Spec für alle 12
  API-Endpoints in `docs/openapi.yaml` angelegt, validiert via `npm run validate:openapi`.
  Umfasst Request/Response-Schemas, Query-Parameter und Status-Codes für alle Endpoints
  (`nah.php`, `stations.php`, `ors.php`, `geocoder.php`, `ping.php`, `adsb.php`, `ais.php`, etc.).

## 2026-07-06 — Map-Subsystem-Cleanup U5-U7 + CI-Submodul-Update

### U5: NAH DOM-Marker → Symbol-Layer migriert
- [x] `NahMapLayers.ts` nutzte als letzte Karten-Funktion noch `maplibregl.Marker`-DOM-Elemente
  statt eines MapLibre-Symbol-Layers, inkl. zweier Inline-`style="color:…"`-CI-Verstöße
  (Icon-Farbe, Popup-Status-Text). Migriert auf einen daten-getriebenen `nah-stations`-Symbol-Layer:
  Helikopter-Icon wird einmalig zur Laufzeit aus dem bestehenden `fa-helicopter`-Glyph als SDF-Icon
  gerendert (kein neues externes Sprite-Asset nötig, da das Sprite-Set kein einfärbbares
  Helikopter-Icon enthält), Status-Farbe läuft über eine `icon-color`-Match-Expression. Klick/Hover
  folgen dem in `TrackingMapLayers` etablierten `queryRenderedFeatures`-Muster. Popup-Status-Text
  nutzt jetzt die bestehenden CI-Badge-Klassen (`badge-green`/`badge-red`/`badge-gray`) statt
  Inline-Style. Popup-Inhalt sonst fachlich unverändert. Design:
  `docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md`. Live im Browser
  verifiziert (Playwright/Chromium headless): Icon-Farben (grün/grau live in echten Daten
  unterscheidbar), Popup-Inhalt für zwei reale Stationen in unterschiedlichen `op_type`-Zweigen
  (daylight, fixed) korrekt inkl. Badge-Klassen statt Inline-Style, Klick auf Station löst
  **nicht** die Incident-Berechnung aus (Sidebar bleibt unverändert), Klick auf freie Fläche löst
  sie weiterhin aus (Sidebar füllt sich mit 5 nächsten Stationen), Hover zeigt Pointer-Cursor
  (vs. „grab" abseits), Symbol-Layer + Popup-Funktion überleben einen Basemap-Wechsel
  unverändert. Der Offseason/`badge-gray`-Zweig ist visuell als abweichende Icon-Farbe in den
  Live-Daten bestätigt, aber nicht per Klick pixelgenau nachgestellt (Koordinaten-Targeting im
  Headless-Run zu unpräzise für dieses eine Icon) — dieser Zweig ist durch die
  `buildStationPopupHtml`-Unit-Tests (badge-gray, „AUSSER SAISON", Monate-Zeile) bereits
  abgedeckt. Keine Konsolenfehler während der Verifikation (bis auf den vorbestehenden,
  separat dokumentierten Sprite-404 von „At Plus"). Betreiber-spezifische Icons bewusst nicht
  Teil dieser Migration, siehe neuer ROADMAP.md-Punkt. `npx tsc --noEmit && npm test` grün
  (82/82).

### U6: Hover-Cursor vereinheitlicht
- [x] Drei unabhängige Implementierungen (`TrackingMapLayers` mit Boolean-Guard, `RoutingPage` komplett
  inline ohne Guard/Cleanup, `NahMapLayers` mit modul-scoped WeakSet) durch einen gemeinsamen
  `attachHoverCursor(map, layerIds)`-Helper (`src/lib/HoverCursor.ts`, WeakSet-Guard) ersetzt.
  Dabei zwei Bugs behoben: Tracking zeigte für `ais-dots-moving`/`ais-dots-static` keinen
  Hover-Cursor trotz Klickbarkeit; Routing meldete seine Listener nie in `destroy()` ab. In
  `CLAUDE.md` dokumentiert. Design:
  `docs/superpowers/specs/2026-07-06-shared-hover-cursor-design.md`. Live im Browser
  verifiziert (`/tracking`, `/routing`, `/nah`, inkl. Seitenwechsel-Test). `npx tsc --noEmit &&
  npm test` grün (86/86).

### U7 + U1b: MapRegistry-Dreifach-Buchhaltung vereinfacht
- [x] Recherche ergab: Die in U7 kritisierte Dreifach-Buchhaltung (`activeLayers` +
  `overlayMetadata` + `MapRegistry`) existierte ausschließlich in `MapPage.toggleLayer`/
  `reapplyActiveOverlays` — `OverlayLoader.ts` (bereits genutzt von `CoordsPage` für das
  Wanderwege-Overlay) hatte dasselbe Grundproblem längst mit einer einzigen, schlankeren
  `loaded`-Map gelöst. U1b („`MapPage.toggleLayer` in `OverlayLoader` generalisieren") und U7
  stellten sich damit als derselbe Umbau heraus und wurden zusammengelegt. Umsetzung: (1) neuer
  gemeinsamer Helper `src/lib/MapDefinitionOps.ts` (`addSourceIfMissing`/`addLayerIfMissing`,
  Guard+Klon+Add), ersetzt die 4x duplizierte Stelle in `MapRegistry.restore`, `OverlayLoader.add`,
  `MapCore.ensureGeoJsonLayer`; (2) `OverlayLoader` generalisiert: optionale Layer-Untermenge pro
  `add()`/`remove()`-Aufruf, kumulative Buchhaltung über mehrere Aufrufe für dasselbe Overlay,
  Style-JSON-Cache pro Overlay, `isStyleLoaded()`-Polling aus `MapPage.toggleLayer` übernommen
  (behebt den früher gefundenen „Basemap At"-Bug jetzt auch zentral für alle `OverlayLoader`-
  Nutzer); (3) `MapPage.toggleLayer` auf einen dünnen `OverlayLoader`-Wrapper reduziert —
  `activeLayers`, `overlayMetadata`, `cachedStyles`, `styleFetchPromises`, `getStyle()`,
  `reapplyActiveOverlays()` entfallen vollständig. `CoordsPage.ts`s bestehende Aufrufe (ohne
  Layer-Untermenge) bleiben unverändert kompatibel — bewusst nicht Teil der Migration: die dabei
  gefundene, harmlose No-op-Reapply-Redundanz in `CoordsPage`s `onRestore`-Callback (Overlay gilt
  nach Basemap-Wechsel weiter als „loaded", der erneute `toggleHikingOverlay(true)`-Aufruf ist
  faktisch wirkungslos; die eigentliche Wiederherstellung läuft über `MapRegistry.restore()`).
  Design: `docs/superpowers/specs/2026-07-06-map-registry-bookkeeping-design.md`. Live im Browser
  verifiziert (Playwright): `/karte` „Autobahnen"-Overlay — A1 an (Layer sichtbar, Source
  gefetcht), A10 an (kumulativ, `style.json` nur einmal gefetcht statt pro Checkbox), A1 aus
  (A10 bleibt sichtbar, Source bleibt bestehen), A10 aus (letzter Layer → Overlay fällt komplett
  auf „NICHT GELADEN" zurück, Source+Sprite entfernt); Basemap-Wechsel auf „Basemap At" bei
  aktivem Overlay — Checkbox-Zustand und Overlay überleben den Wechsel (Regression des früher
  gefixten Bugs), keine Konsolenfehler; `/coords` Wanderwege-Toggle an/aus/an — Verhalten
  unverändert (Style-JSON wird nach vollständigem Entfernen erneut gefetcht, wie schon vor der
  Migration, da Coords ohne Layer-Untermenge arbeitet). Dabei einen vorbestehenden, unabhängigen
  404 entdeckt (Wanderwege-Overlay-Sprite, serverseitig) — als eigener TODO.md-Punkt erfasst,
  nicht mitgefixt (Code-Pfad gegen `master` verglichen, identisch). `npx tsc --noEmit && npm test`
  grün (92/92).

### `oe5ith-ci`-Submodul aktualisiert (v1.18.0 → v1.19.0/c92fb77)
- [x] Zwei zuvor gemeldete offene Punkte im `oe5ith-ci`-Submodul sind seitens des extern
  gepflegten Design-System-Repos umgesetzt und im dortigen `CHANGELOG.md` dokumentiert:
  - **Modal/Topbar-Stacking-Bug** (`ci-bug-reports.md`, Punkt 1): `.modal-backdrop` nutzt jetzt
    `z-index: var(--z-modal)` statt `var(--z-backdrop)`, exakt wie im Bug-Report vorgeschlagen —
    website-v3s eigene, bereits lokal gefixte Kopie (`src/styles/modal.css`) ist davon
    unabhängig, aber die geteilte Quelle ist jetzt konsistent für alle Portale.
  - **Disclosure-Komponente** (`ci-routing-disclosure-request.md`): `css/disclosure.css` +
    `components/disclosure.html` + `docs/sidebar.md`-Abschnitt sind jetzt im Submodul vorhanden,
    schaltet das TODO.md-Item „Turn-by-Turn-Anzeige" frei (Component-Bedarf gedeckt,
    Integration in `RoutingSidebar.ts` steht noch aus).
  - Der dritte offene Punkt (**Split-View**, `ci-split-view-request.md`) stellte sich bei der
    Recherche als bereits erledigt heraus — `css/split.css` existierte schon vor `v1.18.0`
    (Commit `1a0ebdf` u.a.), die Request-Datei war nur ein nicht aufgeräumter, aber inzwischen
    im Submodul selbst committeter Rest der ursprünglichen Anfrage.
  - Submodul-Pointer im Hauptrepo von `dca22e5` auf `c92fb77` (neuester `origin/main`-Commit,
    keine passende Release-Tag vorhanden — `v1.19.0` ist einen Commit dahinter) aktualisiert.
    Kein Fix im Submodul selbst durchgeführt (läuft extern), nur der Pointer-Bump + Verifikation
    hier.

## 2026-07-05 — Diverse Bugfixes (Modal-Stacking, Timer-Leak, Kontextmenü, Stationsliste)

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
  `oe5ith-ci`-Submodul (`css/modal.css`) — dort **nicht** gefixt (wird extern verwaltet); Meldung
  mit Root Cause/Repro/lokal validiertem Fix hinterlegt in `oe5ith-ci/ci-bug-reports.md`.
  `npx tsc --noEmit && npm test` grün (68/68).

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

## 2026-07-03 — Map-Subsystem-Cleanup U1-U4 (Sprite-Caching, Pin-Boilerplate, Verifikation)

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
6-Punkte-Checkliste aus [docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](./superpowers/plans/2026-06-30-map-subsystem-cleanup.md)
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

## 2026-05 — Abgeschlossene Aufgaben (Tracking-Gateway-Migration, Map-Registry, frühere Aufgaben)
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
