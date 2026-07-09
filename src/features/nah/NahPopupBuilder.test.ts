import { describe, it, expect } from 'vitest';
import { computeStationStatus, buildStationPopupHtml, buildMultiStationPopupHtml } from './NahPopupBuilder';
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

describe('NahPopupBuilder.computeStationStatus', () => {
  it('returns "active" when in season and active', () => {
    expect(computeStationStatus(makeStation())).toBe('active');
  });

  it('returns "inactive" when in season but not active', () => {
    expect(computeStationStatus(makeStation({ is_active: false }))).toBe('inactive');
  });

  it('returns "offseason" when not in season, regardless of is_active', () => {
    expect(computeStationStatus(makeStation({ in_season: false, is_active: true }))).toBe('offseason');
    expect(computeStationStatus(makeStation({ in_season: false, is_active: false }))).toBe('offseason');
  });
});

describe('NahPopupBuilder.buildStationPopupHtml', () => {
  it('renders the active badge and station header', () => {
    const html = buildStationPopupHtml(makeStation({ callsign: 'Christophorus 3', name: 'ÖAMTC Flugrettung' }));
    expect(html).toContain('Christophorus 3');
    expect(html).toContain('ÖAMTC Flugrettung');
    expect(html).toContain('badge badge-green');
    expect(html).toContain('EINSATZBEREIT');
  });

  it('renders the inactive badge for stations outside operating hours', () => {
    const html = buildStationPopupHtml(makeStation({ is_active: false }));
    expect(html).toContain('badge badge-red');
    expect(html).toContain('AUSSER DIENST (Betriebszeit)');
  });

  it('renders the offseason badge and season row for out-of-season stations', () => {
    const html = buildStationPopupHtml(makeStation({ in_season: false, months_active: [4, 5, 6] }));
    expect(html).toContain('badge badge-gray');
    expect(html).toContain('AUSSER SAISON');
    expect(html).toContain('Monate: 4, 5, 6');
  });

  it('never uses an inline color style (CI-Konformität)', () => {
    const html = buildStationPopupHtml(makeStation());
    expect(html).not.toMatch(/style="color:/);
  });

  it('renders fixed hours when op_type is "fixed"', () => {
    const html = buildStationPopupHtml(makeStation({ op_type: 'fixed', fixed_start: '08:00', fixed_end: '20:00' }));
    expect(html).toContain('08:00 - 20:00');
  });

  it('renders "BCET bis ECET" for daylight stations without fixed times', () => {
    const html = buildStationPopupHtml(makeStation({ op_type: 'daylight', fixed_start: null, fixed_end: null }));
    expect(html).toContain('BCET bis ECET');
  });

  it('renders 24/7 hours', () => {
    const html = buildStationPopupHtml(makeStation({ op_type: '24/7' }));
    expect(html).toContain('24 Stunden / 7 Tage');
  });
});

describe('NahPopupBuilder.buildMultiStationPopupHtml', () => {
  it('displays all stations with full details', () => {
    const stations: NahStation[] = [
      {
        callsign: 'Martin 1',
        name: 'Martin Luftrettungsstation',
        region: 'OÖ',
        is_active: false,
        in_season: true,
        op_type: 'daylight',
        fixed_start: '07:00',
        fixed_end: '18:00',
        is_night_ready: false,
        lat: 48.1,
        lon: 14.2,
        months_active: [5,6,7,8,9]
      },
      {
        callsign: 'Martin 10',
        name: 'Martin Luftrettungsstation',
        region: 'OÖ',
        is_active: false,
        in_season: false,
        op_type: 'fixed',
        fixed_start: '08:00',
        fixed_end: '17:00',
        is_night_ready: false,
        lat: 48.1,
        lon: 14.2,
        months_active: []
      },
    ];
    const html = buildMultiStationPopupHtml(stations);

    // Verify both stations appear with callsigns
    expect(html).toContain('Martin 1');
    expect(html).toContain('Martin 10');
    // Verify details are included
    expect(html).toContain('Betrieb');
    expect(html).toContain('daylight');
    expect(html).toContain('fixed');
    // Verify status badges
    expect(html).toContain('badge-red');
    expect(html).toContain('badge-gray');
  });
});
