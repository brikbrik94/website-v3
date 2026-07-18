import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderIsochronesResults } from './IsochronesSidebar';
import { IsochroneQuery } from '../types/common';

function createFakeElement() {
  const classes = new Set<string>();
  return {
    innerHTML: '',
    textContent: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
    querySelectorAll: () => [] as any[],
  };
}

function makeQuery(overrides: Partial<IsochroneQuery> = {}): IsochroneQuery {
  return {
    id: 1,
    point: [48.3, 14.28],
    label: 'Linz, Hauptplatz',
    profile: 'driving-car',
    rangeType: 'time',
    ranges: [5, 10, 15],
    geojson: { type: 'FeatureCollection', features: [] },
    ...overrides
  };
}

describe('renderIsochronesResults', () => {
  let results: ReturnType<typeof createFakeElement>;
  let count: ReturnType<typeof createFakeElement>;

  beforeEach(() => {
    results = createFakeElement();
    count = createFakeElement();
    vi.stubGlobal('document', {
      getElementById: (id: string) => {
        if (id === 'isochrones-results') return results;
        if (id === 'iso-result-count') return count;
        return null;
      },
    });
  });

  it('shows the empty state and a zero count when there are no queries', () => {
    renderIsochronesResults([], new Set(), vi.fn(), vi.fn(), vi.fn());
    expect(results.innerHTML).toContain('result-empty');
    expect(count.textContent).toBe('0 Abfragen');
  });

  it('renders one result-item per query with its label and profile', () => {
    const query = makeQuery();
    renderIsochronesResults([query], new Set([1]), vi.fn(), vi.fn(), vi.fn());
    expect(results.innerHTML).toContain('Linz, Hauptplatz');
    expect(results.innerHTML).toContain('driving-car');
    expect(count.textContent).toBe('1 Abfrage');
  });

  it('marks the eye button active only for eye-active queries', () => {
    const query = makeQuery({ id: 2 });
    renderIsochronesResults([query], new Set(), vi.fn(), vi.fn(), vi.fn());
    expect(results.innerHTML).not.toMatch(/toggle-iso-btn active/);
  });

  it('uses plural wording for more than one query', () => {
    renderIsochronesResults([makeQuery({ id: 1 }), makeQuery({ id: 2 })], new Set([1, 2]), vi.fn(), vi.fn(), vi.fn());
    expect(count.textContent).toBe('2 Abfragen');
  });
});
