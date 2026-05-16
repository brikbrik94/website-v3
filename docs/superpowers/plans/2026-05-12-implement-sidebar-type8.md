# Sidebar Typ 8 (Tracking-Liste) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the new CI Sidebar Type 8 (Tracking-Liste) on the Tracking page, replacing the old multi-list and detail-container layout.

**Architecture:** Unified `tracking-list` with a `segmented` filter control. Details are displayed inline using an accordion pattern (`.active` class on `.tracking-item`).

**Tech Stack:** TypeScript (Vanilla), CSS (oe5ith-ci).

---

### Task 1: Update TrackingSidebar HTML Structure

**Files:**
- Modify: `src/components/TrackingSidebar.ts`

- [ ] **Step 1: Update the base HTML in `initTrackingSidebar`**

Replace the old `status-panel`, `tool-sep`, `tracking-detail-container`, and separate `result-list` elements with the new Type 8 structure.

```typescript
// src/components/TrackingSidebar.ts

// Inside initTrackingSidebar
container.innerHTML = `
  <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-inner">
      <!-- TYP 6: Status-Panel (Zähler) -->
      <div class="status-panel" id="status-panel-counters">
        <div class="status-row">
          <div class="status-row-left">
            <i class="fa-solid fa-plane status-row-icon"></i>
            <span class="status-row-name">ADS-B Flugzeuge</span>
          </div>
          <div class="status-row-right">
            <span class="status-row-value" id="status-adsb-count">0</span>
            <span class="status-dot off" id="status-adsb-dot"></span>
          </div>
        </div>
        <div class="status-row">
          <div class="status-row-left">
            <i class="fa-solid fa-ship status-row-icon"></i>
            <span class="status-row-name">AIS Schiffe</span>
          </div>
          <div class="status-row-right">
            <span class="status-row-value" id="status-ais-count">0</span>
            <span class="status-dot off" id="status-ais-dot"></span>
          </div>
        </div>
      </div>

      <div class="tool-sep"></div>

      <!-- Mode-Switch (Filter) -->
      <div class="segmented" id="tracking-filter">
        <button class="segmented-btn active" data-filter="all">Alle</button>
        <button class="segmented-btn" data-filter="adsb">ADS-B</button>
        <button class="segmented-btn" data-filter="ais">AIS</button>
      </div>

      <!-- TYP 8: Tracking-Liste -->
      <div class="tracking-list" id="tracking-list">
        <div class="result-empty">
          <i class="fa-solid fa-satellite-dish"></i>
          Warte auf Empfang…
        </div>
      </div>

    </div>
    ${getSidebarFooterHtml()}
    <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
  </aside>
`;
```

- [ ] **Step 2: Commit Task 1**
```bash
git add src/components/TrackingSidebar.ts
git commit -m "feat(tracking): update sidebar html structure to Type 8"
```

---

### Task 2: Implement Unified List Rendering

**Files:**
- Modify: `src/components/TrackingSidebar.ts`

- [ ] **Step 1: Update `updateTrackingList` to handle Type 8 items**

Refactor `updateTrackingList` to render a combined list of ADS-B and AIS items using the `.tracking-item` structure.

```typescript
// src/components/TrackingSidebar.ts

export const updateTrackingList = (items: TrackingItem[], currentFilter: string) => {
  const listEl = document.getElementById('tracking-list');
  if (!listEl) return;

  const filteredItems = currentFilter === 'all' 
    ? items 
    : items.filter(i => i.type === currentFilter);

  if (filteredItems.length === 0) {
    listEl.innerHTML = `
      <div class="result-empty">
        <i class="fa-solid fa-satellite-dish"></i>
        ${items.length === 0 ? 'Warte auf Empfang...' : 'Keine Objekte für diesen Filter.'}
      </div>
    `;
    return;
  }

  listEl.innerHTML = filteredItems.map(item => {
    const icon = item.type === 'adsb' ? 'fa-plane' : 'fa-ship';
    const badgeClass = item.type === 'adsb' ? 'badge-blue' : 'badge-gray';
    const badgeLabel = item.type === 'adsb' ? 'ADS-B' : 'AIS';
    
    let kvHtml = '';
    if (item.details) {
      kvHtml = '<div class="result-kv">';
      for (const [key, value] of Object.entries(item.details)) {
        kvHtml += `
          <div class="result-kv-item">
            <span class="result-kv-label">${key}</span>
            <span class="result-kv-value">${value}</span>
          </div>
        `;
      }
      kvHtml += '</div>';
    }

    return `
      <div class="tracking-item" data-type="${item.type}" data-id="${item.id}">
        <div class="tracking-item-header">
          <i class="fa-solid ${icon} tracking-item-icon"></i>
          <span class="tracking-item-name">${item.label}</span>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          <i class="fa-solid fa-chevron-down tracking-item-chevron"></i>
        </div>
        <div class="tracking-item-body">
          ${kvHtml}
        </div>
      </div>
    `;
  }).join('');
};
```

- [ ] **Step 2: Commit Task 2**
```bash
git add src/components/TrackingSidebar.ts
git commit -m "feat(tracking): implement unified list rendering with accordion details"
```

---

### Task 3: Implement Filtering and Expansion Logic

**Files:**
- Modify: `src/components/TrackingSidebar.ts`

- [ ] **Step 1: Add Event Listeners for Filter and Accordion**

Update `initTrackingSidebar` to handle filter clicks and item expansion.

```typescript
// src/components/TrackingSidebar.ts

// Inside initTrackingSidebar setup
const filterContainer = document.getElementById('tracking-filter')!;
filterContainer.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.segmented-btn');
  if (btn) {
    filterContainer.querySelectorAll('.segmented-btn').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.getAttribute('data-filter') || 'all';
    // Trigger re-render or notify page
    container.dispatchEvent(new CustomEvent('tracking-filter-change', { detail: filter }));
  }
});

const listEl = document.getElementById('tracking-list')!;
listEl.addEventListener('click', (e) => {
  const header = (e.target as HTMLElement).closest('.tracking-item-header');
  if (header) {
    const itemEl = header.parentElement!;
    const wasActive = itemEl.classList.contains('active');
    
    // Close others
    listEl.querySelectorAll('.tracking-item').forEach(el => el.classList.remove('active'));
    
    if (!wasActive) {
      itemEl.classList.add('active');
      const id = itemEl.getAttribute('data-id');
      const type = itemEl.getAttribute('data-type') as 'adsb' | 'ais';
      onItemClick({ id, type } as any); // Simplified for now, will be refined
    }
  }
});
```

- [ ] **Step 2: Implement `setActiveTrackingItem`**

```typescript
export const setActiveTrackingItem = (id: string | number) => {
  const listEl = document.getElementById('tracking-list');
  if (!listEl) return;

  const items = listEl.querySelectorAll('.tracking-item');
  items.forEach(el => {
    if (el.getAttribute('data-id') === String(id)) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      el.classList.remove('active');
    }
  });
};
```

- [ ] **Step 3: Commit Task 3**
```bash
git add src/components/TrackingSidebar.ts
git commit -m "feat(tracking): add filter and accordion interaction logic"
```

---

### Task 4: Integration in TrackingPage

**Files:**
- Modify: `src/pages/TrackingPage.ts`

- [ ] **Step 1: Update interaction logic**

Update `TrackingPage.ts` to use the new `updateTrackingList` with the unified array and handle filter changes.

- [ ] **Step 2: Remove old `updateObjectDetail` calls**

- [ ] **Step 3: Final Verification**

Run the build and verify:
1. "Alle" shows everything.
2. "ADS-B" / "AIS" filters correctly.
3. Clicking a list item expands it and focuses map.
4. Clicking a map icon expands the list item and scrolls to it.

- [ ] **Step 4: Commit Task 4**
```bash
git add src/pages/TrackingPage.ts
git commit -m "feat(tracking): integrate new sidebar logic into TrackingPage"
```
