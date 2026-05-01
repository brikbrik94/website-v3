# Design Spec: Dynamic NAH Status Updates

## Purpose
The current NAH (Air Rescue) page reloads station data every 30 minutes. This leads to delays in showing the correct operational status (e.g., when a helicopter goes off-duty at sunset or at a fixed time). This design introduces a server-calculated "next refresh" timestamp to allow the client to update exactly when a status change is expected.

## Architecture

### Backend (PHP API)
- **Location:** `api/nah.php`
- **Changes:** 
    - During station iteration, calculate the next relevant event time for each station (e.g., sunrise, sunset, fixed start, fixed end).
    - Identify the *earliest* event time that is in the future.
    - Return this time as a top-level `refresh_at` field in the JSON response.
- **Event Calculation Logic:**
    - For `daylight` stations: Next event is either the next sunrise (if currently inactive) or sunset (if currently active).
    - For `fixed` stations: Next event is the start or end time.
    - For `24/7` stations: No status change event (unless season-based, which can be checked monthly).

### Frontend (TypeScript)
- **Location:** `src/pages/NahPage.ts`
- **Changes:**
    - Replace `initScheduler` (the 30-minute interval) with a logic that uses `setTimeout`.
    - In `refreshStations`, extract the `refresh_at` timestamp.
    - Calculate the delay: `Date.parse(refresh_at) - Date.now()`.
    - Set a `setTimeout` to call `refreshStations` after the delay, plus a small safety buffer (e.g., 10 seconds).
    - Clear any existing timeouts before setting a new one to prevent overlaps.

## Data Flow
1. Client calls `/api/nah`.
2. Server calculates current status AND the timestamp of the next expected status change among all stations.
3. Server returns stations list + `refresh_at`.
4. Client updates UI (markers, sidebar).
5. Client schedules a single-shot `setTimeout` for `refresh_at + 10s`.
6. When timeout fires, the cycle repeats.

## Error Handling
- If `refresh_at` is missing or in the past, fall back to a default 5-minute retry.
- If the API call fails, retry after 1 minute with a Toast warning.

## Testing Strategy
- **Manual Verification:** Adjust a station's fixed end time in the database to be 2 minutes in the future and verify the page updates automatically without manual reload.
- **Log Verification:** Check console logs for "Next reload scheduled at [Time]".
