# Service Dashboard Integration Design

## 1. Overview
This design adapts the existing `HealthModule.ts` and `TrackingEndpointsModule.ts` to fully comply with the newly defined CI dashboard patterns (`docs/service-dashboard.md`). 
The `HealthModule` will be converted to the "Seite 1 — Übersicht (Dashboard)" standard, while `TrackingEndpointsModule` will adopt the "Seite 2 — Detail (Detail-Seite)" standard.

## 2. HealthModule (Dashboard Übersicht)
### 2.1 UI Structure
- Replace the custom `.status-panel` / `.status-row` list with `.card-grid`.
- Use the non-clickable `.card.card-dashboard` variant for each service.
- Card structure:
  - `.card-status-dot.unknown`
  - `h3` containing `i.svc-card-icon` and `span` with the service name.
  - `p.svc-info-line` for the description.
  - `span.svc-status-line.unknown` initialized with `-- ms`.

### 2.2 Logic Updates
- Refactor `pingService()` to update DOM nodes based on the new class structure.
- Status classification:
  - `< 200ms`: `.online`
  - `< 500ms`: `.unknown` (Warn state mapping)
  - `Error / > 500ms`: `.offline`
- Ensure `.online`, `.offline`, or `.unknown` classes are applied simultaneously to both `.card-status-dot` and `.svc-status-line`.

## 3. TrackingEndpointsModule (Detail-Seite)
### 3.1 Page Header
- Replace custom `.content-header` with `.page-header` > `.page-header-left`.
- Introduce `.svc-page-title-row` wrapper for:
  - `i.svc-page-icon` (e.g. `fa-satellite-dish`).
  - `h1.page-title` (Tracking Gateway API).
- Move the subtitle to `p.page-subtitle` directly under `.page-header-left`.

### 3.2 Data Panels
- Panels must adhere strictly to the "Ein-Endpunkt-Regel" and "Zellen-Regel".
- Replace existing `.card-grid` inside panels with `.svc-data-grid`.
- Replace inner cards with `.svc-data-cell` elements:
  - `.svc-data-label` for uppercase meta keys (e.g. "MEMORY").
  - `.svc-data-value` for the actual data value.
  - Optional `.svc-data-sub` for extra details.
- Where appropriate (e.g., metadata hits), use `.svc-data-value.success` or `.svc-data-value.danger`.

### 3.3 Tables
- Existing tables (`ci-table`) for Active Sources and Endpoints remain valid inside their respective `.panel-body` containers.
- Panel titles must all contain an icon and text via `.panel-title`.

## 4. Dependencies & Constraints
- The `service-dashboard.css` file must be active (it is assumed to be loaded via standard CSS imports or CI integration).
- The changes must adhere strictly to the HTML structure defined in `oe5ith-ci/docs/service-dashboard.md` (no extra wrapper `div`s inside cells).
