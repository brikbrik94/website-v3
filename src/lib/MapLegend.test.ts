// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { MapLegend, type AddLegendEntryOptions } from './MapLegend';

function makeLegendFixture(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = `
    <span class="map-legend-title"></span>
    <div class="map-legend-entries"></div>
  `;
  document.body.appendChild(el);
  return el;
}

describe('MapLegend.addEntry', () => {
  let legend: MapLegend;

  beforeEach(() => {
    document.body.innerHTML = '';
    legend = new MapLegend(makeLegendFixture());
  });

  it('applies entry.opacity as an inline style on the swatch', () => {
    legend.addEntry({ id: 'a', type: 'area', color: '#3b82f6', label: 'Bezirke', opacity: 0.1 });
    const marker = document.querySelector('.map-legend-area') as HTMLElement;
    expect(marker.style.opacity).toBe('0.1');
  });

  it('leaves the swatch without an inline opacity when none is given (CI default applies)', () => {
    legend.addEntry({ id: 'b', type: 'line', color: '#0000ff', label: 'Autobahn' });
    const marker = document.querySelector('.map-legend-line') as HTMLElement;
    expect(marker.style.opacity).toBe('');
  });

  it('does not set opacity on the "unknown color" fallback icon', () => {
    legend.addEntry({ id: 'c', type: 'dot', color: null, label: 'Unbekannt', opacity: 0.5 });
    expect(document.querySelector('.map-legend-unknown')).not.toBeNull();
    expect(document.querySelector('.map-legend-dot')).toBeNull();
  });

  it('renders the icon (not the "unknown color" fallback) for type: icon with color: null', () => {
    legend.addEntry({ id: 'd', type: 'icon', color: null, label: 'Liftstation', icon: 'fa-solid fa-location-dot' });
    expect(document.querySelector('.map-legend-unknown')).toBeNull();
    const marker = document.querySelector('.map-legend-icon') as HTMLElement;
    expect(marker).not.toBeNull();
    expect(marker.className).toContain('fa-solid fa-location-dot');
    expect(marker.style.color).toBe('');
  });

  it('applies entry.color as the icon color when set', () => {
    legend.addEntry({ id: 'e', type: 'icon', color: '#ff0000', label: 'Helikopter', icon: 'fa-solid fa-helicopter' });
    const marker = document.querySelector('.map-legend-icon') as HTMLElement;
    expect(marker.style.color).toBe('#ff0000');
  });

  it('renders the "unknown color" fallback (not class="undefined ...") for type: icon with icon: undefined', () => {
    legend.addEntry({ id: 'f', type: 'icon', color: null, label: 'Ohne Icon' } as AddLegendEntryOptions);
    expect(document.querySelector('.map-legend-icon')).toBeNull();
    const unknown = document.querySelector('.map-legend-unknown') as HTMLElement;
    expect(unknown).not.toBeNull();
    expect(unknown.className).not.toContain('undefined');
  });

  it('renders a line-cased entry with two stacked bars, clamped heights', () => {
    legend.addEntry({ id: 'lc1', type: 'line-cased', color: '#3b82f6', width: 3, outline_color: '#ffffff', outline_width: 5, label: 'Skilift' });
    const wrapper = document.querySelector('.map-legend-line-cased') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.style.height).toBe('5px');
    const outline = wrapper.querySelector('.map-legend-line-cased-outline') as HTMLElement;
    const inner = wrapper.querySelector('.map-legend-line-cased-inner') as HTMLElement;
    expect(outline.style.height).toBe('5px');
    expect(inner.style.height).toBe('3px');
  });

  it('clamps line-cased outline_width to the 2-8px range', () => {
    // width=3 stays within its own 1-6px clamp and well below outline_width's clamped max, so
    // this isolates the outline clamp without triggering the inner-width cap rule (see next test).
    legend.addEntry({ id: 'lc2', type: 'line-cased', color: '#000000', width: 3, outline_color: '#ffffff', outline_width: 20, label: 'Test' });
    const wrapper = document.querySelector('.map-legend-line-cased') as HTMLElement;
    const outline = wrapper.querySelector('.map-legend-line-cased-outline') as HTMLElement;
    const inner = wrapper.querySelector('.map-legend-line-cased-inner') as HTMLElement;
    expect(outline.style.height).toBe('8px');
    expect(inner.style.height).toBe('3px');
  });

  it('caps line-cased inner width to outline_width - 1 when width would otherwise reach/exceed it', () => {
    // width=5 clamps to 5 (within 1-6px), outline_width=3 clamps to 3 (within 2-8px) — since
    // 5 >= 3, the inner bar must be capped to max(1, 3-1) = 2, not shown at its own clamped 5.
    legend.addEntry({ id: 'lc2b', type: 'line-cased', color: '#000000', width: 5, outline_color: '#ffffff', outline_width: 3, label: 'Test' });
    const wrapper = document.querySelector('.map-legend-line-cased') as HTMLElement;
    const outline = wrapper.querySelector('.map-legend-line-cased-outline') as HTMLElement;
    const inner = wrapper.querySelector('.map-legend-line-cased-inner') as HTMLElement;
    expect(outline.style.height).toBe('3px');
    expect(inner.style.height).toBe('2px');
  });

  it('throws when line-cased is missing a required field', () => {
    expect(() => legend.addEntry({ id: 'lc3', type: 'line-cased', color: '#000000', width: 3, label: 'Test' } as never))
      .toThrow("MapLegend.addEntry: type 'line-cased' benötigt color, width, outline_color, outline_width");
  });

  it('applies entry.opacity as an inline style on the line-cased wrapper', () => {
    legend.addEntry({ id: 'lc4', type: 'line-cased', color: '#3b82f6', width: 3, outline_color: '#fff', outline_width: 5, opacity: 0.6, label: 'Test' });
    const wrapper = document.querySelector('.map-legend-line-cased') as HTMLElement;
    expect(wrapper.style.opacity).toBe('0.6');
  });

  it('applies line width as a clamped height', () => {
    legend.addEntry({ id: 'lw1', type: 'line', color: '#000000', width: 20, label: 'Breit' });
    const marker = document.querySelector('.map-legend-line') as HTMLElement;
    expect(marker.style.height).toBe('6px');
  });

  it('applies dasharray as a repeating background gradient', () => {
    legend.addEntry({ id: 'ld1', type: 'line', color: '#3b82f6', dasharray: [2, 1], label: 'Gestrichelt' });
    const marker = document.querySelector('.map-legend-line') as HTMLElement;
    expect(marker.style.backgroundImage).toContain('repeating-linear-gradient');
  });

  it('throws when dasharray does not have exactly 2 values', () => {
    expect(() => legend.addEntry({ id: 'ld2', type: 'line', color: '#000000', dasharray: [1, 2, 3] as never, label: 'Test' }))
      .toThrow('MapLegend.addEntry: dasharray muss genau 2 Werte [dash, gap] enthalten');
  });

  it('renders the "unknown color" fallback (not a styled line) for the ski-lifts-style resolver fallback {type: line, color: null, width}', () => {
    legend.addEntry({ id: 'skilift-fallback', type: 'line', color: null, width: 3, label: 'Test' });
    expect(document.querySelector('.map-legend-unknown')).not.toBeNull();
    expect(document.querySelector('.map-legend-line')).toBeNull();
  });

  it('applies area outline as a border', () => {
    legend.addEntry({ id: 'ao1', type: 'area', color: '#3b82f6', outline_color: '#1d4ed8', outline_width: 1, label: 'Bezirk' });
    const marker = document.querySelector('.map-legend-area') as HTMLElement;
    expect(marker.style.borderWidth).toBe('1px');
    expect(marker.style.borderStyle).toBe('solid');
  });

  it('clamps area outline_width to 1-3px', () => {
    legend.addEntry({ id: 'ao2', type: 'area', color: '#3b82f6', outline_color: '#1d4ed8', outline_width: 10, label: 'Test' });
    const marker = document.querySelector('.map-legend-area') as HTMLElement;
    expect(marker.style.borderWidth).toBe('3px');
  });

  it('throws when area has only outline_width without outline_color', () => {
    expect(() => legend.addEntry({ id: 'ao3', type: 'area', color: '#000000', outline_width: 1, label: 'Test' } as never))
      .toThrow("MapLegend.addEntry: 'area' benötigt outline_color UND outline_width zusammen");
  });
});

describe('MapLegend.addPartsRow', () => {
  let legend: MapLegend;

  beforeEach(() => {
    document.body.innerHTML = '';
    legend = new MapLegend(makeLegendFixture());
  });

  it('renders one SVG chip per entry in chips[]', () => {
    const parts = [{ kind: 'line' as const, color: { mode: 'fixed' as const, value: '#fff' }, stroke_color: null, opacity: 1, width: 3, dasharray: null, radius: null, stroke_width: null, icon: null }];
    legend.addPartsRow({
      id: 'pr1',
      label: 'Piste',
      chips: [{ parts, itemColor: null }, { parts, itemColor: null }, { parts, itemColor: null }],
    });
    const chips = document.querySelectorAll('.map-legend-parts-chip');
    expect(chips).toHaveLength(3);
  });

  it('renders the row label', () => {
    legend.addPartsRow({ id: 'pr2', label: 'Buckelpiste', chips: [{ parts: [], itemColor: null }] });
    expect(document.querySelector('.map-legend-label')?.textContent).toBe('Buckelpiste');
  });

  it('draws a line part as an SVG <line> with the resolved color', () => {
    const parts = [{ kind: 'line' as const, color: { mode: 'scale' as const, scale_id: 's' }, stroke_color: null, opacity: 1, width: 3, dasharray: null, radius: null, stroke_width: null, icon: null }];
    legend.addPartsRow({ id: 'pr3', label: 'Test', chips: [{ parts, itemColor: '#ff0000' }] });
    const line = document.querySelector('.map-legend-parts-chip line') as SVGLineElement;
    expect(line).not.toBeNull();
    expect(line.getAttribute('stroke')).toBe('#ff0000');
  });

  it('scales dasharray by the real MapLibre semantics (dash/gap values are multiples of line width)', () => {
    const parts = [{ kind: 'line' as const, color: { mode: 'fixed' as const, value: '#000' }, stroke_color: null, opacity: 1, width: 3, dasharray: [1, 3] as [number, number], radius: null, stroke_width: null, icon: null }];
    legend.addPartsRow({ id: 'pr4', label: 'Test', chips: [{ parts, itemColor: null }] });
    const line = document.querySelector('.map-legend-parts-chip line') as SVGLineElement;
    expect(line.getAttribute('stroke-dasharray')).toBe('3 9');
  });

  it('draws a fill part as an SVG <rect> with the resolved color and opacity', () => {
    const parts = [{ kind: 'fill' as const, color: { mode: 'fixed' as const, value: '#123456' }, stroke_color: null, opacity: 0.25, width: null, dasharray: null, radius: null, stroke_width: null, icon: null }];
    legend.addPartsRow({ id: 'pr5', label: 'Test', chips: [{ parts, itemColor: null }] });
    const rect = document.querySelector('.map-legend-parts-chip rect') as SVGRectElement;
    expect(rect.getAttribute('fill')).toBe('#123456');
    expect(rect.getAttribute('fill-opacity')).toBe('0.25');
  });

  it('sizes chips small enough that a 6-chip strip fits the 300px legend panel', () => {
    // .map-legend is max-width: var(--sidebar-width) = 300px with 12-14px padding — a chip
    // width chosen for a wide standalone artifact page would blow this fixed panel out.
    const parts = [{ kind: 'line' as const, color: { mode: 'fixed' as const, value: '#000' }, stroke_color: null, opacity: 1, width: 3, dasharray: null, radius: null, stroke_width: null, icon: null }];
    legend.addPartsRow({ id: 'pr7', label: 'Test', chips: Array(6).fill({ parts, itemColor: null }) });
    const chip = document.querySelector('.map-legend-parts-chip') as SVGSVGElement;
    const w = Number(chip.getAttribute('width'));
    expect(w).toBeLessThanOrEqual(40);
    expect(w * 6).toBeLessThanOrEqual(272);
  });

  it('is removable via the shared removeEntry(id) mechanism', () => {
    legend.addPartsRow({ id: 'pr6', label: 'Test', chips: [{ parts: [], itemColor: null }] });
    expect(document.querySelector('.map-legend-parts-row')).not.toBeNull();
    legend.removeEntry('pr6');
    expect(document.querySelector('.map-legend-parts-row')).toBeNull();
  });
});

describe('MapLegend.addHeading', () => {
  let legend: MapLegend;

  beforeEach(() => {
    document.body.innerHTML = '';
    legend = new MapLegend(makeLegendFixture());
  });

  it('renders the heading text with the CI overlay-section-label class', () => {
    legend.addHeading('h1', 'Pisten');
    const el = document.querySelector('.overlay-section-label');
    expect(el?.textContent).toBe('Pisten');
  });

  it('is removable via the shared removeEntry(id) mechanism', () => {
    legend.addHeading('h2', 'Loipen');
    expect(document.querySelector('.overlay-section-label')).not.toBeNull();
    legend.removeEntry('h2');
    expect(document.querySelector('.overlay-section-label')).toBeNull();
  });

  it('replaces an existing heading when addHeading is called again with the same id', () => {
    legend.addHeading('h3', 'Alt');
    legend.addHeading('h3', 'Neu');
    const headings = document.querySelectorAll('.overlay-section-label');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Neu');
  });
});
