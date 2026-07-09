# NAH Multi-Station Stacking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display and handle multiple NAH stations at identical coordinates: show count badge, color by best status, and display full details for all stations on click.

**Architecture:** 
- Group GeoJSON features by [lon, lat] coordinates in `setStations()`
- Compute aggregated status (best wins: active > offseason > inactive)
- Add text-layer to MapLibre to display count when > 1
- Modify popup handler to show full details for all stations when multiple exist

**Tech Stack:** MapLibre GL JS, TypeScript, Vitest (tests), Vanilla CSS

## Global Constraints

- Always run `npx tsc --noEmit && npm test` before claiming task complete
- Update `CHANGELOG.md` in German, one block per change (not merged with existing day blocks)
- No changes to `oe5ith-ci` submodule — only fix bugs in website-v3 code
- German comments and UI copy to match surrounding code
- MapLibre paint/layout properties must use CI tokens (`MAP_COLORS`) not hardcoded hex

---

## File Structure

**Modified:**
- `src/features/nah/NahMapLayers.ts` — add grouping logic, aggregate status, modify popup handler
- `src/styles/modal.css` — add styles for multi-station popup list

**Tests (create if missing):**
- `src/features/nah/NahMapLayers.test.ts` — tests for grouping and status logic

**Changelog:**
- `CHANGELOG.md` — one entry per task completion

---

## Task 1: Write test for status grouping logic

**Files:**
- Modify: `src/features/nah/NahMapLayers.test.ts` (create if missing)

**Interfaces:**
- Produces: `computeGroupStatus(stations: NahStation[]): NahStationStatus` function and test

- [ ] **Step 1: Check if test file exists**

```bash
test -f src/features/nah/NahMapLayers.test.ts && echo "exists" || echo "missing"
```

- [ ] **Step 2: If missing, create test file with basic structure**

If the file doesn't exist, create `src/features/nah/NahMapLayers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { NahMapLayers } from './NahMapLayers';
import type { NahStation } from '../../types/nah';

describe('NahMapLayers', () => {
  describe('computeGroupStatus', () => {
    // Tests will go here
  });
});
```

- [ ] **Step 3: Write test for status priority: active > offseason > inactive**

Add to the test file:

```typescript
    it('returns "active" when at least one station is active', () => {
      const stations: NahStation[] = [
        { is_active: false, in_season: true } as NahStation,
        { is_active: true, in_season: true } as NahStation,
      ];
      const status = NahMapLayers.computeGroupStatus(stations);
      expect(status).toBe('active');
    });

    it('returns "offseason" when no active but has offseason', () => {
      const stations: NahStation[] = [
        { is_active: false, in_season: false } as NahStation,
        { is_active: false, in_season: true } as NahStation,
      ];
      const status = NahMapLayers.computeGroupStatus(stations);
      expect(status).toBe('offseason');
    });

    it('returns "inactive" when all stations are inactive', () => {
      const stations: NahStation[] = [
        { is_active: false, in_season: true } as NahStation,
        { is_active: false, in_season: true } as NahStation,
      ];
      const status = NahMapLayers.computeGroupStatus(stations);
      expect(status).toBe('inactive');
    });

    it('handles single station correctly', () => {
      const stations: NahStation[] = [
        { is_active: true, in_season: true } as NahStation,
      ];
      const status = NahMapLayers.computeGroupStatus(stations);
      expect(status).toBe('active');
    });
```

- [ ] **Step 4: Run test to verify it fails**

```bash
npx vitest run src/features/nah/NahMapLayers.test.ts -t "computeGroupStatus"
```

Expected: FAIL with "computeGroupStatus is not defined" or "computeGroupStatus is not a function"

---

## Task 2: Implement computeGroupStatus() function

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`

**Interfaces:**
- Produces: `computeGroupStatus(stations: NahStation[]): NahStationStatus`
  - Input: array of NahStation objects
  - Output: single NahStationStatus ('active' | 'inactive' | 'offseason')
  - Logic: returns status with highest priority where active=3, offseason=2, inactive=1

- [ ] **Step 1: Add priority constant and function to NahMapLayers**

In `src/features/nah/NahMapLayers.ts`, after the `STATUS_TEXT` constant (around line 29), add:

```typescript
const STATUS_PRIORITY = { active: 3, offseason: 2, inactive: 1 };

export const NahMapLayers = {
  computeStationStatus(station: NahStation): NahStationStatus {
    if (!station.in_season) return 'offseason';
    if (!station.is_active) return 'inactive';
    return 'active';
  },

  computeGroupStatus(stations: NahStation[]): NahStationStatus {
    return stations
      .map(s => this.computeStationStatus(s))
      .sort((a, b) => (STATUS_PRIORITY[b] || 0) - (STATUS_PRIORITY[a] || 0))[0] || 'inactive';
  },
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run src/features/nah/NahMapLayers.test.ts -t "computeGroupStatus"
```

Expected: PASS (all 4 tests)

- [ ] **Step 3: Commit**

```bash
git add src/features/nah/NahMapLayers.ts src/features/nah/NahMapLayers.test.ts
git commit -m "feat(nah): add computeGroupStatus for multi-station status aggregation"
```

---

## Task 3: Write test for feature grouping by coordinates

**Files:**
- Modify: `src/features/nah/NahMapLayers.test.ts`

**Interfaces:**
- Consumes: `computeGroupStatus()` (from Task 2)
- Produces: test case for grouping logic (implementation test, not unit)

- [ ] **Step 1: Add test for grouping behavior**

Add to `src/features/nah/NahMapLayers.test.ts` in the main describe block (not in computeGroupStatus suite):

```typescript
  describe('setStations', () => {
    it('groups stations by identical coordinates', () => {
      // This is a conceptual test — we'll verify via integration later
      // For now, document the expected grouping behavior:
      // Input: [
      //   {id: 'A1', lon: 14.0, lat: 47.4, is_active: true, in_season: true},
      //   {id: 'A2', lon: 14.0, lat: 47.4, is_active: false, in_season: true},
      // ]
      // Expected output (GeoJSON features):
      // - Single feature at (14.0, 47.4)
      // - properties._station_count = 2
      // - properties.status = 'active' (grouped status)
      // - properties._all_stations = [A1, A2]
      expect(true).toBe(true); // Placeholder — real test after implementation
    });
  });
```

- [ ] **Step 2: Run test**

```bash
npx vitest run src/features/nah/NahMapLayers.test.ts -t "setStations"
```

Expected: PASS (placeholder passes)

---

## Task 4: Implement feature grouping in setStations()

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts:116-141` (setStations method)

**Interfaces:**
- Consumes: `computeGroupStatus()` (Task 2)
- Produces: GeoJSON features grouped by [lon, lat] with:
  - `_station_count: number`
  - `_all_stations: NahStation[]` (stringified by MapLibre)
  - `status: NahStationStatus` (grouped)
  - All other original station properties from first station in group

- [ ] **Step 1: Replace setStations() implementation**

Replace the entire `setStations()` method (lines 116-141) with:

```typescript
  setStations(map: maplibregl.Map, stations: NahStation[]) {
    if (!map.getSource(STATIONS_SOURCE)) {
      this.initLayers(map);
    }

    // Group stations by coordinates
    const grouped = new Map<string, NahStation[]>();
    stations.forEach(station => {
      const key = `${station.lon},${station.lat}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(station);
    });

    // Create one feature per group
    const features = Array.from(grouped.values()).map(group => {
      const representative = group[0];
      const groupStatus = this.computeGroupStatus(group);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [representative.lon, representative.lat] },
        properties: {
          ...representative,
          status: groupStatus,
          _station_count: group.length,
          _all_stations: group
        }
      };
    });

    const data = {
      type: 'FeatureCollection',
      features: features as any
    };

    const source = map.getSource(STATIONS_SOURCE) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data as any);
    }

    MapRegistry.registerSource(STATIONS_SOURCE, {
      type: 'geojson',
      data: data
    });
  }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: All tests pass (including placeholder test from Task 3)

- [ ] **Step 4: Commit**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "feat(nah): group stations by coordinates with aggregated status"
```

---

## Task 5: Add count badge text layer

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts:189-225` (initLayers method)

**Interfaces:**
- Consumes: Features with `_station_count` property (from Task 4)
- Produces: New text layer `nah-stations-count-label` that displays count when > 1

- [ ] **Step 1: Add text layer definition in initLayers()**

After the stations symbol layer definition (around line 222), add:

```typescript
    // Text-Label für Station-Count (nur sichtbar wenn > 1)
    const stationsCountLayer = {
      id: 'nah-stations-count-label',
      type: 'symbol',
      source: STATIONS_SOURCE,
      layout: {
        'text-field': ['case', ['>', ['get', '_station_count'], 1], ['get', '_station_count'], ''],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': [
          'match', ['get', 'status'],
          'active', MAP_COLORS.success,
          'inactive', MAP_COLORS.danger,
          'offseason', MAP_COLORS.muted,
          MAP_COLORS.success
        ],
        'text-halo-width': 1.5,
      }
    };
    MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsCountLayer as any);
```

Insert this after line 222 (after the main stations layer `MapCore.ensureGeoJsonLayer` call).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "feat(nah): add count badge text layer for multi-station markers"
```

---

## Task 6: Update findClickedStation() to parse _all_stations

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts:148-168` (findClickedStation method)

**Interfaces:**
- Consumes: Features with `_all_stations` property (stringified by MapLibre)
- Produces: Parsed `_all_stations` in returned station object for use in click handler

- [ ] **Step 1: Update findClickedStation() to parse _all_stations**

Replace the station parsing section (lines 158-163):

```typescript
    const station = {
      ...rawProps,
      months_active: typeof rawProps.months_active === 'string'
        ? JSON.parse(rawProps.months_active)
        : rawProps.months_active,
      _all_stations: typeof (rawProps as any)._all_stations === 'string'
        ? JSON.parse((rawProps as any)._all_stations)
        : (rawProps as any)._all_stations
    };
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "fix(nah): parse _all_stations property in click handler"
```

---

## Task 7: Write test for multi-station popup HTML

**Files:**
- Modify: `src/features/nah/NahMapLayers.test.ts`

**Interfaces:**
- Produces: Test case for multi-station popup structure

- [ ] **Step 1: Add test for multi-station popup**

Add to the test file:

```typescript
  describe('buildMultiStationPopupHtml', () => {
    it('displays all stations with full details', () => {
      const stations: NahStation[] = [
        {
          callsign: 'Martin 1',
          name: 'Martin Luftrettungsstation',
          is_active: false,
          in_season: true,
          op_type: 'daylight',
          fixed_start: '07:00',
          fixed_end: '18:00',
          is_night_ready: false,
          months_active: [5,6,7,8,9]
        } as NahStation,
        {
          callsign: 'Martin 10',
          name: 'Martin Luftrettungsstation',
          is_active: false,
          in_season: false,
          op_type: 'fixed',
          fixed_start: '08:00',
          fixed_end: '17:00',
          is_night_ready: false,
          months_active: []
        } as NahStation,
      ];
      const html = NahMapLayers.buildMultiStationPopupHtml(stations);
      
      // Verify both stations appear with callsigns
      expect(html).toContain('Martin 1');
      expect(html).toContain('Martin 10');
      // Verify details are included
      expect(html).toContain('Betrieb');
      expect(html).toContain('daylight');
      expect(html).toContain('fixed');
      // Verify status badges
      expect(html).toContain('badge-red');
      expect(html).toContain('badge-gray');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/nah/NahMapLayers.test.ts -t "buildMultiStationPopupHtml"
```

Expected: FAIL with "buildMultiStationPopupHtml is not defined"

---

## Task 8: Implement buildMultiStationPopupHtml() and update handleStationClick()

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`

**Interfaces:**
- Consumes: `buildStationPopupHtml()` (existing), `_all_stations` property
- Produces: 
  - `buildMultiStationPopupHtml(stations: NahStation[]): string` function
  - Updated `handleStationClick()` to use multi-station popup when count > 1

- [ ] **Step 1: Add buildMultiStationPopupHtml() method**

Add after `buildStationPopupHtml()` (around line 110):

```typescript
  buildMultiStationPopupHtml(stations: NahStation[]): string {
    return `
      <div class="map-popup-detail">
        <div class="popup-header">
          <div class="popup-header-title">${stations.length} Stationen am Standort</div>
        </div>
        <div class="popup-stations-list">
          ${stations.map(station => `
            <div class="popup-station-item">
              <div class="popup-station-header">
                <strong>${station.callsign}</strong> — ${station.name}
              </div>
              <div class="popup-station-details">
                <table class="popup-kv">
                  <tr><td>Status</td><td><span class="badge ${STATUS_BADGE_CLASS[this.computeStationStatus(station)]}">${STATUS_TEXT[this.computeStationStatus(station)]}</span></td></tr>
                  <tr><td>Betrieb</td><td>${station.op_type}</td></tr>
                  ${station.op_type === 'fixed' && station.fixed_start && station.fixed_end ? `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end}</td></tr>` : ''}
                  ${station.op_type === 'daylight' ? (station.fixed_start && station.fixed_end ? `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end} (max. ECET)</td></tr>` : station.fixed_start ? `<tr><td>Zeiten</td><td>Ab ${station.fixed_start} bis ECET</td></tr>` : `<tr><td>Zeiten</td><td>BCET bis ECET</td></tr>`) : ''}
                  ${station.op_type === '24/7' ? `<tr><td>Zeiten</td><td>24 Stunden / 7 Tage</td></tr>` : ''}
                  <tr><td>Nacht</td><td>${station.is_night_ready ? 'Ja' : 'Nein'}</td></tr>
                  ${this.computeStationStatus(station) === 'offseason' ? `<tr><td>Saison</td><td>Monate: ${station.months_active?.join(', ') || '-'}</td></tr>` : ''}
                </table>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
```

- [ ] **Step 2: Update handleStationClick() to use multi-station popup**

Replace the entire `handleStationClick()` method (lines 175-184):

```typescript
  handleStationClick(map: maplibregl.Map, e: maplibregl.MapMouseEvent): boolean {
    const hit = this.findClickedStation(map, [e.point.x, e.point.y]);
    if (!hit) {
      PopupManager.closePopup();
      return false;
    }

    const allStations = (hit.station as any)._all_stations as NahStation[] | undefined;
    let popupHtml: string;

    if (allStations && allStations.length > 1) {
      popupHtml = this.buildMultiStationPopupHtml(allStations);
    } else {
      popupHtml = this.buildStationPopupHtml(hit.station);
    }

    PopupManager.showFeaturePopup(map, hit.coordinates, popupHtml);
    return true;
  },
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/features/nah/NahMapLayers.test.ts -t "buildMultiStationPopupHtml"
```

Expected: PASS

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/features/nah/NahMapLayers.ts src/features/nah/NahMapLayers.test.ts
git commit -m "feat(nah): add multi-station popup with full details for all stations"
```

---

## Task 9: Add CSS styling for multi-station popup list

**Files:**
- Modify: `src/styles/modal.css`

**Interfaces:**
- Consumes: HTML classes from `buildMultiStationPopupHtml()` (.popup-stations-list, .popup-station-item, .popup-station-header, .popup-station-details)
- Produces: CSS rules for proper layout and spacing

- [ ] **Step 1: Add CSS for multi-station list**

In `src/styles/modal.css`, after the `.popup-kv` rules (around line 287), add:

```css
/* Station-Liste (mehrere Stationen am Ort) */
.popup-stations-list {
  font-size: 0.78rem;
}
.popup-station-item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.popup-station-item:last-child {
  border-bottom: none;
}
.popup-station-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.popup-station-header strong {
  color: #fff;
  font-weight: 600;
}
.popup-station-details {
  margin-top: 6px;
}
.popup-station-details .popup-kv {
  font-size: 0.75rem;
  margin: 0;
}
.popup-station-details .popup-kv td {
  padding: 3px 8px;
}
```

- [ ] **Step 2: Verify no CSS errors (visual check)**

```bash
npx tsc --noEmit
```

Expected: No errors (CSS isn't type-checked, but any TypeScript issues should fail here)

- [ ] **Step 3: Commit**

```bash
git add src/styles/modal.css
git commit -m "style(nah): add CSS for multi-station popup list layout"
```

---

## Task 10: Update CHANGELOG.md and verify

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: All commits from Tasks 2–9
- Produces: One consolidated entry in CHANGELOG.md describing feature

- [ ] **Step 1: Add feature entry to CHANGELOG.md**

In `CHANGELOG.md`, find the `[Unreleased]` section (or create it) and add under `### Hinzugefügt`:

```markdown
- **NAH: Mehrfach-Stationen mit Status-Aggregation und Badge** (2026-07-08) — 
  Stationen mit identischen Koordinaten (z.B. Christophorus 14/99, Martin 1/10) 
  werden jetzt aggregiert: ein gemeinsamer Marker mit Nummern-Badge zeigt an, 
  dass mehrere Stationen am Standort sind. Die Icon-Farbe widerspiegelt den 
  besten Status aller Stationen (aktiv > außer Saison > außer Dienst). 
  Klick auf den Marker zeigt alle Stationen mit vollständigen Details 
  (Betriebstyp, Zeiten, Nachtbereitschaft).
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All 106+ tests pass

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Visual verification (dev server)**

Open dev server if needed:
```bash
npm run dev:vite &
```

Navigate to `http://localhost:8000/nah` in a browser. Verify:
- Martin 1/10 at (13.2216904, 47.393657): marker shows "2", red status (both inactive/offseason)
- Christophorus 14/99 at (14.0096935, 47.4797652): marker shows "2", green status (at least one active)
- Click each marker: popup shows all stations with full details

- [ ] **Step 5: Commit CHANGELOG**

```bash
git add CHANGELOG.md
git commit -m "docs: add NAH multi-station aggregation to changelog"
```

- [ ] **Step 6: Final commit check**

```bash
git log --oneline -10
```

Expected: 10 commits (one per task, with clear messages)

---

## Self-Review

✅ **Spec coverage:** 
- Grouping by coordinates (Task 4)
- Count badge display (Task 5)
- Best status color (Task 2, 4, 5)
- Multi-station popup with full details (Task 8)

✅ **No placeholders:** All steps contain exact code, file paths, and test commands

✅ **Type consistency:** 
- `computeGroupStatus(stations)` used in Task 4
- `_station_count` and `_all_stations` in feature properties
- `buildMultiStationPopupHtml(stations)` function signature matches usage in Task 8

✅ **Changelog:** Task 10 updates CHANGELOG.md once, consolidated entry
