import { describe, it, expect } from 'vitest';
import { IsochronesMapLayers } from './IsochronesMapLayers';
import { IsochronesDataService } from './IsochronesDataService';
import { MapRegistry } from '../../lib/MapRegistry';
import { getIsochroneRingColor } from '../../lib/MapStyles';
import { IsochroneQuery } from '../../types/common';
import type { Feature, Polygon } from 'geojson';

function ring(value: number): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: { value },
    geometry: { type: 'Polygon', coordinates: [[[14.0, 48.0], [14.1, 48.0], [14.1, 48.1], [14.0, 48.0]]] }
  };
}

function mockMapWithSource() {
  const calls: { sourceId: string; data: unknown }[] = [];
  const map = {
    getSource: (id: string) => ({ setData: (data: unknown) => calls.push({ sourceId: id, data }) }),
  } as any;
  return { map, calls };
}

function makeQuery(overrides: Partial<Omit<IsochroneQuery, 'id'>> = {}): Omit<IsochroneQuery, 'id'> {
  return {
    point: [48.3, 14.28],
    label: '48.3000, 14.2800',
    profile: 'driving-car',
    rangeType: 'time',
    ranges: [5, 10, 15],
    geojson: { type: 'FeatureCollection', features: [ring(300), ring(600), ring(900)] },
    ...overrides
  };
}

describe('IsochronesMapLayers.updateRingsLayer', () => {
  it('writes rings sorted descending by value, so the smallest ring is drawn last (on top)', () => {
    const { map, calls } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQuery());

    IsochronesMapLayers.updateRingsLayer(map, dataService);

    const data = calls.find((c) => c.sourceId === 'isochrones-rings')!.data as any;
    expect(data.features).toHaveLength(3);
    expect(data.features[0].properties.color).toBe(getIsochroneRingColor(2, 3));
    expect(data.features[1].properties.color).toBe(getIsochroneRingColor(1, 3));
    expect(data.features[2].properties.color).toBe(getIsochroneRingColor(0, 3));
  });

  it('excludes rings of queries whose eye-active state is off', () => {
    const { map, calls } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    const added = dataService.addQuery(makeQuery());
    dataService.setEyeActiveState(added.id, false);

    IsochronesMapLayers.updateRingsLayer(map, dataService);

    const data = calls.find((c) => c.sourceId === 'isochrones-rings')!.data as any;
    expect(data.features).toHaveLength(0);
  });

  it('tags every ring feature with its query id', () => {
    const { map, calls } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    const added = dataService.addQuery(makeQuery());

    IsochronesMapLayers.updateRingsLayer(map, dataService);

    const data = calls.find((c) => c.sourceId === 'isochrones-rings')!.data as any;
    expect(data.features.every((f: any) => f.properties.queryId === added.id)).toBe(true);
  });

  it('re-registers the current data in MapRegistry for restore-after-basemap-switch', () => {
    const { map } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQuery());

    IsochronesMapLayers.updateRingsLayer(map, dataService);

    const registered = MapRegistry.getSource('isochrones-rings');
    const definition = registered?.definition as { data: GeoJSON.FeatureCollection } | undefined;
    expect(definition?.data.features).toHaveLength(3);
  });
});

describe('IsochronesMapLayers.updatePointsLayer', () => {
  it('writes one point feature per eye-active query', () => {
    const { map, calls } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQuery({ point: [48.3, 14.28] }));

    IsochronesMapLayers.updatePointsLayer(map, dataService);

    const data = calls.find((c) => c.sourceId === 'isochrones-points')!.data as any;
    expect(data.features).toHaveLength(1);
    expect(data.features[0].geometry.coordinates).toEqual([14.28, 48.3]);
  });
});

describe('IsochronesMapLayers.updatePendingPoint', () => {
  it('writes a single point feature at the given lngLat', () => {
    const { map, calls } = mockMapWithSource();

    IsochronesMapLayers.updatePendingPoint(map, [14.28, 48.3]);

    const data = calls.find((c) => c.sourceId === 'isochrones-pending-point')!.data as any;
    expect(data.type).toBe('Feature');
    expect(data.geometry).toEqual({ type: 'Point', coordinates: [14.28, 48.3] });
  });

  it('clears the pending point when called with null', () => {
    const { map, calls } = mockMapWithSource();

    IsochronesMapLayers.updatePendingPoint(map, null);

    const data = calls.find((c) => c.sourceId === 'isochrones-pending-point')!.data as any;
    expect(data).toEqual({ type: 'FeatureCollection', features: [] });
  });
});
