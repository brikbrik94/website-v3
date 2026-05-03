# Design Spec: CI Map Integration (Route Styles & Legend)

## Status
- **Date:** 2026-05-02
- **Status:** Approved
- **Goal:** Implement CI-compliant route styles (Blue/Gray semantic) and a dynamic Map Legend overlay.

## 1. Architecture

### 1.1 Style Synchronization
- Update local `src/styles/` by copying all `*.css` files from `oe5ith-ci/css/`.
- This ensures `.map-legend` classes and updated tokens are available.

### 1.2 Library: `src/lib/MapStyles.ts`
- Centralized constants for map rendering.
- Follows CI roadmap "Variante A".

```typescript
export interface RouteStyle {
  color: string;
  weight: number;
  opacity: number;
}

export type RouteStyleKey = 'active' | 'background';

export const MAP_ROUTE_STYLES: Record<RouteStyleKey, RouteStyle> = {
  active: {
    color: '#3b82f6', // --accent
    weight: 5,
    opacity: 1.0
  },
  background: {
    color: '#888888', // --muted
    weight: 3,
    opacity: 0.6
  }
};
```

### 1.3 Library: `src/lib/MapLegend.ts`
- TypeScript implementation of the CI `MapLegend` Vanilla JS class.
- Manages the `.map-legend` DOM element.

**Methods:**
- `setTitle(text: string)`
- `addEntry(entry: LegendEntry)`
- `clearEntries()`
- `show()` / `hide()` / `toggle()`
- `isVisible(): boolean`
- `destroy()`

---

## 2. Components

### 2.1 `Topbar.ts`
- Add a "Legend" toggle button to the `topbar-controls` and mobile `m-nav`.
- Use class `topbar-toggle`.
- Add a callback `onLegendToggle` to the initialization.

---

## 3. Page Integration

### 3.1 `NahPage.ts`
- **Route Style mapping:**
  - Selected line (feature-state): `MAP_ROUTE_STYLES.active`.
  - Unselected lines: `MAP_ROUTE_STYLES.background`.
- **Legend Content:**
  - Title: "Luftrettung"
  - Entries:
    - `{ type: 'line', color: '#3b82f6', label: 'Gewählte Station' }`
    - `{ type: 'line', color: '#888888', label: 'Nächste Stationen' }`
    - `{ type: 'dot',  color: '#10b981', label: 'Einsatzbereit' }`
    - `{ type: 'dot',  color: '#6b7280', label: 'Nicht aktiv' }`

### 3.2 `RoutingPage.ts`
- **Route Style mapping:**
  - Highlighted route: `MAP_ROUTE_STYLES.active`.
  - Comparison routes: `MAP_ROUTE_STYLES.background`.
- **Legend Content:**
  - Title: "Routing"
  - Entries:
    - `{ type: 'line', color: '#3b82f6', label: 'Primärroute' }`
    - `{ type: 'line', color: '#888888', label: 'Vergleich / Alternativ' }`

---

## 4. Error Handling & Testing
- Ensure `MapLegend` handles missing DOM elements gracefully.
- Verify Topbar button "active" state correctly reflects legend visibility.
- Manual verification of color contrast on different basemaps.
