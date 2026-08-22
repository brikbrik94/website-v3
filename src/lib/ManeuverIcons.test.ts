import { describe, it, expect } from 'vitest';
import { getManeuverIconMarkup } from './ManeuverIcons';
import type { ManeuverKind } from '../types/common';

const ALL_KINDS: ManeuverKind[] = [
  'depart', 'depart-right', 'depart-left',
  'goal', 'goal-right', 'goal-left',
  'becomes',
  'straight',
  'slight-right', 'turn-right', 'sharp-right',
  'slight-left', 'turn-left', 'sharp-left',
  'uturn', 'uturn-right', 'uturn-left',
  'ramp-straight', 'ramp-right', 'ramp-left',
  'exit-right', 'exit-left',
  'stay-straight', 'keep-right', 'keep-left',
  'merge',
  'roundabout-enter', 'roundabout-exit',
  'ferry-enter', 'ferry-exit',
];

describe('getManeuverIconMarkup', () => {
  it('returns svg markup with the disclosure-item-icon class and a 16x16 viewBox for a known kind', () => {
    const markup = getManeuverIconMarkup('turn-right');
    expect(markup).toContain('class="disclosure-item-icon"');
    expect(markup).toContain('viewBox="0 0 16 16"');
    expect(markup).toContain('M8 13 Q8 7 13.4 7');
  });

  it('returns distinct markup for each of the 30 known ManeuverKind values', () => {
    const markups = ALL_KINDS.map(getManeuverIconMarkup);
    expect(new Set(markups).size).toBe(ALL_KINDS.length);
  });

  it('falls back to the straight-arrow icon for an unknown/undefined kind', () => {
    expect(getManeuverIconMarkup('nonexistent-kind' as ManeuverKind)).toBe(getManeuverIconMarkup('straight'));
  });

  it('renders the directional uturn icons distinctly from the undirected ORS uturn icon', () => {
    const bare = getManeuverIconMarkup('uturn');
    const right = getManeuverIconMarkup('uturn-right');
    const left = getManeuverIconMarkup('uturn-left');
    expect(new Set([bare, right, left]).size).toBe(3);
  });
});
