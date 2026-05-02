# Gemini Projekt-Richtlinien

Dieses Dokument enthält verbindliche Mandate für die KI-Assistenz in diesem Projekt. Diese Regeln haben oberste Priorität und überschreiben jegliche Standard-Logik der KI.

## Mandate

1. **KEINE EIGENSTÄNDIGE INTERPRETATION:** Der Agent führt Aufgaben exakt so aus, wie sie gestellt wurden. Es darf keine eigenmächtige Interpretation der Anforderungen erfolgen.
2. **STRIKTE UMSETZUNG NACH AUFTRAG:** Erstellt wird ausschließlich das, was explizit beauftragt wurde.
3. **KEINE EIGENKREATIONEN ODER ERWEITERUNGEN:** Es werden keine zusätzlichen Features, "Verbesserungsvorschläge" oder versteckte Elemente eingebaut. Erweiterungen dürfen NUR nach expliziter Rücksprache und Freigabe durch den Nutzer erfolgen.
4. **KLÄRUNG BEI UNKLARHEIT:** Sollte ein Auftrag unklar sein, MUSS der Agent nachfragen, anstatt Annahmen zu treffen oder den Code basierend auf Vermutungen zu ändern.
5. **CI-KONFORMITÄT:** Designentscheidungen und CSS müssen strikt dem verlinkten Corporate Identity (CI) Repository folgen. Eigenkreationen beim Design sind untersagt.
6. **REGELN FÜR CODING-AGENTEN:** Der Agent MUSS die Regeln in `oe5ith-ci/docs/for-coding-agents.md` strikt befolgen. Diese Datei ist die primäre Anleitung für die Arbeit mit dem Design System und der CI.

## Technischer Status (Stand: 29.04.2026)

### Infrastruktur
- **Build-Engine:** Vite mit TypeScript (Vanilla).
- **Test-Server:** Fest konfiguriert auf `100.64.0.1:8000`.
- **Abhängigkeiten:** `@fortawesome/fontawesome-free`, `@fontsource/jetbrains-mono`, `maplibre-gl`, `pmtiles`.
- **Git Integration:** `oe5ith-ci` Repository als Git Submodule unter `/oe5ith-ci` eingebunden.
- **Vite Config:** CI-Ordner vom Watcher ausgeschlossen; Proxy für `/api/ors` und `/api/geocoder` (jetzt mit Reverse-Support).

### Architektur
- **CI-Integration:** Styles (`src/styles/`) werden direkt aus dem Submodule synchronisiert. Nutzt nun offizielle Z-Index Tokens und `100dvh` Mobile-Fixes. Ein manueller Sync erfolgt via `cp -v oe5ith-ci/css/*.css src/styles/`.
- **Routing:** 
    - Unterstützung für Profile (inkl. `driving-emergency`).
    - Sonderlogik für Blaulicht-Routing (Top 7 Matrix -> Einzelberechnung der Top 5).
    - Multi-Route Visualisierung (Eye-Toggle) und Fokus-Highlighting.
    - Dynamisches Context-Menü je nach Routing-Modus.
- **NAH (Luftrettung):**
    - **Echtzeit-Verfügbarkeit:** Backend (`api/nah.php`) nutzt `Europe/Vienna` für präzise Statusberechnung.
    - **Proximity-Logik:** Filtert nur aktive Stationen; berechnet Top 5; zeichnet Luftlinien (CI-Blue).
    - **Interaktion:** Sidebar-Auswahl triggert `fitBounds` (Overview) und Highlighting (CI-Green via MapLibre feature-state).
    - **Automatisierung:** Automatischer Reload und Neuberechnung alle 30 Minuten (:00, :30).
- **Geocoding:** Integriertes Forward- & Reverse-Geocoding (via PHP Proxy) mit automatischer Adress-Injektion in die Routing-Felder (Dataset-Speicherung der Koordinaten).
- **Feedback-System:** Offizielles CI-Toast-System (`src/lib/Toast.ts`) integriert für Status- und Fehlermeldungen.
- **Topbar:** Refactored für dynamische Inhalte; blendet Map-Controls (Tools, Basemap, Terrain) automatisch aus, wenn keine Karten-Daten vorhanden sind (ideal für Info/Landing Pages).
- **Info-Seite:** Zentrale Anlaufstelle für Debug- und Systemdaten (/info); verfügt über ein Sidebar-Modulsystem.
    - *Roadmap:* 1. NAH Statistik-Dashboard (Cards), 2. Service Health (API Pings), 3. Regions-Analyse, 4. Karten-Inventar Übersicht.
- **Terrain & Hillshading:** Synchronisierte Steuerung über alle Karten-Instanzen hinweg via `TerrainManager.ts`.
- **Komponenten:** Topbar mit dynamischen Active-Links und integriertem Mobile-Overlay für Tools.
