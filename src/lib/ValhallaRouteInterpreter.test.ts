import { describe, it, expect } from 'vitest';
import * as polyline from '@mapbox/polyline';
import { toRouteResult, valhallaTypeToManeuverKind } from './ValhallaRouteInterpreter';

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

  it('leaves segments undefined when no leg has maneuvers (no turn-by-turn data available)', () => {
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

  it('populates segments[0].steps from maneuvers, translating type/length/time/street_names/shape-indices', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.15, 14.15], [48.2, 14.2]], 6);
    const result = toRouteResult({
      legs: [{
        shape,
        maneuvers: [
          { type: 1, instruction: 'Fahren Sie los', time: 10, length: 0.5, begin_shape_index: 0, end_shape_index: 1, street_names: ['Hauptplatz'] },
          { type: 10, instruction: 'Biegen Sie rechts ab', time: 20, length: 1.2, begin_shape_index: 1, end_shape_index: 2 },
        ],
      }],
      summary: { time: 30, length: 1.7 },
    });

    const steps = result.features[0].properties.segments![0].steps;
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({
      distance: 500, duration: 10, type: 'depart', instruction: 'Fahren Sie los', name: 'Hauptplatz', way_points: [0, 1],
    });
    expect(steps[1]).toEqual({
      distance: 1200, duration: 20, type: 'turn-right', instruction: 'Biegen Sie rechts ab', name: '', way_points: [1, 2],
    });
  });

  it('sets segments[0].distance/duration from the trip summary, not the sum of maneuver lengths', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    const result = toRouteResult({
      legs: [{ shape, maneuvers: [{ type: 8, instruction: 'x', time: 5, length: 0.1, begin_shape_index: 0, end_shape_index: 1 }] }],
      summary: { time: 300, length: 12.5 },
    });
    expect(result.features[0].properties.segments![0].distance).toBeCloseTo(12500, 1);
    expect(result.features[0].properties.segments![0].duration).toBe(300);
  });
});

describe('valhallaTypeToManeuverKind', () => {
  it('maps every documented, reachable Valhalla maneuver type to its exact ManeuverKind', () => {
    const cases: [number, string][] = [
      [1, 'depart'], [2, 'depart-right'], [3, 'depart-left'],
      [4, 'goal'], [5, 'goal-right'], [6, 'goal-left'],
      [7, 'becomes'],
      [8, 'straight'],
      [9, 'slight-right'], [10, 'turn-right'], [11, 'sharp-right'],
      [12, 'uturn-right'], [13, 'uturn-left'],
      [14, 'sharp-left'], [15, 'turn-left'], [16, 'slight-left'],
      [17, 'ramp-straight'], [18, 'ramp-right'], [19, 'ramp-left'],
      [20, 'exit-right'], [21, 'exit-left'],
      [22, 'stay-straight'], [23, 'keep-right'], [24, 'keep-left'],
      [25, 'merge'],
      [26, 'roundabout-enter'], [27, 'roundabout-exit'],
      [28, 'ferry-enter'], [29, 'ferry-exit'],
    ];
    for (const [type, expected] of cases) {
      expect(valhallaTypeToManeuverKind(type)).toBe(expected);
    }
  });

  it('falls back to "straight" for kNone (0) and all 7 transit maneuver types (30-36)', () => {
    for (const type of [0, 30, 31, 32, 33, 34, 35, 36]) {
      expect(valhallaTypeToManeuverKind(type)).toBe('straight');
    }
  });

  it('falls back to "straight" for an entirely unknown type', () => {
    expect(valhallaTypeToManeuverKind(999)).toBe('straight');
  });
});
