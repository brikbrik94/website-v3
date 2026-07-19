import { describe, it, expect } from 'vitest';
import { getIsochroneRingColor } from './MapStyles';

function parseHex(color: string): [number, number, number] {
  const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) throw new Error(`Not a hex color string: ${color}`);
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

describe('getIsochroneRingColor', () => {
  it('returns the best-reachability (greenest) step for the only ring when total is 1', () => {
    expect(getIsochroneRingColor(0, 1)).toBe('#22c55e');
  });

  it('returns the best-reachability step for index 0 regardless of total', () => {
    expect(getIsochroneRingColor(0, 4)).toBe('#22c55e');
  });

  it('returns the worst-reachability (reddest) step for the outermost ring', () => {
    expect(getIsochroneRingColor(3, 4)).toBe('#ef4444');
  });

  it('moves from green (index 0) towards red (last index) as index increases', () => {
    const [r0] = parseHex(getIsochroneRingColor(0, 4));
    const [r1] = parseHex(getIsochroneRingColor(1, 4));
    const [r2] = parseHex(getIsochroneRingColor(2, 4));
    const [r3] = parseHex(getIsochroneRingColor(3, 4));

    expect(r0).toBeLessThanOrEqual(r1);
    expect(r1).toBeLessThanOrEqual(r2);
    expect(r2).toBeLessThanOrEqual(r3);
  });

  it('produces the same color sequence for two queries with the same ring count', () => {
    expect(getIsochroneRingColor(1, 3)).toBe(getIsochroneRingColor(1, 3));
  });
});
