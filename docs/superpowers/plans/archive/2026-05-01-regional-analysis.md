# Regions Analyse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Regions Analyse" module on the Info page to show helicopter availability grouped by organization.

**Architecture:** Add a new rendering module in `InfoPage.ts`, update the sidebar dispatcher, and implement data grouping/refresh logic using Typ 2 Dashboard Cards.

**Tech Stack:** TypeScript (Vanilla), CI CSS (Cards, Badges, Page layout).

---

### Task 1: Update Sidebar and Dispatcher

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Add "Regions Analyse" to the sidebar HTML**

Update `initInfoPage` to include the new nav item.

```typescript
// Find initInfoPage and update sidebar-inner
<a href="/info/health" class="sidebar-nav-item nav-link ${subpath === 'health' ? 'active' : ''}" data-module="health">
  <i class="fa-solid fa-heart-pulse nav-icon"></i> Service Health
</a>
<a href="/info/regions" class="sidebar-nav-item nav-link ${subpath === 'regions' ? 'active' : ''}" data-module="regions">
  <i class="fa-solid fa-map-location nav-icon"></i> Regions Analyse
</a>
<a href="/info/debug" class="sidebar-nav-item nav-link ${subpath === 'debug' ? 'active' : ''}" data-module="debug">
  <i class="fa-solid fa-terminal nav-icon"></i> API Debug
</a>
```

- [ ] **Step 2: Update the content dispatcher**

Update `initInfoPage` logic to call `renderRegionsModule`.

```typescript
if (subpath === 'nah') {
  renderNahStatusModule(contentMount);
} else if (subpath === 'health') {
  renderHealthModule(contentMount);
} else if (subpath === 'regions') {
  renderRegionsModule(contentMount);
} else {
  // ... existing debug or fallback
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/InfoPage.ts
git commit -m "feat(info): add regions module to sidebar and dispatcher"
```

---

### Task 2: Implement Regions Module Skeleton

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Add the `renderRegionsModule` function shell**

```typescript
/**
 * Renders the Regions Analysis module.
 */
const renderRegionsModule = async (container: HTMLElement) => {
  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Regions <span>Analyse</span></h1>
        <p class="page-subtitle">Verfügbarkeit nach Organisation und Einsatzgebieten.</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="regions-meta">Lade Daten...</div>
        <button class="page-action" id="regions-refresh-btn">
          <i class="fa-solid fa-sync"></i> Aktualisieren
        </button>
      </div>
    </header>

    <div class="content-body">
      <div class="card-grid" id="regions-grid">
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
           <i class="fa-solid fa-circle-notch fa-spin"></i> Berechne regionale Analyse...
        </div>
      </div>
    </div>
  `;

  const grid = document.getElementById('regions-grid')!;
  const meta = document.getElementById('regions-meta')!;
  const refreshBtn = document.getElementById('regions-refresh-btn') as HTMLButtonElement;
  let refreshTimeout: any = null;

  // fetchData and grouping logic goes here in next task
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/InfoPage.ts
git commit -m "feat(info): implement regions module skeleton"
```

---

### Task 3: Implement Data Fetching and Grouping

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Implement `fetchData` with grouping logic**

```typescript
  const fetchData = async () => {
    if (!container.isConnected) return;
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;

    try {
      const response = await fetch('/api/nah');
      const data: NahResponse = await response.json();
      const stations = data.stations || [];

      // Group by region
      const groups: Record<string, { total: number, active: number }> = {};
      stations.forEach(s => {
        if (!groups[s.region]) groups[s.region] = { total: 0, active: 0 };
        groups[s.region].total++;
        if (s.is_active) groups[s.region].active++;
      });

      renderCards(groups);
      meta.innerHTML = `Stand: ${new Date().toLocaleTimeString()}`;
      
      scheduleNext();
    } catch (error) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--danger);">Fehler beim Laden der Regionaldaten.</div>`;
      scheduleNext(60000);
    } finally {
      refreshBtn.classList.remove('loading');
      refreshBtn.disabled = false;
    }
  };
```

- [ ] **Step 2: Implement `renderCards`**

```typescript
  const renderCards = (groups: Record<string, { total: number, active: number }>) => {
    const sortedRegions = Object.keys(groups).sort();
    
    grid.innerHTML = sortedRegions.map(region => {
      const { total, active } = groups[region];
      const pct = Math.round((active / total) * 100);
      
      let statusClass = 'unknown';
      if (pct === 100) statusClass = 'online';
      if (pct === 0) statusClass = 'offline';

      return `
        <div class="card card-dashboard">
          <div class="card-status-dot ${statusClass}" title="${pct}% bereit"></div>
          <h3 title="${region}">${region}</h3>
          <p style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 600;">${active} / ${total}</span> 
            <span class="badge badge-gray" style="font-size: 0.6rem;">${pct}%</span>
          </p>
        </div>
      `;
    }).join('');
  };
```

- [ ] **Step 3: Implement `scheduleNext` and initial call**

```typescript
  const scheduleNext = (delay = 30000) => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    if (!container.isConnected) return;
    refreshTimeout = setTimeout(fetchData, delay);
  };

  refreshBtn.addEventListener('click', () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    fetchData();
  });

  fetchData();
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/InfoPage.ts
git commit -m "feat(info): implement regional data grouping and card rendering"
```

---

### Task 4: Final Polish and Verification

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Verify `isConnected` usage to prevent memory leaks**

Ensure that all `setTimeout` calls check `container.isConnected` or are cleared when the module is destroyed. (Note: `InfoPage.ts` re-renders everything on subpath change, so `isConnected` check in the callback is crucial).

- [ ] **Step 2: Final Review**

Check for any hardcoded colors or non-CI patterns. Ensure icons match requirements.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(info): finalize regions module and verify connectivity checks"
```
