import { describe, it, expect } from 'vitest';
import * as polyline from '@mapbox/polyline';
import { toRouteResult } from './ValhallaRouteInterpreter';

describe('ValhallaRouteInterpreter.toRouteResult', () => {
  it('decodes a single-leg shape into LineString coordinates in [lon, lat] order', () => {
    const points: [number, number][] = [[48.1, 14.1], [48.15, 14.15], [48.2, 14.2]]; // [lat, lon]
    const shape = polyline.encode(points, 6);

    const result = toRouteResult({
      legs: [{ shape }],
      summary: { time: 300, length: 12.5 },
    });

    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry.type).toBe('LineString');
    const coords = result.features[0].geometry.coordinates;
    expect(coords).toHaveLength(3);
    expect(coords[0][0]).toBeCloseTo(14.1, 5);
    expect(coords[0][1]).toBeCloseTo(48.1, 5);
    expect(coords[2][0]).toBeCloseTo(14.2, 5);
    expect(coords[2][1]).toBeCloseTo(48.2, 5);
  });

  it('converts summary.length (km) to meters and keeps summary.time (seconds) unchanged', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    const result = toRouteResult({ legs: [{ shape }], summary: { time: 300, length: 12.5 } });
    expect(result.features[0].properties.summary.distance).toBeCloseTo(12500, 1);
    expect(result.features[0].properties.summary.duration).toBe(300);
  });

  it('leaves extras and segments undefined (no turn-by-turn support yet)', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    const result = toRouteResult({ legs: [{ shape }], summary: { time: 1, length: 1 } });
    expect(result.features[0].properties.extras).toBeUndefined();
    expect(result.features[0].properties.segments).toBeUndefined();
  });

  it('concatenates coordinates across multiple legs into one continuous LineString', () => {
    const shapeA = polyline.encode([[48.1, 14.1], [48.15, 14.15]], 6);
    const shapeB = polyline.encode([[48.15, 14.15], [48.2, 14.2]], 6);
    const result = toRouteResult({
      legs: [{ shape: shapeA }, { shape: shapeB }],
      summary: { time: 600, length: 25 },
    });
    expect(result.features[0].geometry.coordinates).toHaveLength(4);
  });
});
