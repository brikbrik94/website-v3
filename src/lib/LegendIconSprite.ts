import { MARKERS_SPRITE_BASE } from './MapCore';

interface SpriteAtlasEntry {
  x: number;
  y: number;
  width: number;
  height: number;
}

type SpriteSheet = [Record<string, SpriteAtlasEntry>, HTMLImageElement];

/**
 * Fetcht/dekodiert das gemeinsame CI-Marker-Spriteset (`MapCore.MARKERS_SPRITE_BASE`) nur
 * einmal pro Session, analog `_spriteSheetCache` in MapCore.ts — aber map-unabhängig, da die
 * Kartenlegende reines DOM ist (keine `maplibregl.Map`-Instanz zum Zeitpunkt des Renderns nötig).
 */
let _sheetPromise: Promise<SpriteSheet> | null = null;

/** Fertige dataURL pro Icon-Name, damit wiederholte Legend-Re-Renders (bei jedem Layer-Toggle,
 *  siehe `MapPage._syncV3Legend()`) synchron aus dem Cache bedient werden. */
const _iconDataUrlCache = new Map<string, Promise<string | null>>();

function loadSheet(): Promise<SpriteSheet> {
  if (!_sheetPromise) {
    _sheetPromise = Promise.all([
      fetch(`${MARKERS_SPRITE_BASE}.json`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${MARKERS_SPRITE_BASE}.json`);
        return r.json() as Promise<Record<string, SpriteAtlasEntry>>;
      }),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load sprite image: ${MARKERS_SPRITE_BASE}.png`));
        img.src = `${MARKERS_SPRITE_BASE}.png`;
      }),
    ]);
    // Bei Fehlschlag aus dem Cache entfernen, sonst bliebe ein rejektetes Promise dauerhaft
    // gecacht und jeder weitere Versuch schlüge fehl (auch nach Netzwerk-Retry) — analog MapCore.
    _sheetPromise.catch(() => { _sheetPromise = null; });
  }
  return _sheetPromise;
}

/**
 * Liefert eine PNG-`dataURL` für ein Icon aus dem gemeinsamen Marker-Spriteset (z.B. "brd-pin"),
 * oder `null` bei unbekanntem Namen oder Sheet-Ladefehler. Gezeichnet wird in nativer
 * Sprite-Auflösung (keine Skalierung) — die Zielgröße im Legend-Chip steuert CSS, nicht dieses
 * Modul.
 */
export function resolveLegendIcon(iconName: string): Promise<string | null> {
  const cached = _iconDataUrlCache.get(iconName);
  if (cached) return cached;

  const promise = (async (): Promise<string | null> => {
    let atlas: Record<string, SpriteAtlasEntry>;
    let image: HTMLImageElement;
    try {
      [atlas, image] = await loadSheet();
    } catch (err) {
      console.error('[LegendIconSprite] Sprite-Sheet konnte nicht geladen werden:', err);
      return null;
    }

    const entry = atlas[iconName];
    if (!entry) return null;

    const canvas = document.createElement('canvas');
    canvas.width = entry.width;
    canvas.height = entry.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, entry.x, entry.y, entry.width, entry.height, 0, 0, entry.width, entry.height);
    return canvas.toDataURL();
  })();

  _iconDataUrlCache.set(iconName, promise);
  // Fehlgeschlagene/unbekannte Auflösungen nicht dauerhaft cachen, damit ein späterer Aufruf
  // (z.B. nach Sheet-Netzwerk-Retry) erneut versucht statt permanent null zu liefern.
  promise.then((result) => { if (result === null) _iconDataUrlCache.delete(iconName); });

  return promise;
}

/** Test-only: setzt beide Caches zurück, damit Tests isoliert voneinander laufen. */
export function resetLegendIconCache(): void {
  _sheetPromise = null;
  _iconDataUrlCache.clear();
}
