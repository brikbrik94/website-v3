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

Anschlussfeatures nach dem Cleanup (Legende, generischer Karten-Klick, Routing-Touch-Kontextmenü) stehen in [ROADMAP.md](./ROADMAP.md).

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
