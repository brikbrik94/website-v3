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
    console.debug(`[MapRegistry] Registering source: ${id}`);
    sources.set(id, { id, definition });
  },
  
  registerLayer(id: string, definition: any, beforeId?: string) {
    console.debug(`[MapRegistry] Registering layer: ${id} (before: ${beforeId || 'top'})`);
    layers.set(id, { id, definition, beforeId });
  },

  registerImage(id: string, url: string, styleUrl?: string) {
    console.debug(`[MapRegistry] Registering images: ${id} (${url})`);
    images.set(id, { id, url, styleUrl });
  },

  unregisterSource(id: string) {
    sources.delete(id);
  },

  unregisterLayer(id: string) {
    layers.delete(id);
  },

  unregisterImage(id: string) {
    images.delete(id);
  },

  getSource(id: string) {
    return sources.get(id);
  },

  getLayer(id: string) {
    return layers.get(id);
  },

  getImage(id: string) {
    return images.get(id);
  },

  clear() {
    console.debug(`[MapRegistry] Clearing all managed resources (${sources.size} sources, ${layers.size} layers)`);
    sources.clear();
    layers.clear();
    images.clear();
  },

  async restore(map: maplibregl.Map, loadSpritesFn: (map: maplibregl.Map, path: string, style?: string) => Promise<void>) {
    console.log(`[MapRegistry] Restoring ${sources.size} sources, ${images.size} image sets, and ${layers.size} layers`);

    // 1. Load Images (Sprites) - Parallelized with allSettled for resilience
    const imageList = Array.from(images.values());
    if (imageList.length > 0) {
      console.debug(`[MapRegistry] Loading ${imageList.length} sprite sets...`);
      await Promise.allSettled(
        imageList.map(img => loadSpritesFn(map, img.url, img.styleUrl))
      );
    }

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
    
    console.log(`[MapRegistry] Restoration completed.`);
  }
};
