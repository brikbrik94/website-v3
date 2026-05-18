# Design Spec: CoordsPage Refactoring & Terrain Consolidation

**Date:** 2026-05-18
**Status:** Approved
**Topic:** Feature Modularization / Architecture

## 1. Problem Statement
The `CoordsPage.ts` is currently a monolithic file (23KB) that handles coordinate conversion logic, DOM manipulation, map management, and specific overlays. This makes it hard to maintain and test. Additionally, terrain-related overlays (Contours) are implemented locally, while other terrain features (3D, Hillshade) live in a shared library, leading to fragmented logic.

## 2. Goals
- Refactor `CoordsPage` into a class-based controller (`BasePageController`).
- Extract coordinate conversion logic into a state-aware `CoordsDataService`.
- Modularize the sidebar into system-specific blocks.
- Consolidate all terrain-related logic (3D, Hillshade, Contours) into a shared `TerrainManager`.
- Ensure all map overlays use `MapRegistry` for persistence across style changes.

## 3. Architecture

### 3.1. Shared Infrastructure: TerrainManager
The `src/lib/TerrainManager.ts` will be extended to manage the "Contours" overlay in addition to 3D Terrain and Hillshading.

- **State:** `terrainEnabled`, `hillshadeEnabled`, `contoursEnabled`.
- **Logic:** Toggling these features will update the map via `MapRegistry` (for Contours) or direct MapLibre calls (for 3D/Hillshade).

### 3.2. Feature: Coords
Located in `src/features/coords/`.

#### 3.2.1. CoordsDataService
- **Responsibilities:** Manages the current `lat/lon` state and provides conversion methods for all supported systems (WGS84, DMS, UTM, BMN, MGRS, Maidenhead).
- **Communication:** Uses a simple callback or event system to notify the sidebar blocks of updates.

#### 3.2.2. Modular Sidebar
- **CoordsSidebar**: Orchestrates the individual blocks.
- **CoordSystemBlock**: Base class for coordinate blocks.
- **Specific Blocks**: `AddressBlock`, `Wgs84Block`, `UtmBlock`, `MgrsBlock`, etc.

#### 3.2.3. Hiking Overlay
- A feature-specific module in `src/features/coords/CoordsHikingOverlay.ts` that manages the hiking trail layer using `MapRegistry`.

### 3.3. Page Controller
- **CoordsPageController**: Extends `BasePageController`.
- Orchestrates the initialization of the Map, Topbar (with Terrain controls), and the Modular Sidebar.

## 4. Data Flow
1. **User interaction** (Map click or Sidebar input) updates the `CoordsDataService`.
2. **CoordsDataService** broadcasts the new state.
3. **Sidebar Blocks** update their fields based on the new state.
4. **Map Marker** updates its position.

## 5. Migration Strategy
1. **Infrastructure:** Update `TerrainManager` and `TerrainControls`.
2. **Feature Core:** Implement `CoordsDataService` with unit tests.
3. **UI Migration:** Build the modular sidebar components.
4. **Integration:** Create `CoordsPageController` and update the router in `main.ts`.
