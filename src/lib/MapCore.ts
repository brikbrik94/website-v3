import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { initTerrainManager, applyTerrainAndHillshade } from './TerrainManager';

/**
 * Zentraler Orchestrator für MapLibre Instanzen im Projekt.
 * Verhindert Code-Duplizierung und stellt CI-Konformität sicher.
 */
export const MapCore = {
  init(container: HTMLElement, styleUrl: string) {
    // Protokoll nur einmal global registrieren
    if (!(maplibregl as any)._pmtilesProtocolAdded) {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      (maplibregl as any)._pmtilesProtocolAdded = true;
    }

    const map = new maplibregl.Map({
      container,
      style: styleUrl,
      center: [14.2858, 48.3064],
      zoom: 12,
      attributionControl: false,
      maxPitch: 85
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Terrain Manager für diese Karte initialisieren
    initTerrainManager(map, 'pmtiles://https://tiles.oe5ith.at/elevation/pmtiles/at-elevation.pmtiles');

    return map;
  },

  /**
   * Fügt die CI-konforme Attribution zur Karte hinzu.
   */
  getAttributionHtml(): string {
    return `
      <div class="map-attribution">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>
        | © <a href="https://maplibre.org" target="_blank">MapLibre</a>
        | © <a href="https://basemap.at" target="_blank">basemap.at</a>
      </div>
    `;
  },

  /**
   * Hilfsfunktion um nach einem Style-Wechsel alles wiederherzustellen.
   */
  async reapplyBaseLayers(callback?: () => Promise<void>) {
    await applyTerrainAndHillshade();
    if (callback) await callback();
  },

  /**
   * Lädt Sprites aus einem Stylesheet und injiziert sie in die MapLibre Instanz.
   * Basierend auf dem funktionierenden Code der Overlays.
   */
  async loadSprites(map: maplibregl.Map, spritePath: string, styleUrl?: string) {
    const absoluteSpriteUrl = (spritePath.startsWith('http') || !styleUrl)
      ? spritePath 
      : new URL(spritePath, styleUrl).href;

    try {
      const [jsonRes, imageRes] = await Promise.all([
        fetch(`${absoluteSpriteUrl}.json`).then(r => r.json()),
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
          const imageData = ctx.getImageData(0, 0, pos.width, pos.height);
          map.addImage(id, imageData, { pixelRatio: pos.pixelRatio || 1 });
        }
      }
    } catch (err) {
      console.warn('Sprites konnten nicht geladen werden:', err);
    }
  }
};
