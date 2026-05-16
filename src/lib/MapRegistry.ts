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
