# Projekt TODOs

Aufgaben im **aktuellen Scope**: Fixes, Cleanup, Erweiterungen an bereits bestehendem Code/Features.
Neue, noch nicht existierende Features/Funktionen gehören in [ROADMAP.md](./ROADMAP.md), nicht hierher.
Abgeschlossene Aufgaben wandern ins [TODO_ARCHIVE.md](./TODO_ARCHIVE.md).

## Map-Subsystem Cleanup

Kontext & Details: [docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](./docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md).
U1 (OverlayLoader) + U2 (Restore-Pfade) sind seit v3.5.2 erledigt und seit 2026-07-03 visuell
verifiziert (6-Punkte-Checkliste, siehe TODO_ARCHIVE.md) — dabei 2 Bugs gefunden und behoben,
ebenfalls im Archiv dokumentiert. U5 (NAH-Symbol-Layer), U6 (Hover-Cursor) und U7+U1b
(MapRegistry-Buchhaltung, mit U1b zusammengelegt) sind ebenfalls erledigt, Details im Archiv.

### Kleinere Map-Bugs (Sammeltask)
- [x] `NahPageController.destroy()` ruft jetzt `PopupManager.closePopup()` auf, analog zu `TrackingMapLayers.destroy()` (2026-07-07).
- [x] Width-Desync `TrackingMapLayers.ts` behoben — gemeinsame `ADSB_TRACK_WIDTH`-Konstante für `ensureLayers`/`highlightItem` (2026-07-07).
- [x] TerrainManager Double-Add-Race geprüft und behoben (2026-07-07) — redundanter un-awaited `applyTerrainInfrastructure()`-Direktaufruf aus `initTerrainManager()` entfernt; `MapCore.init()`s `restore()` deckt sowohl kalten (`style.load`) als auch warmen (`setTimeout`-Fallback) Fall bereits ab.
- [x] NAH-Feature-State-Reset hardcoded `for (i<5)` (`NahMapLayers.ts`) behoben — `map.removeFeatureState({source})` statt fixer Index-Schleife (2026-07-07).
- [x] Badge-Text-Umbruch behoben — lokaler CSS-Override (`.result-badges .badge { white-space: normal }`) in `src/styles/sidebar.css`; Root Cause liegt in `oe5ith-ci` (`css/badges.css` `.badge` erzwingt `white-space: nowrap`), dokumentiert in `oe5ith-ci/ci-bug-reports.md` (Eintrag 2, nicht im Submodul gefixt) (2026-07-07).
- [ ] Basemap-Style „At Plus" liefert 404 für sein eigenes (natives, nicht von `MapCore.loadSprites`
  verwaltetes) Sprite (`https://tiles.oe5ith.at/assets/sprites/basemaps/sprite.json`) — MapLibre
  loggt beim Laden dieses Basemaps einen `AJAXError (404)`. Serverseitig (Tile-Server-Assets) oder
  im Style-JSON zu prüfen, nicht im Repo-Code; bei U3-Live-Verifikation (2026-07-03) entdeckt.
- [ ] Overlay „Wanderwege" (`hiking`) referenziert in seinem Style-JSON ein Sprite
  (`sprite: "https://tiles.oe5ith.at/assets/sprites/overlays/sprite"`), das serverseitig nicht
  existiert — `sprite.json`/`sprite.png` liefern 404. Analog zum „At Plus"-Sprite-404 oben,
  aber für einen anderen Pfad (`overlays/` statt `basemaps/`); ebenfalls serverseitig (Tile-Server-
  Assets) oder im Style-JSON zu prüfen, nicht im Repo-Code. `MapCore.loadSprites`-Aufrufpfad selbst
  unverändert/korrekt (gegen `master` verglichen). Entdeckt bei der Browser-Verifikation von
  U7+U1b (`/coords` Wanderwege-Toggle, 2026-07-06).
- [x] Turn-by-Turn-Anzeige für A→B-Routen (Phase 2) umgesetzt (2026-07-07) — siehe
  [docs/superpowers/specs/2026-07-07-turn-by-turn-design.md](./docs/superpowers/specs/2026-07-07-turn-by-turn-design.md).
- [x] **NAH: Mehrfach-Stationen mit Status-Aggregation und Badge** (2026-07-08) — ✅ ERLEDIGT
  Stationen mit identischen Koordinaten (z.B. C14/C99, Martin 1/10) werden jetzt aggregiert:
  ein gemeinsamer Marker mit Nummern-Badge zeigt an, dass mehrere Stationen am Standort sind.
  Die Icon-Farbe widerspiegelt den besten Status aller Stationen (aktiv > außer Saison > außer Dienst).
  Klick zeigt alle Stationen mit vollständigen Details. 11 Commits, 112 Tests grün.
  Siehe [CHANGELOG.md](./CHANGELOG.md) für Details.

Anschlussfeatures nach dem Cleanup (Legende, generischer Karten-Klick, Routing-Touch-Kontextmenü) stehen in [ROADMAP.md](./ROADMAP.md).

## UI/UX & Branding (Sammeltask)

Aus `docs/proposals/todo.txt` übernommen (2026-07-05) — kleinere, unabhängige UI-/Text-Anpassungen
an bereits bestehenden Features.

- [x] **Credits/Copyright-Modal überarbeitet und erweitert** (2026-07-07) — siehe
  [docs/superpowers/specs/2026-07-07-copyright-modal-design.md](./docs/superpowers/specs/2026-07-07-copyright-modal-design.md).
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
  [docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md](./docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md).
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
- [ ] **Versionierungspraxis überdenken:** Mehrere kleine Features am selben Tag führen aktuell zu
  mehreren separaten Minor-Bumps (z.B. mehrfach `3.x.0` am selben Tag) — wirkt übertrieben. Da die
  Versionierungsregel in `AGENT_INSTRUCTIONS.md` (Abschnitt 4, generisch/repo-übergreifend) steht,
  läuft eine Änderung daran über den Proposal-Zyklus (`AGENT_INSTRUCTIONS.md` Abschnitt 5,
  `docs/proposals/`) — nicht direkt im Live-Dokument ändern.

## Standards-Angleichung

Bestehenden Code/bestehende Praxis an die in [CLAUDE.md](./CLAUDE.md#standards-referenzen) referenzierten
Standards angleichen bzw. dagegen prüfen (kein neuer Code, kein neues Feature).

- [ ] **PHP (`api/*.php`) gegen PSR-12 prüfen** — aktuell keine durchgesetzte Stilkonvention fürs
  Backend. Audit (Einrückung — schon 4 Spaces, aber Namespaces/Dateistruktur/Klammersetzung
  ungeprüft) + Angleichung wo nötig.
- [ ] **Security-Praxis gegen OWASP Top 10 gegenchecken** — kurzer Self-Check der bestehenden
  Regeln (Read-only `web_api_user`, Secrets nur in `api/config.local.php`, keine Secrets im Repo)
  gegen die zehn Kategorien; keine Vollzertifizierung, nur Lückenprüfung.
- [ ] **OpenAPI-Spec für `api/*.php` erstellen** — aktuell keine formale Beschreibung der Endpoints
  (Pfade, Query-Parameter, Response-Schemas). Je Endpoint (`nah.php`, `stations.php`, `ors.php`,
  `geocoder.php`, `ping.php`, `adsb.php`, `ais.php`, …) Request/Response gegen den Ist-Code
  dokumentieren, als eine `openapi.yaml`/`openapi.json` im Repo.
