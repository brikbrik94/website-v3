import { describe, it, expect } from 'vitest';
import { calculateBboxArea } from './calculateBboxArea';

const EARTH_RADIUS_M = 6371000;
function expectedArea(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const midLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const widthM = Math.abs(lon2 - lon1) * (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(midLatRad);
  const heightM = Math.abs(lat2 - lat1) * (Math.PI / 180) * EARTH_RADIUS_M;
  return widthM * heightM;
}

describe('calculateBboxArea', () => {
  it('computes the area of a small bbox at the equator', () => {
    const bbox: [[number, number], [number, number]] = [[0, 0], [0.01, 0.01]];
    expect(calculateBboxArea(bbox)).toBeCloseTo(expectedArea(0, 0, 0.01, 0.01), 0);
  });

  it('computes roughly the 25 km² design-limit reference bbox (Wien calibration data)', () => {
    // Aus dem Design-Spec: 5km x 5km bei Wien ~5.859 Nodes, empirisch als "an der Grenze" kalibriert.
    const bbox: [[number, number], [number, number]] = [[16.33, 48.19], [16.39, 48.235]];
    const area = calculateBboxArea(bbox);
    expect(area).toBeCloseTo(expectedArea(16.33, 48.19, 16.39, 48.235), 0);
    expect(area).toBeGreaterThan(20_000_000);
    expect(area).toBeLessThan(30_000_000);
  });

  it('returns the same area regardless of corner order (swapped coordinates)', () => {
    const a: [[number, number], [number, number]] = [[16.33, 48.19], [16.39, 48.235]];
    const b: [[number, number], [number, number]] = [[16.39, 48.235], [16.33, 48.19]];
    expect(calculateBboxArea(a)).toBeCloseTo(calculateBboxArea(b), 0);
  });

  it('returns a positive area for negative (southern/western hemisphere) coordinates', () => {
    const bbox: [[number, number], [number, number]] = [[-10, -5], [-9.99, -4.99]];
    expect(calculateBboxArea(bbox)).toBeGreaterThan(0);
  });

  it('returns 0 for a degenerate bbox (zero width or height)', () => {
    expect(calculateBboxArea([[16.3, 48.2], [16.3, 48.21]])).toBe(0);
    expect(calculateBboxArea([[16.3, 48.2], [16.31, 48.2]])).toBe(0);
  });
});
