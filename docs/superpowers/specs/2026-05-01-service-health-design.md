# Design Spec: Service Health Module

## Purpose
Provide a real-time monitor for all technical services used by the website. This includes internal PHP endpoints, database connectivity (via NAH API), and third-party service proxies.

## UI Design
- **Type:** CI **Detail-Seite (Typ 1)** combined with a **Status-Panel**.
- **Layout:** 
    - **Header:** "Service <span>Health</span>" with "Live" badge.
    - **Cards (Top):** 2 Dashboard Cards for "Ø Latenz" and "Erreichbarkeit".
    - **Main Panel:** A list of services using the `.status-panel` / `.status-row` pattern.

### Monitored Services:
1.  **Backend Core:** `/api/ping` (Basic PHP availability).
2.  **NAH Service:** `/api/nah` (Tests DB + Logic).
3.  **Routing Engine:** `/api/ors` (Proxy check).
4.  **Geocoder Service:** `/api/geocoder` (Proxy check).
5.  **Vektorkarten-Server:** `https://tiles.oe5ith.at/inventory.json`.

### Service Row Info:
- **Service Name:** e.g., "Routing API (ORS)".
- **Latency:** Displayed in `ms` (e.g., `42 ms`).
- **Status Dot:** 
    - `on` (green): Response < 200ms or standard success.
    - `warn` (yellow): Response > 500ms.
    - `off` (red): Error or Timeout.

## Implementation Detail
- **Logic:** Each service is "pinged" using a standard `fetch` call.
- **Latency Measurement:** `performance.now()` before and after the fetch.
- **Interval:** Refreshes every 30 seconds automatically.
- **Module Handoff:** In `InfoPage.ts`, when `subpath === 'health'`.

## Data Flow
1. User selects "Service Health" in sidebar.
2. `renderHealthModule` initializes the UI.
3. A loop iterates through the service list.
4. Latency and status are updated in real-time.
5. A global timer ensures periodic updates.
