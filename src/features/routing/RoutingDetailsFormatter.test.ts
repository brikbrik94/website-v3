import { describe, it, expect } from 'vitest';
import { getProfileBadge, getRouteWarnings } from './RoutingDetailsFormatter';
import { RouteExtras } from '../../types/common';

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
