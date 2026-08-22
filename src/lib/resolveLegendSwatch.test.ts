import { describe, it, expect, vi } from 'vitest';
import type { LayerSpecification } from 'maplibre-gl';
import { resolveLegendSwatch, swatchTypeForLayerType, resolveSwatchFromLayersMetaColor, resolveLegendSwatchBranches, computeSwatchDedupKey, resolveLegendItemsForGroup } from './resolveLegendSwatch';

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

  it('extracts the fallback (else) arm of a case expression', () => {
    const layer = {
      id: 'l5b', type: 'line', source: 's',
      paint: { 'line-color': ['case', ['==', ['get', 'x'], 'y'], '#111111', '#222222'] }
    } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'line', color: '#222222' });
  });

  it('recursively unwraps a nested match expression inside a case fallback (real OpenSkiMap pattern)', () => {
    const layer = {
      id: 'l5c', type: 'fill', source: 's',
      paint: {
        'fill-color': [
          'case', ['==', ['get', 'difficulty_convention'], 'europe'],
          ['match', ['get', 'difficulty'], 'novice', '#3498db', 'easy', '#3498db', '#95a5a6'],
          ['match', ['get', 'difficulty'], 'novice', '#2ecc71', 'easy', '#2ecc71', '#95a5a6']
        ]
      }
    } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'area', color: '#95a5a6' });
  });

  it('falls back to text-color for a symbol layer with no icon-color (text-only label layer)', () => {
    const layer = {
      id: 'l5d', type: 'symbol', source: 's',
      paint: { 'text-color': '#2c3e50', 'text-halo-color': '#ffffff' }
    } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'dot', color: '#2c3e50' });
  });

  it('prefers icon-color over text-color for a symbol layer that has both', () => {
    const layer = {
      id: 'l5e', type: 'symbol', source: 's',
      paint: { 'icon-color': '#111111', 'text-color': '#222222' }
    } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'dot', color: '#111111' });
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

  it("maps 'icon' to 'icon'", () => {
    expect(swatchTypeForLayerType('icon')).toBe('icon');
  });

  it("returns null for 'raster'", () => {
    expect(swatchTypeForLayerType('raster')).toBeNull();
  });

  it("returns null for 'background'", () => {
    expect(swatchTypeForLayerType('background')).toBeNull();
  });
});

describe('resolveSwatchFromLayersMetaColor', () => {
  it('resolves a literal color for a fill group as type area', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', '#3b82f6')).toEqual({ type: 'area', color: '#3b82f6' });
  });

  it('resolves a literal color for a line group as type line', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#111111')).toEqual({ type: 'line', color: '#111111' });
  });

  it('extracts the fallback arm of a match expression', () => {
    const color = ['match', ['get', 'AA_MINS'], 15, '#10b981', 30, '#84cc16', '#3b82f6'];
    expect(resolveSwatchFromLayersMetaColor('fill', color)).toEqual({ type: 'area', color: '#3b82f6' });
  });

  it('returns color: null for an unresolvable expression, type still known', () => {
    const color = ['interpolate', ['linear'], ['zoom'], 0, '#000000', 10, '#ffffff'];
    expect(resolveSwatchFromLayersMetaColor('line', color)).toEqual({ type: 'line', color: null });
  });

  it('returns null for a non-legend-able type (raster)', () => {
    expect(resolveSwatchFromLayersMetaColor('raster', '#ffffff')).toBeNull();
  });

  it('returns null when type is undefined', () => {
    expect(resolveSwatchFromLayersMetaColor(undefined, '#ffffff')).toBeNull();
  });

  it('resolves an icon group to a generic fallback FA marker, not the raw sprite name', () => {
    expect(resolveSwatchFromLayersMetaColor('icon', null)).toEqual({
      type: 'icon',
      color: null,
      icon: 'fa-solid fa-location-dot',
    });
  });

  it('does not set icon for non-icon swatch types', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', '#3b82f6')).toEqual({ type: 'area', color: '#3b82f6' });
  });

  it('resolves a full line-cased swatch when all 4 fields are present', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#3b82f6', 3, null, 'hsl(0, 0%, 100%)', 5)).toEqual({
      type: 'line-cased',
      color: '#3b82f6',
      width: 3,
      outline_color: 'hsl(0, 0%, 100%)',
      outline_width: 5,
    });
  });

  it('falls back to plain line when outline is set but color is unresolvable (ski-lifts case: zoom-interpolate expression)', () => {
    const color = ['interpolate', ['linear'], ['zoom'], 0, '#000000', 10, '#ffffff'];
    expect(resolveSwatchFromLayersMetaColor('line', color, 3, null, 'hsl(0, 0%, 100%)', 5)).toEqual({
      type: 'line',
      color: null,
      width: 3,
    });
  });

  it('falls back to plain line when outline is set but width is missing', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#3b82f6', null, null, 'hsl(0, 0%, 100%)', 5)).toEqual({
      type: 'line',
      color: '#3b82f6',
    });
  });

  it('resolves a plain line swatch with only width', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#3b82f6', 5)).toEqual({ type: 'line', color: '#3b82f6', width: 5 });
  });

  it('resolves a plain line swatch with only dasharray', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#3b82f6', null, [2, 1])).toEqual({
      type: 'line', color: '#3b82f6', dasharray: [2, 1],
    });
  });

  it('resolves an area swatch with both outline fields', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', '#3b82f6', null, null, '#1d4ed8', 1)).toEqual({
      type: 'area', color: '#3b82f6', outline_color: '#1d4ed8', outline_width: 1,
    });
  });

  it('drops a lone outline_width without outline_color for area (ski-runs-downhill/-nordic case)', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', null, null, null, null, 5)).toEqual({ type: 'area', color: null });
  });

  it('drops a lone outline_color without outline_width for area', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', '#3b82f6', null, null, '#1d4ed8', null)).toEqual({
      type: 'area', color: '#3b82f6',
    });
  });
});

describe('computeSwatchDedupKey', () => {
  it('gives identical instances of the same overlay+template+color the same key', () => {
    // z.B. autobahnen: A1 und A10, beide template "strassen", identische Farbe
    const swatch = { type: 'line' as const, color: '#0000FF' };
    expect(computeSwatchDedupKey('autobahnen', 'strassen', swatch))
      .toBe(computeSwatchDedupKey('autobahnen', 'strassen', swatch));
  });

  it('keeps different overlays with the same template+color distinct (gemeinden vs. bezirke)', () => {
    const swatch = { type: 'line' as const, color: '#3b82f6' };
    const gemeinden = computeSwatchDedupKey('gemeinden', 'gebiete', swatch);
    const bezirke = computeSwatchDedupKey('bezirke', 'gebiete', swatch);
    expect(gemeinden).not.toBe(bezirke);
  });

  it('keeps different colors within the same overlay+template distinct (leitstellen-bereiche)', () => {
    const key1 = computeSwatchDedupKey('leitstellen-bereiche', 'leitstellen', { type: 'area', color: '#10b981' });
    const key2 = computeSwatchDedupKey('leitstellen-bereiche', 'leitstellen', { type: 'area', color: '#8b5cf6' });
    expect(key1).not.toBe(key2);
  });

  it('handles a null color without throwing', () => {
    expect(computeSwatchDedupKey('rd', 'rd', { type: 'dot', color: null })).toBe('rd:rd:dot:null:null:null:null:null');
  });

  it('keeps different widths within the same overlay+template+type+color distinct', () => {
    const key1 = computeSwatchDedupKey('x', 'y', { type: 'line', color: '#111111', width: 3 });
    const key2 = computeSwatchDedupKey('x', 'y', { type: 'line', color: '#111111', width: 5 });
    expect(key1).not.toBe(key2);
  });

  it('keeps different dasharrays distinct', () => {
    const key1 = computeSwatchDedupKey('x', 'y', { type: 'line', color: '#111111', dasharray: [2, 1] });
    const key2 = computeSwatchDedupKey('x', 'y', { type: 'line', color: '#111111', dasharray: [4, 2] });
    expect(key1).not.toBe(key2);
  });

  it('keeps different outline fields distinct', () => {
    const key1 = computeSwatchDedupKey('x', 'y', { type: 'area', color: '#111111', outline_color: '#fff', outline_width: 1 });
    const key2 = computeSwatchDedupKey('x', 'y', { type: 'area', color: '#111111', outline_color: '#fff', outline_width: 2 });
    expect(key1).not.toBe(key2);
  });
});

describe('resolveLegendSwatchBranches', () => {
  const statusLabels = {
    active: 'Einsatzbereit',
    inactive: 'Außer Dienst (Betriebszeit)',
    offseason: 'Außer Saison',
  };

  it('extracts all match branches with mapped labels (NAH status pattern)', () => {
    const layer = {
      id: 'nah-stations-layer', type: 'symbol', source: 's',
      paint: {
        'icon-color': [
          'match', ['get', 'status'],
          'active', '#22c55e',
          'inactive', '#ef4444',
          'offseason', '#888888',
          '#22c55e'
        ]
      }
    } as LayerSpecification;

    expect(resolveLegendSwatchBranches(layer, statusLabels)).toEqual([
      { type: 'dot', color: '#22c55e', label: 'Einsatzbereit' },
      { type: 'dot', color: '#ef4444', label: 'Außer Dienst (Betriebszeit)' },
      { type: 'dot', color: '#888888', label: 'Außer Saison' },
    ]);
  });

  it('does not include the fallback arm as its own branch', () => {
    const layer = {
      id: 'l1', type: 'line', source: 's',
      paint: { 'line-color': ['match', ['get', 'x'], 'a', '#111111', '#222222'] }
    } as LayerSpecification;

    expect(resolveLegendSwatchBranches(layer, { a: 'A' })).toEqual([
      { type: 'line', color: '#111111', label: 'A' },
    ]);
  });

  it('skips branches with no matching label and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layer = {
      id: 'l2', type: 'symbol', source: 's',
      paint: { 'icon-color': ['match', ['get', 'status'], 'active', '#22c55e', 'unknown', '#000000', '#22c55e'] }
    } as LayerSpecification;

    expect(resolveLegendSwatchBranches(layer, { active: 'Einsatzbereit' })).toEqual([
      { type: 'dot', color: '#22c55e', label: 'Einsatzbereit' },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      '[resolveLegendSwatchBranches] Kein Label für match-Wert', 'unknown', 'auf Layer', 'l2'
    );
    warnSpy.mockRestore();
  });

  it('returns null for a literal (non-match) color expression', () => {
    const layer = { id: 'l3', type: 'symbol', source: 's', paint: { 'icon-color': '#abcdef' } } as LayerSpecification;
    expect(resolveLegendSwatchBranches(layer, statusLabels)).toBeNull();
  });

  it('returns null for a case expression (unsupported)', () => {
    const layer = {
      id: 'l4', type: 'line', source: 's',
      paint: { 'line-color': ['case', ['==', ['get', 'x'], 'y'], '#111111', '#222222'] }
    } as LayerSpecification;
    expect(resolveLegendSwatchBranches(layer, { y: 'Y' })).toBeNull();
  });

  it('returns null for a non-legend-able layer type', () => {
    const layer = { id: 'l5', type: 'raster', source: 's' } as LayerSpecification;
    expect(resolveLegendSwatchBranches(layer, {})).toBeNull();
  });

  it('returns null when no branch has a matching label', () => {
    const layer = {
      id: 'l6', type: 'symbol', source: 's',
      paint: { 'icon-color': ['match', ['get', 'status'], 'active', '#22c55e', '#22c55e'] }
    } as LayerSpecification;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveLegendSwatchBranches(layer, { unrelated: 'X' })).toBeNull();
    warnSpy.mockRestore();
  });
});

describe('resolveLegendItemsForGroup', () => {
  const skiSections = new Map([
    ['ski-difficulty-v1', {
      id: 'ski-difficulty-v1',
      label: 'Schwierigkeitsgrade',
      items: [
        { label: 'Novice', color: 'hsl(125, 100%, 33%)' },
        { label: 'Easy', color: 'hsl(208, 100%, 33%)' },
      ],
    }],
  ]);

  it('resolves items from legend_sections when legend_scale_id is set and version >= 1.1', () => {
    const metaGroup = { legend_scale_id: 'ski-difficulty-v1', legend_items: null };
    expect(resolveLegendItemsForGroup(metaGroup, 'openskimap', '1.1', skiSections)).toEqual({
      items: [
        { label: 'Novice', color: 'hsl(125, 100%, 33%)' },
        { label: 'Easy', color: 'hsl(208, 100%, 33%)' },
      ],
      groupKey: 'scale:ski-difficulty-v1',
    });
  });

  it('falls back to legend_items and warns when legend_scale_id is set but version is below 1.1', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const metaGroup = { legend_scale_id: 'ski-difficulty-v1', legend_items: [{ label: 'Alt', color: '#fff' }] };
    expect(resolveLegendItemsForGroup(metaGroup, 'openskimap', '1.0', skiSections)).toEqual({
      items: [{ label: 'Alt', color: '#fff' }],
      groupKey: 'openskimap',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      '[resolveLegendItemsForGroup] legend_scale_id gesetzt, aber version-Gate (>=1.1) nicht erfüllt:', '1.0'
    );
    warnSpy.mockRestore();
  });

  it('falls back to legend_items and warns when legend_scale_id has no matching legend_sections entry', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const metaGroup = { legend_scale_id: 'unknown-scale', legend_items: [{ label: 'Alt', color: '#fff' }] };
    expect(resolveLegendItemsForGroup(metaGroup, 'openskimap', '1.1', skiSections)).toEqual({
      items: [{ label: 'Alt', color: '#fff' }],
      groupKey: 'openskimap',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      '[resolveLegendItemsForGroup] legend_scale_id ohne passenden legend_scales-Eintrag:', 'unknown-scale'
    );
    warnSpy.mockRestore();
  });

  it('uses classic legend_items when legend_scale_id is not set (unchanged pre-1.1 behavior)', () => {
    const metaGroup = { legend_scale_id: null, legend_items: [{ label: '0-15 min', color: '#22c55e' }] };
    expect(resolveLegendItemsForGroup(metaGroup, 'anfahrtszeit', '1.1', skiSections)).toEqual({
      items: [{ label: '0-15 min', color: '#22c55e' }],
      groupKey: 'anfahrtszeit',
    });
  });

  it('returns null when neither legend_scale_id nor legend_items is set', () => {
    const metaGroup = { legend_scale_id: null, legend_items: null };
    expect(resolveLegendItemsForGroup(metaGroup, 'bezirke', '1.1', skiSections)).toBeNull();
  });

  it('returns null for an empty legend_items array', () => {
    const metaGroup = { legend_scale_id: null, legend_items: [] };
    expect(resolveLegendItemsForGroup(metaGroup, 'bezirke', '1.1', skiSections)).toBeNull();
  });
});
