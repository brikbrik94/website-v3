import { initTopbar } from '../components/Topbar';
import { initSidebar } from '../components/Sidebar';
import { MapCore } from '../lib/MapCore';
import { MapLegend } from '../lib/MapLegend';
import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';
import maplibregl from 'maplibre-gl';
import { MapRegistry } from '../lib/MapRegistry';

export const initMapPage = async (container: HTMLElement) => {
  // 1. Daten laden
  const invService = InventoryService.getInstance();
  const [basemaps, layersRes] = await Promise.all([
    invService.getBasemaps(),
    fetch('https://tiles.oe5ith.at/layers.json')
  ]);
  const layersMeta = await layersRes.json();

  // 2. Basis-Layout
  const mounts = LayoutHelper.renderBaseLayout(container, { 
    withLegend: true, 
    legendTitle: 'Karten-Layer' 
  });

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

  const toggleLayer = async (overlayId: string, overlayUrl: string, layerIds: string[], checked: boolean, m: maplibregl.Map) => {
    if (!m.isStyleLoaded()) {
      await new Promise(resolve => m.once('style.load', resolve));
    }

    const style = await getStyle(overlayId, overlayUrl);
    if (!style) return;

    if (checked) {
      if (style.sources) {
        for (const [srcId, srcDef] of Object.entries(style.sources)) {
          const uniqueSrcId = srcId.startsWith(overlayId) ? srcId : `${overlayId}-${srcId}`;
          const finalDef = { ...srcDef as any };

          // URL-Fix für relative Pfade (z.B. pmtiles://at.pmtiles)
          // Wir lösen diese gegen die overlayUrl (style.json) auf.
          if (finalDef.url && !finalDef.url.startsWith('http')) {
            try {
              finalDef.url = new URL(finalDef.url, overlayUrl).href;
              console.log(`[MapPage] Resolved relative source URL: ${(srcDef as any).url} -> ${finalDef.url}`);
            } catch (e) {
              console.warn(`[MapPage] Failed to resolve relative URL: ${finalDef.url}`, e);
            }
          }
          
          MapRegistry.registerSource(uniqueSrcId, finalDef);
        }
      }

      if (style.sprite) {
        MapRegistry.registerImage(overlayId, style.sprite, overlayUrl);
      }

      for (const layerId of layerIds) {
        const uniqueLayerId = layerId.startsWith(overlayId) ? layerId : `${overlayId}-${layerId}`;
        const layerDef = style.layers.find((l: any) => l.id === layerId);
        if (layerDef) {
          const newLayer = { ...layerDef, id: uniqueLayerId };
          if (newLayer.source && style.sources[newLayer.source]) {
            newLayer.source = newLayer.source.startsWith(overlayId) ? newLayer.source : `${overlayId}-${newLayer.source}`;
          }
          MapRegistry.registerLayer(uniqueLayerId, newLayer);
          
          if (!activeLayers.has(overlayId)) activeLayers.set(overlayId, new Set());
          activeLayers.get(overlayId)!.add(layerId);
        }
      }
    } else {
      for (const layerId of layerIds) {
        const uniqueLayerId = layerId.startsWith(overlayId) ? layerId : `${overlayId}-${layerId}`;
        
        if (m.getLayer(uniqueLayerId)) m.removeLayer(uniqueLayerId);
        MapRegistry.unregisterLayer(uniqueLayerId);

        const layers = activeLayers.get(overlayId);
        if (layers) {
          layers.delete(layerId);
          if (layers.size === 0) {
            activeLayers.delete(overlayId);
            if (style.sources) {
              for (const srcId in style.sources) {
                const uniqueSrcId = srcId.startsWith(overlayId) ? srcId : `${overlayId}-${srcId}`;
                if (m.getSource(uniqueSrcId)) m.removeSource(uniqueSrcId);
                MapRegistry.unregisterSource(uniqueSrcId);
              }
            }
            MapRegistry.unregisterImage(overlayId);
          }
        }
      }
    }

    await MapRegistry.restore(m, MapCore.loadSprites);
  };

  // Map Initialization via Core
  const map = MapCore.init(
    mounts.map, 
    basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json'
  );

  // Legend Initialization
  const legend = new MapLegend(mounts.legend!);

  const overlays = await invService.getOverlays();

  // Initialize Components
  initTopbar(mounts.topbar, basemaps, (url) => {
    map.setStyle(url);
  }, () => legend.toggle());

  initSidebar(mounts.sidebar, overlays, 
    async (overlayId, overlayUrl, layerIds, _layerType, checked) => {
      await toggleLayer(overlayId, overlayUrl, layerIds, checked, map);
    }, 
    (_overlayId, _overlayUrl, _checked) => {},
    undefined,
    layersMeta.layers
  );
};
