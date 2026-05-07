# Design Spec: NAH Availability Fix & Proximity Lines

## Purpose
Improve the accuracy of the NAH (Luftrettung) page by fixing time zone issues and providing visual feedback (lines) for the nearest active stations.

## Proposed Changes

### 1. Time Zone Correction (Backend)
- **File:** `api/nah.php`
- **Change:** Add `date_default_timezone_set('Europe/Vienna');` at the beginning of the script.
- **Reason:** Ensure `is_active` status correctly reflects Austrian local time (CEST/CET) instead of UTC.

### 2. Active Station Filtering (Frontend)
- **File:** `src/pages/NahPage.ts`
- **Change:** Filter the `stations` array to only include `is_active === true` before calculating the top 5 nearest results.
- **Reason:** Only available rescue helicopters should be proposed for mission planning.

### 3. Proximity Lines (Frontend)
- **File:** `src/pages/NahPage.ts`
- **Change:** 
    - Implement a MapLibre Source and Layer (`nah-lines`) for drawing lines.
    - On map click, generate a GeoJSON FeatureCollection of LineStrings from each top 5 station to the click coordinate.
    - Default color: CI-Blue (`#3b82f6`).
    - Highlighting: When a result is selected in the sidebar, the corresponding line feature in the GeoJSON should be updated or a filter applied to turn it CI-Green (`#10b981`).

## Data Flow
1. User clicks map.
2. `NahPage` calculates distances to **active** stations.
3. Top 5 active stations are selected and rendered in the sidebar.
4. GeoJSON lines are generated and added to the `nah-lines` source.
5. User clicks sidebar item: Map flies to station, and the specific line turns green.

## Testing Strategy
- **Backend:** Call `/api/nah` and verify `is_active` matches local Austrian time.
- **Frontend:** Verify that inactive stations (gray markers) never appear in the top 5 sidebar results.
- **Visual:** Confirm blue lines appear on click and turn green upon sidebar selection.
