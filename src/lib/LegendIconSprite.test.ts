// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveLegendIcon, resetLegendIconCache } from './LegendIconSprite';

// Simuliert Bild-Laden ohne echtes Netzwerk (happy-dom feuert weder onload noch onerror für
// echte <img src>-URLs von selbst, siehe Recherche in der Konversation).
let currentFakeImageMode: 'load' | 'error' = 'load';

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';
  private _src = '';
  get src() { return this._src; }
  set src(v: string) {
    this._src = v;
    queueMicrotask(() => {
      if (currentFakeImageMode === 'load') this.onload?.();
      else this.onerror?.();
    });
  }
}

function stubImage() {
  vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
}

function stubCanvas(drawImageCalls: unknown[][]) {
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: (...args: unknown[]) => drawImageCalls.push(args),
        }),
        toDataURL: () => 'data:image/png;base64,FAKE',
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  });
}

describe('resolveLegendIcon', () => {
  const atlas = {
    'brd-pin': { x: 2, y: 2, width: 64, height: 80, pixelRatio: 1, sdf: false },
  };

  beforeEach(() => {
    resetLegendIconCache();
    currentFakeImageMode = 'load';
    stubImage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('draws the atlas sub-rectangle for a known icon and returns the canvas dataURL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => atlas }));
    const drawImageCalls: unknown[][] = [];
    stubCanvas(drawImageCalls);

    const result = await resolveLegendIcon('brd-pin');

    expect(result).toBe('data:image/png;base64,FAKE');
    expect(drawImageCalls).toHaveLength(1);
    expect(drawImageCalls[0].slice(1)).toEqual([2, 2, 64, 80, 0, 0, 64, 80]);
  });

  it('returns null for an icon name missing from the sprite atlas, without touching the canvas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => atlas }));
    const drawImageCalls: unknown[][] = [];
    stubCanvas(drawImageCalls);

    const result = await resolveLegendIcon('does-not-exist');

    expect(result).toBeNull();
    expect(drawImageCalls).toHaveLength(0);
  });

  it('returns null when the sprite sheet JSON fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));

    const result = await resolveLegendIcon('brd-pin');

    expect(result).toBeNull();
  });

  it('caches a resolved icon so a second call does not re-fetch the sheet', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => atlas });
    vi.stubGlobal('fetch', fetchMock);
    stubCanvas([]);

    await resolveLegendIcon('brd-pin');
    await resolveLegendIcon('brd-pin');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries the sheet fetch on the next call after a previous fetch failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => atlas });
    vi.stubGlobal('fetch', fetchMock);
    stubCanvas([]);

    const first = await resolveLegendIcon('brd-pin');
    const second = await resolveLegendIcon('brd-pin');

    expect(first).toBeNull();
    expect(second).toBe('data:image/png;base64,FAKE');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
