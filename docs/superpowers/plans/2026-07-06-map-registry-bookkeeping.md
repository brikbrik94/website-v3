# MapRegistry Bookkeeping Simplification (U7 + U1b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate `MapPage.ts`'s triple bookkeeping (`activeLayers` + `overlayMetadata` + `MapRegistry`) by migrating it onto a generalized `OverlayLoader`, and remove the 4x-duplicated guard+clone+add boilerplate across `MapRegistry.ts`, `OverlayLoader.ts`, and `MapCore.ts`.

**Architecture:** A new shared helper module (`src/lib/MapDefinitionOps.ts`) provides `addSourceIfMissing`/`addLayerIfMissing`, used by all three existing call sites. `OverlayLoader.ts` gains an optional per-call `layerIds` subset, cumulative per-overlay bookkeeping, a cached parsed style per overlay, and the `isStyleLoaded()` wait previously only in `MapPage.ts`. `MapPage.ts`'s `toggleLayer` becomes a thin wrapper around the generalized `OverlayLoader`, and its `activeLayers`/`overlayMetadata`/`cachedStyles`/`styleFetchPromises`/`getStyle`/`reapplyActiveOverlays` all disappear — restoration after a basemap switch is handled entirely by the existing `MapRegistry.restore()` mechanism, same as every other page.

**Tech Stack:** TypeScript, MapLibre GL JS, Vitest.

**Spec:** [docs/superpowers/specs/2026-07-06-map-registry-bookkeeping-design.md](../specs/2026-07-06-map-registry-bookkeeping-design.md)

## Global Constraints

- Run `npx tsc --noEmit && npm test` before considering any task done (CLAUDE.md → Commands).
- Stage files explicitly in commits (`git add <file> <file>`), never `git add -A`.
- Code comments and UI copy stay German, matching the surrounding file.
- No automated tests for `MapRegistry.ts`, `OverlayLoader.ts`, or `MapPage.ts` themselves — none exist today (repo-wide precedent: MapLibre-instance/fetch-coupled code is verified manually, not unit-tested). `MapDefinitionOps.ts` is the one new piece of pure-ish logic in this plan and DOES get unit tests (mockable `map` object, same style as `MapCore.test.ts`).
- `main.ts` already calls `OverlayLoader.reset()` alongside `MapRegistry.clear()` on every page navigation (`main.ts:139-140`) — no page's `destroy()` needs to call it itself.

---

## File Structure

- **Create `src/lib/MapDefinitionOps.ts`** — two exported functions, `addSourceIfMissing`/`addLayerIfMissing`. No other exports.
- **Modify `src/lib/MapRegistry.ts`** — `restore()` uses the new helpers instead of its own duplicated guard+clone+add code.
- **Modify `src/lib/MapCore.ts`** — `ensureGeoJsonLayer` uses the new helpers instead of its own duplicated guard+clone+add code.
- **Modify `src/lib/OverlayLoader.ts`** — `add()`/`remove()` gain an optional `layerIds` subset, cumulative bookkeeping, cached parsed style, and the `isStyleLoaded()` wait (moved from `MapPage.ts`). Uses the new helpers instead of its own duplicated guard+clone+add code.
- **Modify `src/pages/MapPage.ts`** — `toggleLayer` becomes a thin `OverlayLoader` wrapper; `activeLayers`, `overlayMetadata`, `cachedStyles`, `styleFetchPromises`, `getStyle`, `reapplyActiveOverlays` all removed; `MapCore.init`'s `onRestore` argument dropped.

---

### Task 1: `addSourceIfMissing` / `addLayerIfMissing`

**Files:**
- Create: `src/lib/MapDefinitionOps.ts`
- Test: `src/lib/MapDefinitionOps.test.ts`

**Interfaces:**
- Produces: `addSourceIfMissing(map: maplibregl.Map, id: string, definition: any): void` and `addLayerIfMissing(map: maplibregl.Map, definition: any, beforeId?: string): void`. Consumed by Tasks 2, 3, 4.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/MapDefinitionOps.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { addSourceIfMissing, addLayerIfMissing } from './MapDefinitionOps';

describe('addSourceIfMissing', () => {
  it('adds a cloned copy of the definition when the source does not exist', () => {
    const calls: { id: string; definition: any }[] = [];
    const definition = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } };
    const map = {
      getSource: () => undefined,
      addSource: (id: string, def: any) => calls.push({ id, definition: def }),
    } as any;

    addSourceIfMissing(map, 'my-source', definition);

    expect(calls).toHaveLength(1);
    expect(calls[0].id).toBe('my-source');
    expect(calls[0].definition).toEqual(definition);
    expect(calls[0].definition).not.toBe(definition);
  });

  it('does nothing if the source already exists', () => {
    const calls: unknown[] = [];
    const map = {
      getSource: () => ({}),
      addSource: (...args: unknown[]) => calls.push(args),
    } as any;

    addSourceIfMissing(map, 'my-source', { type: 'geojson' });

    expect(calls).toHaveLength(0);
  });

  it('logs a warning instead of throwing if addSource fails', () => {
    const map = {
      getSource: () => undefined,
      addSource: () => { throw new Error('boom'); },
    } as any;

    expect(() => addSourceIfMissing(map, 'my-source', { type: 'geojson' })).not.toThrow();
  });
});

describe('addLayerIfMissing', () => {
  it('adds a cloned copy of the definition when the layer does not exist', () => {
    const calls: { definition: any; beforeId: string | undefined }[] = [];
    const definition = { id: 'my-layer', type: 'line', source: 'my-source' };
    const map = {
      getLayer: () => undefined,
      addLayer: (def: any, beforeId?: string) => calls.push({ definition: def, beforeId }),
    } as any;

    addLayerIfMissing(map, definition, 'some-other-layer');

    expect(calls).toHaveLength(1);
    expect(calls[0].definition).toEqual(definition);
    expect(calls[0].definition).not.toBe(definition);
    expect(calls[0].beforeId).toBe('some-other-layer');
  });

  it('does nothing if the layer already exists', () => {
    const calls: unknown[] = [];
    const map = {
      getLayer: () => ({}),
      addLayer: (...args: unknown[]) => calls.push(args),
    } as any;

    addLayerIfMissing(map, { id: 'my-layer', type: 'line' });

    expect(calls).toHaveLength(0);
  });

  it('logs a warning instead of throwing if addLayer fails', () => {
    const map = {
      getLayer: () => undefined,
      addLayer: () => { throw new Error('boom'); },
    } as any;

    expect(() => addLayerIfMissing(map, { id: 'my-layer', type: 'line' })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/MapDefinitionOps.test.ts`
Expected: FAIL — cannot find module `./MapDefinitionOps`

- [ ] **Step 3: Implement the module**

Create `src/lib/MapDefinitionOps.ts`:

```ts
import maplibregl from 'maplibre-gl';

/**
 * Fügt eine Source hinzu, falls noch nicht vorhanden. Klont die Definition vorher (MapLibre
 * mutiert das übergebene Objekt beim Hinzufügen; ohne Klon würde das die in MapRegistry/
 * OverlayLoader gespeicherte kanonische Kopie korrumpieren).
 */
export function addSourceIfMissing(map: maplibregl.Map, id: string, definition: any): void {
  if (map.getSource(id)) return;
  try {
    map.addSource(id, JSON.parse(JSON.stringify(definition)));
  } catch (e) {
    console.warn(`[Map] Konnte Source ${id} nicht hinzufügen`, e);
  }
}

/**
 * Fügt einen Layer hinzu, falls noch nicht vorhanden (gleiche Klon-Begründung wie oben).
 */
export function addLayerIfMissing(map: maplibregl.Map, definition: any, beforeId?: string): void {
  if (map.getLayer(definition.id)) return;
  try {
    map.addLayer(JSON.parse(JSON.stringify(definition)), beforeId);
  } catch (e) {
    console.warn(`[Map] Konnte Layer ${definition.id} nicht hinzufügen`, e);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/MapDefinitionOps.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/MapDefinitionOps.ts src/lib/MapDefinitionOps.test.ts
git commit -m "feat(map): shared addSourceIfMissing/addLayerIfMissing helpers (U7)"
```

---

### Task 2: Migrate `MapRegistry.restore`

**Files:**
- Modify: `src/lib/MapRegistry.ts`

**Interfaces:**
- Consumes: `addSourceIfMissing`, `addLayerIfMissing` (Task 1).

No automated test for this task — `MapRegistry.ts` has no existing test file. Verified by `npx tsc --noEmit && npm test` and the manual browser check in Task 6.

- [ ] **Step 1: Add the import**

In `src/lib/MapRegistry.ts`, add to the top:

```ts
import { addSourceIfMissing, addLayerIfMissing } from './MapDefinitionOps';
```

- [ ] **Step 2: Simplify `restore()`'s source/layer loops**

Replace:

```ts
    // 2. Add Sources - Use deep cloning to prevent MapLibre from corrupting our registry state
    for (const src of sources.values()) {
      if (!map.getSource(src.id)) {
        try {
          // Deep clone the definition to ensure we always have a clean copy for future restorations
          const definition = JSON.parse(JSON.stringify(src.definition));
          map.addSource(src.id, definition);
          console.debug(`[MapRegistry] Restored source: ${src.id}`);
        } catch (e) {
          console.warn(`[MapRegistry] Failed to restore source ${src.id}`, e);
        }
      }
    }

    // 3. Add Layers
    for (const layer of layers.values()) {
      if (!map.getLayer(layer.id)) {
        try {
          // Deep clone the definition
          const definition = JSON.parse(JSON.stringify(layer.definition));
          map.addLayer(definition, layer.beforeId);
          console.debug(`[MapRegistry] Restored layer: ${layer.id}`);
        } catch (e) {
          console.warn(`[MapRegistry] Failed to restore layer ${layer.id}`, e);
        }
      }
    }
```

with:

```ts
    // 2. Add Sources
    for (const src of sources.values()) {
      addSourceIfMissing(map, src.id, src.definition);
    }

    // 3. Add Layers
    for (const layer of layers.values()) {
      addLayerIfMissing(map, layer.definition, layer.beforeId);
    }
```

(Note: this drops the per-item `console.debug('Restored source/layer: ...')` success logs — an intentional minor logging simplification; the top-level "Restoring N sources..." log at the start of `restore()` already gives visibility, and `addSourceIfMissing`/`addLayerIfMissing` still warn on failure.)

- [ ] **Step 3: Verify no type errors and the full suite still passes**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; full suite passes unchanged (no test file covers `MapRegistry.ts`)

- [ ] **Step 4: Commit**

```bash
git add src/lib/MapRegistry.ts
git commit -m "refactor(map): MapRegistry.restore uses shared addSourceIfMissing/addLayerIfMissing"
```

---

### Task 3: Migrate `MapCore.ensureGeoJsonLayer`

**Files:**
- Modify: `src/lib/MapCore.ts`

**Interfaces:**
- Consumes: `addSourceIfMissing`, `addLayerIfMissing` (Task 1).

No automated test for this task — `MapCore.test.ts` exists but doesn't cover `ensureGeoJsonLayer` (only `createPinLayer`/`setPointSource`). Verified by `npx tsc --noEmit && npm test` (confirms the existing `MapCore.test.ts` tests still pass unchanged) and the manual browser check in Task 6.

- [ ] **Step 1: Add the import**

In `src/lib/MapCore.ts`, add to the top import block:

```ts
import { addSourceIfMissing, addLayerIfMissing } from './MapDefinitionOps';
```

- [ ] **Step 2: Simplify `ensureGeoJsonLayer`'s add-to-map section**

Replace:

```ts
    // 2. Add to current map instance if missing
    if (!map.getSource(sourceId)) {
      const regSource = MapRegistry.getSource(sourceId);
      if (regSource) {
        try {
          map.addSource(sourceId, JSON.parse(JSON.stringify(regSource.definition)));
        } catch (e) {
          console.warn(`[MapCore] Failed to add source ${sourceId}`, e);
        }
      }
    }
    if (!map.getLayer(layerDef.id)) {
      try {
        map.addLayer(JSON.parse(JSON.stringify(layerDef)));
      } catch (e) {
        console.warn(`[MapCore] Failed to add layer ${layerDef.id}`, e);
      }
    }
  },
```

with:

```ts
    // 2. Add to current map instance if missing
    const regSource = MapRegistry.getSource(sourceId);
    if (regSource) {
      addSourceIfMissing(map, sourceId, regSource.definition);
    }
    addLayerIfMissing(map, layerDef);
  },
```

- [ ] **Step 3: Verify no type errors and existing tests still pass**

Run: `npx tsc --noEmit && npx vitest run src/lib/MapCore.test.ts`
Expected: no type errors; all existing tests (6) still PASS unchanged

- [ ] **Step 4: Commit**

```bash
git add src/lib/MapCore.ts
git commit -m "refactor(map): MapCore.ensureGeoJsonLayer uses shared addSourceIfMissing/addLayerIfMissing"
```

---

### Task 4: Generalize `OverlayLoader`

**Files:**
- Modify: `src/lib/OverlayLoader.ts`

**Interfaces:**
- Consumes: `addSourceIfMissing`, `addLayerIfMissing` (Task 1).
- Produces: `OverlayLoader.add(map, overlayId, styleUrl, opts?: { signal?: AbortSignal; layerIds?: string[] }): Promise<void>` and `OverlayLoader.remove(map, overlayId, opts?: { layerIds?: string[] }): void` — both now take an optional `layerIds` subset; calling without it preserves the exact current whole-style behavior (this is what `CoordsPage.ts` already does and must keep working unchanged). Consumed by Task 5.

No automated test for this task — `OverlayLoader.ts` has no existing test file. Verified by `npx tsc --noEmit && npm test` and the manual browser check in Task 6 (which specifically re-verifies `CoordsPage.ts`'s existing hiking-overlay toggle still works unchanged, since this task changes the file it depends on).

- [ ] **Step 1: Replace the whole file**

Replace the full contents of `src/lib/OverlayLoader.ts` with:

```ts
import maplibregl from 'maplibre-gl';
import { MapCore } from './MapCore';
import { MapRegistry } from './MapRegistry';
import { addSourceIfMissing, addLayerIfMissing } from './MapDefinitionOps';

interface LoadedOverlay {
  style: any;
  sourceIdMap: Map<string, string>;
  sourceIds: string[];
  layerIds: string[];
  hasImage: boolean;
}

// Pro Overlay-ID das gecachte, geparste Style-JSON, die Zuordnung original-sourceId ->
// geprefixte uniqueSourceId, und die tatsächlich hinzugefügten Source-/Layer-IDs. Nötig, weil
// diese aus dem entfernten Style stammen und nicht zwingend der Overlay-ID entsprechen – ohne
// dieses Tracking lässt sich ein Overlay nicht zuverlässig wieder entfernen (genau das war die
// Ursache des Contours-Bugs, der gegen die falsche ID prüfte). layerIds ist kumulativ: mehrere
// add()-Aufrufe mit unterschiedlichen Layer-Teilmengen für dasselbe Overlay ergänzen sich, statt
// sich zu ersetzen.
const loaded = new Map<string, LoadedOverlay>();

const prefixed = (overlayId: string, id: string) => (id.startsWith(overlayId) ? id : `${overlayId}-${id}`);

/**
 * Gemeinsamer Loader für entfernte MapLibre-Style-Overlays (z.B. Wanderwege, Höhenlinien,
 * Karten-Layer-Toggles). Vereinheitlicht das zuvor an mehreren Stellen kopierte
 * fetch → resolveSourceUrls → registerImage+loadSprites → register/add sources+layers.
 *
 * Sprites/Sources/Layer werden in der MapRegistry eingetragen und überleben so
 * Style-Wechsel (MapRegistry.restore fügt sie erneut hinzu).
 */
export const OverlayLoader = {
  isLoaded(overlayId: string): boolean {
    return loaded.has(overlayId);
  },

  /**
   * Lädt den Style unter `styleUrl` als Overlay und fügt Layer hinzu. Ohne `opts.layerIds`:
   * alle Layer des Styles (Default, unverändertes Verhalten). Mit `opts.layerIds`: nur die
   * angegebene Teilmenge — mehrere Aufrufe mit unterschiedlichen Teilmengen für dasselbe Overlay
   * ergänzen sich kumulativ, statt sich zu ersetzen. Sources werden immer vollständig beim
   * ersten Aufruf für ein Overlay hinzugefügt (gemeinsame Infrastruktur, unabhängig von der
   * Layer-Teilmenge). Wirft bei Fetch-/Parse-Fehlern – der Aufrufer entscheidet über
   * Fehlerbehandlung (z.B. Toast).
   */
  async add(
    map: maplibregl.Map,
    overlayId: string,
    styleUrl: string,
    opts?: { signal?: AbortSignal; layerIds?: string[] }
  ): Promise<void> {
    // isStyleLoaded() wird erst true, wenn ALLE Sources ihre initialen Tiles geladen haben
    // (nicht nur der Style-JSON geparst ist). Bei großen Basemaps (z.B. "Basemap At", ~2.4 GB
    // PMTiles) ist das hier oft noch nicht der Fall. Auf ein erneutes 'style.load'-Event zu
    // warten hängt für immer, da dieses Event schon gefeuert hat und ohne weiteren
    // setStyle()-Aufruf nicht erneut feuert. Stattdessen pollen, bis der Style wirklich fertig
    // geladen ist.
    if (!map.isStyleLoaded()) {
      await new Promise<void>(resolve => {
        const check = () => {
          if (map.isStyleLoaded()) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
    }

    let entry = loaded.get(overlayId);

    if (!entry) {
      const res = await fetch(styleUrl, opts?.signal ? { signal: opts.signal } : undefined);
      const style = await res.json();

      entry = { style, sourceIdMap: new Map(), sourceIds: [], layerIds: [], hasImage: false };
      loaded.set(overlayId, entry);

      if (style.sprite) {
        MapRegistry.registerImage(overlayId, style.sprite, styleUrl);
        await MapCore.loadSprites(map, style.sprite, styleUrl);
        entry.hasImage = true;
      }

      const resolvedSources = MapCore.resolveSourceUrls(style.sources || {}, styleUrl);
      for (const [sourceId, def] of Object.entries(resolvedSources)) {
        const uniqueSourceId = prefixed(overlayId, sourceId);
        entry.sourceIdMap.set(sourceId, uniqueSourceId);
        MapRegistry.registerSource(uniqueSourceId, def);
        addSourceIfMissing(map, uniqueSourceId, def);
        entry.sourceIds.push(uniqueSourceId);
      }
    }

    const style = entry.style;
    const wantedLayerIds: string[] = opts?.layerIds ?? (style.layers || []).map((l: any) => l.id);

    for (const layerId of wantedLayerIds) {
      const uniqueLayerId = prefixed(overlayId, layerId);
      if (entry.layerIds.includes(uniqueLayerId)) continue;

      const layerDef = (style.layers || []).find((l: any) => l.id === layerId);
      if (!layerDef) continue;

      const newLayer = { ...layerDef, id: uniqueLayerId };
      if (newLayer.source && entry.sourceIdMap.has(newLayer.source)) {
        newLayer.source = entry.sourceIdMap.get(newLayer.source);
      }
      MapRegistry.registerLayer(uniqueLayerId, newLayer);
      addLayerIfMissing(map, newLayer);
      entry.layerIds.push(uniqueLayerId);
    }
  },

  /**
   * Entfernt Layer eines Overlays. Ohne `opts.layerIds`: alle Layer (Default, unverändertes
   * Verhalten), danach auch Sources + Sprite-Image. Mit `opts.layerIds`: nur die angegebene
   * Teilmenge — werden dadurch ALLE Layer des Overlays entfernt (letzte Teilmenge
   * ausgeschaltet), werden automatisch auch Sources + Sprite-Image mit entfernt.
   */
  remove(map: maplibregl.Map, overlayId: string, opts?: { layerIds?: string[] }): void {
    const entry = loaded.get(overlayId);
    if (!entry) return;

    const toRemove = opts?.layerIds
      ? opts.layerIds.map(id => prefixed(overlayId, id))
      : entry.layerIds.slice();

    for (const layerId of toRemove) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      MapRegistry.unregisterLayer(layerId);
      entry.layerIds = entry.layerIds.filter(id => id !== layerId);
    }

    if (entry.layerIds.length === 0) {
      for (const sourceId of entry.sourceIds) {
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        MapRegistry.unregisterSource(sourceId);
      }
      if (entry.hasImage) MapRegistry.unregisterImage(overlayId);
      loaded.delete(overlayId);
    }
  },

  /**
   * Tracking für eine neue Karteninstanz zurücksetzen. Wird beim Seitenwechsel zusammen mit
   * MapRegistry.clear() aufgerufen; die alten IDs gehörten zur zerstörten Karte.
   */
  reset(): void {
    loaded.clear();
  },
};
```

- [ ] **Step 2: Verify no type errors and the full suite still passes**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; full suite passes unchanged (no test file covers `OverlayLoader.ts`)

- [ ] **Step 3: Commit**

```bash
git add src/lib/OverlayLoader.ts
git commit -m "feat(map): generalize OverlayLoader with layer-subset support (U1b)"
```

---

### Task 5: Migrate `MapPage.ts`

**Files:**
- Modify: `src/pages/MapPage.ts`

**Interfaces:**
- Consumes: `OverlayLoader.add`/`OverlayLoader.remove` (Task 4).

No automated test for this task — `MapPage.ts` has no existing test file. Verified by `npx tsc --noEmit && npm test` and the manual browser check in Task 6.

- [ ] **Step 1: Swap the `MapRegistry` import for `OverlayLoader`**

Replace:

```ts
import { MapRegistry } from '../lib/MapRegistry';
```

with:

```ts
import { OverlayLoader } from '../lib/OverlayLoader';
```

- [ ] **Step 2: Remove the four now-unused fields**

Replace:

```ts
export class MapPageController extends BasePageController {
    private map?: maplibregl.Map;
    private activeLayers = new Map<string, Set<string>>();
    private overlayMetadata = new Map<string, { url: string }>();
    private cachedStyles = new Map<string, any>();
    private styleFetchPromises = new Map<string, Promise<any>>();
```

with:

```ts
export class MapPageController extends BasePageController {
    private map?: maplibregl.Map;
```

- [ ] **Step 3: Drop the `onRestore` callback from `MapCore.init`**

Replace:

```ts
            this.map = MapCore.init(
                mounts.map,
                basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
                async (m) => {
                    await this.reapplyActiveOverlays(m);
                }
            );
```

with:

```ts
            this.map = MapCore.init(
                mounts.map,
                basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json'
            );
```

- [ ] **Step 4: Remove the `overlayMetadata.set` call from the sidebar callback**

Replace:

```ts
            initSidebar(mounts.sidebar, overlays,
                async (overlayId, overlayUrl, layerIds, _layerType, checked) => {
                    if (this.map) {
                        // Store metadata for restoration
                        if (checked) this.overlayMetadata.set(overlayId, { url: overlayUrl });
                        await this.toggleLayer(overlayId, overlayUrl, layerIds, checked, this.map);
                    }
                },
                undefined,
                undefined,
                layersMeta.layers
            );
```

with:

```ts
            initSidebar(mounts.sidebar, overlays,
                async (overlayId, overlayUrl, layerIds, _layerType, checked) => {
                    if (this.map) {
                        await this.toggleLayer(overlayId, overlayUrl, layerIds, checked, this.map);
                    }
                },
                undefined,
                undefined,
                layersMeta.layers
            );
```

- [ ] **Step 5: Remove `reapplyActiveOverlays` and `getStyle` entirely**

Delete this whole method:

```ts
    private async reapplyActiveOverlays(m: maplibregl.Map) {
        console.log('[MapPageController] Re-applying active overlays...');
        const promises = Array.from(this.activeLayers.entries()).map(async ([overlayId, layers]) => {
            const meta = this.overlayMetadata.get(overlayId);
            if (meta) {
                // Hier rufen wir toggleLayer auf, was die Ressourcen in der MapRegistry registriert.
                // Da toggleLayer im Checked-Modus auch direkt zur Karte hinzufügt, ist dies doppelt sicher.
                return this.toggleLayer(overlayId, meta.url, Array.from(layers), true, m);
            }
        });
        await Promise.all(promises);
    }

```

Delete this whole method too:

```ts
    /**
     * Cache-Layer für Style-Files der Overlays.
     */
    private async getStyle(overlayId: string, url: string): Promise<any> {
        if (this.cachedStyles.has(overlayId)) return this.cachedStyles.get(overlayId);
        if (this.styleFetchPromises.has(overlayId)) return this.styleFetchPromises.get(overlayId);

        const promise = fetch(url, { signal: this.signal })
            .then(r => r.json())
            .then(style => {
                this.cachedStyles.set(overlayId, style);
                return style;
            })
            .finally(() => {
                // In-Flight-Eintrag immer entfernen – auch bei Fehler/Abort, sonst bliebe
                // ein rejektetes Promise dauerhaft gecacht und jeder Retry schlüge fehl.
                this.styleFetchPromises.delete(overlayId);
            });
        this.styleFetchPromises.set(overlayId, promise);
        return promise;
    }

```

- [ ] **Step 6: Replace `toggleLayer` with the thin wrapper**

Replace the entire existing `toggleLayer` method (from `private async toggleLayer(overlayId: string, overlayUrl: string, layerIds: string[], checked: boolean, m: maplibregl.Map) {` through its closing `}`) with:

```ts
    /**
     * Schaltet einzelne Layer oder Gruppen ein/aus über den gemeinsamen OverlayLoader.
     */
    private async toggleLayer(overlayId: string, overlayUrl: string, layerIds: string[], checked: boolean, m: maplibregl.Map) {
        try {
            if (checked) {
                await OverlayLoader.add(m, overlayId, overlayUrl, { signal: this.signal, layerIds });
            } else {
                OverlayLoader.remove(m, overlayId, { layerIds });
            }
            m.triggerRepaint();
        } catch (err) {
            console.error(`[MapPageController] toggleLayer error:`, err);
        }
    }
```

- [ ] **Step 7: Verify no type errors and the full suite still passes**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors (this also confirms no leftover references to the removed fields/methods — `noUnusedLocals`/`noUnusedParameters` would fail the build otherwise); full suite passes unchanged (note the exact pass count for Task 6's changelog entry)

- [ ] **Step 8: Commit**

```bash
git add src/pages/MapPage.ts
git commit -m "refactor(map): MapPage.toggleLayer migrated onto the generalized OverlayLoader (U1b/U7)"
```

---

### Task 6: Manual browser verification + docs

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `TODO.md`
- Modify: `TODO_ARCHIVE.md`

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Manually verify on `/karte`**

1. Open the layer sidebar. Find an overlay that has more than one selectable layer checkbox under the same overlay (check `layersMeta.layers` structure from `https://tiles.oe5ith.at/layers.json` if unsure which one qualifies).
2. Turn on one layer checkbox of that overlay. Confirm it renders. Check the Network tab: the overlay's style.json was fetched once.
3. Turn on a second, different layer checkbox of the **same** overlay. Confirm both render, and the style.json was **not** re-fetched (reused from cache).
4. Turn off the first checkbox. Confirm only that layer disappears, the second stays, and the shared source/sprite is **not** removed yet.
5. Turn off the second (last) checkbox. Confirm the layer disappears **and** the shared source is now removed (Network tab or `map.getSource(...)` via console — no leftover source).
6. Turn an overlay on, then switch the basemap (topbar) to "Basemap At" (the large PMTiles basemap that previously triggered the `isStyleLoaded()` bug). Confirm the overlay survives the switch and is still visible — this is the regression test for the bug the moved `isStyleLoaded()` wait fixes.
7. No console errors during any of the above.

- [ ] **Step 3: Manually verify on `/coords`**

1. Toggle the "Wanderwege" (hiking) overlay on, then off, then on again. Confirm it still works exactly as before (this overlay uses the whole-style `OverlayLoader.add`/`remove` calls with no `layerIds`, so this is the regression check that the generalization didn't change that path).
2. No console errors.

- [ ] **Step 4: Update `CHANGELOG.md`**

Get the current timestamp:

Run: `date '+%Y-%m-%d %H:%M'`

Insert a new `## [Unreleased] - <TIMESTAMP>` block at the top of `CHANGELOG.md` (above the existing most-recent block — one block per change, do not merge into an existing one):

```markdown
## [Unreleased] - <TIMESTAMP>

### Geändert
- **MapRegistry-Dreifach-Buchhaltung vereinfacht** (U7 + U1b, [docs/superpowers/specs/2026-07-06-map-registry-bookkeeping-design.md](./docs/superpowers/specs/2026-07-06-map-registry-bookkeeping-design.md)). `MapPage.ts`s `activeLayers`/`overlayMetadata`/`cachedStyles`/`styleFetchPromises`/`getStyle`/`reapplyActiveOverlays` entfielen vollständig — `toggleLayer` ist jetzt ein dünner Wrapper um den dafür generalisierten `OverlayLoader` (neu: optionale Layer-Teilmenge pro Overlay, kumulative Buchhaltung, gecachtes Style-JSON). Die Wiederherstellung nach einem Basemap-Wechsel läuft jetzt wie bei allen anderen Seiten allein über `MapRegistry.restore()`. Der zuvor an 4 Stellen (`MapRegistry.restore`, `MapPage.toggleLayer`, `OverlayLoader.add`, `MapCore.ensureGeoJsonLayer`) duplizierte „Guard + `JSON.parse(JSON.stringify())` + Add"-Code ist jetzt ein gemeinsamer Helper (`src/lib/MapDefinitionOps.ts`). Das `isStyleLoaded()`-Polling (behebt ein früher gefundenes Bug: RD-Pins verschwanden dauerhaft bei Basemap-Wechsel auf die große „Basemap At"-PMTiles) ist von `MapPage.toggleLayer` in `OverlayLoader.add()` gewandert — profitiert jetzt auch Coords' Wanderwege-Overlay. Live verifiziert (`/karte`: Mehrfach-Layer-Toggle innerhalb eines Overlays, Basemap-Wechsel-Regression; `/coords`: Wanderwege-Toggle unverändert).

`npx tsc --noEmit && npm test` grün (<PASS COUNT>).
```

Run the full suite once more to get the exact pass count for the line above:

Run: `npm test`

- [ ] **Step 5: Update `TODO.md`**

Remove both the `U7` and `U1b` lines from the "Cleanup / Vereinheitlichung" list:

```markdown
- [ ] U7 MapRegistry-Buchhaltung vereinfachen (Dreifach-Buchhaltung `activeLayers`/`overlayMetadata`/`MapRegistry`)
- [ ] U1b `MapPage.toggleLayer` in `OverlayLoader` generalisieren (ID-Prefixing + Layer-Subset)
```

- [ ] **Step 6: Add a new dated section to `TODO_ARCHIVE.md`**

Check whether `TODO_ARCHIVE.md` already has a `## Unreleased (<today's date>)` heading (it does if any other work landed today) — if so, add the `### U7 + U1b: ...` subsection under that existing heading; otherwise create a new `## Unreleased (<today's date>)` heading above the next-most-recent one. Content:

```markdown
### U7 + U1b: MapRegistry-Dreifach-Buchhaltung vereinfacht
- [x] `MapPage.ts` war die einzige Stelle mit Dreifach-Buchhaltung (`activeLayers` +
  `overlayMetadata` + `MapRegistry`) — `OverlayLoader.ts` hatte das Problem mit einer
  schlankeren Buchhaltung längst gelöst. `OverlayLoader` generalisiert (optionale
  Layer-Teilmenge pro Overlay, kumulative Buchhaltung, gecachtes Style-JSON),
  `MapPage.toggleLayer` darauf migriert — `activeLayers`/`overlayMetadata`/`cachedStyles`/
  `styleFetchPromises`/`getStyle`/`reapplyActiveOverlays` entfallen vollständig, Restore läuft
  jetzt einheitlich über `MapRegistry.restore()`. Zusätzlich den an 4 Stellen duplizierten
  „Guard + `JSON.parse(JSON.stringify())` + Add"-Code in `src/lib/MapDefinitionOps.ts`
  zusammengefasst. Das `isStyleLoaded()`-Polling (behebt den früher gefundenen
  „RD-Pins verschwinden bei Basemap-Wechsel auf Basemap At"-Bug) ist von `MapPage` in
  `OverlayLoader.add()` gewandert, profitiert jetzt auch Coords' Wanderwege-Overlay. Design:
  `docs/superpowers/specs/2026-07-06-map-registry-bookkeeping-design.md`. Live im Browser
  verifiziert (`/karte`: Mehrfach-Layer-Toggle innerhalb eines Overlays inkl. Basemap-Wechsel-
  Regression; `/coords`: Wanderwege-Toggle unverändert). `npx tsc --noEmit && npm test` grün
  (<PASS COUNT>).
```

- [ ] **Step 7: Commit**

```bash
git add CHANGELOG.md TODO.md TODO_ARCHIVE.md
git commit -m "docs: log U7 + U1b MapRegistry bookkeeping simplification in changelog and TODO archive"
```
