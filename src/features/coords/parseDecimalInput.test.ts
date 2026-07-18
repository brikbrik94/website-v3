import { describe, it, expect } from 'vitest';
import { parseDecimalInput } from './parseDecimalInput';

describe('parseDecimalInput', () => {
  it('parses a value using a dot as decimal separator', () => {
    expect(parseDecimalInput('48.3')).toBe(48.3);
  });

  it('parses a value using a comma as decimal separator', () => {
    expect(parseDecimalInput('48,3')).toBe(48.3);
  });

  it('parses a negative value with a comma', () => {
    expect(parseDecimalInput('-14,28')).toBe(-14.28);
  });

  it('parses a plain integer string', () => {
    expect(parseDecimalInput('48')).toBe(48);
  });

  it('returns NaN for a non-numeric string', () => {
    expect(parseDecimalInput('abc')).toBeNaN();
  });

  it('returns NaN for an empty string', () => {
    expect(parseDecimalInput('')).toBeNaN();
  });
});
