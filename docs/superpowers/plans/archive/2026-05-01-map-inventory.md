# Map Inventory Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Karten Inventar" module in the Info page to show all assets from the tile server.

**Architecture:** Add a new sidebar entry and a `renderInventoryModule` function in `InfoPage.ts`.

**Tech Stack:** TypeScript, CI Content Cards (Typ 3).

---

### Task 1: Extend InfoPage Sidebar and Registry

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Add "Karten Inventar" to sidebar**
Add the nav-item for `/info/inventory`. Use icon `fa-layer-group`.

```typescript
<a href="/info/inventory" class="sidebar-nav-item nav-link ${subpath === 'inventory' ? 'active' : ''}" data-module="inventory">
  <i class="fa-solid fa-layer-group nav-icon"></i> Karten Inventar
</a>
```

- [ ] **Step 2: Update module dispatcher**
Handle the `inventory` subpath.

```typescript
} else if (subpath === 'inventory') {
  renderInventoryModule(contentMount);
}
```

---

### Task 2: Implement Inventory Rendering Logic

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Implement `renderInventoryModule` structure**
Create headings for different asset types.

```typescript
async function renderInventoryModule(mount: HTMLElement) {
  mount.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Karten <span>Inventar</span></h1>
        <p class="page-subtitle">Verzeichnis der verfügbaren Geodaten-Layer.</p>
      </div>
    </header>
    <div class="content-body" id="inventory-content">
      <div style="text-align: center; padding: 3rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Lade Inventar...</div>
    </div>
  `;
  
  loadInventoryData();
}
```

- [ ] **Step 2: Implement `loadInventoryData`**
- Fetch from `https://tiles.oe5ith.at/inventory.json`.
- Group maps by `type`.
- Render **Content Cards (Typ 3)** for each map.
- Render lists for **Fonts** and **Sprites**.

```typescript
// Card template for Maps
function createMapCard(map: any) {
  return `
    <div class="card">
      <div class="card-content-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 0.95rem;">${map.name}</h3>
        <span class="badge badge-gray" style="font-size: 0.6rem;">${map.type.toUpperCase()}</span>
      </div>
      <p style="font-size: 0.78rem; color: var(--muted); margin-bottom: 12px;">
        Projekt: ${map.project} · Größe: ${map.file.stats?.size_str || 'k.A.'}
      </p>
      <div class="card-url" style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--success); background: #000; padding: 6px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${map.file.url}
      </div>
    </div>
  `;
}
```

- [ ] **Step 3: Commit and verify**
Check if the cards and technical details are displayed correctly.
