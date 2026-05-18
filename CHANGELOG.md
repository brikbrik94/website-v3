# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [3.3.0-dev] - 2026-05-18 10:30

### Geändert
- **Tracking:** AIS Popups nutzen nun die zentrale `ui_class` Eigenschaft für eine konsistente Anzeige der Schiffsklasse. Redundante `SHIP_CLASSES` Konstanten in `PopupManager.ts` wurden entfernt.

## [3.3.0-dev] - 2026-05-18 10:20

### Geändert
- **Tracking:** AIS Karten-Layer Styling in `TrackingMapLayers.ts` vereinfacht durch Nutzung der angereicherten UI-Properties (`ui_color`, `ui_sprite`). Komplexe `match`-Ausdrücke wurden entfernt.

## [3.3.0-dev] - 2026-05-18 10:00

### Hinzugefügt
- **Tracking:** `ShipTypeMapper` Utility zur Kategorisierung von Schiffstypen basierend auf AIS und ERIDM (Inland AIS) Codes inkl. Sprite-Zuweisung und CI-konformer Farbgebung.
- **Tracking:** Umfassende Unit-Tests für `ShipTypeMapper` zur Absicherung aller AIS/ERIDM Kategorisierungs-Bereiche, Farbmappings und Eingabetypen (verifiziert).

## [3.3.0-dev] - 2026-05-17 15:45

### Hinzugefügt
- **Tracking:** Migration von Polling auf WebSocket-Push (tracking-gateway V1.3).
- **Tracking:** Native Unterstützung für Flugpfade (Track History). Das Frontend nutzt nun die autoritativen `track` und `trackPoints` Daten direkt vom Server.
- **Tracking:** Live-Status Updates für Flugzeuge (ADS-B) und Schiffe (AIS) in Echtzeit über `wss://api.oe5ith.at/tracking/ws`.
- **Tracking:** Detaillierte Source-Health Überwachung. Die Status-Dots im Sidebar reflektieren nun den tatsächlichen Zustand der Upstream-Receiver (SBS/AIS) über das Gateway.
- **Tracking:** Unterstützung für erweiterte ADS-B Metadaten (Registrierung, Flugzeugtyp, Hersteller, Besitzer) durch PostgreSQL-Backend Integration.
- **Tracking:** Paket-Raten Berechnung und Status-Reporting für den WebSocket-Feed.

### Geändert
- **Tracking:** `AdsbInterpreter` und `AisInterpreter` entfernt; Logik in `TrackingDataService` konsolidiert für Push-Betrieb mit nativem State-Merging der Pfad-Historie.
- **Service Health:** Migration der Health-Checks auf den neuen `tracking-gateway` Endpunkt. Entfernung der legacy PHP-Proxies (`adsb.php`, `ais.php`) aus dem Monitoring.
- **Debug:** API-Debug Playground auf das neue Gateway umgestellt.
- **Map:** Optimierte Layer-Registrierung in `TrackingMapLayers` für bessere Sichtbarkeit und Persistenz der Pfade über Style-Wechsel hinweg.

## [3.3.0-dev] - 2026-05-16 11:45

### Behoben
- **MapCore Restoration Timing (Final):** Ersetzung des unzuverlässigen `idle` Events durch eine doppelte `requestAnimationFrame` Kaskade. Dies stellt sicher, dass MapLibre den Style-Wechsel vollständig verarbeitet hat und die Grafik-Pipeline bereit für neue Ressourcen ist.
- **MapPage Optimization:** Bereinigung der `onRestore` Logik. Redundante Wiederherstellungs-Aufrufe wurden entfernt, da `MapCore` nun die zentrale Verantwortung für die Registry-Restaurierung trägt.
- **Rendering Synchronization:** Systematischer Einsatz von `triggerRepaint()` nach jeder Restaurierung, um die visuelle Konsistenz ohne Benutzerinteraktion zu garantieren.

## [3.3.0-dev] - 2026-05-16 11:25

### Behoben
- **MapCore Restoration Timing (Resilient):** Umstellung der Restaurierungskette auf das `idle` Event der Karte. Dies garantiert, dass MapLibre alle internen Style-Operationen abgeschlossen hat, bevor Quellen und Layer injiziert werden.
- **Async Synchronization:** Der `onRestore` Callback wird nun explizit in den nächsten Event-Loop Cycle verschoben (`setTimeout 0`), um eine saubere Trennung zwischen der Registry-Wiederherstellung und der seiten-spezifischen Daten-Synchronisation zu gewährleisten.
- **Repaint Trigger:** Alle kartenbasierten Seiten forcieren nach der Wiederherstellung nun einen `triggerRepaint()`, um sicherzustellen, dass die neuen Daten sofort und ohne Interaktion gerendert werden.

## [3.3.0-dev] - 2026-05-16 11:05
...
### Behoben
- **MapPage Overlay Refresh:** Implementierung eines `onRestore` Callbacks in `MapPage.ts`, der aktive Layer nach einem Basemap-Wechsel automatisch neu anwendet. Dies stellt sicher, dass Overlays sofort nach dem Laden der Grundkarte wieder sichtbar sind, ohne dass eine manuelle Interaktion erforderlich ist.
- **MapCore Restoration Timing:** Einführung einer Sicherheitsverzögerung (50ms) in der `MapCore` Restaurierungskette, um MapLibre Zeit zu geben, den neuen Style intern zu setzen, bevor Quellen und Layer injiziert werden.
- **RoutingPage Sync:** Verstärkung der Synchronisation in `RoutingPage`, damit berechnete Routen auch nach einem Style-Wechsel konsistent angezeigt werden.

## [3.3.0-dev] - 2026-05-16 10:45

### Behoben
- **MapPage URL Resolution:** Korrektur der URL-Auflösung für Overlays. Absolute URLs (inkl. `pmtiles://`) werden nun erkannt und nicht mehr fälschlicherweise als relative Pfade umgeschrieben.
- **Registry Resilience:** Die Wiederherstellung der Karte (`MapRegistry.restore`) ist nun resilient gegen einzelne Fehler (z.B. 404 bei Sprites). Durch `Promise.allSettled` wird sichergestellt, dass restliche Quellen und Layer auch dann geladen werden, wenn ein Overlay-Ressourcenpaket fehlt.
- **Routing Restoration:** Verbesserte Logging- und Self-Healing Logik für die Routing-Seite, um sicherzustellen, dass berechnete Routen nach einem Basemap-Wechsel zuverlässig wieder auf der Karte erscheinen.

## [3.3.0-dev] - 2026-05-16 10:15

### Behoben
- **NAH Functionality:** Fix für die Suche nach der nächstgelegenen Station nach einem Basemap-Wechsel. Durch Self-Healing Logik in `performCalculation` wird sichergestellt, dass benötigte Karten-Ressourcen (nah-lines) auch während eines laufenden Style-Loads zur Verfügung stehen.
- **Registry Data Corruption:** `MapRegistry` nutzt nun Deep-Cloning für GeoJSON-Daten, um zu verhindern, dass interne Modifikationen durch MapLibre den persistierten Zustand korrumpieren.
- **Global Registry Lifecycle:** Automatisches Leeren der `MapRegistry` im globalen Router (`main.ts`) beim Seitenwechsel. Dies verhindert Ressourcen-Leaks und "Ghost"-Layer von vorherigen Seiten, stellt aber durch die `setTimeout` Logik in `MapCore` sicher, dass die neue Seite ihre Ressourcen rechtzeitig registrieren kann.

## [3.3.0-dev] - 2026-05-16 09:05

### Behoben
- **Registry Lifecycle:** Entfernung der redundanten `MapRegistry.clear()` Aufrufe in den Seiten-Initialisierungen. Diese haben den Zustand der Registry fälschlicherweise gelöscht, noch bevor die Karte die Ressourcen wiederherstellen konnte.
- **Basemap Persistence:** Priorisierung des `BasemapStore` in `MapCore.init` korrigiert, damit Standardwerte gespeicherte Präferenzen nicht überschreiben.
- **Topbar Sync:** Initialisierung der Topbar-UI (Label und aktiver Status) mit dem gespeicherten Zustand aus dem `BasemapStore`.
- **Relative URLs:** Fix für verschwindende Overlays durch Auflösung relativer Pfade gegen die `overlayUrl` vor der Registrierung im `MapRegistry`.
- **Sprite Lifecycle:** Alle kartenbasierten Seiten registrieren ihre benötigten Sprites nun explizit im `MapRegistry`, um deren Wiederherstellung vor den Symbol-Layer zu garantieren.
- **Registry Debugging:** Einführung von detaillierten `console.debug` Logs in `MapRegistry.ts` zur Überwachung der Ressourcen-Lebenszyklen.

### Hinzugefügt
...
- **Map Resource Registry:** Zentrale Architektur zur Verwaltung und automatischen Wiederherstellung von Kartenquellen und Layern nach einem Basemap-Wechsel.
- **Basemap Persistence Store:** Persistenzschicht für die gewählte Grundkarte im `localStorage`.

### Geändert
- **MapCore Architektur:** Umstellung auf ein automatisiertes Restaurierungs-System basierend auf der neuen Registry.
- **Seiten-Integration:** Migration von `MapPage`, `NahPage`, `RoutingPage` und `TrackingPage` auf das Registry-System.

...
## [3.2.9] - 2026-05-15
...
### Behoben
- **Routing Seite:** Korrektur der Highlight-Logik in der Ergebnisliste. Stationen können nun durch erneutes Anklicken der Karte wieder abgewählt werden.
- **CI-Konformität:** Strikte Anwendung der `MAP_ROUTE_STYLES` für alle Routen-Visualisierungen (Farbe, Breite, Opazität).

## [3.2.8] - 2026-05-15

### Behoben
- **Routing Seite:** Wiederherstellung der korrekten Sprite-basierten Stations-Icons aus dem `oe5ith-markers` Set. Entfernung der fehlerhaften Fallback-Marker.
- **UI-Konsistenz:** Bereinigung von redundantem CSS für Routing-Marker.

## [3.2.7] - 2026-05-15

### Behoben
- **Tracking Seite:** Kritischer Fix für verschwindende Flugzeuge/Schiffe beim Wechsel der Basemap. Einführung einer robusten Layer-Restaurierung und eines Self-Healing Mechanismus im Refresh-Loop.
- **Routing Seite:** Fix für die Anzeige der 5 nächsten Standorte. Ergebnisse werden nun sofort nach der Suche auf der Karte visualisiert. Routen bleiben auch nach Basemap-Wechsel erhalten.
- **MapCore:** Umstellung auf ein robusteres Event-Handling bei Style-Wechseln zur Vermeidung von Race-Conditions.

### Geändert
- **Zentralisierung:** Einführung von `MapCore.ensureGeoJsonLayer` zur Vereinheitlichung der Overlay-Verwaltung über alle Seiten hinweg.

## [3.2.6] - 2026-05-11

### Hinzugefügt
- **CoordsPage:** Einführung eines verbesserten Geocoder-Dropdowns mit kontextbezogenen Icons (Krankenhäuser, Berge, Städte etc.) und optimierter Adress-Formatierung.

## [3.2.5] - 2026-05-10

### Geändert
- **TerrainControls:** Umstellung auf den CI v2.1.0 Standard mit Icon-Only Toggles, Tooltips und versteckten Labels für eine kompaktere Topbar.

### Behoben
- **Karten-Attribution:** Wiederherstellung des "i"-Symbols (MapLibre compact mode) durch Umstellung auf native Attribution. Entfernung veralteter manueller Attribution-Injection zur Einhaltung der CI-v2 Standards.

## [3.2.4] - 2026-05-09

### Hinzugefügt
- **Tracking Status:** Status-Indikator im Footer der Tracking-Seite für ADS-B und AIS Erreichbarkeit.

## [3.2.3] - 2026-05-09

### Behoben
- **NAH Seite:** Wiederherstellung der bewährten Saison-Logik und Stabilisierung der MapStyles zur Vermeidung grauer Marker.

## [3.2.2] - 2026-05-09

### Behoben
- **Saison-Logik:** Fix für fehlerhafte Monats-Berechnung in `api/nah.php`.

## [3.2.1] - 2026-05-09

### Behoben
- **NAH Seite:** Fix für `TypeError` (Cannot read properties of undefined (reading 'join')) durch Wiederherstellung fehlender API-Felder in `nah.php`.
- **ADS-B Symbole:** Wiederherstellung der Sichtbarkeit durch Korrektur der `addImage` Logik im `MapCore`.
- **Typisierung:** Robusterer Umgang mit optionalen Feldern in den Map-Popups.

## [3.2.0] - 2026-05-08

### Hinzugefügt
- **Tracking Refinement:** Vollständige Überarbeitung der ADS-B und AIS Visualisierung.
- **Improved Popup System:** Einführung des `PopupManager` für CI-konforme, tabellarische Datenanzeige.
- **Höhenabhängige Tracks:** ADS-B Flugpfade werden segmentiert und farblich nach Höhe kodiert.

### Geändert
- **AIS Logik:** Dynamisches Umspringen von Punkten auf Schiffssymbole ab Zoom 11 (nur für Fahrzeuge in Fahrt).
- **Daten-Effizienz:** Optimiertes Tracking-Handling zur Vermeidung redundanter Datenpunkte.
- **Schriften:** Umstellung auf `Open-Sans-Regular` zur Gewährleistung der Server-Kompatibilität.

## [3.2.0a2] - 2026-05-08

### Behoben
- **TrackingPage Stabilisierung:** Umstellung auf einen rekursiven `setTimeout` Loop zur Vermeidung von Request-Überlappungen bei langsamen Verbindungen.
- **Symbol-Rendering:** Fix für verschwindende Icons durch verbesserte Sprite-Initialisierung und pixelRatio-Handhabung in `MapCore`.
- **Backend Proxies:** Robustere Fehlerbehandlung in `api/ais.php` und `api/adsb.php` (liefern nun immer validen JSON-Fallback).
- **Infrastruktur:** Bereinigung von Modul-Konflikten zwischen root-API und Vite-Proxy.

## [3.2.0a1] - 2026-05-07

### Hinzugefügt
- **Live Tracking:** Neue spezialisierte Seite für Schiffs- (AIS) und Flugverkehr (ADS-B).
- **Echtzeit-Karten:** Nutzung von High-Performance Symbol-Layern mit dynamischen Sprites und rotierenden Icons.
- **Track-Historie:** Permanente Anzeige der Flug- und Fahrwege mit Hervorhebung des ausgewählten Objekts.
- **Interaktive Sidebar:** Separate Listen für Luft- und Wasserfahrzeuge zur schnellen Lokalisierung.

## [3.1.2a1] - 2026-05-07

### Hinzugefügt
- **NAH-Verfügbarkeit:** Komplette Überarbeitung der Status-Anzeige. Differentiellere Darstellung von Saisonpause vs. täglicher Betriebszeit.
- **Info-Seite:** Neues Triple-Table Layout (Aktiv, Bereitschaft/Standby, Saisonpause) für bessere Übersicht.
- **Statistik-Dashboard:** Die Quote der Einsatzbereitschaft klammert Stationen in der Saisonpause nun aus, um ein realistischeres Bild der aktiven Flotte zu geben.
- **Kartendarstellung:** Neues Drei-Farben-System für NAH-Marker (Grün=Aktiv, Rot=Saison/Standby, Grau=Saisonpause) inkl. detaillierterer Popups.

## [3.1.1a2] - 2026-05-07

### Hinzugefügt
- **UI-Interaktion:** Die Versionsnummer auf der Startseite öffnet nun ebenfalls das Changelog-Modal.
- **Karten-Attribution:** Umstellung auf das kompakte "i"-Symbol (MapLibre compact mode) für ein saubereres Kartenbild.

## [3.1.1a1] - 2026-05-07

### Hinzugefügt
- **CI v2.0 Integration:** Vollständige Umstellung auf den neuen CI-Standard inkl. Typ-5 Landing-Page und nativem Footer.
- **Kartendarstellung:** Wechsel auf native MapLibre-Attribution zur besseren Einhaltung der Lizenzbedingungen.
- **Styling:** Neue Marker-Definition für NAH-Hubschrauber (bessere Sichtbarkeit & Schatten).

### Behoben
- **Sidebar Mobil:** Fix für die Sidebar im Koordinaten-Umrechner, die sich auf Mobilgeräten nicht öffnen ließ.
- **CI-Fixes:** Übernahme von Gap-Fallbacks und Scrollbar-Verbesserungen aus dem `oe5ith-ci` Repository.

## [3.1.0a1] - 2026-05-06

### Hinzugefügt
- **Koordinaten-Konverter:** Volle Unterstützung für manuelle Eingabe aller Systeme (WGS84, DMS, UTM, BMN, MGRS, Maidenhead).
- **Adress-Suche & Anzeige:** Neues Feld "Adresse" ganz oben. Unterstützt Forward-Geocoding (Suche), Reverse-Geocoding (Anzeige) und Kopieren.
- **Höhenlinien (Contours):** Neuer Button in der Topbar des Umrechners zum Ein-/Ausblenden von topografischen Höhenlinien.
- **Globales UI-Styling:** CI-konforme Definition für Scrollbalken eingeführt.
- **Globales Changelog-Modal:** Versionsnummer im Footer ist nun auf allen Seiten klickbar.
- **Globales Copyright-Modal:** Copyright-Button (©) im Footer zeigt nun eine Übersicht aller Lizenzen und Quellen.

### Behoben
- **Eingabe-Fokus:** Fix für Fokusverlust bei manueller Koordinateneingabe in der Sidebar.
- **Versionierung:** Zentralisierung der App-Version über alle Komponenten.
- **UI-Konsistenz:** Vereinheitlichung des Sidebar-Footers über alle Seiten.

## [3.0.1] - 2026-05-02
- Initialer Release von website-v3 mit MapLibre Integration.
- NAH Status und Routing-Funktionen.
