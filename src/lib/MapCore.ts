import maplibregl, { type LayerSpecification, type StyleImageMetadata } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { initTerrainManager, applyTerrainInfrastructure } from './TerrainManager';
import { BasemapStore } from './BasemapStore';
import { MapRegistry } from './MapRegistry';
import { addSourceIfMissing, addLayerIfMissing } from './MapDefinitionOps';

// Modul-lokale Variable um die Protokoll-Instanz am Leben zu halten
let _pmtilesProtocol: Protocol | null = null;

// Zentrale Konstante für das gemeinsame CI-Marker-Spriteset, statt an drei Stellen
// (NahMapLayers, RoutingMapLayers, CoordsPage) identisch dupliziert zu werden.
export const MARKERS_SPRITE_BASE = 'https://tiles.oe5ith.at/assets/sprites/oe5ith-markers/sprite';

// Cache für geladene Sprite-Sheets (JSON-Atlas + dekodiertes Bild), keyed nach
// Sprite-URL inkl. HiDPI-Suffix. Ein Style-Reload (Basemap-Wechsel) verwirft die per
// map.addImage() hinzugefügten Bilder der alten Style-Instanz, sodass sie für die neue
// Instanz erneut hinzugefügt werden müssen – das ist unvermeidbar. Der Netzwerk-Fetch +
// die Bild-Dekodierung des Sprite-Sheets selbst sind aber pro Sprite-URL immer identisch
// und wurden bisher bei jedem Style-Reload unnötig wiederholt (wirkt sich direkt auf
// Core Web Vitals LCP/INP beim Karten-Init aus, siehe CLAUDE.md → Standards-Referenzen).
const _spriteSheetCache = new Map<string, Promise<[Record<string, any>, HTMLImageElement]>>();

/**
 * Zentraler Orchestrator für MapLibre Instanzen im Projekt.
 * Verhindert Code-Duplizierung und stellt CI-Konformität sicher.
 */
export const MapCore = {
  init(container: HTMLElement, styleUrl?: string, onRestore?: (map: maplibregl.Map) => Promise<void> | void) {
    // Protokoll nur einmal global registrieren
    if (!_pmtilesProtocol) {
      _pmtilesProtocol = new Protocol();
      maplibregl.addProtocol("pmtiles", _pmtilesProtocol.tile);
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

    let isRestoring = false;

    const restore = async (source: string) => {
      if (isRestoring) return;
      isRestoring = true;
      
      console.log(`[MapCore] Restoration sequence started (Trigger: ${source})`);
      
      // We wait two frames to ensure MapLibre has processed the style change
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          try {
            // 1. Terrain & Hillshade (Base infrastructure)
            await applyTerrainInfrastructure();

            // 2. Custom Page Restore Callback (Where pages register their overlays/sources)
            if (onRestore) {
              console.debug('[MapCore] Executing page-specific onRestore callback...');
              await onRestore(map);
            }

            // 3. Central Registry Restore (Ensures EVERYTHING in registry is on the map)
            console.debug('[MapCore] Final MapRegistry restoration pass...');
            await MapRegistry.restore(map, MapCore.loadSprites);
            
            map.triggerRepaint();
            console.log('[MapCore] Restoration sequence completed successfully.');
          } catch (err) {
            console.error('[MapCore] Restoration sequence failed:', err);
          } finally {
            isRestoring = false;
          }
        });
      });
    };

    // Listen to multiple events for maximum reliability
    map.on('style.load', () => restore('style.load'));

    map.on('error', (e) => {
      const errMsg = e.error?.message || e.error || 'Unknown error';
      console.error(`[MapCore] Map error: ${errMsg}`, e);
    });

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
    const regSource = MapRegistry.getSource(sourceId);
    if (regSource) {
      addSourceIfMissing(map, sourceId, regSource.definition);
    }
    addLayerIfMissing(map, layerDef);
  },

  /**
   * Baut die LayerSpecification für einen einzelnen CI-Pin/Marker (Symbol-Layer über einer
   * Point-GeoJSON-Source). Ersetzt die zuvor an drei Stellen (Nah-/Routing-/Coords-Pins)
   * fast identisch kopierten Layer-Definitionen.
   */
  createPinLayer(layerId: string, sourceId: string, opts: {
    icon: string;
    size?: number;
    anchor?: 'center' | 'bottom' | 'top' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    color?: string;
    haloColor?: string;
    haloWidth?: number;
  }): LayerSpecification {
    const paint: Record<string, unknown> = {};
    if (opts.color) paint['icon-color'] = opts.color;
    if (opts.haloColor) paint['icon-halo-color'] = opts.haloColor;
    if (opts.haloWidth !== undefined) paint['icon-halo-width'] = opts.haloWidth;

    return {
      id: layerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'icon-image': opts.icon,
        'icon-size': opts.size ?? 0.5,
        'icon-anchor': opts.anchor ?? 'bottom',
        'icon-allow-overlap': true,
      },
      paint,
    } as LayerSpecification;
  },

  /**
   * Setzt die Point-GeoJSON-Source eines Pins auf eine Koordinate, oder leert sie (lngLat
   * null) – z.B. um einen Pin auszublenden. Ersetzt die zuvor mehrfach kopierte
   * getSource+setData-Logik (Nah-/Routing-/Coords-Pins).
   */
  setPointSource(map: maplibregl.Map, sourceId: string, lngLat: [number, number] | null) {
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const data = lngLat
      ? { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: lngLat }, properties: {} }
      : { type: 'FeatureCollection' as const, features: [] };
    source.setData(data);
  },

  /**
   * Resolves relative URLs in map source definitions (url and tiles) against a base URL.
   * Also ensures 'pmtiles://' identifiers don't get unwanted trailing slashes from URL().
   */
  resolveSourceUrls(sources: any, baseUrl: string): any {
    const resolvedSources = JSON.parse(JSON.stringify(sources));
    
    const resolveUrl = (u: string) => {
      if (!u) return u;
      
      // Case 1: Already absolute HTTP(S) URL
      if (u.startsWith('http://') || u.startsWith('https://')) return u;
      
      // Case 2: PMTiles URL
      if (u.startsWith('pmtiles://')) {
        const innerUrl = u.slice(10);
        // If inner URL is already absolute, don't touch it
        if (innerUrl.startsWith('http://') || innerUrl.startsWith('https://')) return u;
        
        try {
          // Resolve relative path against baseUrl
          const resolvedInner = new URL(innerUrl, baseUrl).href;
          return `pmtiles://${resolvedInner}`;
        } catch (e) {
          return u;
        }
      }

      // Case 3: Other relative URLs (e.g. GeoJSON files)
      try {
        return new URL(u, baseUrl).href;
      } catch (e) {
        return u;
      }
    };

    for (const src of Object.values(resolvedSources) as any) {
      if (src.url) src.url = resolveUrl(src.url);
      if (Array.isArray(src.tiles)) {
        src.tiles = src.tiles.map((u: string) => resolveUrl(u));
      }
    }

    return resolvedSources;
  },

  /**
   * Lädt Sprites aus einem Stylesheet und injiziert sie in die MapLibre Instanz.
   * Basierend auf dem funktionierenden Code der Overlays.
   */
  async loadSprites(map: maplibregl.Map, spritePath: string, styleUrl?: string) {
    const absoluteSpriteUrl = (spritePath.startsWith('http') || !styleUrl)
      ? spritePath
      : new URL(spritePath, styleUrl).href;

    // Eine Sprite-Variante (1x oder @2x) laden. Wirft bei fehlendem .json/.png.
    const fetchVariant = (baseUrl: string) => Promise.all([
      fetch(`${baseUrl}.json`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${baseUrl}.json`);
        return r.json() as Promise<Record<string, any>>;
      }),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load sprite image: ${baseUrl}.png`));
        img.src = `${baseUrl}.png`;
      })
    ] as const);

    // MapLibre lädt für HiDPI-Displays nativ das @2x-Sprite (Bilder mit pixelRatio 2 →
    // korrekte Anzeigegröße). Beim manuellen Nachladen müssen wir das nachbilden, sonst
    // werden die Symbole auf Retina-Displays doppelt so groß gerendert.
    const wantHiDpi = typeof window !== 'undefined' && window.devicePixelRatio >= 1.5;
    const cacheKey = `${absoluteSpriteUrl}${wantHiDpi ? '@2x' : ''}`;

    try {
      // Sprite-Sheet (JSON-Atlas + dekodiertes Bild) nur einmal pro URL fetchen/dekodieren,
      // nicht bei jedem Style-Reload neu (siehe _spriteSheetCache-Kommentar oben).
      let sheetPromise = _spriteSheetCache.get(cacheKey);
      if (!sheetPromise) {
        console.log(`[MapCore] Loading sprites from ${absoluteSpriteUrl}${wantHiDpi ? '@2x' : ''}`);
        sheetPromise = wantHiDpi
          // @2x bevorzugen, bei fehlendem @2x-Sprite (z.B. 404) auf 1x zurückfallen.
          ? fetchVariant(`${absoluteSpriteUrl}@2x`).catch(() => fetchVariant(absoluteSpriteUrl))
          : fetchVariant(absoluteSpriteUrl);
        _spriteSheetCache.set(cacheKey, sheetPromise);
        // Bei Fehlschlag aus dem Cache entfernen, sonst bliebe ein rejektetes Promise
        // dauerhaft gecacht und jeder weitere Versuch schlüge fehl (auch nach Netzwerk-Retry).
        sheetPromise.catch(() => _spriteSheetCache.delete(cacheKey));
      } else {
        console.debug(`[MapCore] Reusing cached sprite sheet for ${cacheKey}`);
      }

      const [jsonRes, imageRes] = await sheetPromise;

      for (const [id, pos] of Object.entries(jsonRes) as [string, any][]) {
        if (map.hasImage(id)) continue;

        const canvas = document.createElement('canvas');
        canvas.width = pos.width;
        canvas.height = pos.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.drawImage(
          imageRes,
          pos.x, pos.y, pos.width, pos.height,
          0, 0, pos.width, pos.height
        );

        // Alle Sprite-Metadaten weiterreichen. stretchX/stretchY/content steuern
        // icon-text-fit (Label-Hintergründe mit Innenabstand) – fehlen sie, wird die
        // im Stylesheet definierte Skalierung ignoriert und der Hintergrund klebt am Text.
        const options: Partial<StyleImageMetadata> = {
          pixelRatio: pos.pixelRatio || 1,
          sdf: Boolean(pos.sdf),
        };
        if (pos.stretchX) options.stretchX = pos.stretchX;
        if (pos.stretchY) options.stretchY = pos.stretchY;
        if (pos.content) options.content = pos.content;
        if (pos.textFitWidth) options.textFitWidth = pos.textFitWidth;
        if (pos.textFitHeight) options.textFitHeight = pos.textFitHeight;

        try {
          const imageData = ctx.getImageData(0, 0, pos.width, pos.height);
          map.addImage(id, imageData, options);
        } catch (e) {
          console.error(`[MapCore] Failed to add image ${id} to map:`, e);
        }
      }
      console.log(`[MapCore] Sprites loaded successfully from ${absoluteSpriteUrl}`);
    } catch (err) {
      console.warn('[MapCore] Sprites konnten nicht geladen werden:', err);
    }
  }
};
