// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { initTopbar } from './Topbar';
import { MapItem } from '../types/inventory';

function makeBasemap(overrides: Partial<MapItem> = {}): MapItem {
  return {
    name: 'Basis',
    type: 'basemap',
    style: { url: 'https://tiles.oe5ith.at/basemaps/styles/at/style.json' },
    file: { url: 'https://tiles.oe5ith.at/basemaps/at.pmtiles' },
    ...overrides
  };
}

describe('initTopbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="controls-backdrop"></div><div id="app"></div>';
  });

  it('gives the mobile controls-toggle button an accessible name', () => {
    const container = document.getElementById('app')!;
    initTopbar(container, [makeBasemap()], () => {});

    const mobileToggle = document.getElementById('controls-toggle-mobile');
    expect(mobileToggle).not.toBeNull();
    // Ohne sichtbaren Text (nur der 3-Balken-"Slider-Icon") braucht der Button ein
    // aria-label, sonst schlägt Lighthouses button-name-Audit fehl (siehe
    // docs/performance/2026-07-28-baseline-audit.md, Befund 1) - reproduziert auf allen
    // 6 Kartenseiten, da genau dieser Button im Mobile-Viewport sichtbar ist.
    expect(mobileToggle!.getAttribute('aria-label')).toBe('Tools');
  });

  it('gives the tablet controls-toggle button a visible text label', () => {
    const container = document.getElementById('app')!;
    initTopbar(container, [makeBasemap()], () => {});

    const tabletToggle = document.getElementById('controls-toggle-tablet');
    expect(tabletToggle!.textContent).toContain('Tools');
  });
});
