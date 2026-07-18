import { describe, it, expect } from 'vitest';
import { parseRoutingDeepLink } from './RoutingDeepLink';

describe('parseRoutingDeepLink', () => {
  it('returns null when target is missing', () => {
    expect(parseRoutingDeepLink('?mode=ab&start=48.2,14.3')).toBeNull();
  });

  it('returns null when target is malformed', () => {
    expect(parseRoutingDeepLink('?target=not-a-coord')).toBeNull();
  });

  it('parses mode=ab with start and target', () => {
    expect(parseRoutingDeepLink('?mode=ab&start=48.2,14.3&target=48.3,14.28')).toEqual({
      mode: 'ab',
      target: [48.3, 14.28],
      start: [48.2, 14.3]
    });
  });

  it('falls back to mode ab when mode is missing', () => {
    expect(parseRoutingDeepLink('?target=48.3,14.28')).toEqual({
      mode: 'ab',
      target: [48.3, 14.28]
    });
  });

  it('falls back to mode ab when mode is invalid', () => {
    expect(parseRoutingDeepLink('?mode=bogus&target=48.3,14.28')).toEqual({
      mode: 'ab',
      target: [48.3, 14.28]
    });
  });

  it('parses mode=sew with target only', () => {
    expect(parseRoutingDeepLink('?mode=sew&target=48.3,14.28')).toEqual({
      mode: 'sew',
      target: [48.3, 14.28]
    });
  });

  it('parses mode=nef with target only', () => {
    expect(parseRoutingDeepLink('?mode=nef&target=48.3,14.28')).toEqual({
      mode: 'nef',
      target: [48.3, 14.28]
    });
  });

  it('ignores start for mode sew/nef', () => {
    expect(parseRoutingDeepLink('?mode=sew&target=48.3,14.28&start=48.2,14.3')).toEqual({
      mode: 'sew',
      target: [48.3, 14.28]
    });
  });

  it('ignores a malformed start, still returns the valid target', () => {
    expect(parseRoutingDeepLink('?mode=ab&target=48.3,14.28&start=nope')).toEqual({
      mode: 'ab',
      target: [48.3, 14.28]
    });
  });

  it('passes through profile when present', () => {
    expect(parseRoutingDeepLink('?target=48.3,14.28&profile=driving-emergency')).toEqual({
      mode: 'ab',
      target: [48.3, 14.28],
      profile: 'driving-emergency'
    });
  });

  it('omits profile when absent', () => {
    const result = parseRoutingDeepLink('?target=48.3,14.28');
    expect(result).not.toHaveProperty('profile');
  });
});
