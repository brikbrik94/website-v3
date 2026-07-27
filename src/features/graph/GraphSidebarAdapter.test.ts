import { describe, it, expect } from 'vitest';
import { rectangleFeatureToBbox } from './GraphSidebarAdapter';
import type { Feature, Polygon } from 'geojson';

function rectangle(coords: [number, number][]): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] }
  };
}

describe('rectangleFeatureToBbox', () => {
  it('extracts the axis-aligned bounding box from a closed rectangle ring', () => {
    const feature = rectangle([
      [16.30, 48.20], [16.31, 48.20], [16.31, 48.205], [16.30, 48.205], [16.30, 48.20]
    ]);
    expect(rectangleFeatureToBbox(feature)).toEqual([[16.30, 48.20], [16.31, 48.205]]);
  });

  it('works even if the ring is not perfectly axis-aligned (e.g. a rotated/pitched map)', () => {
    const feature = rectangle([
      [16.300, 48.2001], [16.3105, 48.2000], [16.3110, 48.2049], [16.2995, 48.2050], [16.300, 48.2001]
    ]);
    expect(rectangleFeatureToBbox(feature)).toEqual([[16.2995, 48.2000], [16.3110, 48.2050]]);
  });
});
