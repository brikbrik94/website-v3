import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { initTerrainManager, applyTerrainAndHillshade } from './TerrainManager';
import { BasemapStore } from './BasemapStore';
import { MapRegistry } from './MapRegistry';

/**
 * Zentraler Orchestrator für MapLibre Instanzen im Projekt.
 * Verhindert Code-Duplizierung und stellt CI-Konformität sicher.
 */
export const MapCore = {
  init(container: HTMLElement, styleUrl?: string, onRestore?: (map: maplibregl.Map) => Promise<void> | void) {
    // Protokoll nur einmal global registrieren
    if (!(maplibregl as any)._pmtilesProtocolAdded) {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      (maplibregl as any)._pmtilesProtocolAdded = true;
    }

    // Prioritize persistence. If styleUrl is provided, it acts as a secondary fallback.
    const effectiveStyle = BasemapStore.get() || styleUrl;

    const map = new maplibregl.Map({
      container,
      style: effectiveStyle,
      center: [14.2858, 48.3064],
      zoom: 12,
      attributionControl: { compact: true },
      maxPitch: 85
    });

    const restore = async () => {
      console.log('[MapCore] Style loaded, starting restoration sequence...');
      try {
        // 1. Terrain & Hillshade (Base Infrastructure)
        await applyTerrainAndHillshade();

        // 2. Registry Restore (Persistierte Layer/Sources/Images)
        await MapRegistry.restore(map, MapCore.loadSprites);
        
        // 3. Custom Restore Callback
        if (onRestore) {
          await onRestore(map);
          console.log('[MapCore] Custom restore sequence completed.');
        }
      } catch (err) {
        console.error('[MapCore] Restoration failed:', err);
      }
    };

    // Style.load is the primary event for setStyle()
    map.on('style.load', () => {
      console.log('[MapCore] style.load event detected');
      restore();
    });

    map.on('error', (e) => console.error('[MapCore] Map error:', e));

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Terrain Manager für diese Karte initialisieren
    initTerrainManager(map, 'pmtiles://https://tiles.oe5ith.at/elevation/pmtiles/at-elevation.pmtiles');

    // Falls der Style bereits geladen ist (z.B. Cache), triggere restore manuell
    if (map.isStyleLoaded()) {
      console.log('[MapCore] Style already loaded at init, triggering manual restore');
      setTimeout(restore, 0);
    }

    return map;
  },

  /**
   * Hilfsfunktion um nach einem manuellen Style-Wechsel oder bei Bedarf alles wiederherzustellen.
   * Wird durch den automatischen Listener in init() weitestgehend obsolet, bleibt aber für 
   * Spezialfälle (z.B. diff: true) bestehen.
   */
  async reapplyBaseLayers(callback?: () => Promise<void>) {
    await applyTerrainAndHillshade();
    if (callback) await callback();
  },

  /**
   * Safe helper to add a GeoJSON source and layer if they don't exist.
   * Useful for persistent overlays across style changes.
   * 
   * NOTE: This function now also registers the source/layer in the MapRegistry
   * to ensure they are restored automatically on style changes.
   */
  ensureGeoJsonLayer(map: maplibregl.Map, sourceId: string, layerDef: any) {
    // 1. Register for persistence (ONLY if not already registered to avoid overwriting actual data)
    if (!MapRegistry.getSource(sourceId)) {
      const sourceDef = {
        type: 'geojson' as const,
        data: { type: 'FeatureCollection' as const, features: [] },
        tolerance: 0
      };
      MapRegistry.registerSource(sourceId, sourceDef);
    }
    
    if (!MapRegistry.getLayer(layerDef.id)) {
      MapRegistry.registerLayer(layerDef.id, layerDef);
    }

    // 2. Add to current map instance if missing
    if (!map.getSource(sourceId)) {
      const regSource = MapRegistry.getSource(sourceId);
      if (regSource) {
        map.addSource(sourceId, regSource.definition);
      }
    }
    if (!map.getLayer(layerDef.id)) {
      map.addLayer(layerDef);
    }
  },

  /**
   * Lädt Sprites aus einem Stylesheet und injiziert sie in die MapLibre Instanz.
   * Basierend auf dem funktionierenden Code der Overlays.
   */
  async loadSprites(map: maplibregl.Map, spritePath: string, styleUrl?: string) {
    const absoluteSpriteUrl = (spritePath.startsWith('http') || !styleUrl)
      ? spritePath 
      : new URL(spritePath, styleUrl).href;

    console.log(`[MapCore] Loading sprites from ${absoluteSpriteUrl}`);

    try {
      const [jsonRes, imageRes] = await Promise.all([
        fetch(`${absoluteSpriteUrl}.json`).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status} for ${absoluteSpriteUrl}.json`);
          return r.json();
        }),
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load sprite image: ${absoluteSpriteUrl}.png`));
          img.src = `${absoluteSpriteUrl}.png`;
        })
      ]);

      for (const [id, pos] of Object.entries(jsonRes) as any) {
        if (map.hasImage(id)) continue;

        const canvas = document.createElement('canvas');
        canvas.width = pos.width;
        canvas.height = pos.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            imageRes,
            pos.x, pos.y, pos.width, pos.height,
            0, 0, pos.width, pos.height
          );
          
          const pixelRatio = pos.pixelRatio || 1;
          const isSdf = Boolean(pos.sdf);
          
          try {
            const imageData = ctx.getImageData(0, 0, pos.width, pos.height);
            map.addImage(id, imageData, { 
              pixelRatio: pixelRatio,
              sdf: isSdf
            });
            // console.debug(`[MapCore] Added image ${id} (SDF: ${isSdf}, PR: ${pixelRatio})`);
          } catch (e) {
            console.error(`[MapCore] Failed to add image ${id} to map:`, e);
          }
        }
      }
      console.log(`[MapCore] Sprites loaded successfully from ${absoluteSpriteUrl}`);
    } catch (err) {
      console.warn('[MapCore] Sprites konnten nicht geladen werden:', err);
    }
  }
};
