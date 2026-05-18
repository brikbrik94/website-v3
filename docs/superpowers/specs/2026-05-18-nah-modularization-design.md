# Design Spec: NahPage Modularization

**Date:** 2026-05-18
**Status:** Approved
**Topic:** Feature Modularization / Architecture

## 1. Problem Statement
The `NahPage.ts` controller currently handles too many responsibilities: station data lifecycle, flight mathematics, map layer configuration, marker rendering, and sidebar interaction. This monolithic structure is difficult to test and maintain.

## 2. Goals
- Refactor `NahPage` into a highly modular structure in `src/features/nah/`.
- Decouple data fetching and state from UI and map rendering.
- Standardize the "Map Plugin" pattern where feature modules populate a shared map container.
- Improve testability by extracting stateless logic (FlightMath) and state-aware services.

## 3. Architecture

### 3.1. NahDataService (`src/features/nah/NahDataService.ts`)
- **Responsibilities:** 
  - Fetches station data from `/api/nah.php`.
  - Manages the station list and periodic refresh timers.
  - Handles the connection heartbeat (ping).
  - Emits events/calls callbacks when data changes.
- **Lifecycle:** Respects the `AbortSignal` for all network requests.

### 3.2. NahFlightMath (`src/features/nah/NahFlightMath.ts` / `src/lib/FlightMath.ts`)
- **Responsibilities:**
  - Pure functions for calculating distances, flight times, and formatting ETAs.
  - Extracted from `NahPage.ts` and potentially consolidated with existing lib.

### 3.3. NahMapLayers (`src/features/nah/NahMapLayers.ts`)
- **Responsibilities:**
  - Standardizes the `nah-lines` and `nah-stations` layer configurations.
  - Provides functions to:
    - `initLayers(map)`: Ensure sources and layers are registered in `MapRegistry`.
    - `updateLines(map, incidentCoord, results)`: Update the GeoJSON source for flight paths.
    - `renderStationMarkers(map, stations)`: Manages marker instantiation and popups.

### 3.4. NahSidebarAdapter (`src/features/nah/NahSidebarAdapter.ts`)
- **Responsibilities:**
  - Bridges the data service with the existing `NahSidebar` components.
  - Handles the rendering of result lists and status updates.

### 3.5. NahPageController (`src/pages/NahPage.ts`)
- **Responsibilities:**
  - Orchestrates the components.
  - Acts as the main entry point for the router.
  - Provides the map and sidebar containers to the feature modules.

## 4. Migration Strategy
1. **Core Service:** Extract `NahDataService` and ensure it handles the `/api/nah.php` lifecycle.
2. **Map Refactoring:** Move layer and marker logic to `NahMapLayers`.
3. **UI Bridge:** Create `NahSidebarAdapter` to clean up the controller's `mount` method.
4. **Integration:** Update `NahPageController` to use these modules.
