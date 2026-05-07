# Design Spec: Info & Debug Page

## Purpose
Create a centralized "Info" page to display debug information and interesting datasets. The page features a sidebar for navigating between different info modules, starting with a NAH (Air Rescue) status overview.

## Architecture

### Frontend (TypeScript)
- **File:** `src/pages/InfoPage.ts`
- **Page Layout:** 
    - Follows CI **Layout** pattern (Topbar + Sidebar + Page-Content).
    - Uses `sidebar-nav-item` for module selection.
    - Content area uses `page-header` and `content-body`.
- **Router Integration:**
    - Update `src/main.ts` to handle `/info` and subpaths like `/info/nah`.
    - Support deep-linking to specific info modules.

### Module 1: NAH Status
- **Type:** CI **Listen-Seite (Typ 2)**.
- **Data Source:** Uses existing `/api/nah` endpoint.
- **UI:** A `ci-table` showing:
    - **Station:** Callsign + Name.
    - **Operation:** Type (Daylight/24h/Fixed).
    - **BCET / Start:** Calculated opening time.
    - **ECET / End:** Calculated closing time.
    - **Status:** Badge (Einsatzbereit / Inaktiv).
- **Update Logic:** Refreshes data periodically (using the same `refresh_at` logic as the map page).

## UI Components
- **Sidebar:**
    - Section Label: "MODULE"
    - Nav Items: 
        - `NAH Status` (Icon: helicopter)
        - `API Debug` (Icon: terminal, placeholder)
- **Page Header:**
    - Title: "Info & <span>Debug</span>"
    - Subtitle: "System-Status und Daten-Einblicke."

## Data Flow
1. User navigates to `/info/nah`.
2. `InfoPage` renders the layout with the sidebar.
3. The "NAH Status" module is loaded into the content area.
4. Data is fetched from `/api/nah`.
5. Table is rendered with calculated times (calculating BCET/ECET in frontend using `date-sun-info` logic or similar, but ideally the API already provides enough info or can be slightly extended if needed).

*Note: Since the API calculates `refresh_at` but doesn't explicitly return BCET/ECET for each station in the array yet, I might need a small update to `api/nah.php` to include these calculated values in the station objects.*
