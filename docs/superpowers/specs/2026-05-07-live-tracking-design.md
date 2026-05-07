# Design Spec: Live Tracking Page (AIS & ADS-B)

**Date:** 2026-05-07
**Status:** Approved
**Topic:** Implementation of a real-time tracking page for maritime (AIS) and aviation (ADS-B) traffic.
**Version Target:** v3.2.0a1

## 1. Goal
Provide a dedicated page for visualizing real-time traffic data from AIS and ADS-B sources. The page will feature a high-performance map view using MapLibre symbol layers, persistent track history, and a sidebar for navigating and highlighting specific objects.

## 2. Requirements

### 2.1 Map Visualization
- **Performance:** Use MapLibre `symbol` layers for markers and `line` layers for tracks.
- **Sprites:** Utilize existing sprites from `https://tiles.oe5ith.at/assets/sprites/adsb/sprite` and `https://tiles.oe5ith.at/assets/sprites/ais/sprite`.
- **Dynamic Rotation:** Icons must rotate based on heading (`track` for ADS-B, `cog` for AIS).
- **Track History:**
    - All tracks are visible as subtle, thin lines.
    - The selected object's track is highlighted (increased width and opacity).
- **Popups:** Standardized popups showing key metadata (Name/Callsign, MMSI/ICAO, Speed, Altitude, Heading).

### 2.2 Sidebar (TrackingSidebar)
- **Dual Lists:** Separate sections for "Luftfahrt (ADS-B)" and "Schifffahrt (AIS)".
- **Interaction:**
    - Clicking an item centers the map on the object.
    - Opens the popup for the object.
    - Highlights the object's track.
- **Real-time Updates:** Lists refresh automatically every 5-10 seconds while maintaining scroll position.

### 2.3 Controls (Topbar)
- **Independent Toggles:**
    - **ADS-B:** Toggle button in Topbar (Icon: `fa-plane`).
    - **AIS:** Toggle button in Topbar (Icon: `fa-ship`).
- **Initial State:** Both layers are active by default on page load.

## 3. Architecture & Components

### 3.1 Data Management
- **Interpreters:**
    - `api/AdsbInterpreter.ts`: Handles Tar1090 data.
    - `api/AisInterpreter.ts`: Handles AIS-catcher data.
- **Refresh Loop:** A central interval in `TrackingPage.ts` manages periodic fetching and updating of map sources.

### 3.2 UI Components
- **`src/pages/TrackingPage.ts`:** Main entry point for the route `/tracking`.
- **`src/components/TrackingSidebar.ts`:** Specialized sidebar for displaying live traffic lists.
- **`src/lib/MapCore.ts`:** Used to initialize the map and manage base layers.

### 3.3 Style Tokens
- Use existing CI tokens for colors and spacing.
- Highlight colors should follow `MAP_COLORS.accent`.

## 4. Technical Implementation Details

### 4.1 Map Layers
```typescript
// Example Layer Definition
{
  id: 'adsb-symbols',
  type: 'symbol',
  source: 'adsb-points',
  layout: {
    'icon-image': 'plane-icon', // from sprite
    'icon-rotate': ['get', 'track'],
    'icon-rotation-alignment': 'map'
  }
}
```

### 4.2 Versioning
- Update `src/version.ts` to `3.2.0a1`.
- Update `CHANGELOG.md` with the new tracking feature.

## 5. Testing & Validation
- Verify data fetching and transformation via interpreters.
- Test toggle functionality in the Topbar.
- Ensure sidebar clicks correctly highlight and center objects.
- Validate that track history is correctly pruned (max 60 points) to prevent memory leaks.
