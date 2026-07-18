import { describe, it, expect } from 'vitest';
import { buildLegendEntries } from './IsochronesSidebarAdapter';
import { IsochronesDataService } from './IsochronesDataService';
import { getIsochroneRingColor } from '../../lib/MapStyles';
import { IsochroneQuery } from '../../types/common';

function makeQueryInput(overrides: Partial<Omit<IsochroneQuery, 'id'>> = {}): Omit<IsochroneQuery, 'id'> {
  return {
    point: [48.3, 14.28],
    label: 'Linz',
    profile: 'driving-car',
    rangeType: 'time',
    ranges: [5, 10],
    geojson: { type: 'FeatureCollection', features: [] },
    ...overrides
  };
}

describe('buildLegendEntries', () => {
  it('returns one entry per ring value, formatted with unit', () => {
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQueryInput({ ranges: [5, 10], rangeType: 'time' }));

    const entries = buildLegendEntries(dataService);

    expect(entries).toHaveLength(2);
    expect(entries[0].label).toBe('5 min');
    expect(entries[1].label).toBe('10 min');
    expect(entries[0].color).toBe(getIsochroneRingColor(0, 2));
    expect(entries[1].color).toBe(getIsochroneRingColor(1, 2));
  });

  it('formats distance ranges with km and a German decimal comma', () => {
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQueryInput({ ranges: [1.5, 3], rangeType: 'distance' }));

    const entries = buildLegendEntries(dataService);

    expect(entries[0].label).toBe('1,5 km');
    expect(entries[1].label).toBe('3 km');
  });

  it('excludes queries that are not eye-active', () => {
    const dataService = new IsochronesDataService();
    const added = dataService.addQuery(makeQueryInput());
    dataService.setEyeActiveState(added.id, false);

    expect(buildLegendEntries(dataService)).toHaveLength(0);
  });

  it('deduplicates entries with identical color+label across queries', () => {
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQueryInput({ ranges: [5, 10], rangeType: 'time' }));
    dataService.addQuery(makeQueryInput({ ranges: [5, 10], rangeType: 'time' }));

    expect(buildLegendEntries(dataService)).toHaveLength(2);
  });

  it('assigns type "area" to every entry', () => {
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQueryInput({ ranges: [5] }));

    expect(buildLegendEntries(dataService)[0].type).toBe('area');
  });
});
