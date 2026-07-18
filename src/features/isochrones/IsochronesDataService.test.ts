import { describe, it, expect, beforeEach } from 'vitest';
import { IsochronesDataService } from './IsochronesDataService';
import { IsochroneQuery } from '../../types/common';

function makeQueryInput(overrides: Partial<Omit<IsochroneQuery, 'id'>> = {}): Omit<IsochroneQuery, 'id'> {
  return {
    point: [48.3, 14.28],
    label: '48.3000, 14.2800',
    profile: 'driving-car',
    rangeType: 'time',
    ranges: [5, 10, 15],
    geojson: { type: 'FeatureCollection', features: [] },
    ...overrides
  };
}

describe('IsochronesDataService', () => {
  let service: IsochronesDataService;

  beforeEach(() => {
    service = new IsochronesDataService();
  });

  it('assigns incrementing ids starting at 1', () => {
    const first = service.addQuery(makeQueryInput());
    const second = service.addQuery(makeQueryInput());
    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });

  it('stores the query retrievable by id', () => {
    const added = service.addQuery(makeQueryInput({ label: 'Linz' }));
    expect(service.getQuery(added.id)?.label).toBe('Linz');
  });

  it('marks a newly added query as eye-active by default', () => {
    const added = service.addQuery(makeQueryInput());
    expect(service.isEyeActive(added.id)).toBe(true);
  });

  it('removes a query from both the query map and eye-active states', () => {
    const added = service.addQuery(makeQueryInput());
    service.removeQuery(added.id);
    expect(service.getQuery(added.id)).toBeUndefined();
    expect(service.isEyeActive(added.id)).toBe(false);
  });

  it('toggles eye-active state independently of query removal', () => {
    const added = service.addQuery(makeQueryInput());
    service.setEyeActiveState(added.id, false);
    expect(service.isEyeActive(added.id)).toBe(false);
    expect(service.getQuery(added.id)).toBeDefined();
  });

  it('clears all queries and eye-active states', () => {
    service.addQuery(makeQueryInput());
    service.addQuery(makeQueryInput());
    service.clearAll();
    expect(service.getQueries().size).toBe(0);
    expect(service.getEyeActiveStates().size).toBe(0);
  });
});
