# Design Spec: Tracking Page Refinement

Dieses Dokument beschreibt die technische Umsetzung der verbesserten Tracking-Darstellung in MapLibre für die `website-v3`. Der Fokus liegt auf höhenabhängigen ADS-B Tracks und CI-konformen Detail-Informationen.

## 1. Übersicht & Ziele
Die aktuelle Tracking-Seite zeigt Flugzeuge und Schiffe mit einfachen Linien und JSON-Popups. Ziel ist eine visuell hochwertigere Darstellung nach Vorbild der Referenz-Implementierung, jedoch strikt in TypeScript und nach `website-v3` Standards.

### Kernanforderungen
- **Höhenabhängige Tracks:** ADS-B Flugpfade werden farblich basierend auf der Flughöhe kodiert.
- **CI-konforme Popups:** Ersatz der JSON-Dumps durch strukturierte Tabellen (`.popup-kv`).
- **Objekt-Highlighting:** Visuelle Hervorhebung des aktiven Tracks bei Auswahl in Sidebar oder Karte.
- **Daten-Effizienz:** Optimierte Historien-Verwaltung in den Interpreten.

## 2. Architektur & Komponenten

### 2.1. AdsbInterpreter (Refactoring)
Der Speicher im `AdsbInterpreter` wird erweitert, um Höhenwerte pro Punkt zu sichern.
- **Methode:** `getTracksAsGeoJson()`
- **Logik:** Erzeugt eine `FeatureCollection` aus Segmenten (2-Punkt `LineString`).
- **Properties:** Jedes Segment erhält `hex` (ID) und `alt_mid` (Mittelwert der Höhe beider Punkte).

### 2.2. AisInterpreter (Refactoring)
Optimierung der Punkt-Historie.
- **Logik:** Neue Punkte werden nur hinzugefügt, wenn sich die Koordinate signifikant geändert hat (Vermeidung von Punkt-Clustering bei liegenden Schiffen).

### 2.3. PopupManager (Neu)
Ein zentraler Utility-Helper zur Erzeugung von CI-konformen Popups.
- **Struktur:** Nutzt `LAYER_CONFIG` Objekte zur Definition von Feldern (Key, Label, Format-Funktion).
- **Formatierung:** Automatische Behandlung von Einheiten (ft, kn, MHz, s).
- **Template:** Erzeugt HTML-Tabellen mit der Klasse `.popup-kv`.

### 2.4. TrackingPage (Anpassung)
Anpassung der MapLibre Layer-Definitionen.
- **Style:** `interpolate` Expression für `line-color` basierend auf `alt_mid`.
- **Interaktion:** Update der `line-width` via `setPaintProperty` bei Selektion.

## 3. Datenfluss
1. **Fetch:** Frontend ruft Daten via `/api/adsb.php` / `/api/ais.php` ab.
2. **Interpret:** Interpreter aktualisieren interne History-Maps.
3. **Segment:** `AdsbInterpreter` wandelt Pfade in farbfähige Segmente um.
4. **Render:** `TrackingPage` setzt die Daten in die GeoJSON-Sources und aktualisiert das Styling.

## 4. Visualisierung (ADS-B Gradient)
| Höhe (ft) | Farbe | CI-Bedeutung |
| :--- | :--- | :--- |
| 0 | `#22c55e` | Boden / Start-Landephase |
| 5.000 | `#38bdf8` | Unterer Luftraum |
| 15.000 | `#818cf8` | Reiseflughöhe (Mittel) |
| 35.000+ | `#e879f9` | Reiseflughöhe (Hoch) |

## 5. Testing & Validierung
- **Manueller Test:** Prüfung der Popup-Darstellung bei verschiedenen Objekttypen.
- **Visual Check:** Verifizierung des Farbverlaufs bei steigenden/sinkenden Flugzeugen.
- **Performance:** Überprüfung der Frame-Rate bei hoher Objekt-Dichte (Segment-Overhead).

## 6. Roadmap & Zukünftige Erweiterungen
- [ ] Block B: Umsetzung dieser Spec (Höhen-Tracks, CI-Popups).
- [ ] Block C: Integration dynamischer Overlays aus `inventory.json`.
- [ ] Block D: 3D-Terrain Integration.
