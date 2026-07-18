import { describe, it, expect } from 'vitest';
import { getIsochroneRingColor } from './MapStyles';

function parseRgb(color: string): [number, number, number] {
  const match = color.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  if (!match) throw new Error(`Not an rgb() string: ${color}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

describe('getIsochroneRingColor', () => {
  it('returns the full accent color fallback for the only ring when total is 1', () => {
    expect(getIsochroneRingColor(0, 1)).toBe('rgb(59, 130, 246)');
  });

  it('returns the full accent color for index 0 regardless of total', () => {
    expect(getIsochroneRingColor(0, 4)).toBe('rgb(59, 130, 246)');
  });

  it('lightens monotonically as the index increases', () => {
    const [r0, g0, b0] = parseRgb(getIsochroneRingColor(0, 4));
    const [r1, g1, b1] = parseRgb(getIsochroneRingColor(1, 4));
    const [r2, g2, b2] = parseRgb(getIsochroneRingColor(2, 4));
    const [r3, g3, b3] = parseRgb(getIsochroneRingColor(3, 4));

    expect(r0).toBeLessThanOrEqual(r1);
    expect(r1).toBeLessThanOrEqual(r2);
    expect(r2).toBeLessThanOrEqual(r3);
    expect(g0).toBeLessThanOrEqual(g1);
    expect(g1).toBeLessThanOrEqual(g2);
    expect(g2).toBeLessThanOrEqual(g3);
    expect(b0).toBeLessThanOrEqual(b1);
    expect(b1).toBeLessThanOrEqual(b2);
    expect(b2).toBeLessThanOrEqual(b3);
  });

  it('never reaches pure white even for the last ring, so it stays visible on a light basemap', () => {
    const [r, g, b] = parseRgb(getIsochroneRingColor(9, 10));
    expect(r < 255 || g < 255 || b < 255).toBe(true);
  });

  it('produces the same color sequence for two queries with the same ring count', () => {
    expect(getIsochroneRingColor(1, 3)).toBe(getIsochroneRingColor(1, 3));
  });
});
