import maplibregl from 'maplibre-gl';
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

  // Overlay Management
  const activeOverlays = new Map<string, string>();

  const addOverlay = async (id: string, styleUrl: string) => {
    if (!map.isStyleLoaded()) {
      await new Promise(resolve => map.once('style.load', resolve));
    }

    try {
      const res = await fetch(styleUrl);
      const overlayStyle = await res.json();

      // Sprites laden via Core
      if (overlayStyle.sprite) {
        await MapCore.loadSprites(map, overlayStyle.sprite, styleUrl);
      }

      // Quellen hinzufügen
      if (overlayStyle.sources) {
        for (const [sourceId, source] of Object.entries(overlayStyle.sources)) {
          const uniqueSourceId = `${id}-${sourceId}`;
          if (!map.getSource(uniqueSourceId)) {
            map.addSource(uniqueSourceId, source as any);
          }
        }
      }

      // Layer hinzufügen
      if (overlayStyle.layers) {
        for (const layer of overlayStyle.layers) {
          if (layer.type === 'background') continue;
          const uniqueLayerId = `${id}-${layer.id}`;
          if (!map.getLayer(uniqueLayerId)) {
            const newLayer = { ...layer, id: uniqueLayerId };
            if (newLayer.source) {
              if (overlayStyle.sources && overlayStyle.sources[newLayer.source]) {
                newLayer.source = `${id}-${newLayer.source}`;
              }
            }
            map.addLayer(newLayer);
          }
        }
      }
    } catch (err) {
      console.error(`Fehler beim Laden des Overlays ${id}:`, err);
    }
  };

  const removeOverlay = (id: string) => {
    const style = map.getStyle();
    if (!style) return;
    if (style.layers) {
      style.layers.forEach(l => {
        if (l.id.startsWith(`${id}-`)) map.removeLayer(l.id);
      });
    }
    const sources = map.getStyle().sources;
    for (const sourceId in sources) {
      if (sourceId.startsWith(`${id}-`)) map.removeSource(sourceId);
    }
  };

  const reapplyAll = async () => {
    await MapCore.reapplyBaseLayers(async () => {
      for (const [id, url] of activeOverlays.entries()) {
        await addOverlay(id, url);
      }
    });
  };

  // Initialize Components
  initTopbar(topbarMount, basemaps, (url) => {
    map.setStyle(url);
    map.once('style.load', () => reapplyAll());
  });

  initSidebar(sidebarMount, overlays, (id, url, checked) => {
    if (checked) {
      activeOverlays.set(id, url);
      addOverlay(id, url);
    } else {
      activeOverlays.delete(id);
      removeOverlay(id);
    }
  });
};
