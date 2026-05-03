# Dynamische PMTiles Layer-Steuerung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a multi-accordion sidebar that dynamically loads and toggles individual layers from PMTiles overlay style JSONs.

**Architecture:** 
- The sidebar will iterate over inventory overlays and create an accordion for each.
- Layer discovery is lazy: fetching and parsing the overlay's style JSON happens on the first expand.
- Map interaction is granular: `addSource` on first layer toggle, `addLayer`/`removeLayer` for individual items, and `removeSource` when no layers are active.

**Tech Stack:** TypeScript (Vanilla), MapLibre GL JS, PMTiles, FontAwesome.

---

### Task 1: Sidebar Component Refactoring

**Files:**
- Modify: `src/components/Sidebar.ts`
- Modify: `src/pages/MapPage.ts`

- [ ] **Step 1: Update Sidebar Interface**
Modify `initSidebar` to accept the full `MapItem` array and a new callback for granular layer toggling.

```typescript
// src/components/Sidebar.ts
export const initSidebar = (
  container: HTMLElement,
  overlays: MapItem[],
  onLayerToggle: (overlayId: string, overlayUrl: string, layerId: string, layerType: string, checked: boolean) => void,
  onBulkToggle?: (overlayId: string, overlayUrl: string, layers: any[], checked: boolean) => void
) => { /* ... */ }
```

- [ ] **Step 2: Implement Accordion Group Generation**
Replace the static "Verfügbare Overlays" group with a loop over `overlays`.

```typescript
// src/components/Sidebar.ts (render logic)
const renderOverlayGroup = (m: MapItem) => {
  const id = m.name.toLowerCase().replace(/\s+/g, '-');
  return `
    <div class="acc-group" id="group-${id}" data-id="${id}" data-url="${m.style.url}">
      <div class="acc-header" role="button" tabindex="0" aria-expanded="false">
        <span class="acc-dot" style="background: var(--accent)"></span>
        <span class="acc-title">${m.name}</span>
        <span class="acc-status unloaded">nicht geladen</span>
        <i class="fa-solid fa-chevron-down acc-chevron"></i>
      </div>
      <div class="acc-controls">
        <button class="acc-ctrl-btn btn-all-on">Alle an</button>
        <button class="acc-ctrl-btn btn-all-off">Alle aus</button>
      </div>
      <div class="acc-body">
        <div class="acc-item-list">
          <div class="acc-item loading-state" style="padding-left: 24px; color: var(--subtle); font-size: 0.8rem;">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Lade Layer...
          </div>
        </div>
      </div>
    </div>
  `;
};
```

- [ ] **Step 3: Commit UI Skeleton**
```bash
git add src/components/Sidebar.ts
git commit -m "feat(sidebar): refactor to multi-accordion structure"
```

---

### Task 2: Lazy Loading & Style Parsing

**Files:**
- Modify: `src/components/Sidebar.ts`

- [ ] **Step 1: Implement Layer Discovery Logic**
Add a function to fetch and parse the style JSON when an accordion is expanded.

```typescript
// src/components/Sidebar.ts
const loadedLayers = new Map<string, any[]>();

const discoverLayers = async (groupEl: HTMLElement) => {
  const id = groupEl.getAttribute('data-id')!;
  if (loadedLayers.has(id)) return;

  const url = groupEl.getAttribute('data-url')!;
  const listEl = groupEl.querySelector('.acc-item-list')!;

  try {
    const res = await fetch(url);
    const style = await res.json();
    const layers = style.layers.filter((l: any) => l.type !== 'background');
    loadedLayers.set(id, layers);

    listEl.innerHTML = layers.map((l: any) => `
      <div class="acc-item" data-layer-id="${l.id}" data-layer-type="${l.type}">
        <span class="acc-checkbox"></span>
        <span class="acc-item-label">${l.id}</span>
      </div>
    `).join('');
    
    // Refresh scrollHeight for transition
    const body = groupEl.querySelector('.acc-body') as HTMLElement;
    body.style.setProperty('--acc-body-height', body.scrollHeight + 'px');
  } catch (err) {
    listEl.innerHTML = `<div class="acc-item" style="color: var(--danger)">Fehler beim Laden</div>`;
  }
};
```

- [ ] **Step 2: Attach Expansion Event**
Update the accordion header click listener to trigger `discoverLayers`.

- [ ] **Step 3: Commit Lazy Loading**
```bash
git add src/components/Sidebar.ts
git commit -m "feat(sidebar): implement lazy layer discovery"
```

---

### Task 3: Granular Map Integration

**Files:**
- Modify: `src/pages/MapPage.ts`
- Modify: `src/lib/MapCore.ts`

- [ ] **Step 1: Update addOverlay in MapPage**
Modify `addOverlay` to support adding specific layers instead of the whole style.

- [ ] **Step 2: Implement Granular Toggle Callback**
In `initMapPage`, implement the logic to add/remove sources and layers based on the individual checkbox state.

- [ ] **Step 3: Handle Status Badges**
Update the `acc-status` badge in `Sidebar.ts` whenever a layer is toggled.

- [ ] **Step 4: Commit Map Logic**
```bash
git add src/pages/MapPage.ts src/components/Sidebar.ts
git commit -m "feat(map): implement granular layer toggling and source management"
```

---

### Task 4: Verification & UI Polish

**Files:**
- Modify: `src/styles/sidebar.css`

- [ ] **Step 1: Verify Namespacing**
Ensure that layer IDs are correctly prefixed to prevent collisions.

- [ ] **Step 2: Test Bulk Controls**
Verify that "Alle an" / "Alle aus" within an accordion work correctly.

- [ ] **Step 3: Run Build & Lint**
```bash
npm run build
```
