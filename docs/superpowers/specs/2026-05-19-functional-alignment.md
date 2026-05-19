# Functional Specification - OE5ITH Cloud Portal (v3)

Dieses Dokument dient als zentrale Referenz für die beabsichtigten Funktionen der verschiedenen Seiten des Cloud Portals. Es stellt die "Source of Truth" für die Entwicklung dar.

## 1. Seite: Karte (`/karte`)
**Zweck:** Universeller Viewer für statische und semi-statische Geodaten (Overlays).

### Kernfunktionen
- **Hintergrundkarten:** Wechsel zwischen Topo (Basemap AT), Satellit und Dark Mode.
- **Overlay-Sidebar:**
    - Auflistung aller verfügbaren Overlays aus `inventory.json`.
    - Ein-/Ausschalten einzelner Layer oder Layer-Gruppen.
    - Status-Anzeige (Geladen, Teilweise geladen, Nicht geladen).
- **Interaktion:**
    - Sofortige Anzeige gewählter Layer auf der Karte.
    - Persistenz: Aktive Layer bleiben beim Wechsel der Basiskarte oder der Seite (innerhalb der Session) erhalten.
- **Legende:** Dynamische Anzeige der Symbole und Farben für alle aktuell aktiven Layer.

## 2. Seite: Luftrettung (`/nah`)
**Zweck:** Überwachung und Erreichbarkeits-Analyse der Notarzthubschrauber (NAH).

### Kernfunktionen
- **Echtzeit-Daten:** Automatischer Abruf der Stationsdaten und Verfügbarkeiten (via PHP-Backend).
- **Einsatz-Simulation:**
    - Klick auf einen beliebigen Punkt der Karte.
    - Berechnung der 5 nächstgelegenen, aktiven Stationen.
    - Visualisierung der Flugwege als Linien auf der Karte.
- **Stations-Details:**
    - Marker mit Farbcodierung (Grün: Aktiv, Rot: Außer Dienst, Grau: Außer Saison).
    - Detaillierte Popups mit Betriebszeiten, Organisation und Nachtflug-Fähigkeit.

## 3. Seite: Routing (`/routing`)
**Zweck:** Spezialisierte Navigation für Rettungskräfte und zivile PKW.

### Kernfunktionen
- **Routenplanung:** Setzen von Start und Ziel via Karte oder Geocoder.
- **Profile:** Unterstützung für Standard-PKW und Blaulicht-Routing (Emergency).
- **Navigation:** Anzeige einer detaillierten Anweisungsliste (Turn-by-turn).
- **Visualisierung:** Darstellung der Route als Linie mit Start-/Ziel-Markern.

## 4. Seite: Umrechner (`/coords`)
**Zweck:** Konvertierung zwischen verschiedenen Koordinatensystemen für Profis.

### Kernfunktionen
- **Konvertierung:** Bidirektionale Umrechnung zwischen WGS84, UTM, BMN, MGRS, Maidenhead.
- **Karten-Sync:**
    - Klick auf Karte aktualisiert alle Koordinatenfelder.
    - Manuelle Eingabe in Felder verschiebt die Kartenansicht zum Punkt.
- **Hilfsmittel:** Zuschaltbare Overlays für Wanderwege und topografische Höhenlinien.

## 5. Seite: Live Tracking (`/tracking`)
**Zweck:** Visualisierung von Flugverkehr (ADS-B) und Schifffahrt (AIS).

### Kernfunktionen
- **Live-Feed:** Anzeige von Positionen in Echtzeit via WebSocket (Push).
- **Historie:** Darstellung der Track-History (Flugpfade/Schiffspfade).
- **Information:** Detaillierte Popups mit technischen Daten (Typ, Registrierung, Geschwindigkeit, Höhe).
- **Filter:** Filtern nach Kategorien (z.B. nur Rettungsflieger).

---
**Version:** 1.0.0
**Datum:** 2026-05-19
**Status:** In Review
