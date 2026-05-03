# Routing Highlight Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify routing highlight logic in `RoutingPage.ts` to strictly adhere to CI semantic styles (removing non-standard dimming).

**Architecture:** Straightforward cleanup of conditional logic in `updateRouteVisuals` and synchronization of paint constants with `MAP_ROUTE_STYLES`.

**Tech Stack:** TypeScript, MapLibre GL.

---

### Task 1: Update RoutingPage Highlighting Logic

**Files:**
- Modify: `src/pages/RoutingPage.ts`

- [ ] **Step 1: Simplify `updateRouteVisuals` logic**

Replace the current implementation of `updateRouteVisuals` (approx. line 87-104) with the simplified version.

```typescript
  const updateRouteVisuals = (id: number, _params: any) => {
    const layerId = `route-${id}`;
    if (!map.getLayer(layerId)) return;

    let style = PAINT_HIDDEN;
    let color = MAP_ROUTE_STYLES.background.color;

    if (id === currentHighlightedId) {
      style = PAINT_HIGHLIGHT;
      color = MAP_ROUTE_STYLES.active.color;
    } else if (eyeActiveStates.has(id)) {
      style = PAINT_DEZENT;
      color = MAP_ROUTE_STYLES.background.color;
    }

    map.setPaintProperty(layerId, 'line-opacity', style['line-opacity']);
    map.setPaintProperty(layerId, 'line-width', style['line-width']);
    map.setPaintProperty(layerId, 'line-color', color);
  };
```

- [ ] **Step 2: Sync Paint Constants**

Ensure `PAINT_HIGHLIGHT` and `PAINT_DEZENT` (approx. line 45-47) strictly follow `MAP_ROUTE_STYLES`.

```typescript
  // Paint Configs
  const PAINT_HIGHLIGHT = { 
    'line-opacity': MAP_ROUTE_STYLES.active.opacity, 
    'line-width': MAP_ROUTE_STYLES.active.weight + 1 
  };
  const PAINT_DEZENT = { 
    'line-opacity': MAP_ROUTE_STYLES.background.opacity, 
    'line-width': MAP_ROUTE_STYLES.background.weight 
  };
  const PAINT_HIDDEN    = { 'line-opacity': 0.0, 'line-width': 0 };
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/RoutingPage.ts
git commit -m "fix: simplify routing highlight logic for CI compliance"
```
