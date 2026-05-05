import { initTopbar } from '../components/Topbar';
import { initSidebar } from '../components/Sidebar';
import { MapCore } from '../lib/MapCore';
import { MapLegend } from '../lib/MapLegend';

export interface MapItem {
  name: string;
  type: string;
  style: { url: string };
  file: { url: string };
}

interface Inventory {
  maps: MapItem[];
}

export const initMapPage = async (container: HTMLElement) => {
  // Inventar laden
  const [invRes, layersRes] = await Promise.all([
    fetch('https://tiles.oe5ith.at/inventory.json'),
    fetch('https://tiles.oe5ith.at/layers.json')
  ]);
  
  const inventory: Inventory = await invRes.json();
  const layersMeta = await layersRes.json();
  
  const basemaps = inventory.maps.filter(m => m.type === 'basemap');
  const overlays = inventory.maps.filter(m => m.type === 'overlay');

  // Basis-Layout
  container.innerHTML = `
    <div id="topbar-mount"></div>
    <div class="layout">
      <div id="sidebar-mount"></div>
      <main id="map" class="full-map">
        ${MapCore.getAttributionHtml()}
      </main>
      <div class="map-legend" id="map-legend" style="display:none;">
        <div class="map-legend-title"></div>
        <div class="map-legend-entries"></div>
      </div>
    </div>
  `;

  const mapContainer = document.getElementById('map')!;
  const topbarMount = document.getElementById('topbar-mount')!;
  const sidebarMount = document.getElementById('sidebar-mount')!;

  // Map Initialization via Core
  const map = MapCore.init(mapContainer, basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');

  // Legend Initialization
  const legend = new MapLegend('#map-legend');
  legend.setTitle('Karten-Layer');

  // Initiales Anwenden von Terrain/Hillshade (falls global aktiviert)
  map.once('style.load', () => MapCore.reapplyBaseLayers());

  // Overlay Management State
  const activeLayers = new Map<string, Set<string>>();
  const cachedStyles = new Map<string, any>();
  const styleFetchPromises = new Map<string, Promise<any>>();

  /**
   * Safe Style Fetching with internal promise caching to prevent parallel redundant fetches.
   */
  const getStyle = async (overlayId: string, url: string): Promise<any> => {
    if (cachedStyles.has(overlayId)) return cachedStyles.get(overlayId);
    if (styleFetchPromises.has(overlayId)) return styleFetchPromises.get(overlayId);

    const promise = fetch(url).then(r => r.json()).then(style => {
      cachedStyles.set(overlayId, style);
      styleFetchPromises.delete(overlayId);
      return style;
    });
    styleFetchPromises.set(overlayId, promise);
    return promise;
  };

  const toggleLayer = async (overlayId: string, overlayUrl: string, layerIds: string[], checked: boolean) => {
    if (!map.isStyleLoaded()) {
      await new Promise(resolve => map.once('style.load', resolve));
    }

    const style = await getStyle(overlayId, overlayUrl);
    if (!style) return;

    for (const layerId of layerIds) {
      // Logic: If the layerId already starts with overlayId, don't prefix again.
      const uniqueLayerId = layerId.startsWith(overlayId) ? layerId : `${overlayId}-${layerId}`;

      if (checked) {
        // Ensure source is added
        if (style.sources) {
          for (const [srcId, srcDef] of Object.entries(style.sources)) {
            const uniqueSrcId = srcId.startsWith(overlayId) ? srcId : `${overlayId}-${srcId}`;
            if (!map.getSource(uniqueSrcId)) {
              try {
                map.addSource(uniqueSrcId, srcDef as any);
              } catch (e) {
                // If parallel call added it between check and add, ignore
                if (!map.getSource(uniqueSrcId)) console.error(e);
              }
            }
          }
        }

        // Load Sprites if any (loadSprites is idempotent via map.hasImage)
        if (style.sprite) {
          await MapCore.loadSprites(map, style.sprite, overlayUrl);
        }

        // Add Layer
        const layerDef = style.layers.find((l: any) => l.id === layerId);
        if (layerDef && !map.getLayer(uniqueLayerId)) {
          const newLayer = { ...layerDef, id: uniqueLayerId };
          if (newLayer.source && style.sources[newLayer.source]) {
            newLayer.source = newLayer.source.startsWith(overlayId) ? newLayer.source : `${overlayId}-${newLayer.source}`;
          }
          try {
            map.addLayer(newLayer);
          } catch (e) {
            if (!map.getLayer(uniqueLayerId)) console.error(e);
          }
        }

        // Update state
        if (!activeLayers.has(overlayId)) activeLayers.set(overlayId, new Set());
        activeLayers.get(overlayId)!.add(layerId);

      } else {
        // Remove Layer
        if (map.getLayer(uniqueLayerId)) {
          map.removeLayer(uniqueLayerId);
        }

        // Update state
        const layers = activeLayers.get(overlayId);
        if (layers) {
          layers.delete(layerId);
          // If no layers left, remove sources
          if (layers.size === 0) {
            activeLayers.delete(overlayId);
            if (style.sources) {
              for (const srcId in style.sources) {
                const uniqueSrcId = srcId.startsWith(overlayId) ? srcId : `${overlayId}-${srcId}`;
                if (map.getSource(uniqueSrcId)) {
                  map.removeSource(uniqueSrcId);
                }
              }
            }
          }
        }
      }
    }
  };

  const reapplyAll = async () => {
    await MapCore.reapplyBaseLayers(async () => {
      for (const [overlayId, layers] of activeLayers.entries()) {
        const overlay = overlays.find(o => o.name.toLowerCase().replace(/\s+/g, '-') === overlayId);
        if (overlay) {
          await toggleLayer(overlayId, overlay.style.url, Array.from(layers), true);
        }
      }
    });
  };

  // Initialize Components
  initTopbar(topbarMount, basemaps, (url) => {
    map.setStyle(url);
    map.once('style.load', () => reapplyAll());
  }, () => legend.toggle());

  initSidebar(sidebarMount, overlays, 
    async (overlayId, overlayUrl, layerIds, _layerType, checked) => {
      await toggleLayer(overlayId, overlayUrl, layerIds, checked);
    }, 
    (_overlayId, _overlayUrl, _checked) => {
      // Bulk toggle logic is handled by individual onLayerToggle calls in Sidebar.ts
    },
    undefined,
    layersMeta.layers // Pass the layers metadata
  );
};
