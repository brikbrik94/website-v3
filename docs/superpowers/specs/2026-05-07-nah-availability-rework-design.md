# Design Spec: NAH Availability & Statistics Rework

**Date:** 2026-05-07
**Status:** Draft
**Topic:** Reworking the NAH (Emergency Helicopter) availability display to differentiate between seasonal breaks and daily operating hours.

## 1. Goal
The goal is to provide a clearer overview of which NAH stations are currently active, which are in season but currently out of service (due to operating hours), and which are entirely out of season. This includes updating the Info page tables, the statistics dashboard, and the map markers.

## 2. Requirements

### 2.1 Info Page (NahStatusModule)
- **Triple Table Layout:**
    1.  **"Aktuell im Dienst" (Active):** Stations where `in_season === true` AND `is_active === true`.
    2.  **"Bereitschaft / Außer Dienst" (On Standby / Out of Hours):** Stations where `in_season === true` AND `is_active === false`.
    3.  **"Aktuell keine Saison" (Off Season):** Stations where `in_season === false`.
- **Statistics Update:**
    - **Active Coverage:** Display "X of Y seasonal stations are active".
    - **Seasonal Count:** Total number of stations currently in season.
    - **Off-Season Count:** Number of stations currently in winter/seasonal break (excluded from active stats).

### 2.2 Map Page (NahPage)
- **Marker States:**
    - **Green (`MAP_COLORS.success`):** Active.
    - **Red (`MAP_COLORS.danger`):** Seasonal but out of hours.
    - **Gray (`MAP_COLORS.muted`):** Off season.
- **Popup Detail:** Clearly state the reason for inactivity (e.g., "Außer Dienst (Betriebszeit)" vs. "Außer Saison").

### 2.3 Technical Implementation
- **Data Source:** Continue using `/api/nah.php`.
- **Logic:**
    - `Active`: `s.in_season && s.is_active`
    - `Standby`: `s.in_season && !s.is_active`
    - `Off-Season`: `!s.in_season`
- **Styling:** Use existing CI tokens and CSS classes.

## 3. Architecture & Components

### 3.1 `src/pages/InfoPage.ts`
- Update `renderNahStatusModule` to handle the three-way split.
- Update `renderStatsCards` to reflect the new logic (excluding off-season from "Coverage" ratio).
- Add specific headers/panels for the new tables.

### 3.2 `src/pages/NahPage.ts`
- Update `refreshStations` marker creation logic.
- Update marker popups.

### 3.3 `src/lib/MapLegend.ts` (if needed)
- Ensure the legend accurately describes the three states.

## 4. Testing & Validation
- Verify correct grouping on the Info page.
- Verify stats cards correctly exclude off-season stations from the "active ratio".
- Verify map markers change color correctly based on the three states.
- Mock API responses to test all three states (active, out-of-hours, off-season).
