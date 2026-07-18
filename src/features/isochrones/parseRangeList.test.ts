import { describe, it, expect } from 'vitest';
import { parseRangeList } from './parseRangeList';

describe('parseRangeList', () => {
  it('parses a single value', () => {
    expect(parseRangeList('5')).toEqual([5]);
  });

  it('parses multiple space-separated values', () => {
    expect(parseRangeList('5 10 15')).toEqual([5, 10, 15]);
  });

  it('sorts values ascending regardless of input order', () => {
    expect(parseRangeList('15 5 10')).toEqual([5, 10, 15]);
  });

  it('accepts a comma as decimal separator without treating it as a list separator', () => {
    expect(parseRangeList('1,5 3 5,5')).toEqual([1.5, 3, 5.5]);
  });

  it('accepts a dot as decimal separator', () => {
    expect(parseRangeList('1.5 3')).toEqual([1.5, 3]);
  });

  it('collapses extra whitespace between values', () => {
    expect(parseRangeList('  5    10  ')).toEqual([5, 10]);
  });

  it('deduplicates identical values', () => {
    expect(parseRangeList('5 5 10')).toEqual([5, 10]);
  });

  it('returns null for an empty string', () => {
    expect(parseRangeList('')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(parseRangeList('   ')).toBeNull();
  });

  it('returns null when any token is not a number', () => {
    expect(parseRangeList('5 abc 10')).toBeNull();
  });

  it('returns null when any value is zero', () => {
    expect(parseRangeList('0 5')).toBeNull();
  });

  it('returns null when any value is negative', () => {
    expect(parseRangeList('-5 5')).toBeNull();
  });
});
