# Design Spec: NAH Statistics Dashboard

## Purpose
Enhance the NAH Info page with a high-level statistics dashboard to provide immediate insights into the operational status of the air rescue network.

## UI Design
- **Position:** Above the NAH status table, within the `content-body`.
- **Layout:** A CI-compliant `card-grid` with 4 columns (Desktop).
- **Component:** CI **Dashboard Cards (Typ 2)**.

### Cards:
1.  **Bereitschaft (Total Availability):**
    - **Title:** "Bereitschaft"
    - **Value:** `X / Y aktiv`
    - **Status Dot:** Online (if > 50% active) / Unknown (if < 50%) / Offline (if 0).
2.  **Nacht-Bereit (Night Readiness):**
    - **Title:** "Nacht-Bereit"
    - **Value:** `X / Y Stationen`
    - **Icon:** `fa-moon`
3.  **Im Dienst (Currently Active):**
    - **Title:** "Im Dienst"
    - **Value:** `X Hubschrauber`
    - **Description:** "Aktuell einsatzbereit."
4.  **Nächster Wechsel (Next Event):**
    - **Title:** "Nächster Wechsel"
    - **Value:** `Callsign` at `HH:mm`
    - **Description:** "Geplante Statusänderung."

## Implementation Detail
- **Logic:** Calculate statistics in the frontend after fetching data from `/api/nah`.
- **Formatting:** Use the same `formatTime` helper for consistency.
- **Responsiveness:** Use `card-grid` (3 cols desktop -> 2 tablet -> 1 mobile). Note: Since we have 4 cards, we might use a custom grid or accept the wrap to 2x2 on tablet.

## Data Flow
1. Fetch NAH data.
2. Iterate through stations to count:
    - Total stations.
    - Active stations.
    - Night-ready stations.
    - Earliest future `calculated_start` or `calculated_end`.
3. Update the DOM element containing the card grid.
