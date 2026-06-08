# Tracking Dashboard CI Fixes Design

## Problem

The Tracking Dashboard (`src/components/info/TrackingEndpointsModule.ts`) violates multiple rules defined in `oe5ith-ci/docs/service-dashboard.md`:
1. **Live-Status Panel**: Violates the "Zellen-Regel" (Ein Wert = eine `.svc-data-cell`). The "Paketrate" value is compounded (`150 / Min`).
2. **Stats/Today Panel**: Uses inline styles for the "Letztes Rollup Update" text, which violates the strict CI rule against inline styles. Uses an invalid badge color (`badge-blue`).
3. **Aktive Datenquellen Panel**: Uses an HTML table (`<table class="ci-table">`) for data visualization instead of the required `.svc-data-grid` > `.svc-data-cell` structure.

## Solution

The dashboard will be updated to strictly adhere to the `service-dashboard.md` specifications for "Seite 2 — Detail".

### 1. Live-Status Panel Updates
- Separate the compounded "Paketrate" value.
- Value will become just the number (e.g., `150`).
- The rate unit (`Nachrichten / Min`) will be moved to a `.svc-data-sub` element within the same cell.

### 2. Stats/Today Panel Updates
- Remove all inline styles (`margin-top: 16px; font-size: 0.85rem; color: var(--muted);`).
- Move the "Letztes Rollup Update" timestamp into the `.panel-meta` section of the `.panel-header`.
- Replace the invalid `badge-blue` with `badge-green` (or remove if inappropriate).

### 3. Aktive Datenquellen Panel Updates
- Completely remove the `<table class="ci-table">` and its wrapper.
- Implement a `.svc-data-grid` inside the `.panel-body`.
- For each active data source, generate individual `.svc-data-cell` blocks for its properties:
  - **Typ**: Value is the source kind (e.g., `ADS-B`).
  - **Source ID**: Value is the ID.
  - **Status**: Value is the state (e.g., `online`), using `.success` or `.danger` modifiers on the `.svc-data-value`.
  - **Nachrichten/Min**: The message rate.
  - **Letztes Paket**: The last data timestamp.

### 4. General Cleanup
- Replace the inline styles on the initial loading spinner with standard CI utility classes or remove the inline styling if a generic structure suffices.

## Architecture & Code Structure
The changes are isolated entirely within `src/components/info/TrackingEndpointsModule.ts`. No new files are needed. The three render functions (`renderLiveKpis`, `renderStatsPanel`, `renderSourcesPanel`) will be updated to output the compliant HTML strings.
