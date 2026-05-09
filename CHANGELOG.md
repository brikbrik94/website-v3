# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

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
