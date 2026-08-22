import { describe, it, expect } from 'vitest';
import { orsCodeToManeuverKind } from './OrsManeuverKind';

describe('orsCodeToManeuverKind', () => {
  it('maps all 14 known ORS codes (0-13) to their exact ManeuverKind', () => {
    expect(orsCodeToManeuverKind(0)).toBe('turn-left');
    expect(orsCodeToManeuverKind(1)).toBe('turn-right');
    expect(orsCodeToManeuverKind(2)).toBe('sharp-left');
    expect(orsCodeToManeuverKind(3)).toBe('sharp-right');
    expect(orsCodeToManeuverKind(4)).toBe('slight-left');
    expect(orsCodeToManeuverKind(5)).toBe('slight-right');
    expect(orsCodeToManeuverKind(6)).toBe('straight');
    expect(orsCodeToManeuverKind(7)).toBe('roundabout-enter');
    expect(orsCodeToManeuverKind(8)).toBe('roundabout-exit');
    expect(orsCodeToManeuverKind(9)).toBe('uturn');
    expect(orsCodeToManeuverKind(10)).toBe('goal');
    expect(orsCodeToManeuverKind(11)).toBe('depart');
    expect(orsCodeToManeuverKind(12)).toBe('keep-left');
    expect(orsCodeToManeuverKind(13)).toBe('keep-right');
  });

  it('falls back to "straight" for an unknown ORS code', () => {
    expect(orsCodeToManeuverKind(99)).toBe('straight');
  });
});
