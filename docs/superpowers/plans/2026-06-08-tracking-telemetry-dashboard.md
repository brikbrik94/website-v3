# Implementation Plan: Tracking Telemetry Dashboard

## Metadata
- Issue/Request: Transform TrackingEndpointsModule into a Tracking Telemetry Dashboard
- Date: 2026-06-08

## Overview
The user wants to transform the `TrackingEndpointsModule` (previously a static endpoints documentation page) into a full telemetry dashboard. We will remove the `/info` endpoint fetch, utilize the `/health` and `/stats/today` endpoints to build a layout featuring top-level KPI cards, a data grid for daily statistics, and a table for active receiver sources.

## Tasks

### Task 1: Refactor TrackingEndpointsModule to Telemetry Dashboard
**Files:**
- Modify: `src/components/info/TrackingEndpointsModule.ts`

- [ ] **Step 1: Update API Interfaces**
Remove `TrackingInfo`. Keep and update `TrackingHealth` and `TrackingStats` to match the required fields.
- [ ] **Step 2: Update Main Render Function**
Remove the `fetch` call for `/info`. Remove `renderInfoPanel(info)`. Update the page title to "Tracking System Telemetrie" and subtitle to "Live-Status und statistische Auswertungen".
- [ ] **Step 3: Implement `renderLiveKpis` (New)**
Create a new function `renderLiveKpis(health: TrackingHealth)` returning a `.card-grid mb-gap` with 4 `.card-dashboard` elements:
  - Paketrate (fa-bolt): `health.system?.totals?.messagesPerMinute` / Min
  - Flugzeuge Live (fa-plane): `health.aircraft`
  - Schiffe Live (fa-ship): `health.vessels`
  - Uptime (fa-clock): `formatUptime(health.system?.uptimeSec || 0)`
- [ ] **Step 4: Update `renderStatsPanel`**
Simplify to show only today's stats using `.svc-data-grid` (ADS-B, AIS, Flugzeuge gesehen/neu, Schiffe gesehen, Metadata Cache Hits, Metadata Misses).
- [ ] **Step 5: Update `renderSourcesPanel` (Replaces `renderHealthPanel`)**
Rename `renderHealthPanel` to `renderSourcesPanel`. Remove the general system properties grid (now in KPIs) and focus purely on the sources table (`health.system?.sources`). Display fields: Typ, Source ID, Status (`.badge-green`/`.badge-red`), Nachrichten/Min, Letztes Paket.
- [ ] **Step 6: Build & Verify**
Run `npx tsc --noEmit`
- [ ] **Step 7: Commit Changes**
```bash
git add src/components/info/TrackingEndpointsModule.ts
git commit -m "refactor: convert TrackingEndpointsModule to Tracking Telemetry Dashboard"
```

### Task 2: Update Sidebar Routing Labels
**Files:**
- Modify: `src/components/RoutingSidebar.ts`

- [ ] **Step 1: Update Sidebar Label**
Find the sidebar entry for the `/info/tracking` route and change its text to "Tracking Telemetrie".
- [ ] **Step 2: Build & Verify**
- [ ] **Step 3: Commit Changes**
```bash
git add src/components/RoutingSidebar.ts
git commit -m "chore: update sidebar label for tracking telemetry"
```
