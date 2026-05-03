# Design Spec: Routing Highlight Fix

## Status
- **Date:** 2026-05-02
- **Status:** Approved
- **Goal:** Correct the routing page highlighting logic to be CI-compliant by removing non-standard route dimming.

## 1. Context
The current implementation in `RoutingPage.ts` reduces the opacity of visible (but not highlighted) routes to `0.1` when another route is highlighted. This contradicts the CI requirement to use standard semantic styles (`active` and `background`).

## 2. Implementation Plan

### 2.1 Component: `src/pages/RoutingPage.ts`
- **Modify `updateRouteVisuals`:**
  - Remove the conditional dimming logic: `style = currentHighlightedId !== null ? { 'line-opacity': 0.1, 'line-width': 3 } : PAINT_DEZENT;`.
  - Replace with a straightforward assignment to `PAINT_DEZENT` when a route is in `eyeActiveStates`.

### 2.2 Paint Config Review
- Ensure `PAINT_HIGHLIGHT` and `PAINT_DEZENT` strictly reflect `MAP_ROUTE_STYLES` values.

---

## 3. Data Flow
1. If `id === currentHighlightedId`: Apply `MAP_ROUTE_STYLES.active`.
2. Else if `eyeActiveStates.has(id)`: Apply `MAP_ROUTE_STYLES.background`.
3. Else: Set opacity to `0.0`.

---

## 4. Verification
- Manually check multiple routes on the routing page.
- Highlight one route and verify others stay at the standard background opacity (0.6) instead of dimming to 0.1.
