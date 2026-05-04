# Gemini Projekt-Richtlinien

Dieses Dokument enthält verbindliche Mandate für die KI-Assistenz in diesem Projekt. Diese Regeln haben oberste Priorität und überschreiben jegliche Standard-Logik der KI.

## Mandate

1. **KEINE EIGENSTÄNDIGE INTERPRETATION:** Der Agent führt Aufgaben exakt so aus, wie sie gestellt wurden.
2. **STRIKTE CI-KONFORMITÄT (PFLICHT):** 
    - Designentscheidungen und CSS müssen strikt dem `oe5ith-ci` Repository folgen.
    - Der Agent MUSS die Regeln in `oe5ith-ci/docs/for-coding-agents.md` befolgen.
    - **KEINE HARDCODED FARBEN:** Farben in JS/TS dürfen nicht als Hex-Werte (`#ffffff`) gesetzt werden. Stattdessen sind die dynamischen Getters aus `src/lib/MapStyles.ts` (MAP_COLORS, MAP_ROUTE_STYLES) zu verwenden.
3. **DATENBANK-SICHERHEIT:**
    - Für Web-Anwendungen (PHP/API) darf NUR der `web_api_user` (Read-Only) verwendet werden.
    - Credentials müssen in `api/config.php` verwaltet werden; `.env` darf nicht committet werden.
4. **KLÄRUNG BEI UNKLARHEIT:** Bei Unsicherheit MUSS nachgefragt werden.
5. **VERSIONS-MANAGEMENT:**
    - Die zentrale App-Version wird in `src/version.ts` definiert.
    - Nach jeder signifikanten Änderung oder vor einem Deployment MUSS geprüft werden, ob ein Versionssprung (Patch, Minor, Major) angemessen ist.
    - Änderungen an der Version müssen im `CHANGELOG.md` (falls vorhanden) oder in der Commit-Message dokumentiert werden.

## Technischer Status (Stand: 02.05.2026)

### Infrastruktur & Sicherheit
- **Stack:** Vite, TypeScript (Vanilla), PHP (Backend-Proxy).
- **DB-Schema:** Umstieg auf spezialisierte Tabellen erfolgt: `emergency.rd_stations` (SEW) und `emergency.nef_stations` (Notarzt).
- **Security:** Zugriff via `web_api_user`. `.env` wird via `.gitignore` geschützt.
- **Git:** `oe5ith-ci` ist als Submodule unter `/oe5ith-ci` eingebunden.

### Architektur-Kernkomponenten
- **MapStyles & Legend:** Zentrale Bibliotheken in `src/lib/` zur CI-konformen Kartensteuerung. Unterstützt dynamische CSS-Token Auflösung.
- **Routing:** 
    - Profile: `driving-car`, `driving-emergency` (Sonderlogik für Blaulicht).
    - Multi-Route Visualisierung mit Fokus-Highlighting.
- **Luftrettung (NAH):**
    - Echtzeit-Statusberechnung (PHP) inkl. Sonnenstand (daylight) und saisonalen Filtern.
    - Dynamische Reload-Logik (alle 30 Min oder nach Server-Vorgabe).
- **Info & Debug Portal (`/info`):**
    - Modulares System für Systemstatus.
    - **NAH Status:** Tabellarische Übersicht der Betriebszeiten.
    - **Service Health:** Live-Pings aller APIs (Backend, DB, ORS, Geocoder, Tiles).
    - **Regions Analyse:** Aggregierte Statistiken (NAH, RD, NEF) nach Bundesland/Region.
    - **Karten Inventar:** Automatisches Verzeichnis der verfügbaren Layer vom Tile-Server.

### UI-Standards
- **Z-Index:** Strikte Nutzung der CI-Tokens (`--z-topbar`, `--z-sidebar` etc.) aus `src/styles/common.css`.
- **Layout:** Flex-Layout mit Z-Index Kaskade für Karten-Anwendungen (CI-Elemente > Map-Controls).
- **Toasts:** Zentrales Feedback-System via `src/lib/Toast.ts`.
