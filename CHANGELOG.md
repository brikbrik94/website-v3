# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [3.3.0-dev] - 2026-05-20 14:31

### Behoben
- **Tracking-UI:** Fix für fehlendes Event-Cleanup und Map-Removal in `TrackingPage`. Implementierung einer dedizierten `handleMoveEnd` Methode zur sicheren Entfernung des Listeners beim Zerstören der Seite.

## [3.3.0-dev] - 2026-05-20 14:14

### Hinzugefügt
- **Tracking-Service:** Implementierung von BBox-basiertem Filtern mit Debouncing (500ms) bei Kartenbewegung zur Reduzierung der Gateway-Last.
- **Tracking-UI:** Verknüpfung der Karten-Events (`moveend`) mit dem Tracking-Service zur dynamischen Aktualisierung der Sichtbarkeitsbereiche.

### Geändert
- **Tracking-Service:** Refactoring von `TrackingDataService` zur Unterstützung des V2-Protokoll-Lebenszyklus (`hello` -> `subscribe` -> `ack`).
- **WebSocket:** Umstellung auf Gateway-V2 (`wss://api.oe5ith.at/tracking/ws/v2`) mit Unterstützung für BBox-basierte Subscriptions.
- **Tracking-Protokoll:** Aktualisierung der TypeScript-Typen in `src/types/tracking.ts` auf Version 2.1 des Tracking Gateway Protokolls.
- **Vessel Tracking:** Unterstützung für Track-Daten (Historie) bei Schiffen (`VesselEntity`) hinzugefügt.
- **Protokoll-Erweiterung:** Unterstützung für `protocolVersion: 2`, sowie neue `AckMessage` und `ErrorMessage` Typen in `HelloMessage` und `ServerMessage` integriert.

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
