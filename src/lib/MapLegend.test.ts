// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { MapLegend } from './MapLegend';

function makeLegendFixture(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = `
    <span class="map-legend-title"></span>
    <div class="map-legend-entries"></div>
  `;
  document.body.appendChild(el);
  return el;
}

describe('MapLegend.addEntry — opacity', () => {
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
});
