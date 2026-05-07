# Sidebar Component Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a multi-accordion sidebar that dynamically loads and toggles individual layers from PMTiles overlay style JSONs.

**Architecture:** 
- The sidebar iterates over inventory overlays and creates an accordion for each.
- Layer discovery is lazy: fetching and parsing the overlay's style JSON happens on the first expand.
- Individual layers are toggled via a granular callback.

**Tech Stack:** TypeScript (Vanilla), MapLibre (Style JSONs), CI Styles (oe5ith-ci).

---

### Task 1: Update Sidebar Interface and Skeleton

**Files:**
- Modify: `src/components/Sidebar.ts`

- [ ] **Step 1: Update `initSidebar` signature**

```typescript
export const initSidebar = (
  container: HTMLElement,
  overlays: MapItem[],
  onLayerToggle: (overlayId: string, overlayUrl: string, layerId: string, layerType: string, checked: boolean) => void,
  onBulkToggle?: (overlayId: string, overlayUrl: string, layers: any[], checked: boolean) => void
) => { ... }
```

- [ ] **Step 2: Update HTML template to loop over overlays**

Replace the static "Overlays" group with a loop over `overlays`.

```typescript
  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Overlays</div>
        <div class="accordion" id="accordion-container">
          ${overlays.map(m => renderOverlayGroup(m)).join('')}
        </div>
      </div>
      <div class="sidebar-footer">
        <span class="sidebar-footer-version">v3.0.0</span>
        <button class="sidebar-footer-copyright" onclick="window.dispatchEvent(new CustomEvent('open-copyright'))" title="Copyright & Lizenzen">©</button>
      </div>
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;
```

- [ ] **Step 3: Implement `renderOverlayGroup` helper**

```typescript
const renderOverlayGroup = (m: MapItem) => {
  const id = m.name.toLowerCase().replace(/\s+/g, '-');
  return `
    <div class="acc-group" id="group-${id}" data-overlay-id="${id}" data-overlay-url="${m.style.url}">
      <div class="acc-header" role="button" tabindex="0">
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
        <div class="acc-loader" style="padding: 10px; color: var(--muted); font-size: 0.8rem;">Lade Layer...</div>
      </div>
    </div>
  `;
};
```

---

### Task 2: Implement Lazy Loading and Group Logic

**Files:**
- Modify: `src/components/Sidebar.ts`

- [ ] **Step 1: Add event listener for accordion headers with lazy loading**

```typescript
  const accordionContainer = container.querySelector('#accordion-container')!;
  
  accordionContainer.addEventListener('click', async (e) => {
    const header = (e.target as HTMLElement).closest('.acc-header');
    if (!header) return;

    const group = header.closest('.acc-group') as HTMLElement;
    const body = group.querySelector('.acc-body') as HTMLElement;
    const overlayUrl = group.getAttribute('data-overlay-url')!;
    const overlayId = group.getAttribute('data-overlay-id')!;

    const isOpen = group.classList.toggle('open');
    
    if (isOpen) {
      // Lazy Load layers if not already loaded
      if (group.classList.contains('loaded')) {
        body.style.setProperty('--acc-body-height', body.scrollHeight + 'px');
      } else {
        await loadOverlayLayers(group, overlayId, overlayUrl);
      }
    }
  });
```

- [ ] **Step 2: Implement `loadOverlayLayers`**

```typescript
  const loadOverlayLayers = async (group: HTMLElement, overlayId: string, url: string) => {
    const body = group.querySelector('.acc-body') as HTMLElement;
    try {
      const res = await fetch(url);
      const style = await res.json();
      const layers = style.layers?.filter((l: any) => l.type !== 'background') || [];
      
      body.innerHTML = layers.map((l: any) => `
        <div class="acc-item" data-layer-id="${l.id}" data-layer-type="${l.type}">
          <span class="acc-checkbox"></span>
          <span class="acc-item-label">${l.id}</span>
        </div>
      `).join('');
      
      group.classList.add('loaded');
      body.style.setProperty('--acc-body-height', body.scrollHeight + 'px');
      updateGroupStatus(group);
    } catch (err) {
      body.innerHTML = `<div style="padding:10px; color:var(--danger)">Fehler beim Laden.</div>`;
    }
  };
```

- [ ] **Step 3: Implement `updateGroupStatus`**

```typescript
  const updateGroupStatus = (group: HTMLElement) => {
    const status = group.querySelector('.acc-status')!;
    const items = group.querySelectorAll('.acc-item');
    const checked = group.querySelectorAll('.acc-item.checked');
    
    status.className = 'acc-status';
    if (checked.length === 0) {
      status.classList.add('unloaded');
      status.textContent = 'nicht geladen';
    } else if (checked.length === items.length) {
      status.classList.add('all-on');
      status.textContent = 'alle aktiv';
    } else {
      status.classList.add('partial');
      status.textContent = `${checked.length} Layer`;
    }
  };
```

---

### Task 3: Implement Layer Toggling and Bulk Controls

**Files:**
- Modify: `src/components/Sidebar.ts`

- [ ] **Step 1: Add event delegation for layer toggling**

```typescript
  accordionContainer.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.acc-item') as HTMLElement;
    if (!item) return;

    const group = item.closest('.acc-group') as HTMLElement;
    const overlayId = group.getAttribute('data-overlay-id')!;
    const overlayUrl = group.getAttribute('data-overlay-url')!;
    const layerId = item.getAttribute('data-layer-id')!;
    const layerType = item.getAttribute('data-layer-type')!;
    
    const isChecked = item.classList.toggle('checked');
    onLayerToggle(overlayId, overlayUrl, layerId, layerType, isChecked);
    updateGroupStatus(group);
  });
```

- [ ] **Step 2: Implement Bulk Controls**

```typescript
  accordionContainer.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.acc-ctrl-btn');
    if (!btn) return;

    e.stopPropagation();
    const group = btn.closest('.acc-group') as HTMLElement;
    const overlayId = group.getAttribute('data-overlay-id')!;
    const overlayUrl = group.getAttribute('data-overlay-url')!;
    const isAllOn = btn.classList.contains('btn-all-on');
    
    const items = group.querySelectorAll('.acc-item');
    items.forEach(item => {
      const el = item as HTMLElement;
      const checked = el.classList.contains('checked');
      if (isAllOn !== checked) {
        el.classList.toggle('checked', isAllOn);
        const layerId = el.getAttribute('data-layer-id')!;
        const layerType = el.getAttribute('data-layer-type')!;
        onLayerToggle(overlayId, overlayUrl, layerId, layerType, isAllOn);
      }
    });
    updateGroupStatus(group);
  });
```

---

### Task 4: Update MapPage Integration

**Files:**
- Modify: `src/pages/MapPage.ts`

- [ ] **Step 1: Update `initSidebar` call**

```typescript
  initSidebar(sidebarMount, overlays, (overlayId, overlayUrl, layerId, layerType, checked) => {
    console.log(`Toggle Layer: ${overlayId} -> ${layerId} (${layerType}) = ${checked}`);
    // Task 3 will handle map logic
  });
```

---

### Verification

- [ ] Run `npm run dev` and open the sidebar.
- [ ] Verify that all overlays from inventory are listed.
- [ ] Verify that clicking an overlay header fetches the style JSON and lists layers.
- [ ] Verify that toggling a layer updates the group status badge.
- [ ] Verify "Alle an" / "Alle aus" functionality.
- [ ] Verify CI compliance (no checkboxes in header, etc.).
