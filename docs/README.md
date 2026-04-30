# Projekt-Dokumentation OE5ITH Website V3

## Architektur-Übersicht
Das Projekt ist als modulare Single-Page-Application (SPA) auf Basis von Vite und TypeScript (Vanilla) aufgebaut. Es folgt strikt den Vorgaben des OE5ITH Corporate Identity (CI) Repositories.

### Kern-Komponenten
- **MapCore.ts:** Zentrales Modul zur Initialisierung von MapLibre, Protokoll-Registrierung (PMTiles) und CI-konformer Attribution.
- **TerrainManager.ts:** Verwaltet 3D-Gelände und Hillshading-Layer basierend auf globalen Elevation-Daten.
- **RoutingService.ts:** Abstraktionsschicht für den OpenRouteService (ORS) inklusive Health-Checks und Routenberechnung.
- **GeocoderService.ts:** Integration der Nominatim-Adresssuche.
- **UI-Komponenten:** Modulare TS-Klassen für Topbar, Sidebar und Context-Menüs unter `src/components/`.

### Sicherheit & Proxy
Die Anwendung nutzt einen lokalen Vite-Proxy (Entwicklung) bzw. Nginx-Proxy (Produktion) unter `/api/ors` und `/api/geocoder`, um API-Keys serverseitig zu injizieren und CORS-Probleme zu vermeiden.
