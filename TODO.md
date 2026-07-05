# Projekt TODOs

Aufgaben im **aktuellen Scope**: Fixes, Cleanup, Erweiterungen an bereits bestehendem Code/Features.
Neue, noch nicht existierende Features/Funktionen gehören in [ROADMAP.md](./ROADMAP.md), nicht hierher.
Abgeschlossene Aufgaben wandern ins [TODO_ARCHIVE.md](./TODO_ARCHIVE.md).

## Map-Subsystem Cleanup

Kontext & Details: [docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](./docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md).
U1 (OverlayLoader) + U2 (Restore-Pfade) sind seit v3.5.2 erledigt und seit 2026-07-03 visuell
verifiziert (6-Punkte-Checkliste, siehe TODO_ARCHIVE.md) — dabei 2 Bugs gefunden und behoben,
ebenfalls im Archiv dokumentiert.

### Cleanup / Vereinheitlichung
- [ ] U5 NAH DOM-Marker → Symbol-Layer migrieren (FA-Helicopter-HTML-Marker → `nah-*` Sprites, Popup-Refactor auf Click-Events); dabei auch Inline-`style="color:…"` in `NahMapLayers.ts:84,108` entfernen
- [ ] U6 Hover-Cursor vereinheitlichen (`attachHoverCursor`; Routing noch inline, `RoutingPage.ts:69`)
- [ ] U7 MapRegistry-Buchhaltung vereinfachen (Dreifach-Buchhaltung `activeLayers`/`overlayMetadata`/`MapRegistry`)
- [ ] U1b `MapPage.toggleLayer` in `OverlayLoader` generalisieren (ID-Prefixing + Layer-Subset)

### Kleinere Map-Bugs (Sammeltask)
- [ ] Width-Desync `TrackingMapLayers.ts` — `ensureLayers` setzt Track-Breite 5/3, `highlightItem` 4/1.5
- [ ] TerrainManager Double-Add-Race bei „warmem" Init prüfen (un-awaited `applyTerrainInfrastructure` + paralleler Restore)
- [ ] NAH-Feature-State-Reset hardcoded `for (i<5)` (`NahMapLayers.ts:148`) → stale `selected` bei >5 Ergebnissen
- [ ] TrackingPage-Timer (`setTimeout`, `TrackingPage.ts:130`) nicht in `destroy()` gecleart
- [ ] Basemap-Style „At Plus" liefert 404 für sein eigenes (natives, nicht von `MapCore.loadSprites`
  verwaltetes) Sprite (`https://tiles.oe5ith.at/assets/sprites/basemaps/sprite.json`) — MapLibre
  loggt beim Laden dieses Basemaps einen `AJAXError (404)`. Serverseitig (Tile-Server-Assets) oder
  im Style-JSON zu prüfen, nicht im Repo-Code; bei U3-Live-Verifikation (2026-07-03) entdeckt.
- [ ] Turn-by-Turn-Anzeige für A→B-Routen (Phase 2 aus
  [docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md](./docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md))
  blockiert auf einer neuen generischen Single-Disclosure-Komponente im `oe5ith-ci`-Submodul —
  Anfrage bereits hinterlegt in `oe5ith-ci/ci-routing-disclosure-request.md`. Sobald verfügbar:
  `formatSteps(segments)`-Helper + Rendering ergänzen.
- [ ] Lange Warn-Badge-Texte (z.B. „Zufahrtsbeschränkungen auf der Strecke") werden am rechten
  Sidebar-Rand abgeschnitten statt umzubrechen — `.badge` (`oe5ith-ci/css/badges.css`) setzt
  `white-space: nowrap`, `.result-badges` hat zwar `flex-wrap: wrap`, aber ein einzelnes zu
  breites Flex-Item bricht dadurch nicht intern um. Vorbestehend (bereits vor
  `docs/superpowers/plans/2026-07-05-routing-summary-layout.md` reproduzierbar, dort nur die
  DOM-Position des Badges geändert, nicht das Overflow-Verhalten); entdeckt bei der
  Browser-Verifikation dieses Plans (2026-07-05).
- [ ] Coords-Seite (Umrechner): Pin setzen ist an Linksklick auf die Karte gebunden
  (`CoordsPage.ts:72`, `map.on('click', ...)`). Auf ein Rechtsklick-Kontextmenü umstellen, exakt
  analog zum bestehenden Routing-Pattern (`RoutingPage.ts:76`, `map.on('contextmenu', ...)` mit
  `ContextMenuItem`-Liste) — **nicht** direkt an Rechtsklick binden, da Rechtsklick-Drag bereits
  für die 3D-Steuerung (Kippen/Rotieren) reserviert ist; `contextmenu` feuert nur bei Rechtsklick
  ohne Drag und kollidiert damit nicht. Linksklick bleibt für normales Verschieben frei. Aus
  `docs/proposals/todo.txt` übernommen (2026-07-05).

Anschlussfeatures nach dem Cleanup (Legende, generischer Karten-Klick, Routing-Touch-Kontextmenü) stehen in [ROADMAP.md](./ROADMAP.md).

## UI/UX & Branding (Sammeltask)

Aus `docs/proposals/todo.txt` übernommen (2026-07-05) — kleinere, unabhängige UI-/Text-Anpassungen
an bereits bestehenden Features.

- [ ] **Versionsinfo-Fenster wird von der Topbar abgeschnitten.** Betrifft vermutlich das
  Changelog- oder das Copyright-Modal (`src/lib/GlobalModals.ts`) auf Kartenseiten — zuerst
  klären, welches der beiden Modals genau gemeint ist, dann Positionierung/z-Index prüfen
  (an Kartenausschnitt begrenzen oder über die gesamte Seite anzeigen); ggf. auch verbreitern.
- [ ] **Credits/Copyright-Modal überarbeiten und erweitern** (`copyright-modal`,
  `src/lib/GlobalModals.ts:134-160`). Kontakt-E-Mail `daniel@oe5ith.at` ergänzen, ggf.
  Kontaktformular statt/zusätzlich zur E-Mail; Abschnitt allgemein inhaltlich erweitern.
- [ ] **Seitentitel „Cloud Portal" → „GeoPortal".** Betrifft `<title>` in `index.html:7`
  (aktuell „OE5ITH - Cloud Portal") und die Landing-Page-Überschrift `src/main.ts:55`
  („Willkommen im Cloud Portal"). Rein textuelle Änderung, aber Auswirkung auf Branding prüfen
  (README, CLAUDE.md-Kopf beschreiben die App ebenfalls als „Cloud Portal" — dort ggf. mitziehen).
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
