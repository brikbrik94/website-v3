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
});
