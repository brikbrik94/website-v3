# Dynamische PMTiles Layer-Steuerung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a multi-accordion sidebar that dynamically loads and toggles individual layers from PMTiles overlay style JSONs.

**Architecture:** 
- The sidebar will iterate over inventory overlays and create an accordion for each.
- Layer discovery is lazy: fetching and parsing the overlay's style JSON happens on the first expand.
- Map interaction is granular: `addSource` on first layer toggle, `addLayer`/`removeLayer` for individual items, and `removeSource` when no layers are active.

**Tech Stack:** TypeScript (Vanilla), MapLibre GL JS, PMTiles, FontAwesome.

---

### Task 1: Sidebar Component Refactoring

**Files:**
- Modify: `src/components/Sidebar.ts`
- Modify: `src/pages/MapPage.ts`

- [x] **Step 1: Update Sidebar Interface**
Modify `initSidebar` to accept the full `MapItem` array and a new callback for granular layer toggling.

- [x] **Step 2: Implement Accordion Group Generation**
Replace the static "Verfügbare Overlays" group with a loop over `overlays`.

- [x] **Step 3: Commit UI Skeleton**

---

### Task 2: Lazy Loading & Style Parsing

**Files:**
- Modify: `src/components/Sidebar.ts`

- [x] **Step 1: Implement Layer Discovery Logic**
Add a function to fetch and parse the style JSON when an accordion is expanded.

- [x] **Step 2: Attach Expansion Event**
Update the accordion header click listener to trigger `discoverLayers`.

- [x] **Step 3: Commit Lazy Loading**

---

### Task 3: Granular Map Integration

**Files:**
- Modify: `src/pages/MapPage.ts`
- Modify: `src/lib/MapCore.ts`

- [x] **Step 1: Update addOverlay in MapPage**
Modify `addOverlay` to support adding specific layers instead of the whole style.

- [x] **Step 2: Implement Granular Toggle Callback**
In `initMapPage`, implement the logic to add/remove sources and layers based on the individual checkbox state.

- [x] **Step 3: Handle Status Badges**
Update the `acc-status` badge in `Sidebar.ts` whenever a layer is toggled.

- [x] **Step 4: Commit Map Logic**

---

### Task 4: Verification & UI Polish

**Files:**
- Modify: `src/styles/sidebar.css`

- [x] **Step 1: Verify Namespacing**
Ensure that layer IDs are correctly prefixed to prevent collisions.

- [x] **Step 2: Test Bulk Controls**
Verify that "Alle an" / "Alle aus" within an accordion work correctly.

- [x] **Step 3: Run Build & Lint**
