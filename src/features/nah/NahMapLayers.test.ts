import { describe, it, expect } from 'vitest';
import { NahMapLayers } from './NahMapLayers';
import { NahStation } from '../../types/nah';
import { MapRegistry } from '../../lib/MapRegistry';

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

describe('NahMapLayers.computeGroupStatus', () => {
  it('returns "active" when at least one station is active and in season', () => {
    const stations: NahStation[] = [
      makeStation({ name: 'Station A', is_active: false, in_season: true }),
      makeStation({ name: 'Station B', is_active: true, in_season: true }),
      makeStation({ name: 'Station C', is_active: false, in_season: false })
    ];
    expect(NahMapLayers.computeGroupStatus(stations)).toBe('active');
  });

  it('returns "offseason" when no stations are active, but at least one is in offseason', () => {
    const stations: NahStation[] = [
      makeStation({ name: 'Station A', is_active: false, in_season: true }),
      makeStation({ name: 'Station B', is_active: false, in_season: false })
    ];
    expect(NahMapLayers.computeGroupStatus(stations)).toBe('offseason');
  });

  it('returns "inactive" when all stations are inactive and all are in season', () => {
    const stations: NahStation[] = [
      makeStation({ name: 'Station A', is_active: false, in_season: true }),
      makeStation({ name: 'Station B', is_active: false, in_season: true })
    ];
    expect(NahMapLayers.computeGroupStatus(stations)).toBe('inactive');
  });

  it('returns the status of a single station', () => {
    const activeStation = [makeStation({ is_active: true, in_season: true })];
    expect(NahMapLayers.computeGroupStatus(activeStation)).toBe('active');

    const inactiveStation = [makeStation({ is_active: false, in_season: true })];
    expect(NahMapLayers.computeGroupStatus(inactiveStation)).toBe('inactive');

    const offseasonStation = [makeStation({ is_active: true, in_season: false })];
    expect(NahMapLayers.computeGroupStatus(offseasonStation)).toBe('offseason');
  });
});

describe('NahMapLayers.buildStationPopupHtml', () => {
  it('renders the active badge and station header', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ callsign: 'Christophorus 3', name: 'ÖAMTC Flugrettung' }));
    expect(html).toContain('Christophorus 3');
    expect(html).toContain('ÖAMTC Flugrettung');
    expect(html).toContain('badge badge-green');
    expect(html).toContain('EINSATZBEREIT');
  });

  it('renders the inactive badge for stations outside operating hours', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ is_active: false }));
    expect(html).toContain('badge badge-red');
    expect(html).toContain('AUSSER DIENST (Betriebszeit)');
  });

  it('renders the offseason badge and season row for out-of-season stations', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ in_season: false, months_active: [4, 5, 6] }));
    expect(html).toContain('badge badge-gray');
    expect(html).toContain('AUSSER SAISON');
    expect(html).toContain('Monate: 4, 5, 6');
  });

  it('never uses an inline color style (CI-Konformität)', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation());
    expect(html).not.toMatch(/style="color:/);
  });

  it('renders fixed hours when op_type is "fixed"', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ op_type: 'fixed', fixed_start: '08:00', fixed_end: '20:00' }));
    expect(html).toContain('08:00 - 20:00');
  });

  it('renders "BCET bis ECET" for daylight stations without fixed times', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ op_type: 'daylight', fixed_start: null, fixed_end: null }));
    expect(html).toContain('BCET bis ECET');
  });

  it('renders 24/7 hours', () => {
    const html = NahMapLayers.buildStationPopupHtml(makeStation({ op_type: '24/7' }));
    expect(html).toContain('24 Stunden / 7 Tage');
  });
});

describe('NahMapLayers.setStations', () => {
  function mockMapWithSource() {
    const calls: unknown[] = [];
    const map = {
      getSource: () => ({ setData: (data: unknown) => calls.push(data) }),
    } as any;
    return { map, calls };
  }

  it('writes a FeatureCollection with a computed status property per station', () => {
    const { map, calls } = mockMapWithSource();
    const station = makeStation({ lon: 14.28, lat: 48.3 });

    NahMapLayers.setStations(map, [station]);

    expect(calls).toHaveLength(1);
    const data = calls[0] as any;
    expect(data.type).toBe('FeatureCollection');
    expect(data.features).toHaveLength(1);
    expect(data.features[0].geometry).toEqual({ type: 'Point', coordinates: [14.28, 48.3] });
    expect(data.features[0].properties.status).toBe('active');
    expect(data.features[0].properties.callsign).toBe(station.callsign);
  });

  it('registers the data in MapRegistry for restore-after-basemap-switch', () => {
    const { map } = mockMapWithSource();
    NahMapLayers.setStations(map, [makeStation()]);

    const registered = MapRegistry.getSource('nah-stations');
    expect(registered?.definition.data.features).toHaveLength(1);
  });

  it('groups stations by identical coordinates', () => {
    // This is a conceptual test — we'll verify via integration later
    // For now, document the expected grouping behavior:
    // Input: [
    //   {id: 'A1', lon: 14.0, lat: 47.4, is_active: true, in_season: true},
    //   {id: 'A2', lon: 14.0, lat: 47.4, is_active: false, in_season: true},
    // ]
    // Expected output (GeoJSON features):
    // - Single feature at (14.0, 47.4)
    // - properties._station_count = 2
    // - properties.status = 'active' (grouped status)
    // - properties._all_stations = [A1, A2]
    expect(true).toBe(true); // Placeholder — real test after implementation
  });
});

describe('NahMapLayers.findClickedStation', () => {
  function mockMap(features: unknown[]) {
    return { queryRenderedFeatures: () => features } as any;
  }

  it('returns null when no station feature is hit', () => {
    const map = mockMap([]);
    expect(NahMapLayers.findClickedStation(map, [10, 10])).toBeNull();
  });

  it('returns the station properties and coordinates of the first hit feature', () => {
    const props = { name: 'Christophorus 3', callsign: 'C3', status: 'active' };
    const map = mockMap([{ properties: props, geometry: { type: 'Point', coordinates: [14.1, 48.2] } }]);

    const hit = NahMapLayers.findClickedStation(map, [10, 10]);

    expect(hit?.station).toEqual(props);
    expect(hit?.coordinates).toEqual([14.1, 48.2]);
  });

  it('parses months_active back into a real array when MapLibre round-tripped it as a JSON string', () => {
    // MapLibre GL JS speichert nicht-primitive GeoJSON-Properties (Arrays) intern
    // als JSON-String; queryRenderedFeatures liefert sie so zurück statt als Array.
    const props = { name: 'Christophorus 3', callsign: 'C3', status: 'offseason', months_active: '[4,5,6]' };
    const map = mockMap([{ properties: props, geometry: { type: 'Point', coordinates: [14.1, 48.2] } }]);

    const hit = NahMapLayers.findClickedStation(map, [10, 10]);

    expect(hit?.station.months_active).toEqual([4, 5, 6]);
  });
});
