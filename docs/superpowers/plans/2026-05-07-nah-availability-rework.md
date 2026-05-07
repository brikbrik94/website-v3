# NAH Availability & Statistics Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the NAH availability display to differentiate between seasonal breaks and daily operating hours across the Info page and Map page.

**Architecture:** We will use the existing `/api/nah.php` data but implement a three-way split in the frontend logic: Active (in season & active), Standby (in season & not active), and Off-Season (not in season). Statistics will be updated to exclude off-season stations from the active ratio.

**Tech Stack:** TypeScript (Vanilla), Vite, MapLibre GL JS, FontAwesome.

---

### Task 1: Update InfoPage Statistics Logic

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Update `renderStatsCards` to support three-way split**

Replace the current statistics calculation logic to distinguish between active, standby (in season), and off-season.

```typescript
  const renderStatsCards = (stations: NahStation[]) => {
    const statsContainer = document.getElementById('nah-stats-cards');
    if (!statsContainer) return;

    const total = stations.length;
    const inSeasonStations = stations.filter(s => s.in_season);
    const activeStations = inSeasonStations.filter(s => s.is_active);
    
    const activeCount = activeStations.length;
    const inSeasonCount = inSeasonStations.length;
    const offSeasonCount = total - inSeasonCount;
    
    // Calculate night ready count (only for in-season stations)
    const nightReadyCount = inSeasonStations.filter(s => s.is_night_ready).length;

    let statusClass = 'offline';
    let statusLabel = 'Keine Stationen aktiv';
    const ratio = inSeasonCount > 0 ? activeCount / inSeasonCount : 0;

    if (activeCount === 0) {
      statusClass = 'offline';
    } else if (ratio > 0.5) {
      statusClass = 'online';
      statusLabel = 'Einsatzbereit';
    } else {
      statusClass = 'unknown';
      statusLabel = 'Eingeschränkt bereit';
    }

    statsContainer.innerHTML = `
      <div class="card card-dashboard">
        <div class="card-status-dot ${statusClass}" title="${statusLabel}"></div>
        <h3>Bereitschaft</h3>
        <p class="t-body">${activeCount} von ${inSeasonCount} im Dienst</p>
      </div>

      <div class="card card-dashboard">
        <h1 class="t-h1" style="margin: 0; color: var(--success);">${activeCount}</h1>
        <h3>Verfügbar</h3>
        <p class="t-body">Aktuell einsatzbereit</p>
      </div>

      <div class="card card-dashboard">
        <h1 class="t-h1" style="margin: 0; color: var(--muted);">${offSeasonCount}</h1>
        <h3>Saisonpause</h3>
        <p class="t-body">Von gesamt ${total} Stationen</p>
      </div>
      
      <div class="card card-dashboard">
        <div class="card-status-dot online" style="background: none; box-shadow: none;">
          <i class="fa-solid fa-moon" style="color: var(--subtle);"></i>
        </div>
        <h3>Nacht-Bereit</h3>
        <p class="t-body">${nightReadyCount} Stationen (H24)</p>
      </div>
    `;
  };
```

- [ ] **Step 2: Commit changes**

```bash
git add src/pages/InfoPage.ts
git commit -m "feat(info): update NAH statistics with seasonal differentiation"
```

---

### Task 2: Update InfoPage Table Layout

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Update HTML structure for three tables**

Modify the `renderNahStatusModule` container HTML to include three distinct table sections.

```typescript
  container.innerHTML = `
    <!-- ... header ... -->
    <div class="content-body">
      <div class="card-grid" id="nah-stats-cards" style="margin-bottom: var(--card-gap);"></div>
      
      <div id="nah-tables-container" style="display: flex; flex-direction: column; gap: 24px;">
        <!-- 1. Active Table -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title" style="color: var(--success);"><i class="fa-solid fa-helicopter"></i> Aktuell im Dienst</div>
          </div>
          <div class="panel-body panel-body-flush" style="overflow-x: auto;">
            <table class="ci-table">
              <thead>
                <tr>
                  <th class="sortable" data-sort="callsign">Station</th>
                  <th class="sortable" data-sort="region">Organisation</th>
                  <th class="sortable" data-sort="op_type">Typ</th>
                  <th class="sortable mono" data-sort="calculated_start">Start (BCET)</th>
                  <th class="sortable mono" data-sort="calculated_end">Ende (ECET)</th>
                  <th class="sortable" data-sort="is_active">Status</th>
                </tr>
              </thead>
              <tbody id="nah-table-body-active"></tbody>
            </table>
          </div>
        </div>

        <!-- 2. Standby Table -->
        <div class="panel" id="nah-panel-standby">
          <div class="panel-header">
            <div class="panel-title" style="color: var(--danger);"><i class="fa-solid fa-clock"></i> Außer Dienst (Betriebszeit)</div>
          </div>
          <div class="panel-body panel-body-flush" style="overflow-x: auto;">
            <table class="ci-table">
              <thead>
                <tr>
                  <th style="width: 25%;">Station</th>
                  <th style="width: 25%;">Organisation</th>
                  <th style="width: 25%;">Typ</th>
                  <th style="width: 25%;">Nächster Dienst</th>
                </tr>
              </thead>
              <tbody id="nah-table-body-standby"></tbody>
            </table>
          </div>
        </div>

        <!-- 3. Off Season Table -->
        <div class="panel" id="nah-panel-offseason">
          <div class="panel-header">
            <div class="panel-title" style="color: var(--muted);"><i class="fa-solid fa-snowflake"></i> Aktuell keine Saison</div>
          </div>
          <div class="panel-body panel-body-flush" style="overflow-x: auto;">
            <table class="ci-table">
              <thead>
                <tr>
                  <th style="width: 25%;">Station</th>
                  <th style="width: 25%;">Organisation</th>
                  <th style="width: 25%;">Typ</th>
                  <th style="width: 25%;">Status</th>
                </tr>
              </thead>
              <tbody id="nah-table-body-offseason"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
```

- [ ] **Step 2: Update `renderTable` logic to populate three tables**

Modify `renderTable` to filter and render into the three separate bodies.

```typescript
  const renderTable = () => {
    const activeStations = stations.filter(s => s.in_season && s.is_active);
    const standbyStations = stations.filter(s => s.in_season && !s.is_active);
    const offSeasonStations = stations.filter(s => !s.in_season);

    const tableBodyActive = document.getElementById('nah-table-body-active')!;
    const tableBodyStandby = document.getElementById('nah-table-body-standby')!;
    const tableBodyOffseason = document.getElementById('nah-table-body-offseason')!;

    // Helper to render row
    const renderRow = (s: NahStation, simple = false) => {
      if (simple) {
        return `
          <tr>
            <td>
              <div style="font-weight: 500;">${s.callsign}</div>
              <div style="font-size: 0.8rem; color: var(--subtle);">${s.name}</div>
            </td>
            <td>${s.region}</td>
            <td><span class="badge badge-gray">${s.op_type}</span></td>
            <td>
              ${!s.in_season 
                ? '<span class="badge badge-gray">SAISONPAUSE</span>' 
                : `<span class="badge badge-red">AB ${formatTime(s.calculated_start)}</span>`}
            </td>
          </tr>
        `;
      }
      return `
        <tr>
          <td>
            <div style="font-weight: 500;">${s.callsign}</div>
            <div style="font-size: 0.8rem; color: var(--subtle);">${s.name}</div>
          </td>
          <td>${s.region}</td>
          <td><span class="badge badge-gray">${s.op_type}</span></td>
          <td class="mono">${formatTime(s.calculated_start)}</td>
          <td class="mono">${formatTime(s.calculated_end)}</td>
          <td><span class="badge badge-green">EINSATZBEREIT</span></td>
        </tr>
      `;
    };

    tableBodyActive.innerHTML = activeStations.map(s => renderRow(s)).join('') || '<tr><td colspan="6" style="text-align: center; padding: 12px;">Keine Stationen aktiv</td></tr>';
    tableBodyStandby.innerHTML = standbyStations.map(s => renderRow(s, true)).join('') || '<tr><td colspan="4" style="text-align: center; padding: 12px;">Keine Stationen auf Standby</td></tr>';
    tableBodyOffseason.innerHTML = offSeasonStations.map(s => renderRow(s, true)).join('') || '<tr><td colspan="4" style="text-align: center; padding: 12px;">Alle Stationen in Saison</td></tr>';
  };
```

- [ ] **Step 3: Commit changes**

```bash
git add src/pages/InfoPage.ts
git commit -m "feat(info): implement triple table layout for NAH status"
```

---

### Task 3: Update Map Page Marker Logic

**Files:**
- Modify: `src/pages/NahPage.ts`

- [ ] **Step 1: Update marker color and popup logic in `refreshStations`**

Update the marker creation loop to distinguish between active, out-of-hours, and off-season.

```typescript
    stations.forEach((station) => {
      let color = MAP_COLORS.success;
      let statusText = 'EINSATZBEREIT';

      if (!station.in_season) {
        color = MAP_COLORS.muted;
        statusText = 'AUSSER SAISON';
      } else if (!station.is_active) {
        color = MAP_COLORS.danger;
        statusText = 'AUSSER DIENST (Betriebszeit)';
      }
      
      const el = document.createElement('div');
      el.innerHTML = `<i class="fa-solid fa-helicopter map-marker-helicopter" style="color: ${color};"></i>`;
      
      // ... hoursHtml logic ...

      const popupHtml = `
        <div class="map-popup-detail">
          <div class="popup-header">
            <div class="popup-header-title">${station.callsign}</div>
            <div class="popup-header-org">${station.name}</div>
          </div>
          <table class="popup-kv">
            <tr><td>Status</td><td style="color: ${color}; font-weight: 700;">${statusText}</td></tr>
            <tr><td>Betrieb</td><td>${station.op_type}</td></tr>
            ${hoursHtml}
            <tr><td>Nacht</td><td>${station.is_night_ready ? 'Ja' : 'Nein'}</td></tr>
            ${!station.in_season ? `<tr><td>Saison</td><td>Monate: ${station.months_active.join(', ')}</td></tr>` : ''}
          </table>
        </div>
      `;
      // ... marker creation ...
    });
```

- [ ] **Step 2: Commit changes**

```bash
git add src/pages/NahPage.ts
git commit -m "feat(map): update NAH marker colors and popups for three-state availability"
```

---

### Task 4: Final Validation

- [ ] **Step 1: Verify Info Page**
- Open `/info/nah`.
- Check if three tables are displayed.
- Check if statistics cards show correct counts (especially "Saisonpause").

- [ ] **Step 2: Verify Map Page**
- Open `/nah`.
- Check marker colors (Green, Red, Gray).
- Check popups for accurate status text.
