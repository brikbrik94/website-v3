import { describe, it, expect } from 'vitest';
import { NahMapLayers } from './NahMapLayers';
import { NahStation } from '../../types/nah';

function makeStation(overrides: Partial<NahStation> = {}): NahStation {
  return {
    name: 'Christophorus 3',
    callsign: 'Christophorus 3',
    region: 'OÖ',
    op_type: 'daylight',
    is_active: true,
    in_season: true,
    is_night_ready: false,
    lat: 48.3,
    lon: 14.28,
    ...overrides
  };
}

describe('NahMapLayers.computeStationStatus', () => {
  it('returns "active" when in season and active', () => {
    expect(NahMapLayers.computeStationStatus(makeStation())).toBe('active');
  });

  it('returns "inactive" when in season but not active', () => {
    expect(NahMapLayers.computeStationStatus(makeStation({ is_active: false }))).toBe('inactive');
  });

  it('returns "offseason" when not in season, regardless of is_active', () => {
    expect(NahMapLayers.computeStationStatus(makeStation({ in_season: false, is_active: true }))).toBe('offseason');
    expect(NahMapLayers.computeStationStatus(makeStation({ in_season: false, is_active: false }))).toBe('offseason');
  });
});
