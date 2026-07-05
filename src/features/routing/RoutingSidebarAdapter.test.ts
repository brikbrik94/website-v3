import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoutingSidebarAdapter } from './RoutingSidebarAdapter';
import { RoutingDataService } from './RoutingDataService';
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

vi.mock('../../components/RoutingSidebar', async () => {
  const actual = await vi.importActual<typeof import('../../components/RoutingSidebar')>(
    '../../components/RoutingSidebar'
  );
  return {
    ...actual,
    initRoutingSidebar: vi.fn(),
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
