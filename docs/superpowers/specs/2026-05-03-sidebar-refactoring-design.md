# Sidebar Refactoring Design

**Date:** 2026-05-03
**Status:** Draft
**Topic:** Multi-accordion sidebar with lazy-loaded dynamic layers.

## Goal
Refactor the sidebar to support multiple accordion groups, one per overlay, with granular layer toggling and lazy loading of layer definitions from PMTiles style JSONs.

## Architecture

### Sidebar Component (`src/components/Sidebar.ts`)
- **Initialization**: `initSidebar` now takes `overlays: MapItem[]` and granular callbacks.
- **Dynamic Rendering**: Loops over `overlays` to create `.acc-group` elements following CI standards.
- **Lazy Loading**: 
    - Layer metadata is not loaded upfront.
    - Fetching happens when an `.acc-group` is expanded for the first time.
    - Uses `fetch` to get the style JSON from the overlay's `style.url`.
- **Granular Toggling**:
    - Individual layers are rendered as `.acc-item` with checkboxes.
    - Toggling a layer calls `onLayerToggle`.
- **Bulk Toggling**:
    - "Alle an" / "Alle aus" buttons call `onBulkToggle` or iterate `onLayerToggle`.
- **Status Badges**:
    - Updates per group: `nicht geladen` (0), `n Layer` (1..n-1), `alle aktiv` (all).

### Map Page (`src/pages/MapPage.ts`)
- **Integration**: Updates the `initSidebar` call.
- **State**: For now, uses dummy callbacks as map logic is out of scope for this task.

## UI / UX (CI Compliance)
- Follows `oe5ith-ci/docs/sidebar.md`.
- Uses `MAP_COLORS` from `src/lib/MapStyles.ts` for dynamic colors.
- Z-Index from `src/styles/common.css`.

## Data Flow
1. `initMapPage` calls `initSidebar` with overlays.
2. `initSidebar` renders headers.
3. User clicks Header -> `fetch(styleUrl)` -> Render items in `acc-body`.
4. User clicks Item -> `onLayerToggle` callback.

## Error Handling
- Handle fetch failures for style JSONs with a toast notification or error state in the accordion.

## Testing Strategy
- Verify that multiple accordions can be opened.
- Verify that layers only load on demand.
- Verify status badge updates correctly.
