# CI Map Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CI-compliant route styles (Blue/Gray semantic) and a dynamic Map Legend overlay.

**Architecture:** Update local styles from CI submodule, create dedicated library files for styles and legend logic, and integrate them into existing map pages with a Topbar toggle.

**Tech Stack:** TypeScript, Vanilla CSS (CI Tokens), MapLibre GL.

---

### Task 1: Style Synchronization

**Files:**
- Modify: `src/styles/*.css` (overwrite from `oe5ith-ci/css/`)

- [ ] **Step 1: Sync CSS files from CI submodule**

Run: `cp -v oe5ith-ci/css/*.css src/styles/`
Expected: `modal.css`, `common.css`, `sidebar.css` etc. updated in `src/styles/`.

- [ ] **Step 2: Verify `src/styles/modal.css` contains legend classes**

Run: `grep ".map-legend" src/styles/modal.css`
Expected: Matches found for `.map-legend`, `.map-legend-title`, etc.

- [ ] **Step 3: Commit**

```bash
git add src/styles/*.css
git commit -m "chore: sync CI styles to latest version"
```

---

### Task 2: Create MapStyles Library

**Files:**
- Create: `src/lib/MapStyles.ts`

- [ ] **Step 1: Create `src/lib/MapStyles.ts` with CI-compliant styles**

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

- [ ] **Step 2: Commit**

```bash
git add src/lib/MapStyles.ts
git commit -m "feat: add MapStyles library with CI route colors"
```

---

### Task 3: Create MapLegend Library

**Files:**
- Create: `src/lib/MapLegend.ts`

- [ ] **Step 1: Create `src/lib/MapLegend.ts` with `MapLegend` class**

```typescript
export interface LegendEntry {
  type: 'dot' | 'line' | 'area';
  color: string;
  label: string;
}

export class MapLegend {
  private _el: HTMLElement;
  private _titleEl: HTMLElement;
  private _entriesEl: HTMLElement;

  constructor(selectorOrEl: string | HTMLElement) {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) throw new Error(`MapLegend: Element not found: ${selectorOrEl}`);
    this._el = el as HTMLElement;
    this._titleEl = this._el.querySelector('.map-legend-title') as HTMLElement;
    this._entriesEl = this._el.querySelector('.map-legend-entries') as HTMLElement;
    if (!this._titleEl || !this._entriesEl) {
      throw new Error('MapLegend: Required child elements (.map-legend-title, .map-legend-entries) missing');
    }
  }

  setTitle(text: string): void {
    this._titleEl.textContent = text;
    this._titleEl.style.display = text ? 'block' : 'none';
  }

  addEntry(entry: LegendEntry): void {
    const div = document.createElement('div');
    div.className = 'map-legend-entry';

    const typeClass = { dot: 'map-legend-dot', line: 'map-legend-line', area: 'map-legend-area' }[entry.type];
    const marker = document.createElement('div');
    marker.className = typeClass;
    marker.style.background = entry.color;

    const label = document.createElement('span');
    label.className = 'map-legend-label';
    label.textContent = entry.label;

    div.appendChild(marker);
    div.appendChild(label);
    this._entriesEl.appendChild(div);
  }

  clearEntries(): void {
    this._entriesEl.innerHTML = '';
  }

  show(): void { this._el.style.display = 'block'; }
  hide(): void { this._el.style.display = 'none'; }
  toggle(): void { this._el.style.display = this.isVisible() ? 'none' : 'block'; }
  isVisible(): boolean { return this._el.style.display !== 'none'; }

  destroy(): void {
    this._el.remove();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/MapLegend.ts
git commit -m "feat: add MapLegend library for dynamic map overlays"
```

---

### Task 4: Extend Topbar Component

**Files:**
- Modify: `src/components/Topbar.ts`

- [ ] **Step 1: Update `initTopbar` signature to include `onLegendToggle`**

```typescript
// Modify signature and add button
export const initTopbar = (
  container: HTMLElement, 
  basemaps: any[], 
  onStyleChange: (url: string) => void,
  onLegendToggle?: (isActive: boolean) => void // New callback
) => {
  // ...
}
```

- [ ] **Step 2: Add Legend button to HTML template**

In `container.innerHTML`, add the button to both desktop and mobile sections.
```html
<!-- Desktop (topbar-controls) -->
<button class="topbar-toggle" id="legend-toggle" title="Legende">
  <i class="fa-solid fa-list-ul"></i>
</button>

<!-- Mobile (m-nav) -->
<a id="m-legend-toggle">Legende</a>
```

- [ ] **Step 3: Wire up toggle logic**

```typescript
const legendBtn = document.getElementById('legend-toggle');
const mLegendBtn = document.getElementById('m-legend-toggle');

const handleToggle = () => {
  legendBtn?.classList.toggle('active');
  const isActive = legendBtn?.classList.contains('active') || false;
  if (onLegendToggle) onLegendToggle(isActive);
};

legendBtn?.addEventListener('click', handleToggle);
mLegendBtn?.addEventListener('click', handleToggle);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Topbar.ts
git commit -m "feat: add legend toggle button to Topbar"
```

---

### Task 5: Integrate Legend and Styles into NahPage

**Files:**
- Modify: `src/pages/NahPage.ts`

- [ ] **Step 1: Import new libraries**

```typescript
import { MAP_ROUTE_STYLES } from '../lib/MapStyles';
import { MapLegend } from '../lib/MapLegend';
```

- [ ] **Step 2: Initialize `MapLegend` and update `initTopbar` call**

In `initNahPage`, after layout mount:
```typescript
// 1. Add Legend container to HTML
container.innerHTML = `
  <div id="topbar-mount"></div>
  <div class="layout">
    <div id="sidebar-mount"></div>
    <main id="map" ...>
      ...
    </main>
    <div class="map-legend" id="map-legend" style="display:none; position:fixed; bottom:16px; right:16px;">
      <div class="map-legend-title"></div>
      <div class="map-legend-entries"></div>
    </div>
  </div>
`;

// 2. Init Legend
const legend = new MapLegend('#map-legend');
legend.setTitle('Luftrettung');
legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.active.color, label: 'Gewählte Station' });
legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.background.color, label: 'Nächste Stationen' });
legend.addEntry({ type: 'dot',  color: '#10b981', label: 'Einsatzbereit' });
legend.addEntry({ type: 'dot',  color: '#6b7280', label: 'Nicht aktiv' });

// 3. Update initTopbar
initTopbar(topbarMount, basemaps, (url) => { ... }, () => legend.toggle());
```

- [ ] **Step 3: Update `nah-lines` layer paint properties**

```typescript
map.addLayer({
  id: 'nah-lines',
  type: 'line',
  source: 'nah-lines',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': ['case', 
      ['boolean', ['feature-state', 'selected'], false], 
      MAP_ROUTE_STYLES.active.color, 
      MAP_ROUTE_STYLES.background.color
    ],
    'line-width': ['case', 
      ['boolean', ['feature-state', 'selected'], false], 
      MAP_ROUTE_STYLES.active.weight, 
      MAP_ROUTE_STYLES.background.weight
    ],
    'line-opacity': ['case', 
      ['boolean', ['feature-state', 'selected'], false], 
      MAP_ROUTE_STYLES.active.opacity, 
      MAP_ROUTE_STYLES.background.opacity
    ]
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/NahPage.ts
git commit -m "feat: implement CI route styles and legend in NahPage"
```

---

### Task 6: Integrate Legend and Styles into RoutingPage

**Files:**
- Modify: `src/pages/RoutingPage.ts`

- [ ] **Step 1: Import new libraries**

```typescript
import { MAP_ROUTE_STYLES } from '../lib/MapStyles';
import { MapLegend } from '../lib/MapLegend';
```

- [ ] **Step 2: Update Layout and Initialize Legend**

In `initRoutingPage`:
```typescript
// 1. Add Legend container
container.innerHTML = `
  <div id="topbar-mount"></div>
  <div class="layout">
    ...
    <div class="map-legend" id="map-legend" style="display:none; position:fixed; bottom:16px; right:16px;">
      <div class="map-legend-title"></div>
      <div class="map-legend-entries"></div>
    </div>
  </div>
`;

const legend = new MapLegend('#map-legend');
legend.setTitle('Routing');
legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.active.color, label: 'Primärroute' });
legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.background.color, label: 'Vergleich / Alternativ' });

// 2. Update initTopbar call
initTopbar(topbarMount, basemaps, (url) => { ... }, () => legend.toggle());
```

- [ ] **Step 3: Update `route-line` and dynamic route paint properties**

```typescript
// For route-line
'line-color': MAP_ROUTE_STYLES.active.color,
'line-width': MAP_ROUTE_STYLES.active.weight,
'line-opacity': MAP_ROUTE_STYLES.active.opacity

// For updateRouteVisuals
const PAINT_HIGHLIGHT = { 
  'line-opacity': MAP_ROUTE_STYLES.active.opacity, 
  'line-width': MAP_ROUTE_STYLES.active.weight + 1 
};
const PAINT_DEZENT = { 
  'line-opacity': MAP_ROUTE_STYLES.background.opacity, 
  'line-width': MAP_ROUTE_STYLES.background.weight 
};
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/RoutingPage.ts
git commit -m "feat: implement CI route styles and legend in RoutingPage"
```
