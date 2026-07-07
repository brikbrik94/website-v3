import { describe, it, expect } from 'vitest';
import { getManeuverIconMarkup } from './ManeuverIcons';

describe('getManeuverIconMarkup', () => {
  it('returns svg markup with the disclosure-item-icon class and a 16x16 viewBox for a known ORS code', () => {
    const markup = getManeuverIconMarkup(1);
    expect(markup).toContain('class="disclosure-item-icon"');
    expect(markup).toContain('viewBox="0 0 16 16"');
    expect(markup).toContain('M8 13 Q8 7 13.4 7');
  });

  it('returns distinct markup for each of the 14 known ORS codes (0-13)', () => {
    const codes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const markups = codes.map(getManeuverIconMarkup);
    expect(new Set(markups).size).toBe(codes.length);
  });

  it('falls back to the straight-arrow icon (code 6) for an unknown ORS code', () => {
    expect(getManeuverIconMarkup(99)).toBe(getManeuverIconMarkup(6));
  });
});
