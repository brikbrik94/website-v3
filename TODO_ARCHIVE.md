# TODO Archiv

Abgeschlossene Punkte aus [TODO.md](./TODO.md), chronologisch nach Release/Monat. Umgesetzte
Punkte aus [ROADMAP.md](./ROADMAP.md) landen separat in [ROADMAP_ARCHIVE.md](./ROADMAP_ARCHIVE.md).
Einträge unten stammen aus der Zeit vor dem TODO/ROADMAP-Split (Cleanup- und Feature-Arbeit war
noch nicht getrennt) und sind entsprechend gemischt.

## Abgeschlossene Aufgaben (Mai 2026)
### Release v3.3.0 - Tracking Gateway Migration & BBox Deactivation
- [x] Tracking Gateway V2 Migration (Types, Service, Tracks)
- [x] BBox-Filtering Implementation & Deactivation (for Desktop Optimization)
- [x] Map Bounds Sync Implementation & Cleanup
- [x] Protocol Expansion (Ack, Error, System Telemetry)
- [x] Vessel Track History Persistence
- [x] Final Verification & SemVer Release

### Map Registry & Overlay Fixes
- [x] Basemap Persistence Store
- [x] Map Resource Registry
- [x] MapCore Integration & triggerRestore logic
- [x] Topbar Basemap Sync
- [x] MapPage Refactoring
- [x] NAH and Routing Page Refactoring
- [x] Deep Cloning in MapRegistry (Safety)
- [x] Robust URL Resolution in MapCore
- [x] MapPage/CoordsPage/TerrainManager Integration
- [x] Resilience with Promise.allSettled

### Frühere Aufgaben (Mai 2026)
- [x] Task 1: Style Synchronization
- [x] Task 2: Create MapStyles Library
- [x] Task 3: Create MapLegend Library
- [x] Task 4: Extend Topbar Component
- [x] Task 5: Integrate Legend and Styles into NahPage
- [x] Task 6: Integrate Legend and Styles into RoutingPage
- [x] Task 7: Database Migration to New Schema (rd_stations, nef_stations)
- [x] Task 8: Security Update: Switch to web_api_user
- [x] Task 9: Expand Regions Analysis with RD & NEF stats
- [x] Task 10: Implement secure API Debugger module
- [x] Task 11: TrackingPage Debugging & Stabilisierung (v3.2.0a2)
    - Ursachen für Rendering-Fehler behoben (Sprite Loading Resilience).
    - Proxy-Robustheit für ADS-B/AIS verbessert.
    - Refresh-Loop auf rekursives setTimeout umgestellt.
    - CI-Konformität für Farben und Layer-Management sichergestellt.
