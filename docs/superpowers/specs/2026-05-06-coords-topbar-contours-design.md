# Design Spec: CoordsPage Topbar & Contours Toggle

Implementation of a specialized Topbar for the `CoordsPage` featuring a toggle button for topographic contour lines (Höhenlinien).

## 1. Objectives
- Enhance the `CoordsPage` with a quick toggle for elevation contour lines.
- Extend the `Topbar` component to support modular, page-specific actions.
- Maintain CI compliance with existing icon and button styles.

## 2. Architecture & Components

### 2.1 Topbar Extension (`src/components/Topbar.ts`)
- Modify `initTopbar` to accept an optional `customActions` array.
- Each action will define:
    - `id`: Unique identifier.
    - `icon`: Font Awesome class (e.g., `fa-mountain`).
    - `title`: Tooltip text.
    - `onClick`: Callback function.
- These buttons will be injected into the `.controls-panel` (Desktop) and `.controls-btn-group` (Mobile/Overlay).

### 2.2 CoordsPage Logic (`src/pages/CoordsPage.ts`)
- Define the contour overlay source: `https://tiles.oe5ith.at/overlays/styles/basemap-at-contours/style.json`.
- Implement a `toggleContours()` function:
    - Track the active state.
    - Add/Remove or show/hide the MapLibre layer based on state.
    - Ensure the layer remains visible when switching base maps (using `MapCore.reapplyBaseLayers` pattern if applicable).

## 3. Data Flow
1. User clicks the **Mountain** icon in the Topbar.
2. The Topbar executes the provided `onClick` callback.
3. `CoordsPage` checks if the `basemap-at-contours` source exists in the map.
    - **First activation:** Fetch the style JSON, extract sources/layers, and inject them into the map.
    - **Subsequent toggles:** Set layer visibility (`layout: { visibility: 'visible' | 'none' }`).
4. Update button UI state (`.active` class) to provide visual feedback.

## 4. UI/UX Design
- **Icon:** `fa-solid fa-mountain`.
- **Tooltip:** "Höhenlinien ein/ausblenden".
- **Visual State:** The button will use the CI `.active` state (accent background/border) when contours are visible.

## 5. Error Handling
- If the overlay style fails to load, show a `Toast.error`.
- Gracefully handle cases where the map style is still loading during the first toggle.

## 6. Verification Plan
- **Manual Test:**
    1. Navigate to `/coords`.
    2. Click the mountain icon in the Topbar.
    3. Verify contour lines appear on the map.
    4. Click again and verify they disappear.
    5. Switch the base map (e.g., to Satellit) and verify contours can still be toggled.
- **Build Check:** Run `npm run build` to ensure no TypeScript regressions in the shared Topbar component.
