# NAH DOM-Marker → Symbol-Layer Migration (U5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the NAH station `maplibregl.Marker` DOM markers with a MapLibre symbol layer, fixing the two documented inline-`style="color:…"` CI violations along the way.

**Architecture:** `NahMapLayers.ts` gains a data-driven `nah-stations` GeoJSON source + symbol layer (icon-color per computed status), a runtime-rendered SDF helicopter icon (no new external sprite dependency), and click/hover handling mirroring `TrackingMapLayers`'s established pattern. `NahPageController` swaps its DOM-marker bookkeeping for calls into the new methods.

**Tech Stack:** TypeScript, MapLibre GL JS, Vitest.

**Spec:** [docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md](../specs/2026-07-06-nah-symbol-layer-migration-design.md)

## Global Constraints

- Run `npx tsc --noEmit && npm test` before considering any task done (CLAUDE.md → Commands).
- No hardcoded colors — use `MAP_COLORS` getters (`src/lib/MapStyles.ts`), never raw hex.
- No `style="..."` in dynamically generated HTML strings unless the value is only computable at runtime from a JS event/measurement (`oe5ith-ci/docs/for-coding-agents.md` JS-Regeln) — colors are **not** such a case; use existing CI badge classes (`badge`, `badge-green`, `badge-red`, `badge-gray`) instead.
- Reuse existing CI components/patterns; do not invent new classes when one already fits (`oe5ith-ci/docs/for-coding-agents.md` Grundsatz).
- Code comments and UI copy stay German, matching the surrounding file.
- Stage files explicitly in commits (`git add <file> <file>`), never `git add -A`.

---

## File Structure

- **Modify `src/features/nah/NahMapLayers.ts`** — adds: `NahStationStatus` type, `computeStationStatus`, `buildStationPopupHtml`, `setStations`, `findClickedStation`, `handleStationClick`, the `nah-stations` source/layer wiring in `initLayers`, and the private `ensureHeliIcon`/`attachStationHoverCursor` helpers. Removes: `renderMarkers` (Task 7, once its only caller is migrated).
- **Modify `src/pages/NahPage.ts`** — removes the `stationMarkers` field and its DOM-marker cleanup, swaps `renderMarkers` for `setStations`, and routes `handleMapClick` through `NahMapLayers.handleStationClick` before falling back to the existing incident-calculation flow.
- **New test file `src/features/nah/NahMapLayers.test.ts`** — unit tests for the four pure/mockable pieces (`computeStationStatus`, `buildStationPopupHtml`, `setStations`, `findClickedStation`). Built up incrementally across Tasks 1, 2, 4, 5.

**Deliberately not unit-tested** (consistent with existing precedent in this codebase — `TrackingMapLayers` and `MapCore.loadSprites` are equally untested for their DOM/canvas/network-coupled logic, since this repo's Vitest setup runs in a plain Node environment with no `jsdom`/canvas shim): `ensureHeliIcon` (real `<canvas>`/`document.fonts`), `attachStationHoverCursor` (real `map.on`/DOM cursor), `handleStationClick`'s `maplibregl.Popup` side effect. These are verified manually in Task 8's browser checklist.

The spec's testing section also calls for a "click on station vs. click on empty map" dispatch test. The actual decision logic (does this click hit a station?) is the part covered by the `findClickedStation` unit tests (Task 5) — that's the only non-trivial branching. `NahPageController.handleMapClick`'s two-line `if (NahMapLayers.handleStationClick(...)) return;` wiring is not unit-tested: no `NahPageController`/`TrackingPageController`-level test file exists anywhere in this codebase for click handlers, and testing it here would mean introducing new page-controller test infrastructure (mocking the data service, sidebar DOM, and the module-level `NahMapLayers` import) for a two-line conditional. It's covered by Task 8's manual checklist (step 2.3) instead.

---

### Task 1: `computeStationStatus`

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`
- Test: `src/features/nah/NahMapLayers.test.ts` (create)

**Interfaces:**
- Produces: `NahMapLayers.computeStationStatus(station: NahStation): NahStationStatus`, exported type `NahStationStatus = 'active' | 'inactive' | 'offseason'`. Later tasks (2, 4, 5) call this.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { NahMapLayers } from './NahMapLayers';
import { NahStation } from '../../types/nah';

function makeStation(overrides: Partial<NahStation> = {}): NahStation {
  return {
    name: 'Christophorus 3',
    callsign: 'Christophorus 3',
    region: 'OÖ',
    op_type: 'daylight',
    is_active: true,
    in_season: true,
    is_night_ready: false,
    lat: 48.3,
    lon: 14.28,
    ...overrides
  };
}

describe('NahMapLayers.computeStationStatus', () => {
  it('returns "active" when in season and active', () => {
    expect(NahMapLayers.computeStationStatus(makeStation())).toBe('active');
  });

  it('returns "inactive" when in season but not active', () => {
    expect(NahMapLayers.computeStationStatus(makeStation({ is_active: false }))).toBe('inactive');
  });

  it('returns "offseason" when not in season, regardless of is_active', () => {
    expect(NahMapLayers.computeStationStatus(makeStation({ in_season: false, is_active: true }))).toBe('offseason');
    expect(NahMapLayers.computeStationStatus(makeStation({ in_season: false, is_active: false }))).toBe('offseason');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: FAIL — `NahMapLayers.computeStationStatus is not a function`

- [ ] **Step 3: Implement `computeStationStatus`**

In `src/features/nah/NahMapLayers.ts`, add the exported type above the `NahMapLayers` object (after the existing `const TARGET_PIN_LAYER = ...;` line):

```ts
export type NahStationStatus = 'active' | 'inactive' | 'offseason';
```

Add the method as the first property inside the `export const NahMapLayers = { ... }` object literal (before `initLayers`):

```ts
  computeStationStatus(station: NahStation): NahStationStatus {
    if (!station.in_season) return 'offseason';
    if (!station.is_active) return 'inactive';
    return 'active';
  },

```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/nah/NahMapLayers.ts src/features/nah/NahMapLayers.test.ts
git commit -m "feat(nah): compute station status for future symbol-layer icon/popup"
```

---

### Task 2: `buildStationPopupHtml` (CI-Fix: badge classes instead of inline color)

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`
- Modify: `src/features/nah/NahMapLayers.test.ts`

**Interfaces:**
- Consumes: `NahMapLayers.computeStationStatus` (Task 1).
- Produces: `NahMapLayers.buildStationPopupHtml(station: NahStation): string`. Consumed by `handleStationClick` (Task 6).

- [ ] **Step 1: Write the failing tests**

Append to `src/features/nah/NahMapLayers.test.ts`:

```ts
describe('NahMapLayers.buildStationPopupHtml', () => {
  it('renders the active badge and station header', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ callsign: 'Christophorus 3', name: 'ÖAMTC Flugrettung' }));
    expect(html).toContain('Christophorus 3');
    expect(html).toContain('ÖAMTC Flugrettung');
    expect(html).toContain('badge badge-green');
    expect(html).toContain('EINSATZBEREIT');
  });

  it('renders the inactive badge for stations outside operating hours', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ is_active: false }));
    expect(html).toContain('badge badge-red');
    expect(html).toContain('AUSSER DIENST (Betriebszeit)');
  });

  it('renders the offseason badge and season row for out-of-season stations', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ in_season: false, months_active: [4, 5, 6] }));
    expect(html).toContain('badge badge-gray');
    expect(html).toContain('AUSSER SAISON');
    expect(html).toContain('Monate: 4, 5, 6');
  });

  it('never uses an inline color style (CI-Konformität)', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation());
    expect(html).not.toMatch(/style="color:/);
  });

  it('renders fixed hours when op_type is "fixed"', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ op_type: 'fixed', fixed_start: '08:00', fixed_end: '20:00' }));
    expect(html).toContain('08:00 - 20:00');
  });

  it('renders "BCET bis ECET" for daylight stations without fixed times', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ op_type: 'daylight', fixed_start: null, fixed_end: null }));
    expect(html).toContain('BCET bis ECET');
  });

  it('renders 24/7 hours', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ op_type: '24/7' }));
    expect(html).toContain('24 Stunden / 7 Tage');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: FAIL — `NahMapLayers.buildStationPopupHtml is not a function`

- [ ] **Step 3: Implement `buildStationPopupHtml`**

Add these two lookup tables above `export const NahMapLayers = {` (after the `NahStationStatus` type from Task 1):

```ts
const STATUS_BADGE_CLASS: Record<NahStationStatus, string> = {
  active: 'badge-green',
  inactive: 'badge-red',
  offseason: 'badge-gray',
};

const STATUS_TEXT: Record<NahStationStatus, string> = {
  active: 'EINSATZBEREIT',
  inactive: 'AUSSER DIENST (Betriebszeit)',
  offseason: 'AUSSER SAISON',
};
```

Add the method inside `NahMapLayers`, right after `computeStationStatus`:

```ts
  buildStationPopupHtml(station: NahStation): string {
    const status = this.computeStationStatus(station);
    const badgeClass = STATUS_BADGE_CLASS[status];
    const statusText = STATUS_TEXT[status];

    let hoursHtml = '';
    if (station.op_type === 'fixed' && station.fixed_start && station.fixed_end) {
      hoursHtml = `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end}</td></tr>`;
    } else if (station.op_type === 'daylight') {
      if (station.fixed_start && station.fixed_end) {
        hoursHtml = `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end} (max. ECET)</td></tr>`;
      } else if (station.fixed_start) {
        hoursHtml = `<tr><td>Zeiten</td><td>Ab ${station.fixed_start} bis ECET</td></tr>`;
      } else {
        hoursHtml = `<tr><td>Zeiten</td><td>BCET bis ECET</td></tr>`;
      }
    } else if (station.op_type === '24/7') {
      hoursHtml = `<tr><td>Zeiten</td><td>24 Stunden / 7 Tage</td></tr>`;
    }

    return `
      <div class="map-popup-detail">
        <div class="popup-header">
          <div class="popup-header-title">${station.callsign}</div>
          <div class="popup-header-org">${station.name}</div>
        </div>
        <table class="popup-kv">
          <tr><td>Status</td><td><span class="badge ${badgeClass}">${statusText}</span></td></tr>
          <tr><td>Betrieb</td><td>${station.op_type}</td></tr>
          ${hoursHtml}
          <tr><td>Nacht</td><td>${station.is_night_ready ? 'Ja' : 'Nein'}</td></tr>
          ${status === 'offseason' ? `<tr><td>Saison</td><td>Monate: ${station.months_active?.join(', ') || '-'}</td></tr>` : ''}
        </table>
      </div>
    `;
  },

```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: PASS (10 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/features/nah/NahMapLayers.ts src/features/nah/NahMapLayers.test.ts
git commit -m "fix(nah): popup status via CI badge classes instead of inline color style"
```

---

### Task 3: Heli icon + `nah-stations` layer wiring in `initLayers`

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`

**Interfaces:**
- Produces: constants `STATIONS_SOURCE = 'nah-stations'`, `STATIONS_LAYER = 'nah-stations-layer'`, `HELI_ICON_ID = 'nah-heli-icon'`. Consumed by `setStations` (Task 4) and `findClickedStation`/`handleStationClick` (Tasks 5–6).

No automated test for this task — `ensureHeliIcon` needs a real `<canvas>` and `document.fonts`, `attachStationHoverCursor` needs a real `map.on`/`getCanvas`. This repo's Vitest runs in plain Node (no `jsdom`), and this matches existing precedent: `TrackingMapLayers`'s hover-cursor logic and `MapCore.loadSprites` are equally untested for the same reason. Verified manually in Task 8.

- [ ] **Step 1: Add constants and helpers**

Add below the existing `TARGET_PIN_LAYER` constant in `src/features/nah/NahMapLayers.ts`:

```ts
const STATIONS_SOURCE = 'nah-stations';
const STATIONS_LAYER = 'nah-stations-layer';
const HELI_ICON_ID = 'nah-heli-icon';
const HELI_ICON_SIZE = 64;
```

Add these module-level helpers after the `STATUS_TEXT` lookup table (from Task 2), before `export const NahMapLayers = {`:

```ts
// WeakSet statt Boolean-Flag: initLayers() läuft bei jedem Basemap-Wechsel erneut für
// dieselbe Map-Instanz (Guard nötig), aber NahPageController erzeugt bei jedem Seitenbesuch
// eine neue Map-Instanz (kein Guard gewünscht, sonst blieben Hover-Listener nach einem
// Seitenwechsel für die neue Instanz fälschlich deaktiviert). Ein WeakSet trackt das korrekt
// pro Instanz, ohne dass destroy() den Zustand manuell zurücksetzen müsste.
const _stationHoverAttached = new WeakSet<maplibregl.Map>();
function attachStationHoverCursor(map: maplibregl.Map) {
  if (_stationHoverAttached.has(map)) return;
  _stationHoverAttached.add(map);
  map.on('mouseenter', STATIONS_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', STATIONS_LAYER, () => { map.getCanvas().style.cursor = ''; });
}

// Rendert das fa-helicopter-Glyph (Font Awesome 7 Free, solid, ) einmalig auf einen
// Canvas und registriert es als SDF-Icon. Es gibt kein einfärbbares Helikopter-Icon im
// oe5ith-markers Sprite-Set (nur nicht-SDF Betreiber-Logos, siehe ROADMAP.md); dieser Weg
// vermeidet eine externe Sprite-Server-Abhängigkeit für ein einzelnes generisches Icon.
async function ensureHeliIcon(map: maplibregl.Map): Promise<void> {
  if (map.hasImage(HELI_ICON_ID)) return;

  try {
    await document.fonts.load(`900 ${HELI_ICON_SIZE}px "Font Awesome 7 Free"`);
  } catch (e) {
    console.warn('[NahMapLayers] Font Awesome Font konnte nicht vorab geladen werden', e);
  }

  if (map.hasImage(HELI_ICON_ID)) return;

  const canvas = document.createElement('canvas');
  canvas.width = HELI_ICON_SIZE;
  canvas.height = HELI_ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.font = `900 ${Math.round(HELI_ICON_SIZE * 0.85)}px "Font Awesome 7 Free"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.fillText('', HELI_ICON_SIZE / 2, HELI_ICON_SIZE / 2 + HELI_ICON_SIZE * 0.03);

  try {
    const imageData = ctx.getImageData(0, 0, HELI_ICON_SIZE, HELI_ICON_SIZE);
    if (!map.hasImage(HELI_ICON_ID)) {
      map.addImage(HELI_ICON_ID, imageData, { sdf: true });
    }
  } catch (e) {
    console.error('[NahMapLayers] Konnte Helikopter-Icon nicht registrieren', e);
  }
}
```

- [ ] **Step 2: Wire the stations layer into `initLayers`**

In `initLayers`, right after the existing `MapRegistry.registerImage('oe5ith-markers', SPRITE_BASE);` line, add:

```ts
    void ensureHeliIcon(map);
```

Then, right after the existing target-pin block (`MapCore.ensureGeoJsonLayer(map, TARGET_PIN_SOURCE, targetPinLayerDef);`) and before the `const sourceId = 'nah-lines';` line, add:

```ts
    // NAH-Stationen (Symbol-Layer statt DOM-Marker; siehe
    // docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md)
    const stationsLayerDef = {
      id: STATIONS_LAYER,
      type: 'symbol',
      source: STATIONS_SOURCE,
      layout: {
        'icon-image': HELI_ICON_ID,
        'icon-size': 0.5,
        'icon-allow-overlap': true,
      },
      paint: {
        'icon-color': [
          'match', ['get', 'status'],
          'active', MAP_COLORS.success,
          'inactive', MAP_COLORS.danger,
          'offseason', MAP_COLORS.muted,
          MAP_COLORS.success
        ]
      }
    };
    MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsLayerDef as any);
    attachStationHoverCursor(map);
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no output (success)

- [ ] **Step 4: Commit**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "feat(nah): register nah-stations symbol layer with runtime-rendered SDF icon"
```

---

### Task 4: `setStations`

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`
- Modify: `src/features/nah/NahMapLayers.test.ts`

**Interfaces:**
- Consumes: `STATIONS_SOURCE` (Task 3), `computeStationStatus` (Task 1).
- Produces: `NahMapLayers.setStations(map: maplibregl.Map, stations: NahStation[]): void`. Consumed by `NahPageController` (Task 7).

- [ ] **Step 1: Write the failing tests**

Append to `src/features/nah/NahMapLayers.test.ts` (add `MapRegistry` to the existing import block from `'../../lib/MapRegistry'`):

```ts
import { MapRegistry } from '../../lib/MapRegistry';

describe('NahMapLayers.setStations', () => {
  function mockMapWithSource() {
    const calls: unknown[] = [];
    const map = {
      getSource: () => ({ setData: (data: unknown) => calls.push(data) }),
    } as any;
    return { map, calls };
  }

  it('writes a FeatureCollection with a computed status property per station', () => {
    const { map, calls } = mockMapWithSource();
    const station = makeStation({ lon: 14.28, lat: 48.3 });

    NahMapLayers.setStations(map, [station]);

    expect(calls).toHaveLength(1);
    const data = calls[0] as any;
    expect(data.type).toBe('FeatureCollection');
    expect(data.features).toHaveLength(1);
    expect(data.features[0].geometry).toEqual({ type: 'Point', coordinates: [14.28, 48.3] });
    expect(data.features[0].properties.status).toBe('active');
    expect(data.features[0].properties.callsign).toBe(station.callsign);
  });

  it('registers the data in MapRegistry for restore-after-basemap-switch', () => {
    const { map } = mockMapWithSource();
    NahMapLayers.setStations(map, [makeStation()]);

    const registered = MapRegistry.getSource('nah-stations');
    expect(registered?.definition.data.features).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: FAIL — `NahMapLayers.setStations is not a function`

- [ ] **Step 3: Implement `setStations`**

Add inside `NahMapLayers`, after `buildStationPopupHtml`:

```ts
  /**
   * Renders the NAH stations as a data-driven symbol layer (replaces the former
   * per-station maplibregl.Marker approach).
   */
  setStations(map: maplibregl.Map, stations: NahStation[]) {
    if (!map.getSource(STATIONS_SOURCE)) {
      this.initLayers(map);
    }

    const features = stations.map((station) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [station.lon, station.lat] },
      properties: { ...station, status: this.computeStationStatus(station) }
    }));

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
  },

```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: PASS (12 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/features/nah/NahMapLayers.ts src/features/nah/NahMapLayers.test.ts
git commit -m "feat(nah): setStations writes station data onto the symbol layer"
```

---

### Task 5: `findClickedStation`

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`
- Modify: `src/features/nah/NahMapLayers.test.ts`

**Interfaces:**
- Consumes: `STATIONS_LAYER` (Task 3).
- Produces: `NahMapLayers.findClickedStation(map: maplibregl.Map, point: [number, number]): { station: NahStation & { status: NahStationStatus }; coordinates: [number, number] } | null`. Consumed by `handleStationClick` (Task 6).

- [ ] **Step 1: Write the failing tests**

Append to `src/features/nah/NahMapLayers.test.ts`:

```ts
describe('NahMapLayers.findClickedStation', () => {
  function mockMap(features: unknown[]) {
    return { queryRenderedFeatures: () => features } as any;
  }

  it('returns null when no station feature is hit', () => {
    const map = mockMap([]);
    expect(NahMapLayers.findClickedStation(map, [10, 10])).toBeNull();
  });

  it('returns the station properties and coordinates of the first hit feature', () => {
    const props = { name: 'Christophorus 3', callsign: 'C3', status: 'active' };
    const map = mockMap([{ properties: props, geometry: { type: 'Point', coordinates: [14.1, 48.2] } }]);

    const hit = NahMapLayers.findClickedStation(map, [10, 10]);

    expect(hit?.station).toEqual(props);
    expect(hit?.coordinates).toEqual([14.1, 48.2]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: FAIL — `NahMapLayers.findClickedStation is not a function`

- [ ] **Step 3: Implement `findClickedStation`**

Add inside `NahMapLayers`, after `setStations`:

```ts
  /**
   * Looks up the station (if any) hit by a map click, for use in the page's central
   * click handler (queryRenderedFeatures, analogous to TrackingMapLayers.handleMapClick).
   */
  findClickedStation(map: maplibregl.Map, point: [number, number]): { station: NahStation & { status: NahStationStatus }; coordinates: [number, number] } | null {
    const features = map.queryRenderedFeatures(point, { layers: [STATIONS_LAYER] });
    if (features.length === 0) return null;

    const feat = features[0];
    const coordinates = (feat.geometry as any).coordinates as [number, number];
    return {
      station: feat.properties as NahStation & { status: NahStationStatus },
      coordinates
    };
  },

```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: PASS (14 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/features/nah/NahMapLayers.ts src/features/nah/NahMapLayers.test.ts
git commit -m "feat(nah): findClickedStation resolves a map click against the stations layer"
```

---

### Task 6: `handleStationClick`

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`

**Interfaces:**
- Consumes: `findClickedStation` (Task 5), `buildStationPopupHtml` (Task 2).
- Produces: `NahMapLayers.handleStationClick(map: maplibregl.Map, e: maplibregl.MapMouseEvent): boolean`. Consumed by `NahPageController.handleMapClick` (Task 7).

No automated test — constructing `maplibregl.Popup` requires a real DOM, unavailable in this repo's Node-based Vitest setup (same reason `TrackingMapLayers.handleMapClick`, which does the equivalent thing for ADS-B/AIS, has no test either). Verified manually in Task 8.

- [ ] **Step 1: Add the popup singleton**

Add after the `_stationHoverAttached` WeakSet from Task 3 (before `ensureHeliIcon`):

```ts
// Ein Popup wird für alle Stationsklicks wiederverwendet (analog TrackingMapLayers),
// statt pro Station ein eigenes Popup zu halten wie bei den früheren DOM-Markern.
let _stationPopup: maplibregl.Popup | null = null;
function getStationPopup(): maplibregl.Popup {
  if (!_stationPopup) {
    _stationPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' });
  }
  return _stationPopup;
}
```

- [ ] **Step 2: Implement `handleStationClick`**

Add inside `NahMapLayers`, after `findClickedStation`:

```ts
  /**
   * Handles a map click against the stations layer: shows the station popup and
   * returns true if a station was hit, false otherwise (caller falls back to its
   * own click behaviour, e.g. NahPageController's incident calculation).
   */
  handleStationClick(map: maplibregl.Map, e: maplibregl.MapMouseEvent): boolean {
    const hit = this.findClickedStation(map, [e.point.x, e.point.y]);
    if (!hit) return false;

    const html = this.buildStationPopupHtml(hit.station);
    getStationPopup().setLngLat(hit.coordinates).setHTML(html).addTo(map);
    return true;
  },

```

- [ ] **Step 3: Verify no type errors and existing tests still pass**

Run: `npx tsc --noEmit && npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: no type errors; 14 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "feat(nah): handleStationClick shows the station popup on symbol-layer click"
```

---

### Task 7: `NahPageController` integration + remove `renderMarkers`

**Files:**
- Modify: `src/pages/NahPage.ts`
- Modify: `src/features/nah/NahMapLayers.ts`

**Interfaces:**
- Consumes: `NahMapLayers.setStations` (Task 4), `NahMapLayers.handleStationClick` (Task 6).

- [ ] **Step 1: Remove the `stationMarkers` field**

In `src/pages/NahPage.ts`, remove this line from the class body:

```ts
  private stationMarkers: maplibregl.Marker[] = [];
```

- [ ] **Step 2: Swap `renderMarkers` for `setStations` in the data callback**

Replace:

```ts
        (stations) => {
          if (!this.map) return;
          this.stationMarkers.forEach(m => m.remove());
          this.stationMarkers = NahMapLayers.renderMarkers(this.map, stations);
          
          if (stations.length > 0) {
```

with:

```ts
        (stations) => {
          if (!this.map) return;
          NahMapLayers.setStations(this.map, stations);

          if (stations.length > 0) {
```

- [ ] **Step 3: Remove the DOM-marker cleanup from `destroy()`**

Replace:

```ts
  public destroy(): void {
    super.destroy();
    
    // Data service is automatically stopped via AbortSignal in its constructor
    
    this.stationMarkers.forEach(m => m.remove());
    this.stationMarkers = [];

    if (this.map) {
      NahMapLayers.clearTargetPin(this.map);
    }
```

with:

```ts
  public destroy(): void {
    super.destroy();
    
    // Data service is automatically stopped via AbortSignal in its constructor

    if (this.map) {
      NahMapLayers.clearTargetPin(this.map);
    }
```

- [ ] **Step 4: Route clicks through `handleStationClick` first**

Replace:

```ts
  private handleMapClick = (e: maplibregl.MapMouseEvent) => {
    if (!this.map || !this.sidebarResults) return;
    
    // Ignore clicks on markers
    if ((e.originalEvent.target as HTMLElement).closest('.maplibregl-marker')) {
      return;
    }

    const { lng, lat } = e.lngLat;
    this.performCalculation(this.map, this.sidebarResults, lng, lat);
  };
```

with:

```ts
  private handleMapClick = (e: maplibregl.MapMouseEvent) => {
    if (!this.map || !this.sidebarResults) return;

    if (NahMapLayers.handleStationClick(this.map, e)) {
      return;
    }

    const { lng, lat } = e.lngLat;
    this.performCalculation(this.map, this.sidebarResults, lng, lat);
  };
```

- [ ] **Step 5: Remove the now-dead `renderMarkers` method**

In `src/features/nah/NahMapLayers.ts`, delete the entire `renderMarkers` method (from `/**\n   * Renders markers for the given NAH stations.\n   */` through its closing `},`), including the `maplibregl.Marker[]` return type. Nothing else in the codebase calls it after Step 2.

- [ ] **Step 6: Full verification**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; full suite passes (note the exact pass count printed — you'll need it for Task 8's changelog entry)

- [ ] **Step 7: Commit**

```bash
git add src/pages/NahPage.ts src/features/nah/NahMapLayers.ts
git commit -m "refactor(nah): drop DOM markers, wire NahPage to the symbol-layer API"
```

---

### Task 8: Manual browser verification + changelog/TODO updates

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `TODO.md`
- Modify: `TODO_ARCHIVE.md`

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Manually verify in the browser, on `/nah`**

Check each of the following and note the result:
1. Stations render with the helicopter icon, colored green/red/gray matching their real status (compare against `/info/nah` if in doubt).
2. Clicking a station shows a popup with callsign, name, status badge (colored pill, not plain colored text), Betrieb, Zeiten (if applicable), Nacht, and — for an off-season station — the Saison/Monate row.
3. Clicking empty water/land (not a station) still triggers the incident calculation (sidebar fills with nearest stations, flight-path lines + target pin appear) — this must **not** fire when a station itself is clicked.
4. Hovering a station shows a pointer cursor.
5. Switch the basemap (topbar) while stations are visible — stations, their colors, and click/hover behavior all survive the switch.

- [ ] **Step 3: Update `CHANGELOG.md`**

Insert a new `## [Unreleased]` section directly below the `# Changelog` header (above the existing `## [3.6.1] - 2026-07-05 16:14`). Get the current timestamp first:

Run: `date '+%Y-%m-%d %H:%M'`

Then insert (substituting the printed timestamp):

```markdown
## [Unreleased] - <TIMESTAMP>

### Behoben
- **NAH-Stationsmarker: Inline-Style-Verstoß gegen CI-Konvention behoben** (`src/features/nah/NahMapLayers.ts`). Der Status-Text im Stations-Popup nutzte `style="color:…"` — jetzt über die bestehenden CI-Badge-Klassen (`badge-green`/`badge-red`/`badge-gray`), die exakt auf die drei Status-Farben passen.

### Geändert
- **NAH-Stationsmarker von DOM-Markern auf einen MapLibre-Symbol-Layer migriert** (U5, [docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md](./docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md)). NAH war die letzte Karten-Funktion mit `maplibregl.Marker`-DOM-Elementen statt eines Symbol-Layers (Tracking/Coords/Routing nutzen das Muster schon). Das Helikopter-Icon wird jetzt einmalig zur Laufzeit aus dem bestehenden `fa-helicopter`-Glyph als SDF-Icon gerendert (kein neues externes Sprite nötig), Klick/Hover folgen dem in `TrackingMapLayers` etablierten `queryRenderedFeatures`-Muster. Popup-Inhalt bleibt fachlich unverändert. Betreiber-spezifische Icons (bereits im Sprite-Set vorhanden) sind bewusst nicht Teil dieser Migration — siehe neuer ROADMAP.md-Punkt.

`npx tsc --noEmit && npm test` grün (<PASS COUNT AUS TASK 7>).
```

- [ ] **Step 4: Move the U5 TODO item to the archive**

In `TODO.md`, remove this line from the „Cleanup / Vereinheitlichung" list under „Map-Subsystem Cleanup":

```markdown
- [ ] U5 NAH DOM-Marker → Symbol-Layer migrieren (FA-Helicopter-HTML-Marker → `nah-*` Sprites, Popup-Refactor auf Click-Events); dabei auch Inline-`style="color:…"` in `NahMapLayers.ts:84,108` entfernen
```

In `TODO_ARCHIVE.md`, add a new dated section at the top (above the existing `## Unreleased (2026-07-05)`):

```markdown
## Unreleased (2026-07-06)

### U5: NAH DOM-Marker → Symbol-Layer migriert
- [x] `NahMapLayers.ts` nutzte als letzte Karten-Funktion noch `maplibregl.Marker`-DOM-Elemente
  statt eines MapLibre-Symbol-Layers, inkl. zweier Inline-`style="color:…"`-CI-Verstöße
  (Icon-Farbe, Popup-Status-Text). Migriert auf einen daten-getriebenen `nah-stations`-Symbol-Layer:
  Helikopter-Icon wird einmalig zur Laufzeit aus dem bestehenden `fa-helicopter`-Glyph als SDF-Icon
  gerendert (kein neues externes Sprite-Asset nötig, da das Sprite-Set kein einfärbbares
  Helikopter-Icon enthält), Status-Farbe läuft über eine `icon-color`-Match-Expression. Klick/Hover
  folgen dem in `TrackingMapLayers` etablierten `queryRenderedFeatures`-Muster. Popup-Status-Text
  nutzt jetzt die bestehenden CI-Badge-Klassen (`badge-green`/`badge-red`/`badge-gray`) statt
  Inline-Style. Popup-Inhalt sonst fachlich unverändert. Design:
  `docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md`. Live im Browser
  verifiziert (Icon-Farben, Popup-Inhalt, Klick-auf-Station vs. Klick-auf-Karte, Hover-Cursor,
  Basemap-Wechsel). Betreiber-spezifische Icons bewusst nicht Teil dieser Migration, siehe neuer
  ROADMAP.md-Punkt. `npx tsc --noEmit && npm test` grün (<PASS COUNT AUS TASK 7>).
```

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md TODO.md TODO_ARCHIVE.md
git commit -m "docs: log U5 NAH symbol-layer migration in changelog and TODO archive"
```
