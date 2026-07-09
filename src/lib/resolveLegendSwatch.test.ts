import { describe, it, expect, vi } from 'vitest';
import type { LayerSpecification } from 'maplibre-gl';
import { resolveLegendSwatch, swatchTypeForLayerType } from './resolveLegendSwatch';

describe('resolveLegendSwatch', () => {
  it('resolves a literal line-color as type line', () => {
    const layer = { id: 'l1', type: 'line', source: 's', paint: { 'line-color': '#ff0000' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'line', color: '#ff0000' });
  });

  it('resolves a literal fill-color as type area', () => {
    const layer = { id: 'l2', type: 'fill', source: 's', paint: { 'fill-color': '#00ff00' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'area', color: '#00ff00' });
  });

  it('resolves a literal fill-extrusion-color as type area', () => {
    const layer = { id: 'l2b', type: 'fill-extrusion', source: 's', paint: { 'fill-extrusion-color': '#123456' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'area', color: '#123456' });
  });

  it('resolves a literal circle-color as type dot', () => {
    const layer = { id: 'l3', type: 'circle', source: 's', paint: { 'circle-color': '#0000ff' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'dot', color: '#0000ff' });
  });

  it('resolves a literal icon-color (symbol) as type dot', () => {
    const layer = { id: 'l4', type: 'symbol', source: 's', paint: { 'icon-color': '#abcdef' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'dot', color: '#abcdef' });
  });

  it('extracts the fallback arm of a match expression', () => {
    const layer = {
      id: 'l5', type: 'symbol', source: 's',
      paint: { 'icon-color': ['match', ['get', 'status'], 'active', '#22c55e', 'inactive', '#ef4444', '#888888'] }
    } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'dot', color: '#888888' });
  });

  it('returns color: null and warns for an unresolvable expression', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layer = {
      id: 'l6', type: 'line', source: 's',
      paint: { 'line-color': ['interpolate', ['linear'], ['zoom'], 0, '#000000', 10, '#ffffff'] }
    } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'line', color: null });
    expect(warnSpy).toHaveBeenCalledWith('[resolveLegendSwatch] Farbe nicht auflösbar für Layer', 'l6');
    warnSpy.mockRestore();
  });

  it('returns color: null when paint is missing entirely', () => {
    const layer = { id: 'l7', type: 'line', source: 's' } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'line', color: null });
  });

  it('returns null for a non-legend-able layer type (raster)', () => {
    const layer = { id: 'l8', type: 'raster', source: 's' } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toBeNull();
  });

  it('returns null for a non-legend-able layer type (background)', () => {
    const layer = { id: 'l9', type: 'background' } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toBeNull();
  });
});

describe('swatchTypeForLayerType', () => {
  it("maps 'line' to 'line'", () => {
    expect(swatchTypeForLayerType('line')).toBe('line');
  });

  it("maps 'fill' to 'area'", () => {
    expect(swatchTypeForLayerType('fill')).toBe('area');
  });

  it("maps 'fill-extrusion' to 'area'", () => {
    expect(swatchTypeForLayerType('fill-extrusion')).toBe('area');
  });

  it("maps 'circle' to 'dot'", () => {
    expect(swatchTypeForLayerType('circle')).toBe('dot');
  });

  it("maps 'symbol' to 'dot'", () => {
    expect(swatchTypeForLayerType('symbol')).toBe('dot');
  });

  it("returns null for 'raster'", () => {
    expect(swatchTypeForLayerType('raster')).toBeNull();
  });

  it("returns null for 'background'", () => {
    expect(swatchTypeForLayerType('background')).toBeNull();
  });
});
