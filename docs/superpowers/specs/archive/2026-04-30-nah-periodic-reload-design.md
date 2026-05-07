# Design Spec: Periodic NAH Station Reload

## Purpose
Ensure that station availability is always up-to-date by automatically reloading station data every full and half hour. If a mission calculation is currently active, it should be automatically re-triggered with the new data.

## Proposed Changes

### 1. Refactoring Station Management
- **File:** `src/pages/NahPage.ts`
- **Changes:**
    - Move station loading, marker creation, and proximity calculation into separate, reusable functions (e.g., `loadStations`, `updateMarkers`, `calculateProximity`).
    - Keep track of existing markers in an array to allow clearing them before adding new ones.

### 2. Periodic Check Logic
- **File:** `src/pages/NahPage.ts`
- **Logic:**
    - Implement a `checkSchedule` function that runs every minute (via `setInterval`).
    - The function checks if the current minute is `0` or `30`.
    - If a reload is due, it triggers the full update cycle.

### 3. Automatic Recalculation
- **Logic:**
    - If `currentIncidentCoord` is set (meaning the user has already clicked on the map), the `calculateProximity` function is called automatically after the stations have been re-fetched and markers updated.
    - This ensures that if a helicopter just went out of service, the Top 5 results and lines are updated immediately.

## Data Flow
1. Timer triggers at `:00` or `:30`.
2. `fetch('/api/nah')` retrieves latest availability.
3. Old helicopter markers are removed from the map.
4. New markers (green/gray) are added.
5. If a search was active: Proximity to `currentIncidentCoord` is recalculated and lines/sidebar are updated.

## Testing Strategy
- **Manual Verification:** Temporary change the timer to trigger every minute to verify the reload logic (markers flickering, sidebar updating).
- **Verification:** Ensure no memory leaks occur from repeated marker creation.
