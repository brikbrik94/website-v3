# Design Spec: Map Resource Registry & Basemap Persistence

**Status:** Draft  
**Topic:** Fixing disappearing map layers/markers after base map changes.  
**Approach:** Approach 1 (Resource Registry)

## 1. Problem Statement
When `map.setStyle()` is called in MapLibre, all sources, layers, and images are removed. The current recovery logic is fragmented across pages, leading to:
- Disappearing overlays on the Map Page.
- Missing pins and routes on the Routing/NAH pages.
- Race conditions during asynchronous restoration.
- Loss of selected base map when navigating between pages.

## 2. Proposed Architecture

### 2.1 MapRegistry Module (`src/lib/MapRegistry.ts`)
A centralized module to manage "Managed Resources".

- **ManagedSource:** Stores source definitions (GeoJSON, Vector, etc.).
- **ManagedLayer:** Stores layer configurations and their intended Z-order.
- **ManagedImage:** Stores sprite/icon definitions.
- **State:** Keeps track of which resources are currently active.
- **Method `restore(map)`:** Iteratively re-adds all active sources, images, and layers to the map instance.

### 2.2 BasemapStore (`src/lib/BasemapStore.ts`)
A simple persistence layer for the selected base map URL.

- Stores the last selected base map URL (in memory or LocalStorage).
- Used by `MapCore.init()` to set the initial style.
- Updated by `Topbar` when the user selects a different map.

### 2.3 MapCore Integration (`src/lib/MapCore.ts`)
Update `MapCore` to be the primary consumer of the Registry.

- Listen to `style.load`.
- Automatically trigger `MapRegistry.restore(map)` after base infrastructure (Terrain/Hillshade) is applied.
- Provide helper methods for pages to register their specific resources.

## 3. Data Flow

### Scenario: Changing Base Map
1. **User Action:** Selects a new base map in the Topbar.
2. **Persistence:** `BasemapStore` updates the current URL.
3. **Trigger:** `map.setStyle(newUrl)` is called.
4. **Lifecycle:** MapLibre fires `style.load`.
5. **Restoration:**
   - `MapCore` applies Terrain/Hillshade.
   - `MapCore` calls `MapRegistry.restore(map)`.
   - `MapRegistry` checks active items (e.g., active Overlays, NAH-Lines, Tracking-Icons).
   - `MapRegistry` re-adds all definitions to the map instance.
6. **Result:** The map updates visually, but all information remains visible.

## 4. Implementation Details

### Managed Resource Definition
```typescript
interface ManagedResource {
  id: string;
  type: 'source' | 'layer' | 'image';
  definition: any;
  active: boolean;
}
```

### Page Adaptations
- **MapPage:** Instead of manual `addLayer`, it registers layers with the Registry. Toggling in the Sidebar updates the `active` state in the Registry.
- **NahPage/RoutingPage:** Markers and GeoJSON sources are registered as "Managed". Calculation results update the `definition` (data) of the managed source.

## 5. Success Criteria
- [ ] Overlays on `/karte` remain visible after switching from "Outdoor" to "Satellite".
- [ ] Pins on `/routing` remain visible during map changes.
- [ ] NAH calculation results and markers persist through base map changes.
- [ ] The selected base map is remembered when navigating from `/karte` to `/nah`.
- [ ] No race conditions (layers appearing/disappearing randomly).

## 6. Testing Strategy
- Manual testing of all 4 map-based pages (`/karte`, `/routing`, `/nah`, `/tracking`).
- Verify console logs for "Restoration sequence" to ensure correct execution order.
- Stress test by rapidly switching base maps while layers are loading.
