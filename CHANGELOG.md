# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unreleased] - 2026-07-03 15:49

### Hinzugefügt
- **Unit-Tests für `MapCore.createPinLayer`/`MapCore.setPointSource`** (`src/lib/MapCore.test.ts`, 6 Tests): Defaults, Custom-Optionen, Halo-Paint nur bei gesetzter Farbe, Punkt setzen/leeren/No-Op bei fehlender Source. `npm test`: 47/47 grün.


### Geändert
- **Sprite-Sheets werden gecacht statt bei jedem Style-Reload neu geladen (`MapCore.loadSprites`).** Fetch + Bild-Dekodierung eines Sprite-Sheets liefen bisher bei jedem Basemap-Wechsel erneut ab, obwohl der Inhalt pro Sprite-URL identisch ist — wirkt sich auf Core Web Vitals (LCP/INP) beim Karten-Init aus. Neuer Cache (`_spriteSheetCache`, keyed nach Sprite-URL inkl. HiDPI-Suffix) übernimmt jetzt nur noch den einmaligen Fetch/Decode; das (unvermeidbare) erneute `map.addImage()` pro Style-Instanz bleibt bestehen. Zusätzlich die 3 identisch duplizierten `SPRITE_BASE`-Konstanten (`NahMapLayers.ts`, `RoutingMapLayers.ts`, `CoordsPage.ts`) durch eine zentrale, aus `MapCore.ts` exportierte `MARKERS_SPRITE_BASE` ersetzt. Live per Playwright verifiziert (`npx tsc --noEmit && npm test` grün).
- **Pin-/Marker-Boilerplate zusammengefasst (`MapCore.createPinLayer`, `MapCore.setPointSource`).** Die Symbol-Layer-Definition für Einzel-Pins (NAH-Einsatzort, Routing-Start/-Ziel, Coords-Pin) und die „Pin-Position setzen/leeren"-Logik waren an drei Stellen fast identisch kopiert. Jetzt zwei gemeinsame `MapCore`-Helper (`createPinLayer` baut die `LayerSpecification`, `setPointSource` setzt/leert die Point-GeoJSON-Source); ersetzt die Duplikate in `NahMapLayers.ts`, `RoutingMapLayers.ts` (inkl. Wegfall der privaten `_updatePin`) und `CoordsPage.ts`. Live per Playwright verifiziert (Coords-/Routing-Pins rendern korrekt, keine Konsolenfehler), `npx tsc --noEmit && npm test` grün.

### Behoben
- **RD-Overlay-Pins verschwinden dauerhaft bei Basemap-Wechsel auf „Basemap At"** (`src/pages/MapPage.ts`, `toggleLayer`). `isStyleLoaded()` wartete via `m.once('style.load', resolve)` auf ein bereits verstrichenes Event (feuert ohne erneuten `setStyle()`-Aufruf nicht wieder) → hing bei großen, langsam ladenden Basemaps (hier „Basemap At", ~2,4 GB PMTiles) für immer und blockierte wegen des dauerhaft `true` bleibenden `isRestoring`-Flags in `MapCore.ts` jede weitere Restore-Sequenz der Karteninstanz. Wartelogik jetzt ein Polling auf `isStyleLoaded()` (`requestAnimationFrame`-Loop) statt auf das Event.
- **Höhenlinien rendern/entfernen sich nicht auf „Basemap At"** (`src/lib/OverlayLoader.ts`). Der Höhenlinien-Overlay-Style (`basemap-at-contours`) und der „Basemap At"-Basemap-Style definieren unabhängig voneinander beide eine Source namens `esri` — `OverlayLoader.add()` prüfte nur `!map.getSource(sourceId)`, die existierte durch den Basemap bereits, wodurch die eigentliche Höhenlinien-Source nie hinzugefügt wurde (Contour-Layer zeigten auf die falschen, Basemap-eigenen Vektordaten). Beim Ausschalten scheiterte zusätzlich `removeSource('esri')`, weil die Source noch von Basemap-Layern gebraucht wurde. `OverlayLoader` prefixt Source-/Layer-IDs jetzt immer mit der `overlayId` (gleiches Muster wie in `MapPageController.toggleLayer`), damit Overlay-IDs nie mit Basemap-eigenen IDs kollidieren können.

Beide Bugs beim manuellen Durchtesten der U1/U2-Verifikations-Checkliste (Map-Subsystem Cleanup, siehe TODO_ARCHIVE.md) gefunden, per systematischer Fehlersuche (Root-Cause + Live-Reproduktion via Playwright) bestätigt und gefixt; `npx tsc --noEmit && npm test` grün.

### Hinzugefügt
- **TODO/Roadmap-Trennung + Standards-Referenzen (`CLAUDE.md`, `TODO.md`, `ROADMAP.md`).** `TODO.md` (aktueller Scope: Fixes/Cleanup/Erweiterungen) und neues `ROADMAP.md` (neue, noch nicht existierende Features) getrennt, je mit `*_ARCHIVE.md`-Gegenstück. `TODO.md` auf die offene Map-Subsystem-Cleanup-Roadmap (U1–U7) aktualisiert; die 4 alten CI-Token/Accessibility-Punkte entfernt, da sie tatsächlich zu `oe5ith-ci/docs/roadmap.md` gehören. `CLAUDE.md` bekam eine neue Sektion „Standards-Referenzen": referenziert die externen Standards hinter den Repo-Konventionen (Semantic Versioning, Keep a Changelog, Conventional Commits, PSR-12, EditorConfig, BEM, GeoJSON/RFC 7946, WGS84, ISO 8601, WCAG, ARIA APG, Twelve-Factor Config, ADR, OWASP Top 10, Core Web Vitals, OpenAPI) inkl. bekannter Abweichungen, plus eine Pflege-Regel für künftige neue Dienste/Sprachen. Neues `.editorconfig` an bestehenden Codestil angeglichen (2 Spaces JS/TS/CSS, 4 Spaces PHP). Konkrete Angleichungs-Aufgaben (PSR-12-Audit, OWASP-Self-Check, OpenAPI-Spec) als neue TODO.md-Sektion „Standards-Angleichung" erfasst.

### Geändert
- **`CLAUDE.md` in portable + repo-spezifische Teile aufgesplittet.** Neue Datei `AGENT_INSTRUCTIONS.md` enthält jetzt die repo-unabhängigen, standardbasierten Regeln (generische Standards-Referenzen-Auswahl, TODO/Roadmap-Split-Konvention, Releases/Versionierung/Git, Core Mandates) — 1:1 in andere Repos kopierbar, ohne website-v3-Dateipfade. `CLAUDE.md` verweist darauf statt die Regeln zu duplizieren und behält nur noch Repo-Spezifisches (Architektur, Commands, Geodaten-Standards, `oe5ith-ci`-Anwendung, konkrete Release-Dateipfade). `GEMINI.md` (von Gemini CLI zwingend unter diesem Namen geladen) auf einen kurzen Verweis auf `AGENT_INSTRUCTIONS.md` + `CLAUDE.md` reduziert statt eigenständig zu duplizieren — war zuvor veraltet (`api/config.php` statt `api/config.local.php`, verpflichtender `-dev`-Suffix). Entsprechender ROADMAP.md-Punkt nach `ROADMAP_ARCHIVE.md` verschoben.
- **`AGENT_INSTRUCTIONS.md` nach Review überarbeitet** (Entwurf + Review-Doku in `docs/proposals/archive/2026-07-03-agent-instructions-*.md`): neues Core Mandate „Out-of-Scope-Funde als TODO.md-Eintrag dokumentieren statt nebenbei mitfixen"; Nachfragen-Mandat um Fallback für non-interaktive Läufe ergänzt (minimalinvasivste Interpretation + Annahme dokumentieren); Changelog-Zeitstempel-Konvention explizit als bewusste Eigenregel markiert (Keep a Changelog kennt nur einen undatierten `[Unreleased]`-Block) plus Merge-Konflikt-Regel (immer zusammenführen, nie verwerfen); PSR-12-Zeile zu „Ökosystem-Style-Standard" generalisiert (PEP 8, rustfmt, gofmt, Prettier als weitere Beispiele); TODO/Roadmap-Tie-Breaker „im Zweifel TODO.md" ergänzt; `git add -A`-Verbot von Release-Kontext auf generell gehoben; Versions-Kriterium „minor" präzisiert.
- **`AGENT_INSTRUCTIONS.md` um Abschnitt „Meta-Dokument-Änderungen (Proposals)" ergänzt.** Formalisiert den gerade genutzten Draft-Review-Merge-Zyklus für Änderungen an Regel-/Prozessdokumenten selbst: Ablage in `docs/proposals/` (Naming `YYYY-MM-DD-<slug>.md` + `-review.md`), harte Grenze „nur explizit in der Review-Tabelle besprochene Punkte werden übernommen, keine stillschweigenden Zusatzänderungen", danach Archivierung nach `docs/proposals/archive/`. Generisch gehalten (kein website-v3-Bezug), damit die Konvention mit `AGENT_INSTRUCTIONS.md` in andere Repos mitwandert.

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

### Aktualisiert
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
