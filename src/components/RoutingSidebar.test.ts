import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { updateRoutingSummary, renderStationResults, updateServiceStatus, checkProviderHealth, type ServiceStatusElements } from './RoutingSidebar';
import { RoutingService } from '../lib/RoutingService';
import { ValhallaService } from '../lib/ValhallaService';

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

function findMatchingDivClose(html: string, openTagIndex: number): number {
  let depth = 0;
  const divRegex = /<div\b[^>]*>|<\/div>/g;
  divRegex.lastIndex = openTagIndex;
  let match: RegExpExecArray | null;
  while ((match = divRegex.exec(html))) {
    if (match[0].startsWith('</')) {
      depth--;
      if (depth === 0) return match.index + match[0].length;
    } else {
      depth++;
    }
  }
  return -1;
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

describe('updateRoutingSummary turn-by-turn disclosure', () => {
  let details: ReturnType<typeof createFakeElement>;

  beforeEach(() => {
    details = createFakeElement();
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'routing-details' ? details : null),
    });
  });

  it('renders no disclosure block when segments is undefined', () => {
    updateRoutingSummary(1000, 60);
    expect(details.innerHTML).not.toContain('disclosure-header');
  });

  it('renders no disclosure block when segments has no steps', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', undefined, undefined, [
      { distance: 0, duration: 0, steps: [] },
    ]);
    expect(details.innerHTML).not.toContain('disclosure-header');
  });

  it('renders the Wegbeschreibung disclosure collapsed by default with one item per step', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', undefined, undefined, [
      {
        distance: 1176.2,
        duration: 144.3,
        steps: [
          { distance: 176.2, duration: 63.4, type: 'depart', instruction: 'Head south on Hauptplatz', name: 'Hauptplatz', way_points: [0, 10] },
          { distance: 1000, duration: 80.9, type: 'straight', instruction: 'Continue straight onto Hauptstraße', name: 'Hauptstraße', way_points: [10, 20] },
        ],
      },
    ]);

    expect(details.innerHTML).toContain('disclosure-header');
    expect(details.innerHTML).not.toContain('<details class="disclosure" open>');
    expect(details.innerHTML).toContain('2 Schritte');
    expect(details.innerHTML).toContain('Head south on Hauptplatz');
    expect(details.innerHTML).toContain('176 m');
    expect(details.innerHTML).toContain('Continue straight onto Hauptstraße');
    expect(details.innerHTML).toContain('1.0 km');
    expect(details.innerHTML).toContain('maneuver-item-icon');
  });

  it('places the disclosure block at or after the point where .result-list closes, not nested inside it', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', undefined, undefined, [
      { distance: 100, duration: 10, steps: [{ distance: 100, duration: 10, type: 'straight', instruction: 'Continue straight', name: '', way_points: [0, 1] }] },
    ]);

    const resultListOpenIdx = details.innerHTML.indexOf('<div class="result-list">');
    const resultListCloseIdx = findMatchingDivClose(details.innerHTML, resultListOpenIdx);
    const disclosureIdx = details.innerHTML.indexOf('<details class="disclosure">');

    expect(resultListOpenIdx).toBeGreaterThanOrEqual(0);
    expect(resultListCloseIdx).toBeGreaterThan(0);
    expect(disclosureIdx).toBeGreaterThanOrEqual(resultListCloseIdx);
  });
});

function createFakeStatusEl() {
  const classes = new Set<string>();
  return {
    textContent: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (...cs: string[]) => cs.forEach(c => classes.delete(c)),
      contains: (c: string) => classes.has(c),
    },
  };
}

function createFakeToggleEl() {
  return { disabled: false };
}

function createFakeServiceStatusElements(): ServiceStatusElements {
  return {
    statusDot: createFakeStatusEl(),
    statusName: createFakeStatusEl(),
    profileSelect: createFakeToggleEl(),
    startInput: createFakeToggleEl(),
    targetInput: createFakeToggleEl(),
    submitButton: createFakeToggleEl(),
  };
}

describe('updateServiceStatus', () => {
  it('labels the status row "ORS API" for provider ors', () => {
    const els = createFakeServiceStatusElements();
    updateServiceStatus(els, true, 'ors');
    expect(els.statusName.textContent).toBe('ORS API');
  });

  it('labels the status row "Valhalla API" for provider valhalla', () => {
    const els = createFakeServiceStatusElements();
    updateServiceStatus(els, true, 'valhalla');
    expect(els.statusName.textContent).toBe('Valhalla API');
  });

  it('shows the dot as "on" and enables inputs/button when online', () => {
    const els = createFakeServiceStatusElements();
    updateServiceStatus(els, true, 'ors');
    expect(els.statusDot.classList.contains('on')).toBe(true);
    expect(els.statusDot.classList.contains('off')).toBe(false);
    expect(els.statusDot.classList.contains('warn')).toBe(false);
    expect(els.profileSelect.disabled).toBe(false);
    expect(els.startInput.disabled).toBe(false);
    expect(els.targetInput.disabled).toBe(false);
    expect(els.submitButton.disabled).toBe(false);
  });

  it('shows the dot as "off" and disables inputs/button when offline', () => {
    const els = createFakeServiceStatusElements();
    updateServiceStatus(els, false, 'ors');
    expect(els.statusDot.classList.contains('off')).toBe(true);
    expect(els.statusDot.classList.contains('on')).toBe(false);
    expect(els.profileSelect.disabled).toBe(true);
    expect(els.startInput.disabled).toBe(true);
    expect(els.targetInput.disabled).toBe(true);
    expect(els.submitButton.disabled).toBe(true);
  });

  it('shows the dot as "warn" and disables inputs/button while a check is in progress (online: null)', () => {
    const els = createFakeServiceStatusElements();
    updateServiceStatus(els, null, 'valhalla');
    expect(els.statusDot.classList.contains('warn')).toBe(true);
    expect(els.statusDot.classList.contains('on')).toBe(false);
    expect(els.statusDot.classList.contains('off')).toBe(false);
    expect(els.profileSelect.disabled).toBe(true);
    expect(els.submitButton.disabled).toBe(true);
  });

  it('clears a previous dot state when called again with a different result', () => {
    const els = createFakeServiceStatusElements();
    updateServiceStatus(els, false, 'ors');
    updateServiceStatus(els, true, 'ors');
    expect(els.statusDot.classList.contains('off')).toBe(false);
    expect(els.statusDot.classList.contains('on')).toBe(true);
  });
});

describe('checkProviderHealth', () => {
  afterEach(() => vi.restoreAllMocks());

  it('dispatches to RoutingService.checkHealth for provider ors', async () => {
    const orsSpy = vi.spyOn(RoutingService, 'checkHealth').mockResolvedValue(true);
    const valhallaSpy = vi.spyOn(ValhallaService, 'checkHealth').mockResolvedValue(false);

    const result = await checkProviderHealth('ors');

    expect(result).toBe(true);
    expect(orsSpy).toHaveBeenCalledOnce();
    expect(valhallaSpy).not.toHaveBeenCalled();
  });

  it('dispatches to ValhallaService.checkHealth for provider valhalla', async () => {
    const orsSpy = vi.spyOn(RoutingService, 'checkHealth').mockResolvedValue(false);
    const valhallaSpy = vi.spyOn(ValhallaService, 'checkHealth').mockResolvedValue(true);

    const result = await checkProviderHealth('valhalla');

    expect(result).toBe(true);
    expect(valhallaSpy).toHaveBeenCalledOnce();
    expect(orsSpy).not.toHaveBeenCalled();
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
      [{ id: 1, name: 'Testort', org: 'ORG', lat: 47.8, lon: 13.0, duration: 300, distance: 4000 }],
      () => {},
      () => {}
    );
    expect(results.classList.contains('hidden')).toBe(false);
    expect(results.innerHTML).toContain('Nächste Stützpunkte');
    expect(results.innerHTML).toContain('Testort');
  });
});
