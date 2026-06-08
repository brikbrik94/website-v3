# Service Dashboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `HealthModule.ts` and `TrackingEndpointsModule.ts` to strictly follow the CI's `service-dashboard.md` definitions for "Übersicht" and "Detail" pages.

**Architecture:** We will replace the custom flex-based rows and grids with the CI's explicit classes (`card-dashboard`, `svc-data-grid`, `svc-page-title-row`) and update the JS logic to apply the correct status classes (`online`, `offline`, `unknown`).

**Tech Stack:** TypeScript, Vanilla DOM API

---

### Task 1: Refactor HealthModule to Dashboard Grid

**Files:**
- Modify: `src/components/info/HealthModule.ts`

- [x] **Step 1: Rewrite HTML template to use card-grid**

```typescript
  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Service <span>Health</span></h1>
        <p class="page-subtitle">Live-Monitor der technischen Dienste und APIs. Details in docs/API_ENDPOINTS.md.</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="health-meta">Initialisierung...</div>
        <button class="page-action" id="health-refresh-btn">
          <i class="fa-solid fa-sync"></i> Jetzt prüfen
        </button>
      </div>
    </header>

    <div class="content-body">
      <div class="card-grid mb-gap" id="health-list">
        ${services.map(s => `
          <div class="card card-dashboard" id="svc-${s.id}">
            <div class="card-status-dot unknown"></div>
            <h3>
              <i class="${s.icon} svc-card-icon"></i>
              <span>${s.name}</span>
            </h3>
            <p class="svc-info-line">${s.description}</p>
            <span class="svc-status-line unknown mono">-- ms</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
```

- [x] **Step 2: Update logic in `pingService()`**

Replace the `.status-dot` class toggling with the new structure updating `.card-status-dot` and `.svc-status-line`.

```typescript
    const row = container.querySelector(`#svc-${service.id}`)!;
    const latencyEl = row.querySelector('.svc-status-line')!;
    const dot = row.querySelector('.card-status-dot')!;
// ...
      const latency = Math.round(performance.now() - start);
      latencyEl.textContent = `${latency} ms`;
      
      dot.classList.remove('online', 'unknown', 'offline');
      latencyEl.classList.remove('online', 'unknown', 'offline');
      
      if (response.ok) {
        if (latency < 200) {
          dot.classList.add('online');
          latencyEl.classList.add('online');
        } else if (latency < 500) {
          dot.classList.add('unknown');
          latencyEl.classList.add('unknown');
        } else {
          dot.classList.add('offline');
          latencyEl.classList.add('offline');
        }
      } else {
        dot.classList.add('offline');
        latencyEl.classList.add('offline');
      }
    } catch (e: any) {
      if (e.name === 'AbortError' && signal?.aborted) return;
      
      latencyEl.textContent = 'Error';
      dot.classList.remove('online', 'unknown', 'offline');
      latencyEl.classList.remove('online', 'unknown', 'offline');
      
      dot.classList.add('offline');
      latencyEl.classList.add('offline');
    }
```

- [x] **Step 3: Build & Verify HealthModule**
Run: `npm run build` or `npx tsc --noEmit`
Expected: Passes type checking successfully.

- [x] **Step 4: Commit HealthModule changes**
```bash
git add src/components/info/HealthModule.ts
git commit -m "refactor: adapt HealthModule to CI dashboard overview pattern"
```

---

### Task 2: Refactor TrackingEndpointsModule to Detail Page

**Files:**
- Modify: `src/components/info/TrackingEndpointsModule.ts`

- [ ] **Step 1: Rewrite Main Header**

```typescript
    container.innerHTML = `
        <header class="page-header">
            <div class="page-header-left">
                <div class="svc-page-title-row">
                    <i class="fa-solid fa-satellite-dish svc-page-icon"></i>
                    <h1 class="page-title">Tracking Gateway API</h1>
                </div>
                <p class="page-subtitle">Statische HTTP Endpunkte Übersicht</p>
            </div>
        </header>
        <div class="content-body" id="tracking-endpoints-body">
```

- [ ] **Step 2: Rewrite `renderHealthPanel`**

```typescript
function renderHealthPanel(health: any) {
// ...
    return `
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-heart-pulse"></i> /health (Live Status)</div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid mb-4">
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Gateway Status</span>
                        <span class="svc-data-value ${health.status === 'ok' ? 'success' : 'danger'}">${(health.status || 'unknown').toUpperCase()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Uptime</span>
                        <span class="svc-data-value">${formatUptime(sys.uptimeSec || 0)}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Memory (RSS+Heap)</span>
                        <span class="svc-data-value">${memTotal} MB</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Decoded / Min</span>
                        <span class="svc-data-value">${(sys.totals?.decodedPerMinute || 0).toLocaleString()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Flugzeuge (Live)</span>
                        <span class="svc-data-value">${health.aircraft || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Schiffe (Live)</span>
                        <span class="svc-data-value">${health.vessels || 0}</span>
                    </div>
                </div>

                <div class="panel-title" style="margin-top: 24px; margin-bottom: 12px;"><i class="fa-solid fa-plug"></i> Aktive Datenquellen</div>
                <div class="table-wrapper">
                    <table class="ci-table">
// ...
```

- [ ] **Step 3: Rewrite `renderStatsPanel`**

```typescript
function renderStatsPanel(stats: any) {
    return `
        <div class="panel mt-4">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-chart-pie"></i> /stats/today (Tages-Zähler)</div>
                <div class="panel-meta">
                    <span class="badge badge-blue">${stats.day || 'Heute'}</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid">
                    <div class="svc-data-cell">
                        <span class="svc-data-label">ADS-B Messages</span>
                        <span class="svc-data-value">${(stats.adsbMessages || 0).toLocaleString()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">AIS Messages</span>
                        <span class="svc-data-value">${(stats.aisMessages || 0).toLocaleString()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Aircraft Seen / New</span>
                        <span class="svc-data-value">${stats.aircraftSeen || 0} / <span class="t-success">+${stats.aircraftNew || 0}</span></span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Vessels Seen</span>
                        <span class="svc-data-value">${stats.vesselsSeen || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Metadata Hits</span>
                        <span class="svc-data-value success">${(stats.metadataCacheHit || 0).toLocaleString()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Metadata Misses</span>
                        <span class="svc-data-value danger">${stats.metadataNotFound || 0}</span>
                    </div>
                </div>
                <div style="margin-top: 16px; font-size: 0.85rem; color: var(--muted);">
                    Letztes Rollup Update in der Datenbank: ${stats.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString() : 'Unbekannt'}
                </div>
            </div>
        </div>
    `;
}
```

- [ ] **Step 4: Rewrite `renderInfoPanel`**

```typescript
function renderInfoPanel(info: any) {
// ...
    return `
        <div class="panel mt-4 mb-4" style="margin-top: 24px; margin-bottom: 24px;">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-circle-info"></i> /info (API Übersicht)</div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid mb-4">
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Service</span>
                        <span class="svc-data-value">${info.name}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">API Version</span>
                        <span class="svc-data-value"><span class="badge badge-blue">${info.apiVersion}</span></span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Beschreibung</span>
                        <span class="svc-data-value" style="font-size:0.85rem">${info.description}</span>
                    </div>
                </div>
                
                <div class="panel-title" style="margin-top: 24px; margin-bottom: 12px;"><i class="fa-solid fa-server"></i> Verfügbare Endpunkte</div>
// ...
```

- [ ] **Step 5: Build & Verify TrackingEndpointsModule**
Run: `npx tsc --noEmit`
Expected: Passes type checking successfully.

- [ ] **Step 6: Commit TrackingEndpointsModule changes**
```bash
git add src/components/info/TrackingEndpointsModule.ts
git commit -m "refactor: adapt TrackingEndpointsModule to CI dashboard detail pattern"
```
