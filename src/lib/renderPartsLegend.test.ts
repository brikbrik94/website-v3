import { describe, it, expect } from 'vitest';
import { findDrivingScaleId, buildChipsForRow, resolveVisibleLegend, type RenderPart, type LegendHeading } from './renderPartsLegend';
import type { LegendScale } from './resolveLegendSwatch';

const fixedLine = (value: string, dasharray: [number, number] | null = null): RenderPart => ({
  kind: 'line', color: { mode: 'fixed', value }, stroke_color: null, opacity: 1,
  width: 3, dasharray, radius: null, stroke_width: null, icon: null,
});

const scaleLine = (scale_id: string, dasharray: [number, number] | null = null): RenderPart => ({
  kind: 'line', color: { mode: 'scale', scale_id }, stroke_color: null, opacity: 1,
  width: 3, dasharray, radius: null, stroke_width: null, icon: null,
});

const scaleFill = (scale_id: string): RenderPart => ({
  kind: 'fill', color: { mode: 'scale', scale_id }, stroke_color: null, opacity: 0.25,
  width: null, dasharray: null, radius: null, stroke_width: null, icon: null,
});

const difficultyScale: LegendScale = {
  id: 'ski-difficulty-v1',
  label: 'Schwierigkeitsgrade',
  items: [
    { label: 'Novice', color: 'green' },
    { label: 'Easy', color: 'blue' },
    { label: 'Intermediate', color: 'red' },
  ],
};

describe('findDrivingScaleId', () => {
  it('returns the scale_id of the first scale-mode part', () => {
    const parts = [fixedLine('#fff'), scaleLine('ski-difficulty-v1')];
    expect(findDrivingScaleId(parts)).toBe('ski-difficulty-v1');
  });

  it('returns null when no part references a scale', () => {
    const parts = [fixedLine('#fff'), fixedLine('#000')];
    expect(findDrivingScaleId(parts)).toBeNull();
  });
});

describe('buildChipsForRow', () => {
  it('returns a single unresolved-color chip for a fixed-color render', () => {
    const render = [fixedLine('purple')];
    expect(buildChipsForRow(render, new Map())).toEqual([{ parts: render, itemColor: null }]);
  });

  it('expands into one chip per scale item when render has a scale-mode part', () => {
    const render = [scaleFill('ski-difficulty-v1')];
    const scales = new Map([['ski-difficulty-v1', difficultyScale]]);
    const chips = buildChipsForRow(render, scales);
    expect(chips).toHaveLength(3);
    expect(chips.map(c => c.itemColor)).toEqual(['green', 'blue', 'red']);
    expect(chips[0].parts).toBe(render);
  });

  it('falls back to a single unresolved chip when the referenced scale is missing from legendScalesById', () => {
    const render = [scaleLine('unknown-scale')];
    expect(buildChipsForRow(render, new Map())).toEqual([{ parts: render, itemColor: null }]);
  });
});

describe('resolveVisibleLegend', () => {
  const headings: LegendHeading[] = [
    {
      heading: 'Pisten',
      rows: [
        { label: 'Präpariert', render: [scaleLine('ski-difficulty-v1')], style_layer_ids: ['ski-runs-downhill-line'] },
        { label: 'Skitour', render: [scaleLine('ski-difficulty-v1')], style_layer_ids: ['ski-runs-skitour-line'] },
        { label: 'Freeride', render: [fixedLine('orange')], style_layer_ids: ['ski-runs-downhill-line', 'ski-runs-skitour-line'] },
      ],
    },
    {
      heading: 'Loipen',
      rows: [
        { label: 'Präpariert', render: [fixedLine('white')], style_layer_ids: ['ski-runs-nordic-line'] },
      ],
    },
  ];
  const scales = new Map([['ski-difficulty-v1', difficultyScale]]);

  it('returns only rows whose style_layer_ids intersect the active set', () => {
    const active = new Set(['ski-runs-downhill-line']);
    const visible = resolveVisibleLegend(headings, active, scales);
    expect(visible).toHaveLength(1);
    expect(visible[0].heading).toBe('Pisten');
    expect(visible[0].rows.map(r => r.label)).toEqual(['Präpariert', 'Freeride']);
  });

  it('shows a row when at least one of multiple style_layer_ids is active (union semantics)', () => {
    const active = new Set(['ski-runs-skitour-line']);
    const visible = resolveVisibleLegend(headings, active, scales);
    expect(visible[0].rows.map(r => r.label)).toEqual(['Skitour', 'Freeride']);
  });

  it('drops a heading entirely when none of its rows are visible', () => {
    const active = new Set(['ski-runs-nordic-line']);
    const visible = resolveVisibleLegend(headings, active, scales);
    expect(visible).toHaveLength(1);
    expect(visible[0].heading).toBe('Loipen');
  });

  it('returns an empty array when nothing is active', () => {
    expect(resolveVisibleLegend(headings, new Set(), scales)).toEqual([]);
  });

  it('resolves chips per visible row using the scale map', () => {
    const active = new Set(['ski-runs-downhill-line']);
    const visible = resolveVisibleLegend(headings, active, scales);
    const row = visible[0].rows.find(r => r.label === 'Präpariert')!;
    expect(row.chips.map(c => c.itemColor)).toEqual(['green', 'blue', 'red']);
  });

  it('silently excludes a row with a malformed (non-array) style_layer_ids instead of throwing', () => {
    const malformedHeadings: LegendHeading[] = [
      {
        heading: 'Kaputt',
        rows: [
          // Simuliert unvalidiertes Server-JSON (z.B. Feld fehlt/ist null statt string[]).
          { label: 'Undefined', render: [fixedLine('white')], style_layer_ids: undefined as unknown as string[] },
          { label: 'Null', render: [fixedLine('white')], style_layer_ids: null as unknown as string[] },
          { label: 'Ok', render: [fixedLine('white')], style_layer_ids: ['some-layer'] },
        ],
      },
    ];
    const active = new Set(['some-layer']);
    expect(() => resolveVisibleLegend(malformedHeadings, active, scales)).not.toThrow();
    const visible = resolveVisibleLegend(malformedHeadings, active, scales);
    expect(visible).toHaveLength(1);
    expect(visible[0].rows.map(r => r.label)).toEqual(['Ok']);
  });
});
