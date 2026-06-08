# Tracking Dashboard CI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix CI compliance violations in the Live-Status, Stats, and Active Data Sources panels of the Tracking Dashboard.

**Architecture:** We will modify the HTML template literals in `TrackingEndpointsModule.ts` to strictly adhere to the DOM structures and modifiers defined in `oe5ith-ci/docs/service-dashboard.md`.

**Tech Stack:** TypeScript, Vanilla DOM, HTML.

---

### Task 1: Fix Live-Status Panel CI Compliance

**Files:**
- Modify: `src/components/info/TrackingEndpointsModule.ts`

- [ ] **Step 1: Write minimal implementation**

Modify the `renderLiveKpis` function to fix the compound "Paketrate" value.

```typescript
function renderLiveKpis(health: TrackingHealth) {
    return `
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-bolt"></i> Live-Status</div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid">
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Paketrate</span>
                        <span class="svc-data-value">${health.system?.totals?.messagesPerMinute || 0}</span>
                        <span class="svc-data-sub">Nachrichten / Min</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Flugzeuge Live</span>
                        <span class="svc-data-value">${health.aircraft || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Schiffe Live</span>
                        <span class="svc-data-value">${health.vessels || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Uptime</span>
                        <span class="svc-data-value">${formatUptime(health.system?.uptimeSec || 0)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
```

- [ ] **Step 2: Run test to verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/info/TrackingEndpointsModule.ts
git commit -m "fix(info): split compound value in tracking live-status panel to match CI cells rule"
```

---

### Task 2: Fix Stats Panel CI Compliance

**Files:**
- Modify: `src/components/info/TrackingEndpointsModule.ts`

- [ ] **Step 1: Write minimal implementation**

Modify the `renderStatsPanel` function to remove inline styles, move the update timestamp into `.panel-meta`, and fix the invalid badge color.

```typescript
function renderStatsPanel(stats: TrackingStats) {
    return `
        <div class="panel mt-4">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-chart-pie"></i> /stats/today (Tages-Zähler)</div>
                <div class="panel-meta">
                    Letztes Update: ${stats.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString() : 'Unbekannt'}
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
                        <span class="svc-data-label">Aircraft Seen</span>
                        <span class="svc-data-value">${stats.aircraftSeen || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Aircraft New</span>
                        <span class="svc-data-value success">+${stats.aircraftNew || 0}</span>
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
            </div>
        </div>
    `;
}
```

- [ ] **Step 2: Run test to verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/info/TrackingEndpointsModule.ts
git commit -m "fix(info): remove inline styles and invalid badges from tracking stats panel"
```

---

### Task 3: Fix Sources Panel CI Compliance

**Files:**
- Modify: `src/components/info/TrackingEndpointsModule.ts`

- [ ] **Step 1: Write minimal implementation**

Modify the `renderSourcesPanel` function to replace the table with `.svc-data-grid`.

```typescript
function renderSourcesPanel(health: TrackingHealth) {
    const sources = health.system?.sources || health.sources || [];
    
    if (sources.length === 0) {
        return `
            <div class="panel mt-4">
                <div class="panel-header">
                    <div class="panel-title"><i class="fa-solid fa-plug"></i> Aktive Datenquellen</div>
                </div>
                <div class="panel-body">
                    <p class="svc-info-line">Keine Quellen aktiv</p>
                </div>
            </div>
        `;
    }

    const sourceGrids = sources.map((s: any) => `
        <div class="svc-data-cell">
            <span class="svc-data-label">Typ</span>
            <span class="svc-data-value">${(s.kind || 'unknown').toUpperCase()}</span>
        </div>
        <div class="svc-data-cell">
            <span class="svc-data-label">Source ID</span>
            <span class="svc-data-value">${s.id}</span>
        </div>
        <div class="svc-data-cell">
            <span class="svc-data-label">Status</span>
            <span class="svc-data-value ${s.state === 'online' ? 'success' : 'danger'}">${s.state}</span>
        </div>
        <div class="svc-data-cell">
            <span class="svc-data-label">Nachrichten/Min</span>
            <span class="svc-data-value">${s.messagesPerMinute || 0}</span>
        </div>
        <div class="svc-data-cell">
            <span class="svc-data-label">Letztes Paket</span>
            <span class="svc-data-value">${s.lastDataAt ? new Date(s.lastDataAt).toLocaleTimeString() : '-'}</span>
        </div>
    `).join('');

    return `
        <div class="panel mt-4">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-plug"></i> Aktive Datenquellen</div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid">
                    ${sourceGrids}
                </div>
            </div>
        </div>
    `;
}
```

- [ ] **Step 2: Run test to verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/info/TrackingEndpointsModule.ts
git commit -m "fix(info): replace tracking sources table with CI compliant data grid"
```

---

### Task 4: Fix General Layout Cleanups

**Files:**
- Modify: `src/components/info/TrackingEndpointsModule.ts`

- [ ] **Step 1: Write minimal implementation**

Modify the initial loading spinner in `renderTrackingEndpointsModule` to remove inline styles.

```typescript
export async function renderTrackingEndpointsModule(container: HTMLElement, signal: AbortSignal) {
    container.innerHTML = `
        <header class="page-header">
            <div class="page-header-left">
                <div class="svc-page-title-row">
                    <i class="fa-solid fa-satellite-dish svc-page-icon"></i>
                    <h1 class="page-title">Tracking System Telemetrie</h1>
                </div>
                <p class="page-subtitle">Live-Status und statistische Auswertungen</p>
            </div>
        </header>
        <div class="content-body" id="tracking-endpoints-body">
            <div class="panel">
                <div class="panel-body">
                    <p class="svc-info-line"><i class="fa-solid fa-spinner fa-spin"></i> Lade Tracking-Daten...</p>
                </div>
            </div>
        </div>
    `;

    const body = container.querySelector('#tracking-endpoints-body')!;

    try {
        const [healthRes, statsRes] = await Promise.all([
            fetch(\`\${TRACKING_API_BASE}/health\`, { signal }),
            fetch(\`\${TRACKING_API_BASE}/stats/today\`, { signal })
        ]);

        if (!healthRes.ok || !statsRes.ok) {
            throw new Error('Fehler beim Abrufen der API-Daten (HTTP Status nicht ok)');
        }

        const health = await healthRes.json();
        const stats = await statsRes.json();

        if (signal.aborted) return;

        body.innerHTML = \`
            \${renderLiveKpis(health)}
            \${renderStatsPanel(stats)}
            \${renderSourcesPanel(health)}
        \`;
    } catch (e: any) {
        if (signal.aborted) return;
        body.innerHTML = \`
            <div class="panel error-panel">
                <div class="panel-header">
                    <div class="panel-title"><i class="fa-solid fa-triangle-exclamation"></i> Fehler</div>
                </div>
                <div class="panel-body">
                    <p>Die Tracking-Endpunkte konnten nicht geladen werden.</p>
                    <p class="error-text">\${e.message}</p>
                </div>
            </div>
        \`;
    }
}
```

- [ ] **Step 2: Run test to verify it compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/info/TrackingEndpointsModule.ts
git commit -m "fix(info): clean up tracking module inline styles and invalid panel headers"
```
