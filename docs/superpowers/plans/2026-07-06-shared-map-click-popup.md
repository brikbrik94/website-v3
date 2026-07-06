# Shared Map Click-Popup Mechanic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bug where clicking a second map feature while a popup is open closes it instead of showing the new one (first click "wasted"), by extracting the popup open/close mechanic that both `TrackingMapLayers` and `NahMapLayers` duplicate into one shared, correct implementation in `PopupManager`.

**Architecture:** `PopupManager` gains two new static methods, `showFeaturePopup` (open/move/update the one shared popup, including the `e.preventDefault()` that fixes the bug) and `closePopup`. `NahMapLayers` and `TrackingMapLayers` each drop their own `maplibregl.Popup` instance and call these instead. Feature hit-detection (`queryRenderedFeatures`) and popup HTML content stay page-specific, unchanged.

**Tech Stack:** TypeScript, MapLibre GL JS, Vitest.

**Spec:** [docs/superpowers/specs/2026-07-06-shared-map-click-popup-design.md](../specs/2026-07-06-shared-map-click-popup-design.md)

## Global Constraints

- Run `npx tsc --noEmit && npm test` before considering any task done (CLAUDE.md → Commands).
- Stage files explicitly in commits (`git add <file> <file>`), never `git add -A`.
- Code comments and UI copy stay German, matching the surrounding file (`PopupManager.ts`'s existing comments are English — match that file's own language, don't force German into it).
- Popup content-building (`PopupManager.buildHtml`, `NahMapLayers.buildStationPopupHtml`) and feature hit-detection (`TrackingMapLayers.handleMapClick`'s `queryRenderedFeatures` call, `NahMapLayers.findClickedStation`) are explicitly **out of scope** — do not touch them beyond what's shown in each task's diff.
- No automated test for `PopupManager.showFeaturePopup`/`closePopup` — constructing a real `maplibregl.Popup` needs a DOM, unavailable in this repo's Node-based Vitest setup (no jsdom). This matches existing precedent (`NahMapLayers.handleStationClick`, `TrackingMapLayers.handleMapClick` are equally untested for their `Popup`-touching parts). Verified instead via the manual browser checklist in Task 4.

---

## File Structure

- **Modify `src/lib/PopupManager.ts`** — adds a module-level shared `maplibregl.Popup` singleton (lazily created) and two new static methods on the existing `PopupManager` class: `showFeaturePopup` (opens/updates it, including the `preventDefault()` fix) and `closePopup`. `buildHtml` is untouched.
- **Modify `src/features/nah/NahMapLayers.ts`** — removes the local `_stationPopup`/`getStationPopup()` singleton (now redundant), updates `handleStationClick` to call `PopupManager.showFeaturePopup`.
- **Modify `src/features/tracking/TrackingMapLayers.ts`** — removes the `popup` instance field and its constructor initialization, updates `handleMapClick` to use the clicked feature's own geometry coordinates (instead of the click point) and call `PopupManager.showFeaturePopup`/`closePopup`, updates `destroy()` to call `PopupManager.closePopup()`.

---

### Task 1: `PopupManager.showFeaturePopup` / `closePopup`

**Files:**
- Modify: `src/lib/PopupManager.ts`

**Interfaces:**
- Produces: `PopupManager.showFeaturePopup(map: maplibregl.Map, e: maplibregl.MapMouseEvent, coordinates: [number, number], html: string): void` and `PopupManager.closePopup(): void`. Consumed by `NahMapLayers.handleStationClick` (Task 2) and `TrackingMapLayers.handleMapClick`/`destroy` (Task 3).

No automated test for this task (see Global Constraints — real `maplibregl.Popup`, no DOM in this repo's test environment). Verified by `npx tsc --noEmit` and the unchanged existing suite still passing, plus Task 4's manual browser check.

- [ ] **Step 1: Add the `maplibregl` import**

At the top of `src/lib/PopupManager.ts`, add as the first line:

```ts
import maplibregl from 'maplibre-gl';
```

- [ ] **Step 2: Add the shared popup singleton and the two methods**

Insert this block directly above `export class PopupManager {` (after the existing `POPUP_CONFIGS` constant, before the class):

```ts
let _sharedPopup: maplibregl.Popup | null = null;
function getSharedPopup(): maplibregl.Popup {
    if (!_sharedPopup) {
        _sharedPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' });
    }
    return _sharedPopup;
}
```

Then add these two static methods inside the existing `PopupManager` class, after `buildHtml`'s closing brace (i.e. right before the class's own closing `}`):

```ts

    /**
     * Opens (or moves/updates) the one shared map-click popup at the given coordinates
     * with the given HTML, and marks the triggering click as handled.
     *
     * MapLibre's Popup.addTo() re-registers its own closeOnClick 'click' listener on
     * every call (removing the old one first if already open) — this happens while the
     * current click event is still being dispatched to all listeners, so the freshly
     * re-registered listener can fire again for this same click and immediately close
     * the popup that was just (re)opened. Calling e.preventDefault() here prevents that
     * self-inflicted close — without it, clicking a second feature while a popup is open
     * closes the old popup but doesn't show the new one until a second click.
     */
    static showFeaturePopup(map: maplibregl.Map, e: maplibregl.MapMouseEvent, coordinates: [number, number], html: string): void {
        getSharedPopup().setLngLat(coordinates).setHTML(html).addTo(map);
        e.preventDefault();
    }

    /**
     * Closes the shared map-click popup (e.g. when a click misses every feature).
     */
    static closePopup(): void {
        getSharedPopup().remove();
    }
```

- [ ] **Step 3: Verify no type errors and existing tests still pass**

Run: `npx tsc --noEmit && npx vitest run src/lib/PopupManager.test.ts`
Expected: no type errors; `PopupManager.test.ts`'s existing 4 tests still PASS (they only exercise `buildHtml`, untouched by this change)

- [ ] **Step 4: Commit**

```bash
git add src/lib/PopupManager.ts
git commit -m "feat(popup): shared showFeaturePopup/closePopup mechanic with the preventDefault fix"
```

---

### Task 2: Migrate `NahMapLayers` to the shared popup

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`

**Interfaces:**
- Consumes: `PopupManager.showFeaturePopup` (Task 1).

- [ ] **Step 1: Add the `PopupManager` import**

In `src/features/nah/NahMapLayers.ts`, add to the existing import block (after the `MapRegistry` import):

```ts
import { PopupManager } from '../../lib/PopupManager';
```

- [ ] **Step 2: Remove the local popup singleton**

Delete this entire block (it sits between the `attachStationHoverCursor` function and the `ensureHeliIcon` function):

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

- [ ] **Step 3: Update `handleStationClick`**

Replace:

```ts
  handleStationClick(map: maplibregl.Map, e: maplibregl.MapMouseEvent): boolean {
    const hit = this.findClickedStation(map, [e.point.x, e.point.y]);
    if (!hit) return false;

    const html = this.buildStationPopupHtml(hit.station);
    getStationPopup().setLngLat(hit.coordinates).setHTML(html).addTo(map);
    return true;
  },
```

with:

```ts
  handleStationClick(map: maplibregl.Map, e: maplibregl.MapMouseEvent): boolean {
    const hit = this.findClickedStation(map, [e.point.x, e.point.y]);
    if (!hit) return false;

    PopupManager.showFeaturePopup(map, e, hit.coordinates, this.buildStationPopupHtml(hit.station));
    return true;
  },
```

- [ ] **Step 4: Verify no type errors and existing tests still pass**

Run: `npx tsc --noEmit && npx vitest run src/features/nah/NahMapLayers.test.ts`
Expected: no type errors; all existing tests (15) still PASS unchanged

- [ ] **Step 5: Commit**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "refactor(nah): use the shared PopupManager popup instead of a local singleton"
```

---

### Task 3: Migrate `TrackingMapLayers` to the shared popup

**Files:**
- Modify: `src/features/tracking/TrackingMapLayers.ts`

**Interfaces:**
- Consumes: `PopupManager.showFeaturePopup`, `PopupManager.closePopup` (Task 1).

No automated test for this task — `TrackingMapLayers` has no existing test file (its `Popup`/DOM-coupled logic was already untested before this change; this task doesn't reduce coverage, it just relocates the same untested mechanic). Verified by `npx tsc --noEmit`, the unchanged full suite passing, and Task 4's manual browser check.

- [ ] **Step 1: Remove the `popup` field and its constructor init**

Replace:

```ts
export class TrackingMapLayers {
    private map: maplibregl.Map;
    private popup: maplibregl.Popup;
    private adsbVisible = true;
```

with:

```ts
export class TrackingMapLayers {
    private map: maplibregl.Map;
    private adsbVisible = true;
```

Replace:

```ts
    constructor(map: maplibregl.Map) {
        this.map = map;
        this.popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' });
    }
```

with:

```ts
    constructor(map: maplibregl.Map) {
        this.map = map;
    }
```

- [ ] **Step 2: Update `handleMapClick`**

Replace:

```ts
    public handleMapClick(e: any, onSelect: (id: string | number | null) => void) {
        const features = this.map.queryRenderedFeatures(e.point, { layers: ['adsb-icons', 'ais-icons', 'ais-dots-moving', 'ais-dots-static'] });
        
        if (features.length === 0) {
            this.popup.remove();
            this.highlightItem(null);
            onSelect(null);
            return;
        }

        const feat = features[0];
        const props = feat.properties || {};
        const layerId = feat.layer.id;
        const isAdsb = layerId.includes('adsb');
        
        const selectedId = isAdsb ? props.hex : props.mmsi;
        
        this.highlightItem(selectedId);
        onSelect(selectedId);

        const html = PopupManager.buildHtml(layerId, props);
        this.popup.setLngLat(e.lngLat).setHTML(html).addTo(this.map);
        e.preventDefault();
    }
```

with:

```ts
    public handleMapClick(e: any, onSelect: (id: string | number | null) => void) {
        const features = this.map.queryRenderedFeatures(e.point, { layers: ['adsb-icons', 'ais-icons', 'ais-dots-moving', 'ais-dots-static'] });
        
        if (features.length === 0) {
            PopupManager.closePopup();
            this.highlightItem(null);
            onSelect(null);
            return;
        }

        const feat = features[0];
        const props = feat.properties || {};
        const layerId = feat.layer.id;
        const isAdsb = layerId.includes('adsb');
        
        const selectedId = isAdsb ? props.hex : props.mmsi;
        
        this.highlightItem(selectedId);
        onSelect(selectedId);

        const coordinates = (feat.geometry as any).coordinates as [number, number];
        const html = PopupManager.buildHtml(layerId, props);
        PopupManager.showFeaturePopup(this.map, e, coordinates, html);
    }
```

(Note the position source changed from `e.lngLat` — the click point — to `feat.geometry.coordinates` — the feature's own position. This is the deliberate positioning unification from the spec.)

- [ ] **Step 3: Update `destroy()`**

Replace:

```ts
    public destroy() {
        this.popup.remove();
        // Cursor-Listener wieder abmelden (die Karte selbst wird von MapCore zerstört).
```

with:

```ts
    public destroy() {
        PopupManager.closePopup();
        // Cursor-Listener wieder abmelden (die Karte selbst wird von MapCore zerstört).
```

- [ ] **Step 4: Verify no type errors and the full suite still passes**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; full suite passes (note the exact pass count for Task 4's changelog entry)

- [ ] **Step 5: Commit**

```bash
git add src/features/tracking/TrackingMapLayers.ts
git commit -m "refactor(tracking): use the shared PopupManager popup, position at feature coordinates"
```

---

### Task 4: Manual browser verification + CHANGELOG entry

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Manually verify on `/nah`**

1. Click a station to open its popup, then — **without clicking empty space first** — click a different station. The new popup must appear immediately with the new station's content (not on a second click).
2. With a popup open, click empty water/land (no station). The popup closes and the incident calculation still triggers (sidebar fills with nearest stations).
3. No console errors during either interaction.

- [ ] **Step 3: Manually verify on `/tracking`**

1. Click an ADS-B (plane) feature — popup appears positioned exactly at the plane icon (not offset to wherever you clicked within its hit area).
2. Click an AIS (ship) feature — same positioning check.
3. While a popup is open, click a different plane/ship — the new popup must appear immediately (not on a second click) — this is the same bug, now fixed via the shared mechanic.
4. Click empty water/land — popup closes, and the sidebar's selected/highlighted item resets (matches pre-existing `onSelect(null)` behavior).
5. No console errors.

- [ ] **Step 4: Update `CHANGELOG.md`**

Get the current timestamp:

Run: `date '+%Y-%m-%d %H:%M'`

Add a new bullet to the existing `### Behoben` section under the current `## [Unreleased]` heading at the top of `CHANGELOG.md` (if the file's `[Unreleased]` heading has an older timestamp than now, update the heading's timestamp to the one just printed):

```markdown
- **Popup schloss sich beim Wechsel zu einer anderen Station/einem anderen Flugzeug/Schiff, statt sofort das neue zu zeigen** (`src/lib/PopupManager.ts`, `src/features/nah/NahMapLayers.ts`, `src/features/tracking/TrackingMapLayers.ts`). MapLibres `Popup.addTo()` registriert bei einem bereits offenen Popup seinen `closeOnClick`-Listener neu — mitten in der laufenden Klick-Event-Verteilung, wodurch der neue Listener denselben Klick nochmal mitbekommt und das gerade erst wieder geöffnete Popup sofort schließt. `TrackingMapLayers` rief deshalb schon `e.preventDefault()` auf, `NahMapLayers` (aus der U5-Migration) noch nicht. Statt den Fix ein zweites Mal zu duplizieren: neue gemeinsame `PopupManager.showFeaturePopup`/`closePopup`-Mechanik, die beide Seiten jetzt nutzen — behebt den Bug an einer Stelle für beide, plus Tracking positioniert sein Popup jetzt konsistent an der Feature-Koordinate statt am Klickpunkt. Design: [docs/superpowers/specs/2026-07-06-shared-map-click-popup-design.md](./docs/superpowers/specs/2026-07-06-shared-map-click-popup-design.md).
```

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: log the shared popup mechanic fix in the changelog"
```
