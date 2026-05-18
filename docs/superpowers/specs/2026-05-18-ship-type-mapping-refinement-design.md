# Design Spec: Ship Type Mapping Refinement (ERIDM & AIS)

**Date:** 2026-05-18
**Status:** Draft
**Topic:** Fixing broken ship icon assignment and implementing Inland AIS (ERIDM) support.

## 1. Objective
The current ship type mapping is limited to a few legacy AIS codes. The new Tracking Gateway provides Inland AIS (ERIDM) codes (4-digit) which are currently not mapped, leading to fallback "unknown" icons and unreadable class names in popups. This spec introduces a centralized `ShipTypeMapper` to handle both standard and Inland AIS codes.

## 2. Architecture

### 2.1 Centralized Mapper (`src/lib/ShipTypeMapper.ts`)
A new utility class will act as the single source of truth for:
- Mapping codes (AIS/ERIDM) to sprite IDs.
- Mapping codes to human-readable names.
- Mapping codes to UI colors (using `MAP_COLORS`).

### 2.2 Data Enrichment (`TrackingDataService.ts`)
The service will enrich the GeoJSON features with UI-specific properties before sending them to the map.
- `ui_sprite`: The ID of the sprite to use.
- `ui_class`: The human-readable class name.
- `ui_color`: The color token for icons and circles.

### 2.3 Simplified Styling (`TrackingMapLayers.ts`)
Map layers will use the enriched properties directly, removing complex `match` expressions from the style definition.

## 3. Mapping Logic

| Range / Code | Description | Current Sprite | Future Sprite (Planned) | Color Token |
| :--- | :--- | :--- | :--- | :--- |
| **8000 - 8019** | Cargo / Freight | `ship-cargo` | `ship-cargo` | `accent` |
| **8020 - 8029** | Tankers | `ship-tanker` | `ship-tanker` | `danger` |
| **8440 - 8449** | Passenger Ships | `ship-passenger` | `ship-passenger` | `warning` |
| **8210 - 8229** | Tugs / Pushers | `ship-cargo` | `ship-tug` | `accent` |
| **8430, 8450** | Service / Icebreaker | `ship-cargo` | `ship-special` | `accent` |
| **30 - 39** | Pleasure Craft | `ship-small` | `ship-small` | `accent` |
| **50 - 59** | Search & Rescue / Pilot | `ship-small` | `ship-emergency` | `danger` |
| **Default** | Unknown | `ship-unknown` | `ship-unknown` | `accent` |

## 4. Implementation Details

### 4.1 ShipTypeMapper Class
```typescript
export class ShipTypeMapper {
  static getSprite(code: number): string;
  static getClassName(code: number): string;
  static getColor(code: number): string;
}
```

### 4.2 GeoJSON Properties
Features in the `ais` source will include:
- `ui_sprite`: e.g. "ship-cargo"
- `ui_class`: e.g. "Gütermotorschiff"
- `ui_color`: e.g. "var(--color-accent)" (resolved via MapStyles)

## 5. Testing & Validation
- **Unit Tests**: Test `ShipTypeMapper` with various codes (8010, 8025, 37, unknown).
- **Manual Verification**: Verify on map that different vessel types show correct icons and colors.
- **Popup Verification**: Ensure popups show readable names instead of numeric codes.

## 6. Future Extensions
- Add `ship-tug` icon to the sprite set.
- Add `ship-emergency` (SAR) icon.
- Add `ship-special` for service vessels.
