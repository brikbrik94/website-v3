# NahPage Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the modularization of the `NahPage` by extracting data management, map layers, and sidebar interaction into a dedicated feature structure.

**Architecture:**
- Create `src/features/nah/NahDataService.ts` for station state and lifecycle.
- Create `src/features/nah/NahMapLayers.ts` for map-specific visuals (markers, lines).
- Create `src/features/nah/NahSidebarAdapter.ts` for UI integration.
- Refactor `NahPageController.ts` to coordinate these components.

**Tech Stack:** TypeScript, MapLibre GL.

---

### Task 1: NahDataService Implementation

**Files:**
- Create: `src/features/nah/NahDataService.ts`

- [ ] **Step 1: Implement NahDataService**

Extract station fetching, periodic refresh, and heartbeat logic from `NahPage.ts`.

```typescript
import { NahStation, NahResponse } from '../../types/nah';

export class NahDataService {
    private stations: NahStation[] = [];
    private signal: AbortSignal;
    private refreshTimeout: any = null;
    
    constructor(signal: AbortSignal) {
        this.signal = signal;
    }

    public async refresh(): Promise<NahStation[]> {
        // ... fetch logic from NahPage.refreshStations ...
    }
    
    public getStations(): NahStation[] {
        return this.stations;
    }
    
    // ... ping/heartbeat logic ...
}
```

- [ ] **Step 2: Commit service**

```bash
git add src/features/nah/NahDataService.ts
git commit -m "feat(nah): implement NahDataService for station state management"
```

---

### Task 2: NahMapLayers Implementation

**Files:**
- Create: `src/features/nah/NahMapLayers.ts`

- [ ] **Step 1: Implement NahMapLayers**

Extract `ensureNahLayers`, `renderStationMarkers`, and `updateLines` logic.

```typescript
import maplibregl from 'maplibre-gl';
import { NahStation, NahStationResult } from '../../types/nah';

export const NahMapLayers = {
    init(map: maplibregl.Map) {
        // ... ensureNahLayers logic ...
    },
    
    updateStationMarkers(map: maplibregl.Map, stations: NahStation[]): maplibregl.Marker[] {
        // ... marker rendering logic ...
    },
    
    updateFlightPaths(map: maplibregl.Map, origin: [number, number], results: NahStationResult[]) {
        // ... updateLines/performCalculation map logic ...
    }
}
```

- [ ] **Step 2: Commit map layers**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "feat(nah): implement NahMapLayers for visual map orchestration"
```

---

### Task 3: NahSidebarAdapter Implementation

**Files:**
- Create: `src/features/nah/NahSidebarAdapter.ts`

- [ ] **Step 1: Implement NahSidebarAdapter**

Extract the bridge between calculations and the sidebar UI.

```typescript
import { NahStationResult } from '../../types/nah';
import { renderNahResults } from '../../components/NahSidebar';

export const NahSidebarAdapter = {
    updateResults(container: HTMLElement, results: NahStationResult[]) {
        renderNahResults(container, results);
    }
    // ... highlight logic ...
}
```

- [ ] **Step 2: Commit sidebar adapter**

```bash
git add src/features/nah/NahSidebarAdapter.ts
git commit -m "feat(nah): implement NahSidebarAdapter for UI orchestration"
```

---

### Task 4: NahPageController Refactoring

**Files:**
- Modify: `src/pages/NahPage.ts`

- [ ] **Step 1: Refactor NahPageController to use new modules**

Clean up the `mount` and `destroy` methods by delegating to the new service and modules.

- [ ] **Step 2: Commit refactoring**

```bash
git add src/pages/NahPage.ts
git commit -m "refactor(nah): complete modularization of NahPageController"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Verify NAH functionality**
Confirm station loading, map clicks for nearest station, and sidebar result highlighting.
- [ ] **Step 2: Verify Lifecycle**
Confirm all timers and requests are canceled on page exit.
- [ ] **Step 3: Update Changelog**
Document the final modularization step for the NAH feature.
