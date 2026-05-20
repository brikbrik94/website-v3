# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [3.3.1] - 2026-05-20 18:05

### Geändert
- **UI/UX Design System:** Vollständiges Refactoring aller Seiten, Komponenten und Helper zur vollständigen Eliminierung statischer und dynamischer inline CSS `style="..."`-Attribute gemäß CI-Richtlinien (`oe5ith-ci`).
- **Sichtbarkeitssteuerung:** Standardisierung des Sichtbarkeits-Hiding-Mechanismus unter Verwendung der modular in `src/app.css` definierten `.hidden` Utility-Klasse anstelle von inline `style="display: none;"` / `style="display: block;"` / `style="display: flex;"`. Toggling erfolgt nun sauber via `classList` in TypeScript.
- **Regions-Analyse:** Refactoring von `src/components/info/RegionsModule.ts` zur Eliminierung aller inline Layouts, Flex-Stile und Gewichte. Ersatz durch neue und bestehende CI-konforme Utilities.
- **Tracking Gateway Modul:** Refactoring von `src/components/info/TrackingGatewayModule.ts` zur Entfernung von inline Tabellenbreiten, Border-Collapse und Paddings.
- **Koordinaten-Eingabeblöcke:** Refactoring von `AddressBlock.ts` und `DmsBlock.ts` zur Eliminierung von inline Geocoder-Abständen und Cursor-Zeigern.
- **Kartenlegende:** Refactoring von `LayoutHelper.ts` und `MapLegend.ts` zur Steuerung der Legenden-Sichtbarkeit über Klassen-Toggles statt Inline-Display.
- **Sidebar & UI Toggles:** Refactoring von `NahSidebar.ts`, `RoutingSidebar.ts` und `SidebarUtils.ts` zur Beseitigung aller inline Cursor-Pointer und Hiding-Stile.

### Behoben
- **CI-Konformität:** Beseitigung aller verbleibenden statischen Hex-Farben (`#fff` / `#ffffff`) in den geänderten UI-Dateien und vollständige Ausrichtung an den Farb-Tokens des CI-Submoduls.

### Hinzugefügt
- **CI_MISSING_STYLES.md:** Erstellung eines Vorschlagsregisters im Projekt-Root zur geordneten Migration neuer Layout- und Spacing-Utilities in das Upstream-Repository `oe5ith-ci`.
- **Design Utilities:** Einführung von `.pos-relative`, `.coord-header-status`, `.cursor-pointer` und `.t-tiny` in `src/app.css` zur Kapselung projektspezifischer UI-Layout-Erfordernisse.

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
