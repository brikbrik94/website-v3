# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

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
