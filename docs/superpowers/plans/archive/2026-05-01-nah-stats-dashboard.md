# NAH Statistics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 CI-compliant Dashboard Cards above the NAH status table to summarize the operational state.

**Architecture:** Extend `src/pages/InfoPage.ts` to include a `renderStatsCards` function called after data fetching.

**Tech Stack:** TypeScript, CI Dashboard Cards (Typ 2).

---

### Task 1: Prepare Stats Container and Logic

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Add a placeholder for cards in `renderNahStatusModule`**
Insert a div with class `card-grid` and a specific ID before the panel.

```typescript
// src/pages/InfoPage.ts
// ... before the <div class="panel"> ...
<div class="card-grid" id="nah-stats-cards" style="margin-bottom: 24px;"></div>
```

- [ ] **Step 2: Implement the `renderStatsCards` helper**
Calculate values and generate HTML for the 4 cards.

```typescript
const renderStatsCards = (stations: NahStation[]) => {
  const container = document.getElementById('nah-stats-cards');
  if (!container) return;

  const total = stations.length;
  const active = stations.filter(s => s.is_active).length;
  const night = stations.filter(s => s.is_night_ready).length;
  
  // Find next event (simplified)
  const now = Date.now();
  let nextStation = null;
  let nextTime = Infinity;

  stations.forEach(s => {
    const start = s.calculated_start ? Date.parse(s.calculated_start) : Infinity;
    const end = s.calculated_end ? Date.parse(s.calculated_end) : Infinity;
    
    if (start > now && start < nextTime) { nextTime = start; nextStation = s; }
    if (end > now && end < nextTime) { nextTime = end; nextStation = s; }
  });

  const statusColor = active > total/2 ? 'online' : (active > 0 ? 'unknown' : 'offline');

  container.innerHTML = `
    <div class="card card-dashboard">
      <div class="card-status-dot ${statusColor}"></div>
      <h3 style="font-size: 0.75rem; color: var(--subtle); text-transform: uppercase;">Bereitschaft</h3>
      <p style="font-size: 1.2rem; font-weight: 700; color: #fff;">${active} / ${total}</p>
      <span style="font-size: 0.7rem; color: var(--muted);">Stationen aktiv</span>
    </div>
    <div class="card card-dashboard">
      <h3 style="font-size: 0.75rem; color: var(--subtle); text-transform: uppercase;">Nacht-Bereit</h3>
      <p style="font-size: 1.2rem; font-weight: 700; color: #fff;">${night} / ${total}</p>
      <i class="fa-solid fa-moon" style="position: absolute; top: 14px; right: 14px; color: var(--accent); opacity: 0.5;"></i>
    </div>
    <div class="card card-dashboard">
      <h3 style="font-size: 0.75rem; color: var(--subtle); text-transform: uppercase;">Im Dienst</h3>
      <p style="font-size: 1.2rem; font-weight: 700; color: var(--success);">${active}</p>
      <span style="font-size: 0.7rem; color: var(--muted);">Aktuell einsatzbereit</span>
    </div>
    <div class="card card-dashboard">
      <h3 style="font-size: 0.75rem; color: var(--subtle); text-transform: uppercase;">Nächster Wechsel</h3>
      <p style="font-size: 1.1rem; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${nextStation ? `${nextStation.callsign} @ ${formatTime(new Date(nextTime).toISOString())}` : '-'}
      </p>
      <span style="font-size: 0.7rem; color: var(--muted);">Geplante Änderung</span>
    </div>
  `;
};
```

- [ ] **Step 3: Call `renderStatsCards` in `fetchData`**
Ensure it runs after `stations` is populated.

- [ ] **Step 4: Commit and verify**
Check if the cards appear correctly above the table.
