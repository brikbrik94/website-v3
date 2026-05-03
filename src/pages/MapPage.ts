import { initTopbar } from '../components/Topbar';
import { initSidebar } from '../components/Sidebar';
import { MapCore } from '../lib/MapCore';

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
  const response = await fetch('https://tiles.oe5ith.at/inventory.json');
  const inventory: Inventory = await response.json();
  const basemaps = inventory.maps.filter(m => m.type === 'basemap');
  const overlays = inventory.maps.filter(m => m.type === 'overlay');

  // Basis-Layout
  container.innerHTML = `
    <div id="topbar-mount"></div>
    <div class="layout">
      <div id="sidebar-mount"></div>
      <main id="map" style="flex: 1; height: 100%; position: relative; min-width: 0;">
        ${MapCore.getAttributionHtml()}
      </main>
    </div>
  `;

  const mapContainer = document.getElementById('map')!;
  const topbarMount = document.getElementById('topbar-mount')!;
  const sidebarMount = document.getElementById('sidebar-mount')!;

  // Map Initialization via Core
  const map = MapCore.init(mapContainer, basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');

  // Initiales Anwenden von Terrain/Hillshade (falls global aktiviert)
  map.once('style.load', () => MapCore.reapplyBaseLayers());

  // Overlay Management State
  // activeLayers: overlayId -> Set of active layerIds
  const activeLayers = new Map<string, Set<string>>();
  // cachedStyles: overlayId -> full style object
  const cachedStyles = new Map<string, any>();

  const toggleLayer = async (overlayId: string, overlayUrl: string, layerId: string, checked: boolean) => {
    if (!map.isStyleLoaded()) {
      await new Promise(resolve => map.once('style.load', resolve));
    }

    let style = cachedStyles.get(overlayId);
    if (!style) {
      const res = await fetch(overlayUrl);
      style = await res.json();
      cachedStyles.set(overlayId, style);
    }

    const uniqueLayerId = `${overlayId}-${layerId}`;

    if (checked) {
      // Ensure source is added
      if (style.sources) {
        for (const [srcId, srcDef] of Object.entries(style.sources)) {
          const uniqueSrcId = `${overlayId}-${srcId}`;
          if (!map.getSource(uniqueSrcId)) {
            map.addSource(uniqueSrcId, srcDef as any);
          }
        }
      }

      // Load Sprites if any
      if (style.sprite) {
        await MapCore.loadSprites(map, style.sprite, overlayUrl);
      }

      // Add Layer
      const layerDef = style.layers.find((l: any) => l.id === layerId);
      if (layerDef && !map.getLayer(uniqueLayerId)) {
        const newLayer = { ...layerDef, id: uniqueLayerId };
        if (newLayer.source && style.sources[newLayer.source]) {
          newLayer.source = `${overlayId}-${newLayer.source}`;
        }
        map.addLayer(newLayer);
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
              const uniqueSrcId = `${overlayId}-${srcId}`;
              if (map.getSource(uniqueSrcId)) {
                map.removeSource(uniqueSrcId);
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
          for (const layerId of layers) {
            await toggleLayer(overlayId, overlay.style.url, layerId, true);
          }
        }
      }
    });
  };

  // Initialize Components
  initTopbar(topbarMount, basemaps, (url) => {
    map.setStyle(url);
    map.once('style.load', () => reapplyAll());
  });

  initSidebar(sidebarMount, overlays, 
    async (overlayId, overlayUrl, layerId, _layerType, checked) => {
      await toggleLayer(overlayId, overlayUrl, layerId, checked);
    }, 
    (_overlayId, _overlayUrl, _checked) => {
      // Bulk toggle logic is handled by individual onLayerToggle calls in Sidebar.ts
      // But we could optimize it here if needed.
    }
  );
};
