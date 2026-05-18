# Ship Type Mapping Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken ship type mapping by introducing a centralized `ShipTypeMapper` for AIS and Inland AIS (ERIDM) codes and enriching tracking data with UI-ready properties.

**Architecture:** 
- Centralize logic in `ShipTypeMapper.ts`.
- Enrich GeoJSON features in `TrackingDataService.ts` with `ui_sprite`, `ui_class`, and `ui_color`.
- Simplify `TrackingMapLayers.ts` styles by using these enriched properties.
- Update `PopupManager.ts` to show readable class names.

**Tech Stack:** TypeScript, MapLibre GL, Vitest.

---

### Task 1: Create ShipTypeMapper Utility

**Files:**
- Create: `src/lib/ShipTypeMapper.ts`

- [ ] **Step 1: Create the ShipTypeMapper class**

```typescript
import { MAP_COLORS } from './MapStyles';

export class ShipTypeMapper {
  /**
   * Returns the sprite ID for a given AIS/ERIDM ship type code.
   */
  static getSprite(code: number | string | undefined): string {
    const n = typeof code === 'string' ? parseInt(code, 10) : (code || 0);
    
    // Inland AIS (ERIDM)
    if (n >= 8000 && n <= 8019) return 'ship-cargo';
    if (n >= 8020 && n <= 8029) return 'ship-tanker';
    if (n >= 8440 && n <= 8449) return 'ship-passenger';
    if (n >= 8210 && n <= 8229) return 'ship-cargo'; // Future: ship-tug
    if (n === 8430 || n === 8450) return 'ship-cargo'; // Future: ship-special
    
    // Standard AIS
    if (n >= 30 && n <= 39) return 'ship-small';
    if (n >= 50 && n <= 59) return 'ship-small'; // Future: ship-emergency
    if (n >= 70 && n <= 79) return 'ship-cargo';
    if (n >= 80 && n <= 89) return 'ship-tanker';
    if (n >= 60 && n <= 69) return 'ship-passenger';
    if (n === 90) return 'ship-buoy';

    return 'ship-unknown';
  }

  /**
   * Returns a human-readable class name.
   */
  static getClassName(code: number | string | undefined): string {
    const n = typeof code === 'string' ? parseInt(code, 10) : (code || 0);
    
    // Inland AIS
    if (n >= 8000 && n <= 8019) return 'Gütermotorschiff';
    if (n >= 8020 && n <= 8029) return 'Tankschiff';
    if (n >= 8440 && n <= 8449) return 'Fahrgastschiff';
    if (n >= 8210 && n <= 8229) return 'Schlepper/Schubboot';
    if (n === 8430) return 'Dienstfahrzeug';
    if (n === 8450) return 'Eisbrecher';
    
    // Standard AIS
    if (n >= 30 && n <= 39) return 'Sportboot';
    if (n >= 50 && n <= 59) return 'Behörde/SAR';
    if (n >= 70 && n <= 79) return 'Frachtschiff';
    if (n >= 80 && n <= 89) return 'Tanker';
    if (n >= 60 && n <= 69) return 'Passagierschiff';
    if (n === 90) return 'Seezeichen';

    return `Unbekannt (${n})`;
  }

  /**
   * Returns the color token for the UI.
   */
  static getColor(code: number | string | undefined): string {
    const n = typeof code === 'string' ? parseInt(code, 10) : (code || 0);
    
    if ((n >= 8020 && n <= 8029) || (n >= 80 && n <= 89) || (n >= 50 && n <= 59)) {
      return MAP_COLORS.danger;
    }
    if ((n >= 8440 && n <= 8449) || (n >= 60 && n <= 69)) {
      return MAP_COLORS.warning;
    }
    return MAP_COLORS.accent;
  }
}
```

- [ ] **Step 2: Commit utility**

```bash
git add src/lib/ShipTypeMapper.ts
git commit -m "feat(tracking): add ShipTypeMapper for AIS and ERIDM codes"
```

---

### Task 2: Verify ShipTypeMapper with Tests

**Files:**
- Create: `src/lib/ShipTypeMapper.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';
import { ShipTypeMapper } from './ShipTypeMapper';

describe('ShipTypeMapper', () => {
  it('should map Inland AIS cargo codes correctly', () => {
    expect(ShipTypeMapper.getSprite(8010)).toBe('ship-cargo');
    expect(ShipTypeMapper.getClassName(8010)).toBe('Gütermotorschiff');
  });

  it('should map Inland AIS passenger codes correctly', () => {
    expect(ShipTypeMapper.getSprite(8440)).toBe('ship-passenger');
    expect(ShipTypeMapper.getColor(8440)).toContain('warning');
  });

  it('should map standard AIS pleasure craft correctly', () => {
    expect(ShipTypeMapper.getSprite(37)).toBe('ship-small');
    expect(ShipTypeMapper.getClassName(37)).toBe('Sportboot');
  });

  it('should handle unknown codes gracefully', () => {
    expect(ShipTypeMapper.getSprite(9999)).toBe('ship-unknown');
    expect(ShipTypeMapper.getClassName(9999)).toContain('9999');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test src/lib/ShipTypeMapper.test.ts`
Expected: PASS

- [ ] **Step 3: Commit tests**

```bash
git add src/lib/ShipTypeMapper.test.ts
git commit -m "test(tracking): add unit tests for ShipTypeMapper"
```

---

### Task 3: Enrich Tracking Data in TrackingDataService

**Files:**
- Modify: `src/features/tracking/TrackingDataService.ts`

- [ ] **Step 1: Import Mapper and update getAisGeoJson**

```typescript
// Add import
import { ShipTypeMapper } from '../../lib/ShipTypeMapper';

// Update getAisGeoJson method
    private getAisGeoJson() {
        return {
            type: 'FeatureCollection',
            features: Array.from(this.vesselState.values())
                .filter(v => v.lat != null && v.lon != null)
                .map(v => {
                    const typeCode = v.shipType;
                    return {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [v.lon!, v.lat!] },
                        properties: {
                            mmsi: Number(v.id),
                            shipname: v.name,
                            callsign: v.callsign,
                            speed: v.speedKt,
                            cog: v.courseDeg,
                            heading: v.headingDeg,
                            shipclass: typeCode,
                            status: v.status,
                            seen: (Date.now() - new Date(v.lastSeen).getTime()) / 1000,
                            // ENRICHMENT
                            ui_sprite: ShipTypeMapper.getSprite(typeCode),
                            ui_class: ShipTypeMapper.getClassName(typeCode),
                            ui_color: ShipTypeMapper.getColor(typeCode)
                        }
                    };
                })
        };
    }
```

- [ ] **Step 2: Update emitData for aisItems**

```typescript
        const aisItems: TrackingItem[] = Array.from(this.vesselState.values()).map(v => ({
            id: v.id,
            label: v.name || v.callsign || `MMSI: ${v.id}`,
            info: `${v.speedKt || 0}kt | ${ShipTypeMapper.getClassName(v.shipType)}`,
            type: 'ais',
            lat: v.lat || 0,
            lon: v.lon || 0,
            details: {
                'MMSI': v.id,
                'Klasse': ShipTypeMapper.getClassName(v.shipType),
                'SOG': `${v.speedKt || 0} kt`,
                'COG': `${v.courseDeg || 0}°`,
                'Status': v.status ?? '?'
            }
        }));
```

- [ ] **Step 3: Commit changes**

```bash
git add src/features/tracking/TrackingDataService.ts
git commit -m "feat(tracking): enrich AIS GeoJSON and items with UI metadata"
```

---

### Task 4: Simplify Map Layers in TrackingMapLayers

**Files:**
- Modify: `src/features/tracking/TrackingMapLayers.ts`

- [ ] **Step 1: Update layer styles to use enriched properties**

```typescript
        // --- AIS DOTS & ICONS ---
        // Replace shipColorMatch with a direct property access
        const shipColorProp = ['get', 'ui_color'];

        // ... in ais-dots-moving paint ...
        'circle-color': shipColorProp,

        // ... in ais-dots-static paint ...
        'circle-color': shipColorProp,

        // ... in ais-icons layout ...
        'icon-image': ['get', 'ui_sprite'],
        
        // ... in ais-icons paint ...
        'icon-color': shipColorProp,
```

- [ ] **Step 2: Cleanup redundant constants**

Remove `const shipColorMatch: any = ...` line from `ensureLayers` method.

- [ ] **Step 3: Commit changes**

```bash
git add src/features/tracking/TrackingMapLayers.ts
git commit -m "style(tracking): use enriched properties for AIS layer styling"
```

---

### Task 4: Update PopupManager

**Files:**
- Modify: `src/lib/PopupManager.ts`

- [ ] **Step 1: Use ui_class for AIS popup**

```typescript
// ... in POPUP_CONFIGS['ais-icons'] ...
    'ais-icons': {
        title: (p) => (p.shipname as string) || (p.name as string) || `MMSI: ${p.mmsi}`,
        icon: 'fa-solid fa-ship',
        fields: [
            { key: 'mmsi', label: 'MMSI' },
            { key: 'ui_class', label: 'Klasse' }, // Use ui_class instead of formatting shipclass here
            { key: 'speed', label: 'Speed', format: (v) => v != null ? `${v} kn` : null },
            { key: 'cog', label: 'Course', format: (v) => v != null ? `${Math.round(v as number)}°` : null },
            { key: 'destination', label: 'Destination' }
        ]
    }
```

- [ ] **Step 2: Commit changes**

```bash
git add src/lib/PopupManager.ts
git commit -m "feat(tracking): use ui_class in AIS popups"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Verify whole flow**
Check `npm run build` and ensure no type errors.
Verify visually that ships now have correct icons and colors.
Check `CHANGELOG.md` and add entry.
Update `src/version.ts` if needed (from -dev to dev-2 or similar).

- [ ] **Step 2: Commit Final**
```bash
git add CHANGELOG.md src/version.ts
git commit -m "chore: finalize ship type mapping refinement"
```
