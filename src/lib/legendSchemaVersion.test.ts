import { describe, it, expect } from 'vitest';
import { isLegendSchemaAtLeast } from './legendSchemaVersion';

describe('isLegendSchemaAtLeast', () => {
  it('returns true when version equals the minimum', () => {
    expect(isLegendSchemaAtLeast('1.1', 1, 1)).toBe(true);
  });

  it('returns true when version is above the minimum (major)', () => {
    expect(isLegendSchemaAtLeast('2.0', 1, 1)).toBe(true);
  });

  it('returns true when version is above the minimum (minor)', () => {
    expect(isLegendSchemaAtLeast('1.2', 1, 1)).toBe(true);
  });

  it('returns false when version is below the minimum', () => {
    expect(isLegendSchemaAtLeast('1.0', 1, 1)).toBe(false);
  });

  it('compares numerically, not as a string (1.10 >= 1.1 is true, "1.10" < "1.1" as a string)', () => {
    expect(isLegendSchemaAtLeast('1.10', 1, 1)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isLegendSchemaAtLeast(null, 1, 1)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLegendSchemaAtLeast(undefined, 1, 1)).toBe(false);
  });

  it('returns false for a malformed version string', () => {
    expect(isLegendSchemaAtLeast('garbage', 1, 1)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isLegendSchemaAtLeast('', 1, 1)).toBe(false);
  });
});
