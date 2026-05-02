# Design Spec: Map Inventory Module

## Purpose
Display a comprehensive list of all geospatial assets available on the tile server, including vector map layers (PMTiles), fonts, and sprites.

## UI Design
- **Type:** CI **Karten-Grid (Typ 3)** pattern.
- **Layout:** 
    - **Header:** "Karten <span>Inventar</span>"
    - **Sections:** Groups for "Basemaps", "Overlays", "Elevation", "Fonts", and "Sprites".
- **Components:** 
    - Maps: CI **Content Cards (Typ 3)** with URL and type badges.
    - Fonts/Sprites: CI **Panels** with lists.

### Map Card Details:
- **Title:** Map Name.
- **Badge:** Type (Basemap / Overlay / Elevation).
- **Description:** Project name and file size.
- **URL Field:** The PMTiles source URL (green mono box).

## Implementation Detail
- **Logic:** Fetch `https://tiles.oe5ith.at/inventory.json`.
- **Grouping:** Sort maps by `project` or `type`.
- **Formatting:** Human-readable file sizes are already provided in the JSON (`size_str`).
- **Module Handoff:** In `InfoPage.ts`, when `subpath === 'inventory'`.

## Data Flow
1. User selects "Karten Inventar" in sidebar.
2. `renderInventoryModule` fetches the JSON.
3. Renders cards grouped by category.
4. Shows a technical summary (Total Layers, Total Fonts).
