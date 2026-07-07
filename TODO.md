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

Anschlussfeatures nach dem Cleanup (Legende, generischer Karten-Klick, Routing-Touch-Kontextmenü) stehen in [ROADMAP.md](./ROADMAP.md).

## UI/UX & Branding (Sammeltask)

Aus `docs/proposals/todo.txt` übernommen (2026-07-05) — kleinere, unabhängige UI-/Text-Anpassungen
an bereits bestehenden Features.

- [ ] **Credits/Copyright-Modal überarbeiten und erweitern** (`copyright-modal`,
  `src/lib/GlobalModals.ts:134-160`). Kontakt-E-Mail `daniel@oe5ith.at` ergänzen, ggf.
  Kontaktformular statt/zusätzlich zur E-Mail; Abschnitt allgemein inhaltlich erweitern.
- [ ] **Mobilansicht: Quicklinks in der Topbar durch das Dropdown ersetzen.** Auf schmalen
  Viewports aktuell vermutlich beides parallel sichtbar/beengt — genaue Topbar-Struktur vor
  Umsetzung prüfen.
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
