# NAH Availability & Proximity Lines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the station availability calculation (timezone) and visualize the top 5 active stations with proximity lines on the map.

**Architecture:** 
- Backend: PHP configuration update.
- Frontend: Array filtering and MapLibre GeoJSON source/layer management.

**Tech Stack:** PHP, TypeScript, MapLibre GL JS.

---

### Task 1: Backend Timezone Fix

**Files:**
- Modify: `api/nah.php`

- [ ] **Step 1: Set the default timezone**

Add `date_default_timezone_set('Europe/Vienna');` right after the `require_once` call.

```php
require_once 'config.php';
date_default_timezone_set('Europe/Vienna');
header('Content-Type: application/json');
```

- [ ] **Step 2: Verify API output**

Run: `php api/nah.php | grep -i is_active`
Expected: Check if the status matches current local time in Austria (e.g., if it's past 17:00, stations with `fixed_end` 17:00 should be `false`).

- [ ] **Step 3: Commit**

```bash
git add api/nah.php
git commit -m "fix(api): set timezone to Europe/Vienna for accurate availability"
```

### Task 2: Filter Active Stations & Setup Map Layer

**Files:**
- Modify: `src/pages/NahPage.ts`

- [ ] **Step 1: Setup MapLibre Source and Layer**

Initialize the source and layer after map load.

```typescript
map.on('load', () => {
  map.addSource('nah-lines', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  map.addLayer({
    id: 'nah-lines',
    type: 'line',
    source: 'nah-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#10b981', '#3b82f6'],
      'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4, 2],
      'line-opacity': 0.8
    }
  });
});
```

- [ ] **Step 2: Filter active stations in click handler**

Modify the `map.on('click')` logic to filter `stations`.

```typescript
// Distanz zu allen AKTIVEN Stationen berechnen
const results = stations
  .filter((s: any) => s.is_active) // <--- ADD THIS
  .map((s: any) => { ... })
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/NahPage.ts
git commit -m "feat(nah): filter by active status and setup lines layer"
```

### Task 3: Generate and Highlight Lines

**Files:**
- Modify: `src/pages/NahPage.ts`

- [ ] **Step 1: Update lines on map click**

Generate GeoJSON LineStrings for the top 5 results.

```typescript
const lineFeatures = results.map(s => ({
  type: 'Feature',
  id: s.osm_id,
  geometry: {
    type: 'LineString',
    coordinates: [[lng, lat], [s.lon, s.lat]]
  },
  properties: { osm_id: s.osm_id }
}));

(map.getSource('nah-lines') as maplibregl.GeoJSONSource).setData({
  type: 'FeatureCollection',
  features: lineFeatures
});
```

- [ ] **Step 2: Implement highlighting on sidebar selection**

Update the sidebar click listener to set feature state.

```typescript
sidebarResults.addEventListener('click', (e) => {
  const item = (e.target as HTMLElement).closest('.result-item-simple') as HTMLElement;
  if (item) {
    const osmId = item.dataset.id;
    // Reset all states
    lineFeatures.forEach(f => map.setFeatureState({ source: 'nah-lines', id: f.id }, { selected: false }));
    // Set selected state
    if (osmId) map.setFeatureState({ source: 'nah-lines', id: osmId }, { selected: true });
    
    // ... existing flyTo logic ...
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/NahPage.ts
git commit -m "feat(nah): draw and highlight proximity lines"
```
