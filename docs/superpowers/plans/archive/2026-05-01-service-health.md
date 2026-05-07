# Service Health Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Service Health" module in the Info page to monitor backend and proxy services.

**Architecture:** Add a new sidebar entry and a `renderHealthModule` function in `InfoPage.ts`.

**Tech Stack:** TypeScript, CI Status-Panel.

---

### Task 1: Extend InfoPage Sidebar and Registry

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Add "Service Health" to sidebar**
Add the nav-item for `/info/health`.

```typescript
<a href="/info/health" class="sidebar-nav-item nav-link ${subpath === 'health' ? 'active' : ''}" data-module="health">
  <i class="fa-solid fa-heart-pulse nav-icon"></i> Service Health
</a>
```

- [ ] **Step 2: Update module dispatcher**
Handle the `health` subpath.

```typescript
if (subpath === 'nah') {
  renderNahStatusModule(contentMount);
} else if (subpath === 'health') {
  renderHealthModule(contentMount);
}
```

---

### Task 2: Implement Health Monitoring Logic

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Implement `renderHealthModule` base UI**
Create the header and the `.status-panel` container.

```typescript
async function renderHealthModule(mount: HTMLElement) {
  mount.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Service <span>Health</span></h1>
        <p class="page-subtitle">Live-Monitor der technischen Dienste und APIs.</p>
      </div>
    </header>
    <div class="content-body">
      <div class="card-grid" id="health-stats" style="margin-bottom: 24px;"></div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title"><i class="fa-solid fa-server"></i> API Endpunkte</div></div>
        <div class="panel-body">
          <div class="status-panel" id="health-list">
             <!-- Service rows here -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  startHealthChecks();
}
```

- [ ] **Step 2: Implement `startHealthChecks` loop**
Define a list of services and ping them using `fetch`.

```typescript
const services = [
  { id: 'backend', name: 'Backend Core', url: '/api/ping', icon: 'fa-php' },
  { id: 'nah', name: 'NAH Service', url: '/api/nah', icon: 'fa-helicopter' },
  { id: 'ors', name: 'Routing API (ORS)', url: '/api/ors', icon: 'fa-route' },
  { id: 'geo', name: 'Geocoder (Nominatim)', url: '/api/geocoder', icon: 'fa-location-dot' },
  { id: 'tiles', name: 'Tile Registry', url: 'https://tiles.oe5ith.at/inventory.json', icon: 'fa-layer-group' }
];

async function pingService(s: any) {
  const start = performance.now();
  try {
    const res = await fetch(s.url);
    const end = performance.now();
    const lat = Math.round(end - start);
    updateServiceRow(s, lat, res.ok);
  } catch (e) {
    updateServiceRow(s, 0, false);
  }
}
```

- [ ] **Step 3: Implement `updateServiceRow`**
Create/Update DOM elements using the CI `.status-row` pattern.

- [ ] **Step 4: Add 30s auto-refresh**
Ensure the checks run periodically while the user is on the page.

- [ ] **Step 5: Commit and verify**
Verify that all pings are successful and latency is shown.
