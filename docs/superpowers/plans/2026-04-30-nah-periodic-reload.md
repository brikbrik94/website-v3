# NAH Periodic Reload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically reload NAH station data and update active proximity calculations every full and half hour.

**Architecture:** 
- Refactor `NahPage.ts` into functional units (Load, Render, Calculate).
- Use a 1-minute interval timer to check for schedule matches (:00, :30).

**Tech Stack:** TypeScript, MapLibre GL JS.

---

### Task 1: Refactor NahPage.ts for Modularity

**Files:**
- Modify: `src/pages/NahPage.ts`

- [ ] **Step 1: Extract Station Loading and Marker Management**

Move the fetching and marker rendering into a function `refreshStations`. Store markers in a module-level array `stationMarkers`.

```typescript
let stations: any[] = [];
let stationMarkers: maplibregl.Marker[] = [];

const refreshStations = async (map: maplibregl.Map) => {
  const nahRes = await fetch('/api/nah');
  stations = await nahRes.json();
  
  // Clear old markers
  stationMarkers.forEach(m => m.remove());
  stationMarkers = [];

  stations.forEach(station => {
    // ... logic from current initNahPage ...
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([station.lon, station.lat])
      .setPopup(...)
      .addTo(map);
    stationMarkers.push(marker);
  });
};
```

- [ ] **Step 2: Extract Proximity Calculation**

Move the logic inside `map.on('click')` to a function `performCalculation`.

```typescript
const performCalculation = (map: maplibregl.Map, sidebarResults: HTMLElement, lng: number, lat: number) => {
  // ... distance calc, filtering active stations, sorting, slicing ...
  // ... line generation and source.setData ...
  // ... renderNahResults ...
};
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/NahPage.ts
git commit -m "refactor(nah): modularize station loading and calculation logic"
```

### Task 2: Implement Periodic Reload Timer

**Files:**
- Modify: `src/pages/NahPage.ts`

- [ ] **Step 1: Add the scheduler logic**

Implement a timer that checks the current time every minute.

```typescript
const initScheduler = (map: maplibregl.Map, sidebarResults: HTMLElement) => {
  setInterval(async () => {
    const now = new Date();
    const min = now.getMinutes();
    
    if (min === 0 || min === 30) {
      console.log(`[NahPage] Periodic reload triggered at ${now.toLocaleTimeString()}`);
      await refreshStations(map);
      
      // If a calculation was active, re-trigger it
      if (currentIncidentCoord) {
        performCalculation(map, sidebarResults, currentIncidentCoord[0], currentIncidentCoord[1]);
      }
      
      Toast.success('Stationen automatisch aktualisiert.');
    }
  }, 60000); // Every minute
};
```

- [ ] **Step 2: Integrate into initNahPage**

Call `refreshStations` and `initScheduler` during initialization.

- [ ] **Step 3: Commit**

```bash
git add src/pages/NahPage.ts
git commit -m "feat(nah): implement periodic reload every :00 and :30"
```

### Task 4: Final Verification

- [ ] **Step 1: Verify the reload trigger**

Temporarily set the interval or condition to trigger every minute to see if the markers refresh and the sidebar updates.
Expected: Successful reload and recalculation.

- [ ] **Step 2: Revert debug changes and final commit**

```bash
git add src/pages/NahPage.ts
git commit -m "docs: finalize periodic reload feature"
```
