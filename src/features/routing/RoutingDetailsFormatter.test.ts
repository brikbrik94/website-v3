import { describe, it, expect } from 'vitest';
import { getProfileBadge, getRouteWarnings, formatSteps } from './RoutingDetailsFormatter';
import { RouteExtras, RouteSegment } from '../../types/common';

describe('getProfileBadge', () => {
  it('maps driving-car to the Normalfahrt badge', () => {
    expect(getProfileBadge('driving-car')).toEqual({ icon: 'fa-solid fa-car', label: 'Normalfahrt' });
  });

  it('maps driving-emergency to the Blaulichtfahrt badge', () => {
    expect(getProfileBadge('driving-emergency')).toEqual({
      icon: 'fa-solid fa-truck-medical',
      label: 'Blaulichtfahrt',
    });
  });

  it('falls back to a generic icon and the raw profile name for unknown profiles', () => {
    expect(getProfileBadge('cycling-regular')).toEqual({
      icon: 'fa-solid fa-route',
      label: 'cycling-regular',
    });
  });
});

describe('getRouteWarnings', () => {
  it('returns no warnings when extras is undefined', () => {
    expect(getRouteWarnings(undefined)).toEqual([]);
  });

  it('returns no toll warning when tollways amount is 0%', () => {
    const extras: RouteExtras = {
      tollways: { values: [[0, 1, 0]], summary: [{ value: 0, distance: 1000, amount: 100 }] },
    };
    expect(getRouteWarnings(extras)).toEqual([]);
  });

  it('returns a toll warning when tollways amount is greater than 0%', () => {
    const extras: RouteExtras = {
      tollways: {
        values: [[0, 1, 1]],
        summary: [
          { value: 0, distance: 100, amount: 7.2 },
          { value: 1, distance: 900, amount: 92.8 },
        ],
      },
    };
    expect(getRouteWarnings(extras)).toEqual([
      { icon: 'fa-solid fa-triangle-exclamation', label: 'Enthält Mautstraßen' },
    ]);
  });

  it('returns no restriction warning when roadaccessrestrictions is 100% frei (value 0)', () => {
    const extras: RouteExtras = {
      roadaccessrestrictions: { values: [[0, 1, 0]], summary: [{ value: 0, distance: 1000, amount: 100 }] },
    };
    expect(getRouteWarnings(extras)).toEqual([]);
  });

  it('returns a restriction warning when roadaccessrestrictions is less than 100% frei', () => {
    const extras: RouteExtras = {
      roadaccessrestrictions: {
        values: [[0, 1, 0], [1, 2, 3]],
        summary: [
          { value: 0, distance: 800, amount: 80 },
          { value: 3, distance: 200, amount: 20 },
        ],
      },
    };
    expect(getRouteWarnings(extras)).toEqual([
      { icon: 'fa-solid fa-triangle-exclamation', label: 'Zufahrtsbeschränkungen auf der Strecke' },
    ]);
  });

  it('returns both warnings when both conditions are met', () => {
    const extras: RouteExtras = {
      tollways: {
        values: [[0, 1, 1]],
        summary: [{ value: 1, distance: 1000, amount: 100 }],
      },
      roadaccessrestrictions: {
        values: [[0, 1, 3]],
        summary: [{ value: 3, distance: 1000, amount: 100 }],
      },
    };
    expect(getRouteWarnings(extras)).toEqual([
      { icon: 'fa-solid fa-triangle-exclamation', label: 'Enthält Mautstraßen' },
      { icon: 'fa-solid fa-triangle-exclamation', label: 'Zufahrtsbeschränkungen auf der Strecke' },
    ]);
  });
});

describe('formatSteps', () => {
  it('returns an empty array when segments is undefined', () => {
    expect(formatSteps(undefined)).toEqual([]);
  });

  it('returns an empty array when segments is an empty array', () => {
    expect(formatSteps([])).toEqual([]);
  });

  it('flattens steps in order, keeps the instruction text unchanged, and formats distance under 1000 m in meters', () => {
    const segments: RouteSegment[] = [
      {
        distance: 1175.2,
        duration: 144.3,
        steps: [
          { distance: 176.2, duration: 63.4, type: 11, instruction: 'Head south on Hauptplatz', name: 'Hauptplatz', way_points: [0, 10] },
          { distance: 999, duration: 80.9, type: 6, instruction: 'Continue straight onto Hauptstraße', name: 'Hauptstraße', way_points: [10, 20] },
        ],
      },
    ];

    const result = formatSteps(segments);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Head south on Hauptplatz');
    expect(result[0].meta).toBe('176 m');
    expect(result[0].iconMarkup).toContain('disclosure-item-icon');
    expect(result[1].text).toBe('Continue straight onto Hauptstraße');
    expect(result[1].meta).toBe('999 m');
  });

  it('formats distance at and above 1000 m in km with one decimal', () => {
    const segments: RouteSegment[] = [
      {
        distance: 2500,
        duration: 200,
        steps: [
          { distance: 1000, duration: 60, type: 6, instruction: 'Continue straight', name: '', way_points: [0, 5] },
          { distance: 1500, duration: 90, type: 1, instruction: 'Turn right', name: '', way_points: [5, 10] },
        ],
      },
    ];

    const result = formatSteps(segments);

    expect(result[0].meta).toBe('1.0 km');
    expect(result[1].meta).toBe('1.5 km');
  });

  it('flattens steps from multiple segments in order', () => {
    const segments: RouteSegment[] = [
      { distance: 100, duration: 10, steps: [{ distance: 100, duration: 10, type: 11, instruction: 'Depart', name: '', way_points: [0, 1] }] },
      { distance: 200, duration: 20, steps: [{ distance: 200, duration: 20, type: 10, instruction: 'Arrive', name: '', way_points: [1, 2] }] },
    ];

    const result = formatSteps(segments);

    expect(result.map((s) => s.text)).toEqual(['Depart', 'Arrive']);
  });
});
