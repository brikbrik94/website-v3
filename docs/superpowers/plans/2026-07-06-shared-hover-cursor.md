# Shared Hover Cursor Helper (U6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three independent, duplicated hover-cursor implementations (`TrackingMapLayers`, `RoutingPage`, `NahMapLayers`) with one shared `attachHoverCursor` helper, fixing two bugs found during the inventory along the way (Tracking's AIS dots never got a pointer cursor; Routing never cleaned up its listeners on page teardown).

**Architecture:** A new standalone module `src/lib/HoverCursor.ts` exports a single function, `attachHoverCursor(map, layerIds)`, with a module-level `WeakSet<maplibregl.Map>` guard for idempotency across repeated calls (e.g. on basemap switch) and no explicit cleanup requirement (a new page always gets a new map instance).

**Tech Stack:** TypeScript, MapLibre GL JS, Vitest.

**Spec:** [docs/superpowers/specs/2026-07-06-shared-hover-cursor-design.md](../specs/2026-07-06-shared-hover-cursor-design.md)

## Global Constraints

- Run `npx tsc --noEmit && npm test` before considering any task done (CLAUDE.md → Commands).
- Stage files explicitly in commits (`git add <file> <file>`), never `git add -A`.
- `MapPage.ts` and `CoordsPage.ts` are explicitly out of scope — do not touch them.
- Code comments and UI copy stay German, matching the surrounding file (`HoverCursor.ts` is a new file — its own doc comment should be German, matching every other `src/lib/` file except `PopupManager.ts`, which is an already-noted, pre-existing exception).

---

## File Structure

- **Create `src/lib/HoverCursor.ts`** — one exported function, `attachHoverCursor(map, layerIds)`. No other exports.
- **Modify `src/features/tracking/TrackingMapLayers.ts`** — removes `cursorListenersAttached`/`hoverLayerIds`/`onHoverEnter`/`onHoverLeave` fields and the inline registration/cleanup blocks; calls `attachHoverCursor` instead, now covering `ais-dots-moving`/`ais-dots-static` too.
- **Modify `src/pages/RoutingPage.ts`** — removes the inline `mouseenter`/`mouseleave` registration; calls `attachHoverCursor` instead.
- **Modify `src/features/nah/NahMapLayers.ts`** — removes `attachStationHoverCursor`/its `WeakSet`; calls `attachHoverCursor` instead.
- **Modify `CLAUDE.md`** — adds `HoverCursor`/`attachHoverCursor` to the "Map infrastructure" bullet list.

---

### Task 1: `attachHoverCursor`

**Files:**
- Create: `src/lib/HoverCursor.ts`
- Test: `src/lib/HoverCursor.test.ts`

**Interfaces:**
- Produces: `attachHoverCursor(map: maplibregl.Map, layerIds: string[]): void`. Consumed by Tasks 2, 3, 4.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/HoverCursor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { attachHoverCursor } from './HoverCursor';

function mockMap() {
  const calls: { type: string; layerId: string }[] = [];
  const map = {
    on: (type: string, layerId: string, _cb: () => void) => { calls.push({ type, layerId }); },
  } as any;
  return { map, calls };
}

describe('attachHoverCursor', () => {
  it('registers a mouseenter and mouseleave listener per layer', () => {
    const { map, calls } = mockMap();
    attachHoverCursor(map, ['layer-a', 'layer-b']);
    expect(calls).toEqual([
      { type: 'mouseenter', layerId: 'layer-a' },
      { type: 'mouseleave', layerId: 'layer-a' },
      { type: 'mouseenter', layerId: 'layer-b' },
      { type: 'mouseleave', layerId: 'layer-b' },
    ]);
  });

  it('does not re-register listeners on a second call for the same map instance', () => {
    const { map, calls } = mockMap();
    attachHoverCursor(map, ['layer-a']);
    attachHoverCursor(map, ['layer-a']);
    expect(calls).toHaveLength(2);
  });

  it('registers independently for two different map instances', () => {
    const { map: mapA, calls: callsA } = mockMap();
    const { map: mapB, calls: callsB } = mockMap();
    attachHoverCursor(mapA, ['layer-a']);
    attachHoverCursor(mapB, ['layer-a']);
    expect(callsA).toHaveLength(2);
    expect(callsB).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/HoverCursor.test.ts`
Expected: FAIL — cannot find module `./HoverCursor` (or `attachHoverCursor is not a function`)

- [ ] **Step 3: Implement `attachHoverCursor`**

Create `src/lib/HoverCursor.ts`:

```ts
import maplibregl from 'maplibre-gl';

const _attached = new WeakSet<maplibregl.Map>();

/**
 * Zeigt einen Pointer-Cursor, solange der Mauszeiger über einem Feature der angegebenen
 * Layer steht (z.B. für klickbare Symbol-/Circle-Layer). Idempotent: mehrfache Aufrufe für
 * dieselbe Map-Instanz (z.B. weil initLayers()/ensureLayers() bei jedem Basemap-Wechsel
 * erneut läuft) registrieren die Listener nur einmal.
 *
 * Kein explizites Cleanup nötig: jede Seite bekommt bei jedem Besuch eine neue Map-Instanz
 * (siehe MapCore.init() / CLAUDE.md Page-Lifecycle), eine neue Instanz steckt automatisch
 * nicht im WeakSet und die Listener der alten Instanz verschwinden mit ihr.
 */
export function attachHoverCursor(map: maplibregl.Map, layerIds: string[]): void {
  if (_attached.has(map)) return;
  _attached.add(map);

  for (const layerId of layerIds) {
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/HoverCursor.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/HoverCursor.ts src/lib/HoverCursor.test.ts
git commit -m "feat(map): shared attachHoverCursor helper (U6)"
```

---

### Task 2: Migrate `TrackingMapLayers`

**Files:**
- Modify: `src/features/tracking/TrackingMapLayers.ts`

**Interfaces:**
- Consumes: `attachHoverCursor` (Task 1).

No automated test for this task — `TrackingMapLayers` has no existing test file (unchanged from before this migration). Verified by `npx tsc --noEmit && npm test` and the manual browser check in Task 6.

- [ ] **Step 1: Add the import**

In `src/features/tracking/TrackingMapLayers.ts`, add to the top import block:

```ts
import { attachHoverCursor } from '../../lib/HoverCursor';
```

- [ ] **Step 2: Remove the four now-unused fields**

Replace:

```ts
export class TrackingMapLayers {
    private map: maplibregl.Map;
    private adsbVisible = true;
    private aisVisible = true;
    private cursorListenersAttached = false;
    private readonly hoverLayerIds = ['adsb-icons', 'ais-icons'];
    private readonly onHoverEnter = () => { this.map.getCanvas().style.cursor = 'pointer'; };
    private readonly onHoverLeave = () => { this.map.getCanvas().style.cursor = ''; };

    constructor(map: maplibregl.Map) {
        this.map = map;
    }
```

with:

```ts
export class TrackingMapLayers {
    private map: maplibregl.Map;
    private adsbVisible = true;
    private aisVisible = true;

    constructor(map: maplibregl.Map) {
        this.map = map;
    }
```

- [ ] **Step 3: Replace the cursor-registration block in `ensureLayers`**

Replace:

```ts
        // Cursor-Listener nur einmal registrieren (ensureLayers läuft bei jedem
        // Style-/Basemap-Wechsel erneut, sonst stapeln sich die Handler).
        if (!this.cursorListenersAttached) {
            this.cursorListenersAttached = true;
            for (const id of this.hoverLayerIds) {
                m.on('mouseenter', id, this.onHoverEnter);
                m.on('mouseleave', id, this.onHoverLeave);
            }
        }
    }
```

with:

```ts
        attachHoverCursor(m, ['adsb-icons', 'ais-icons', 'ais-dots-moving', 'ais-dots-static']);
    }
```

(Note: `ais-dots-moving`/`ais-dots-static` are new here — they weren't in the old `hoverLayerIds` even though they're clickable per `handleMapClick`'s `queryRenderedFeatures` layer list. This is the bug fix from the spec.)

- [ ] **Step 4: Simplify `destroy()`**

Replace:

```ts
    public destroy() {
        PopupManager.closePopup();
        // Cursor-Listener wieder abmelden (die Karte selbst wird von MapCore zerstört).
        if (this.cursorListenersAttached) {
            for (const id of this.hoverLayerIds) {
                this.map.off('mouseenter', id, this.onHoverEnter);
                this.map.off('mouseleave', id, this.onHoverLeave);
            }
            this.cursorListenersAttached = false;
        }
    }
```

with:

```ts
    public destroy() {
        PopupManager.closePopup();
    }
```

- [ ] **Step 5: Verify no type errors and the full suite still passes**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; full suite passes unchanged (no test file covers this class)

- [ ] **Step 6: Commit**

```bash
git add src/features/tracking/TrackingMapLayers.ts
git commit -m "refactor(tracking): use shared attachHoverCursor, add missing AIS-dots cursor"
```

---

### Task 3: Migrate `RoutingPage`

**Files:**
- Modify: `src/pages/RoutingPage.ts`

**Interfaces:**
- Consumes: `attachHoverCursor` (Task 1).

No automated test for this task — `RoutingPage` has no existing test file. Verified by `npx tsc --noEmit && npm test` and the manual browser check in Task 6.

- [ ] **Step 1: Add the import**

In `src/pages/RoutingPage.ts`, add to the top import block (after the `MapCore` import):

```ts
import { attachHoverCursor } from '../lib/HoverCursor';
```

- [ ] **Step 2: Replace the inline hover-cursor registration**

Replace, inside `setupMapListeners()`:

```ts
        this.map.on('mouseenter', 'routing-path', () => {
            if (this.map) this.map.getCanvas().style.cursor = 'pointer';
        });
        this.map.on('mouseleave', 'routing-path', () => {
            if (this.map) this.map.getCanvas().style.cursor = '';
        });
```

with:

```ts
        attachHoverCursor(this.map, ['routing-path']);
```

(The surrounding `if (!this.map || !this.sidebarAdapter) return;` guard at the top of `setupMapListeners()` already ensures `this.map` is defined at this point, so no extra null-check is needed here — unlike the old inline callbacks, which re-checked `this.map` on every hover because they ran asynchronously later.)

- [ ] **Step 3: Verify no type errors and the full suite still passes**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; full suite passes unchanged

- [ ] **Step 4: Commit**

```bash
git add src/pages/RoutingPage.ts
git commit -m "refactor(routing): use shared attachHoverCursor, fixes missing listener cleanup"
```

---

### Task 4: Migrate `NahMapLayers`

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`

**Interfaces:**
- Consumes: `attachHoverCursor` (Task 1).

No automated test for this task — `attachStationHoverCursor` was never itself unit-tested (only the exported `NahMapLayers` methods are), so no existing test needs updating.

- [ ] **Step 1: Add the import**

In `src/features/nah/NahMapLayers.ts`, add to the top import block (after the `PopupManager` import):

```ts
import { attachHoverCursor } from '../../lib/HoverCursor';
```

- [ ] **Step 2: Remove the local WeakSet guard and function**

Delete this entire block (sits between the `STATUS_TEXT` constant and the `ensureHeliIcon` function):

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

```

- [ ] **Step 3: Update the call site in `initLayers`**

Replace:

```ts
    MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsLayerDef as any);
    attachStationHoverCursor(map);
```

with:

```ts
    MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsLayerDef as any);
    attachHoverCursor(map, [STATIONS_LAYER]);
```

- [ ] **Step 4: Verify no type errors and existing tests still pass**

Run: `npx tsc --noEmit && npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: no type errors; all existing tests (15) still PASS unchanged

- [ ] **Step 5: Commit**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "refactor(nah): use shared attachHoverCursor instead of local WeakSet guard"
```

---

### Task 5: Document the helper in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `HoverCursor` to the "Map infrastructure" bullet**

Replace:

```markdown
**Map infrastructure (`src/lib/`):** `MapCore` initializes MapLibre GL. `MapRegistry` is a central store of map sources/layers/images that survives basemap style changes (re-applied on style reload) and is cleared between pages. `TerrainManager` handles 3D terrain. `MapLegend`, `PopupManager`, `GeocoderService`, `Toast` (central feedback), `GlobalModals` are shared singletons/utilities.
```

with:

```markdown
**Map infrastructure (`src/lib/`):** `MapCore` initializes MapLibre GL. `MapRegistry` is a central store of map sources/layers/images that survives basemap style changes (re-applied on style reload) and is cleared between pages. `TerrainManager` handles 3D terrain. `MapLegend`, `PopupManager`, `HoverCursor` (`attachHoverCursor(map, layerIds)` — pointer cursor on hover for clickable layers, idempotent, no manual cleanup needed), `GeocoderService`, `Toast` (central feedback), `GlobalModals` are shared singletons/utilities.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the shared attachHoverCursor helper for new pages"
```

---

### Task 6: Manual browser verification + CHANGELOG entry

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Manually verify on `/tracking`**

1. Hover over an ADS-B plane icon — pointer cursor.
2. Hover over an AIS ship icon (at high zoom, `ais-icons` layer) — pointer cursor.
3. Hover over an AIS "dot" (at lower zoom, `ais-dots-moving`/`ais-dots-static`) — pointer cursor (this is the bug fix — previously showed the default cursor).
4. Hover over empty water/land — default cursor.
5. No console errors.

- [ ] **Step 3: Manually verify on `/routing`**

1. Calculate a route so `routing-path` renders.
2. Hover over the route line — pointer cursor.
3. Hover away from the line — default cursor.
4. Navigate away to another page and back to `/routing`, calculate a route again — hover still works (confirms no leak/breakage from the destroy() simplification path, even though Routing's `destroy()` doesn't call the old cursor-cleanup code at all — it only ever called `this.map?.remove()`).
5. No console errors.

- [ ] **Step 4: Manually verify on `/nah`**

1. Hover over a station icon — pointer cursor.
2. Hover away — default cursor.
3. Switch basemap (topbar) — hover still works after the style reload.
4. No console errors.

- [ ] **Step 5: Manually verify page-switching doesn't leak or break**

Navigate `/tracking` → `/nah` → `/routing` → `/tracking` (internal nav links, not full reloads). At each stop, re-check that hovering a clickable feature on that page shows a pointer cursor. No console errors at any point.

- [ ] **Step 6: Update `CHANGELOG.md`**

Get the current timestamp:

Run: `date '+%Y-%m-%d %H:%M'`

Add a new `## [Unreleased] - <TIMESTAMP>` block at the top of `CHANGELOG.md` (above the existing most-recent block — see `feedback_changelog-block-per-change` convention: one block per change, not merged into an existing one):

```markdown
## [Unreleased] - <TIMESTAMP>

### Geändert
- **Hover-Cursor-Logik vereinheitlicht** (U6, [docs/superpowers/specs/2026-07-06-shared-hover-cursor-design.md](./docs/superpowers/specs/2026-07-06-shared-hover-cursor-design.md)). Drei unabhängige, duplizierte Implementierungen (`TrackingMapLayers`, `RoutingPage`, `NahMapLayers`) durch einen gemeinsamen Helper `attachHoverCursor` (`src/lib/HoverCursor.ts`) ersetzt. Dabei zwei Bugs behoben: `ais-dots-moving`/`ais-dots-static` (Tracking) waren klickbar, zeigten aber keinen Hover-Cursor; `RoutingPage` meldete seine Hover-Listener nie in `destroy()` ab (Leak-Risiko bei Seitenwechsel). Beide verschwinden automatisch durch die vereinheitlichte Implementierung. In `CLAUDE.md` dokumentiert für künftige neue Seiten.

`npx tsc --noEmit && npm test` grün (<PASS COUNT>).
```

Run the full suite once more to get the exact pass count for the line above:

Run: `npm test`

- [ ] **Step 7: Update `TODO.md`**

Remove the `U6` line from the "Cleanup / Vereinheitlichung" list:

```markdown
- [ ] U6 Hover-Cursor vereinheitlichen (`attachHoverCursor`; Routing noch inline, `RoutingPage.ts:69`; jetzt eine dritte lokale Instanz in `NahMapLayers.ts` seit U5)
```

Add a new dated section to `TODO_ARCHIVE.md`, above the existing most-recent `## Unreleased (...)` heading:

```markdown
## Unreleased (<YYYY-MM-DD, today's date>)

### U6: Hover-Cursor vereinheitlicht
- [x] Drei unabhängige Implementierungen (`TrackingMapLayers` mit Boolean-Guard, `RoutingPage` komplett
  inline ohne Guard/Cleanup, `NahMapLayers` mit modul-scoped WeakSet) durch einen gemeinsamen
  `attachHoverCursor(map, layerIds)`-Helper (`src/lib/HoverCursor.ts`, WeakSet-Guard) ersetzt.
  Dabei zwei Bugs behoben: Tracking zeigte für `ais-dots-moving`/`ais-dots-static` keinen
  Hover-Cursor trotz Klickbarkeit; Routing meldete seine Listener nie in `destroy()` ab. In
  `CLAUDE.md` dokumentiert. Design:
  `docs/superpowers/specs/2026-07-06-shared-hover-cursor-design.md`. Live im Browser
  verifiziert (`/tracking`, `/routing`, `/nah`, inkl. Seitenwechsel-Test). `npx tsc --noEmit &&
  npm test` grün (<PASS COUNT>).
```

- [ ] **Step 8: Commit**

```bash
git add CHANGELOG.md TODO.md TODO_ARCHIVE.md
git commit -m "docs: log U6 hover-cursor unification in changelog and TODO archive"
```
