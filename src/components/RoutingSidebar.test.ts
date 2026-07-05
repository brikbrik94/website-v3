import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateRoutingSummary, renderStationResults } from './RoutingSidebar';

function createFakeElement() {
  const classes = new Set<string>();
  return {
    innerHTML: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
    querySelectorAll: () => [] as any[],
  };
}

describe('updateRoutingSummary badges', () => {
  let details: ReturnType<typeof createFakeElement>;

  beforeEach(() => {
    details = createFakeElement();
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'routing-details' ? details : null),
    });
  });

  it('renders no mode icon and no warning badges when only distance/duration are given', () => {
    updateRoutingSummary(1000, 60);
    expect(details.innerHTML).not.toContain('result-mode-icon');
    expect(details.innerHTML).not.toContain('fa-car');
    expect(details.innerHTML).not.toContain('fa-truck-medical');
    expect(details.innerHTML).not.toContain('badge-yellow');
  });

  it('renders the Normalfahrt mode icon (not a text badge) for driving-car', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car');
    expect(details.innerHTML).toContain('result-mode-icon');
    expect(details.innerHTML).toContain('fa-car');
    expect(details.innerHTML).toContain('title="Normalfahrt"');
    expect(details.innerHTML).not.toContain('badge-blue');
  });

  it('renders the Blaulichtfahrt mode icon (not a text badge) for driving-emergency', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-emergency');
    expect(details.innerHTML).toContain('result-mode-icon');
    expect(details.innerHTML).toContain('fa-truck-medical');
    expect(details.innerHTML).toContain('title="Blaulichtfahrt"');
    expect(details.innerHTML).not.toContain('badge-blue');
  });

  it('renders a toll warning badge inside the same card as the kv row when extras indicate tollways', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car', {
      tollways: { values: [[0, 1, 1]], summary: [{ value: 1, distance: 1000, amount: 92.8 }] },
    });
    expect(details.innerHTML).toContain('badge-yellow');
    expect(details.innerHTML).toContain('Enthält Mautstraßen');
    // Warnungen müssen innerhalb desselben .result-item stehen wie die Kv-Zeile,
    // nicht als eigener Block danach.
    const itemOpenIdx = details.innerHTML.indexOf('result-item active no-click');
    const kvIdx = details.innerHTML.indexOf('result-kv');
    const warningIdx = details.innerHTML.indexOf('badge-yellow');
    const listCloseIdx = details.innerHTML.lastIndexOf('</div>');
    expect(itemOpenIdx).toBeGreaterThanOrEqual(0);
    expect(kvIdx).toBeGreaterThan(itemOpenIdx);
    expect(warningIdx).toBeGreaterThan(kvIdx);
    expect(warningIdx).toBeLessThan(listCloseIdx);
  });

  it('renders no warning badges when extras have no tollways/restrictions', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car', {
      tollways: { values: [[0, 1, 0]], summary: [{ value: 0, distance: 1000, amount: 100 }] },
    });
    expect(details.innerHTML).not.toContain('badge-yellow');
  });
});

describe('renderStationResults empty state', () => {
  let results: ReturnType<typeof createFakeElement>;
  let status: ReturnType<typeof createFakeElement>;

  beforeEach(() => {
    results = createFakeElement();
    status = createFakeElement();
    vi.stubGlobal('document', {
      getElementById: (id: string) => {
        if (id === 'routing-results') return results;
        if (id === 'routing-status') return status;
        return null;
      },
    });
  });

  it('hides the results panel instead of showing "0 Standorte gefunden" for an empty list (e.g. reset in A→B mode)', () => {
    renderStationResults([], () => {}, () => {});
    expect(results.classList.contains('hidden')).toBe(true);
    expect(results.innerHTML).not.toContain('Nächste Stützpunkte');
  });

  it('still shows the results panel with real content for a non-empty station list', () => {
    renderStationResults(
      [{ name: 'Testort', org: 'ORG', duration: 300, distance: 4000 }],
      () => {},
      () => {}
    );
    expect(results.classList.contains('hidden')).toBe(false);
    expect(results.innerHTML).toContain('Nächste Stützpunkte');
    expect(results.innerHTML).toContain('Testort');
  });
});
