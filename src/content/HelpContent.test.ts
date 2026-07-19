import { describe, it, expect } from 'vitest';
import { HELP_CONTENT } from './HelpContent';

const EXPECTED_PATHS = ['/karte', '/routing', '/nah', '/coords', '/tracking', '/isochrones'];

describe('HELP_CONTENT', () => {
  it('has an entry for each of the 6 feature pages', () => {
    EXPECTED_PATHS.forEach((path) => {
      expect(HELP_CONTENT[path]).toBeDefined();
    });
  });

  it('has no entries outside the 6 feature pages', () => {
    expect(Object.keys(HELP_CONTENT).sort()).toEqual([...EXPECTED_PATHS].sort());
  });

  it('gives every entry a non-empty title and at least one section', () => {
    Object.values(HELP_CONTENT).forEach((entry) => {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.sections.length).toBeGreaterThan(0);
    });
  });

  it('gives every section a non-empty heading and body', () => {
    Object.values(HELP_CONTENT).forEach((entry) => {
      entry.sections.forEach((section) => {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
      });
    });
  });
});
