# CoordsPage Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the monolithic `CoordsPage.ts` into a modular architecture with a state-aware service, decomposed UI components, and consolidated terrain management.

**Architecture:**
- Extend `TerrainManager.ts` to handle Contours.
- Implement `CoordsDataService.ts` for coordinate logic.
- Create `CoordsSidebar.ts` and modular `CoordSystemBlock` components.
- Implement `CoordsPageController` (BasePageController).

**Tech Stack:** TypeScript, Proj4, MGRS, MapLibre GL.

---

### Task 1: Consolidate Terrain Management

**Files:**
- Modify: `src/lib/TerrainManager.ts`
- Modify: `src/components/TerrainControls.ts`

- [ ] **Step 1: Extend TerrainManager with Contours**

Add `contoursEnabled` and `toggleContours`. Update `applyTerrainAndHillshade` (rename to `applyTerrainInfrastructure`) to manage the contours layer via `MapRegistry`.

```typescript
// src/lib/TerrainManager.ts
export let contoursEnabled = false;
const CONTOURS_OVERLAY = {
    id: 'basemap-at-contours',
    url: 'https://tiles.oe5ith.at/overlays/styles/basemap-at-contours/style.json'
};

export async function applyTerrainInfrastructure(map: Map) {
    // ... terrain/hillshade logic ...
    
    // Contours logic
    if (contoursEnabled) {
        // Register in MapRegistry and trigger restore
        // (Implementation details using MapRegistry.registerSource/Layer)
    } else {
        // Unregister from MapRegistry
    }
}

export function toggleContours(): boolean {
    contoursEnabled = !contoursEnabled;
    // ...
    return contoursEnabled;
}
```

- [ ] **Step 2: Update TerrainControls UI**

Add a button for Contours in `TerrainControls.ts`.

- [ ] **Step 3: Commit changes**

```bash
git add src/lib/TerrainManager.ts src/components/TerrainControls.ts
git commit -m "feat(terrain): consolidate contours into TerrainManager"
```

---

### Task 2: CoordsDataService Implementation

**Files:**
- Create: `src/features/coords/CoordsDataService.ts`
- Create: `src/features/coords/CoordsDataService.test.ts`

- [ ] **Step 1: Implement the service with Proj4 and MGRS**

Encapsulate all logic from `CoordsPage.ts` (toDms, UTM, BMN, MGRS, Maidenhead).

```typescript
export class CoordsDataService {
    private state = { lat: 48.3064, lon: 14.2858 };
    private listeners: ((state: {lat: number, lon: number}) => void)[] = [];

    public setWgs(lat: number, lon: number) {
        this.state = { lat, lon };
        this.notify();
    }
    
    // ... conversion methods ...
}
```

- [ ] **Step 2: Write unit tests**

Verify conversions for a known point (e.g. Linz: 48.3064, 14.2858).

- [ ] **Step 3: Commit service**

```bash
git add src/features/coords/CoordsDataService.ts
git commit -m "feat(coords): implement CoordsDataService with conversion logic"
```

---

### Task 3: Modular Sidebar Components

**Files:**
- Create: `src/features/coords/CoordSidebar.ts`
- Create: `src/features/coords/CoordSystemBlock.ts`
- Create: `src/features/coords/blocks/*.ts` (Wgs84, Utm, etc.)

- [ ] **Step 1: Implement base CoordSystemBlock**

Handle the active/readonly state and copy-to-clipboard logic.

- [ ] **Step 2: Implement specific blocks**

Each block handles its own rendering and input parsing.

- [ ] **Step 3: Commit components**

```bash
git add src/features/coords/
git commit -m "feat(coords): implement modular sidebar and system blocks"
```

---

### Task 4: CoordsPageController & Integration

**Files:**
- Modify: `src/pages/CoordsPage.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement CoordsPageController**

Extends `BasePageController`. Orchestrates the service, map, and sidebar.

- [ ] **Step 2: Update Router**

Switch `/coords` route to use the new controller.

- [ ] **Step 3: Commit final refactoring**

```bash
git add src/pages/CoordsPage.ts src/main.ts
git commit -m "refactor(coords): complete modularization of CoordsPage"
```

---

### Task 5: Verification & Cleanup

- [ ] **Step 1: Verify all coordinate systems**
Check WGS84, UTM, BMN, MGRS, and Maidenhead for consistency.
- [ ] **Step 2: Verify Terrain Controls**
Ensure 3D, Hillshade, and Contours work together from the Topbar.
- [ ] **Step 3: Update Changelog**
Document the major refactoring.
