import { describe, it, expect } from 'vitest';
import { MapCore } from './MapCore';

describe('MapCore.createPinLayer', () => {
  it('applies defaults (size 0.5, anchor bottom) and no paint when no color/halo given', () => {
    const layer = MapCore.createPinLayer('layer-1', 'source-1', { icon: 'ci-pin' }) as any;

    expect(layer.id).toBe('layer-1');
    expect(layer.type).toBe('symbol');
    expect(layer.source).toBe('source-1');
    expect(layer.layout).toEqual({
      'icon-image': 'ci-pin',
      'icon-size': 0.5,
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
    });
    expect(layer.paint).toEqual({});
  });

  it('applies custom size/anchor and color/halo paint options', () => {
    const layer = MapCore.createPinLayer('layer-2', 'source-2', {
      icon: 'ci-symbol-location',
      size: 0.75,
      anchor: 'center',
      color: '#ff0000',
      haloColor: '#ffffff',
      haloWidth: 2,
    }) as any;

    expect(layer.layout).toEqual({
      'icon-image': 'ci-symbol-location',
      'icon-size': 0.75,
      'icon-anchor': 'center',
      'icon-allow-overlap': true,
    });
    expect(layer.paint).toEqual({
      'icon-color': '#ff0000',
      'icon-halo-color': '#ffffff',
      'icon-halo-width': 2,
    });
  });

  it('omits halo paint properties when only color is given', () => {
    const layer = MapCore.createPinLayer('layer-3', 'source-3', {
      icon: 'ci-pin',
      color: '#00ff00',
    }) as any;

    expect(layer.paint).toEqual({ 'icon-color': '#00ff00' });
  });
});

describe('MapCore.setPointSource', () => {
  function mockMap(source?: { setData: (data: unknown) => void }) {
    return { getSource: () => source } as any;
  }

  it('sets a Point feature on the source when given coordinates', () => {
    const calls: unknown[] = [];
    const map = mockMap({ setData: (data) => calls.push(data) });

    MapCore.setPointSource(map, 'src', [14.28, 48.3]);

    expect(calls).toEqual([
      { type: 'Feature', geometry: { type: 'Point', coordinates: [14.28, 48.3] }, properties: {} },
    ]);
  });

  it('clears the source (empty FeatureCollection) when lngLat is null', () => {
    const calls: unknown[] = [];
    const map = mockMap({ setData: (data) => calls.push(data) });

    MapCore.setPointSource(map, 'src', null);

    expect(calls).toEqual([{ type: 'FeatureCollection', features: [] }]);
  });

  it('does nothing if the source does not exist yet', () => {
    const map = mockMap(undefined);

    expect(() => MapCore.setPointSource(map, 'missing', [1, 2])).not.toThrow();
  });
});
