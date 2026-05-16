# Sidebar Typ 8 (Tracking-Liste) Implementation Design

> **Status:** Draft · **Date:** 2026-05-12
> **Goal:** Migration of the Tracking page sidebar to the new CI Sidebar Type 8.

## 1. Overview
The current sidebar on the Tracking page uses separate lists for ADS-B/AIS and a dedicated detail container. We are replacing this with the standardized **Sidebar Type 8** from the `oe5ith-ci` system.

### Key Changes:
- **Unified List:** One `tracking-list` container instead of two separate result lists.
- **Mode Switch:** A segmented control at the top to filter between "All", "ADS-B", and "AIS".
- **Accordion Details:** Clicking an item expands it to show details (`tracking-item-body`) and highlights it on the map.
- **Removal of Detail Container:** The standalone `tracking-detail-container` is removed as details are now inline.

## 2. Architecture & Components

### `TrackingSidebar.ts`
- **`initTrackingSidebar`**: Updated to include the `.segmented` filter and the new `.tracking-list` structure.
- **`updateTrackingList`**: Refactored to handle the combined list, filtering, and the new `tracking-item` HTML.
- **`setActiveTrackingItem(id)`**: New helper to handle expanding an item (via map click or list click).
- **`updateObjectDetail`**: Removed (functionality merged into list items).

### `TrackingPage.ts`
- **Interaction Logic**: Updated to call the new list expansion methods.
- **State Management**: Ensure the current filter (All/ADS-B/AIS) is respected during updates.

## 3. Implementation Details

### HTML Structure (Type 8)
```html
<div class="status-panel">...</div>
<div class="tool-sep"></div>
<div class="segmented">
  <button class="segmented-btn active" data-filter="all">Alle</button>
  <button class="segmented-btn" data-filter="adsb">ADS-B</button>
  <button class="segmented-btn" data-filter="ais">AIS</button>
</div>
<div class="tracking-list" id="tracking-list">
  <!-- Items injected here -->
</div>
```

### Tracking Item HTML
```html
<div class="tracking-item" data-type="adsb" data-id="HEX">
  <div class="tracking-item-header">
    <i class="fa-solid fa-plane"></i>
    <span class="tracking-item-name">CALLSIGN</span>
    <span class="badge badge-blue">ADS-B</span>
    <i class="fa-solid fa-chevron-down tracking-item-chevron"></i>
  </div>
  <div class="tracking-item-body">
    <!-- .result-kv details -->
  </div>
</div>
```

## 4. User Experience & Interactions
1. **List Click:** Toggles `.active` class on `.tracking-item`. If expanding, triggers map zoom/highlight.
2. **Map Click:** Finds the corresponding item in the list, expands it, and scrolls it into view.
3. **Filtering:** Segmented buttons filter the DOM elements (or re-render the list based on state).

## 5. Verification Plan
- [ ] Verify segmented buttons filter the list correctly.
- [ ] Verify clicking an item expands it and shows the correct details.
- [ ] Verify map clicks correctly expand and scroll to the item in the sidebar.
- [ ] Verify empty states (`.result-empty`) show when no objects are present for a filter.
