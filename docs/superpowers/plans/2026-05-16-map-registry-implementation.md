# Map Resource Registry & Basemap Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure map information (layers, pins, routes) persists during base map changes and that the selected base map is remembered across pages.

**Architecture:** A centralized `MapRegistry` manages active map resources and re-applies them automatically after `style.load`. A `BasemapStore` persists the selected base map URL.

**Tech Stack:** TypeScript, MapLibre GL JS, Vite.

---

### Task 1: Basemap Persistence Store

**Files:**
- Create: `src/lib/BasemapStore.ts`

- [ ] **Step 1: Create BasemapStore module**

```typescript
const BASEMAP_KEY = 'oe5ith-last-basemap';
const DEFAULT_BASEMAP = 'https://tiles.oe5ith.at/basemaps/styles/at/style.json';

export const BasemapStore = {
  get(): string {
    return localStorage.getItem(BASEMAP_KEY) || DEFAULT_BASEMAP;
  },
  set(url: string) {
    localStorage.setItem(BASEMAP_KEY, url);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/BasemapStore.ts
git commit -m "feat: add BasemapStore for persistence"
```

---

### Task 2: Map Resource Registry

**Files:**
- Create: `src/lib/MapRegistry.ts`

- [ ] **Step 1: Create MapRegistry module**

```typescript
import maplibregl from 'maplibre-gl';

interface ManagedSource {
  id: string;
  definition: any;
}

interface ManagedLayer {
  id: string;
  definition: any;
  beforeId?: string;
}

interface ManagedImage {
  id: string;
  url: string;
  styleUrl?: string;
}

const sources = new Map<string, ManagedSource>();
const layers = new Map<string, ManagedLayer>();
const images = new Map<string, ManagedImage>();

export const MapRegistry = {
  registerSource(id: string, definition: any) {
    sources.set(id, { id, definition });
  },
  
  registerLayer(id: string, definition: any, beforeId?: string) {
    layers.set(id, { id, definition, beforeId });
  },

  registerImage(id: string, url: string, styleUrl?: string) {
    images.set(id, { id, url, styleUrl });
  },

  unregisterLayer(id: string) {
    layers.delete(id);
  },

  clear() {
    sources.clear();
    layers.clear();
    images.clear();
  },

  async restore(map: maplibregl.Map, loadSpritesFn: (map: maplibregl.Map, path: string, style?: string) => Promise<void>) {
    console.log(`[MapRegistry] Restoring ${sources.size} sources, ${images.size} image sets, and ${layers.size} layers`);

    // 1. Load Images (Sprites)
    for (const img of images.values()) {
      await loadSpritesFn(map, img.url, img.styleUrl);
    }

    // 2. Add Sources
    for (const src of sources.values()) {
      if (!map.getSource(src.id)) {
        try {
          map.addSource(src.id, src.definition);
        } catch (e) {
          console.warn(`[MapRegistry] Failed to restore source ${src.id}`, e);
        }
      }
    }

    // 3. Add Layers
    for (const layer of layers.values()) {
      if (!map.getLayer(layer.id)) {
        try {
          map.addLayer(layer.definition, layer.beforeId);
        } catch (e) {
          console.warn(`[MapRegistry] Failed to restore layer ${layer.id}`, e);
        }
      }
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/MapRegistry.ts
git commit -m "feat: add MapRegistry for centralized map resource management"
```

---

### Task 3: MapCore Integration

**Files:**
- Modify: `src/lib/MapCore.ts`

- [ ] **Step 1: Update MapCore to use BasemapStore and MapRegistry**

```typescript
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { initTerrainManager, applyTerrainAndHillshade } from './TerrainManager';
import { MapRegistry } from './MapRegistry';
import { BasemapStore } from './BasemapStore';

export const MapCore = {
  init(container: HTMLElement, styleUrl?: string, onRestore?: (map: maplibregl.Map) => Promise<void> | void) {
    if (!(maplibregl as any)._pmtilesProtocolAdded) {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      (maplibregl as any)._pmtilesProtocolAdded = true;
    }

    // Use persisted style if none provided
    const finalStyle = styleUrl || BasemapStore.get();

    const map = new maplibregl.Map({
      container,
      style: finalStyle,
      center: [14.2858, 48.3064],
      zoom: 12,
      attributionControl: { compact: true },
      maxPitch: 85
    });

    const restore = async () => {
      console.log('[MapCore] Style loaded, starting restoration sequence...');
      try {
        await applyTerrainAndHillshade();
        
        // Restore managed resources
        await MapRegistry.restore(map, MapCore.loadSprites);

        if (onRestore) {
          await onRestore(map);
          console.log('[MapCore] Custom restore sequence completed.');
        }
      } catch (err) {
        console.error('[MapCore] Restoration failed:', err);
      }
    };

    map.on('style.load', () => {
      console.log('[MapCore] style.load event detected');
      restore();
    });

    map.on('error', (e) => console.error('[MapCore] Map error:', e));
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    initTerrainManager(map, 'pmtiles://https://tiles.oe5ith.at/elevation/pmtiles/at-elevation.pmtiles');

    if (map.isStyleLoaded()) {
      setTimeout(restore, 0);
    }

    return map;
  },

  // ... loadSprites and ensureGeoJsonLayer remain mostly same but can be simplified ...
  // update loadSprites to use absolute paths correctly
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/MapCore.ts
git commit -m "refactor: integrate MapRegistry and BasemapStore into MapCore"
```

---

### Task 4: Topbar Basemap Sync

**Files:**
- Modify: `src/components/Topbar.ts`

- [ ] **Step 1: Update Topbar to sync with BasemapStore**

```typescript
// Inside initTopbar:
// In the item click listener for basemaps:
const styleUrl = item.getAttribute('data-style')!;
BasemapStore.set(styleUrl); // Save to store
onBasemapChange(styleUrl, name);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Topbar.ts
git commit -m "feat: sync Topbar basemap selection with BasemapStore"
```

---

### Task 5: MapPage Refactoring

**Files:**
- Modify: `src/pages/MapPage.ts`

- [ ] **Step 1: Refactor toggleLayer to use MapRegistry**

```typescript
// Inside toggleLayer:
if (checked) {
  // Register Sources
  if (style.sources) {
    for (const [srcId, srcDef] of Object.entries(style.sources)) {
      const uniqueSrcId = srcId.startsWith(overlayId) ? srcId : `${overlayId}-${srcId}`;
      MapRegistry.registerSource(uniqueSrcId, srcDef);
    }
  }
  // Register Image
  if (style.sprite) {
    MapRegistry.registerImage(overlayId, style.sprite, overlayUrl);
  }
  // Register Layer
  const layerDef = style.layers.find((l: any) => l.id === layerId);
  if (layerDef) {
    const newLayer = { ...layerDef, id: uniqueLayerId };
    if (newLayer.source && style.sources[newLayer.source]) {
      newLayer.source = newLayer.source.startsWith(overlayId) ? newLayer.source : `${overlayId}-${newLayer.source}`;
    }
    MapRegistry.registerLayer(uniqueLayerId, newLayer);
  }
} else {
  MapRegistry.unregisterLayer(uniqueLayerId);
  // Optional: cleanup sources if no layers left
}

// Trigger immediate apply if map is ready
await MapRegistry.restore(m, MapCore.loadSprites);
```

- [ ] **Step 2: Clear Registry on Page Init**

```typescript
MapRegistry.clear(); // Start fresh on each page init
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/MapPage.ts
git commit -m "refactor: use MapRegistry in MapPage"
```

---

### Task 6: NAH and Routing Page Refactoring

**Files:**
- Modify: `src/pages/NahPage.ts`
- Modify: `src/pages/RoutingPage.ts`

- [ ] **Step 1: Register NAH Line layers and sources as Managed**

```typescript
// In NahPage.ts ensureNahLayers:
MapRegistry.registerSource('nah-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: 0 });
MapRegistry.registerLayer('nah-lines', { ...layerDef });
```

- [ ] **Step 2: Update Managed Source data when results change**

```typescript
// In performCalculation:
const sourceDef = { type: 'geojson', data: { type: 'FeatureCollection', features: lineFeatures } };
MapRegistry.registerSource('nah-lines', sourceDef);
// Apply immediately
const source = map.getSource('nah-lines') as maplibregl.GeoJSONSource;
if (source) source.setData(sourceDef.data);
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/NahPage.ts src/pages/RoutingPage.ts
git commit -m "refactor: use MapRegistry in NAH and Routing pages"
```

---

### Task 7: Verification

- [ ] **Step 1: Manual Test Map Page**
  - Load /karte
  - Enable an overlay (e.g. Weather)
  - Change Basemap to Satellite
  - Verify overlay is still there.

- [ ] **Step 2: Manual Test NAH Page**
  - Load /nah
  - Click on map to calculate
  - Change Basemap
  - Verify lines and markers are still there.

- [ ] **Step 3: Manual Test Persistence**
  - Change Basemap to Satellite on /karte
  - Navigate to /nah
  - Verify it starts with Satellite basemap.
