import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoutingSidebarAdapter } from './RoutingSidebarAdapter';
import { RoutingDataService } from './RoutingDataService';
import { RoutingService } from '../../lib/RoutingService';
import { ValhallaService } from '../../lib/ValhallaService';
import { updateRoutingSummary } from '../../components/RoutingSidebar';

vi.mock('./RoutingMapLayers', () => ({
  RoutingMapLayers: {
    updateStartPin: vi.fn(),
    updateTargetPin: vi.fn(),
    updateRoutesLayer: vi.fn(),
    updateStationsLayer: vi.fn(),
    updateSingleRoute: vi.fn(),
    ensureBaseLayers: vi.fn(),
  },
}));

let capturedOnRouteStart: ((params: any) => void | Promise<void>) | null = null;

vi.mock('../../components/RoutingSidebar', async () => {
  const actual = await vi.importActual<typeof import('../../components/RoutingSidebar')>(
    '../../components/RoutingSidebar'
  );
  return {
    ...actual,
    initRoutingSidebar: vi.fn((_container: any, onRouteStart: any) => {
      capturedOnRouteStart = onRouteStart;
    }),
    renderStationResults: vi.fn(),
    renderRoutingError: vi.fn(),
    setRoutingCoord: vi.fn(),
  };
});

function createFakeElement() {
  const classes = new Set<string>();
  return {
    value: '',
    style: {} as Record<string, string>,
    innerHTML: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
  };
}

describe('RoutingSidebarAdapter.clearAll', () => {
  let elements: Record<string, ReturnType<typeof createFakeElement>>;

  beforeEach(() => {
    elements = {
      'routing-details': createFakeElement(),
      'input-start': createFakeElement(),
      'input-target': createFakeElement(),
    };
    vi.stubGlobal('document', {
      getElementById: (id: string) => elements[id] ?? null,
    });
  });

  it('hides the details box via the hidden class (not inline style), so a later route calculation can show it again', () => {
    const dataService = new RoutingDataService();
    const adapter = new RoutingSidebarAdapter(dataService, {} as any, new AbortController().signal);

    adapter.clearRoute();

    const details = elements['routing-details'];
    expect(details.classList.contains('hidden')).toBe(true);
    expect(details.style.display).toBeUndefined();

    // Simulates a completed A-B route calculation, which shows the summary afterwards.
    updateRoutingSummary(12345, 678);

    expect(details.classList.contains('hidden')).toBe(false);
    expect(details.style.display).toBeUndefined();
  });
});

describe('RoutingSidebarAdapter A→B route details', () => {
  let elements: Record<string, ReturnType<typeof createFakeElement>>;

  beforeEach(() => {
    capturedOnRouteStart = null;
    elements = {
      'routing-details': createFakeElement(),
      'input-start': createFakeElement(),
      'input-target': createFakeElement(),
    };
    vi.stubGlobal('document', {
      getElementById: (id: string) => elements[id] ?? null,
    });
  });

  it('requests extra_info and passes profile/extras through to the sidebar summary', async () => {
    const dataService = new RoutingDataService();
    const map = { fitBounds: vi.fn() } as any;
    const adapter = new RoutingSidebarAdapter(dataService, map, new AbortController().signal);
    adapter.init({} as any);

    const routeResult = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          summary: { distance: 125360, duration: 5040 },
          extras: {
            tollways: { values: [[0, 1, 1]], summary: [{ value: 1, distance: 125360, amount: 92.8 }] },
          },
        },
        geometry: { type: 'LineString', coordinates: [[14.1, 48.1], [14.2, 48.2]] },
      }],
    };
    const calculateRouteSpy = vi.spyOn(RoutingService, 'calculateRoute').mockResolvedValue(routeResult as any);

    expect(capturedOnRouteStart).not.toBeNull();
    await capturedOnRouteStart!({
      mode: 'ab',
      start: [48.1, 14.1],
      target: [48.2, 14.2],
      profile: 'driving-car',
    });

    expect(calculateRouteSpy).toHaveBeenCalledWith(
      [48.1, 14.1],
      [48.2, 14.2],
      'driving-car',
      ['waytype', 'tollways', 'roadaccessrestrictions']
    );

    const details = elements['routing-details'];
    expect(details.innerHTML).toContain('result-mode-icon');
    expect(details.innerHTML).toContain('fa-car');
    expect(details.innerHTML).toContain('title="Normalfahrt"');
    expect(details.innerHTML).not.toContain('badge-blue');
    expect(details.innerHTML).toContain('badge-yellow');
    expect(details.innerHTML).toContain('Enthält Mautstraßen');

    calculateRouteSpy.mockRestore();
  });

  it('does not request extra_info for driving-emergency (ORS graph has no way_type/tollways storages for it)', async () => {
    const dataService = new RoutingDataService();
    const map = { fitBounds: vi.fn() } as any;
    const adapter = new RoutingSidebarAdapter(dataService, map, new AbortController().signal);
    adapter.init({} as any);

    const routeResult = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { summary: { distance: 124504, duration: 3891 } },
        geometry: { type: 'LineString', coordinates: [[14.1, 48.1], [14.2, 48.2]] },
      }],
    };
    const calculateRouteSpy = vi.spyOn(RoutingService, 'calculateRoute').mockResolvedValue(routeResult as any);

    expect(capturedOnRouteStart).not.toBeNull();
    await capturedOnRouteStart!({
      mode: 'ab',
      start: [48.1, 14.1],
      target: [48.2, 14.2],
      profile: 'driving-emergency',
    });

    expect(calculateRouteSpy).toHaveBeenCalledWith(
      [48.1, 14.1],
      [48.2, 14.2],
      'driving-emergency',
      undefined
    );

    const details = elements['routing-details'];
    expect(details.innerHTML).toContain('result-mode-icon');
    expect(details.innerHTML).toContain('fa-truck-medical');
    expect(details.innerHTML).toContain('title="Blaulichtfahrt"');
    expect(details.innerHTML).not.toContain('badge-blue');

    calculateRouteSpy.mockRestore();
  });

  it('passes segments through so the sidebar renders the turn-by-turn disclosure', async () => {
    const dataService = new RoutingDataService();
    const map = { fitBounds: vi.fn() } as any;
    const adapter = new RoutingSidebarAdapter(dataService, map, new AbortController().signal);
    adapter.init({} as any);

    const routeResult = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          summary: { distance: 1176.2, duration: 144.3 },
          segments: [
            {
              distance: 1176.2,
              duration: 144.3,
              steps: [
                { distance: 176.2, duration: 63.4, type: 11, instruction: 'Head south on Hauptplatz', name: 'Hauptplatz', way_points: [0, 10] },
              ],
            },
          ],
        },
        geometry: { type: 'LineString', coordinates: [[14.1, 48.1], [14.2, 48.2]] },
      }],
    };
    const calculateRouteSpy = vi.spyOn(RoutingService, 'calculateRoute').mockResolvedValue(routeResult as any);

    expect(capturedOnRouteStart).not.toBeNull();
    await capturedOnRouteStart!({
      mode: 'ab',
      start: [48.1, 14.1],
      target: [48.2, 14.2],
      profile: 'driving-car',
    });

    const details = elements['routing-details'];
    expect(details.innerHTML).toContain('disclosure-header');
    expect(details.innerHTML).toContain('1 Schritte');
    expect(details.innerHTML).toContain('Head south on Hauptplatz');

    calculateRouteSpy.mockRestore();
  });

  it('routes through ValhallaService when provider is valhalla and skips ORS entirely', async () => {
    const dataService = new RoutingDataService();
    const map = { fitBounds: vi.fn() } as any;
    const adapter = new RoutingSidebarAdapter(dataService, map, new AbortController().signal);
    adapter.init({} as any);

    const routeResult = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { summary: { distance: 5000, duration: 600 } },
        geometry: { type: 'LineString', coordinates: [[14.1, 48.1], [14.2, 48.2]] },
      }],
    };
    const orsSpy = vi.spyOn(RoutingService, 'calculateRoute');
    const valhallaSpy = vi.spyOn(ValhallaService, 'calculateRoute').mockResolvedValue(routeResult as any);

    expect(capturedOnRouteStart).not.toBeNull();
    await capturedOnRouteStart!({
      mode: 'ab',
      start: [48.1, 14.1],
      target: [48.2, 14.2],
      profile: 'bicycle',
      provider: 'valhalla',
    });

    expect(valhallaSpy).toHaveBeenCalledWith([48.1, 14.1], [48.2, 14.2], 'bicycle');
    expect(orsSpy).not.toHaveBeenCalled();

    const details = elements['routing-details'];
    expect(details.innerHTML).toContain('5.00 km');

    orsSpy.mockRestore();
    valhallaSpy.mockRestore();
  });
});
