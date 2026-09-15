import { describe, it, expect, afterEach } from 'vitest';
import { RadiosondenDataService } from './RadiosondenDataService';
import type { RadiosondeFlight, TrackingItem } from '../../types/tracking';

// Zugriff auf privates Cache-/GeoJSON-Building über bracket-notation (siehe
// TrackingDataService.test.ts), da hier nur die reine Filter-/Cache-Logik getestet wird,
// nicht der fetch()-Polling-Mechanismus selbst.
describe('RadiosondenDataService - 24h-Fenster', () => {
  let controller: AbortController;
  let service: RadiosondenDataService;

  afterEach(() => {
    service?.destroy();
    controller.abort();
  });

  function makeService(): RadiosondenDataService {
    controller = new AbortController();
    return new RadiosondenDataService(controller.signal);
  }

  function flight(overrides: Partial<RadiosondeFlight> & { callsign: string }): RadiosondeFlight {
    return {
      model: 'DFM17',
      subtype: 'DFM17',
      first_seen: '2026-09-14T10:00:00Z',
      last_seen: '2026-09-14T11:00:00Z',
      position_count: 100,
      max_altitude: 20000,
      active: false,
      ...overrides
    };
  }

  function applyFlights(flights: RadiosondeFlight[], now: number): string[] {
    return (service as unknown as {
      applyFlights: (f: RadiosondeFlight[], now: number) => string[]
    }).applyFlights(flights, now);
  }

  it('keeps flights whose last_seen is within the last 24h', () => {
    service = makeService();
    const now = Date.parse('2026-09-15T12:00:00Z');
    const recent = flight({ callsign: 'RECENT-1', last_seen: '2026-09-15T00:00:00Z' });

    applyFlights([recent], now);

    const flights = (service as unknown as { flights: Map<string, RadiosondeFlight> }).flights;
    expect(flights.has('RECENT-1')).toBe(true);
  });

  it('drops flights whose last_seen is older than 24h', () => {
    service = makeService();
    const now = Date.parse('2026-09-15T12:00:00Z');
    const stale = flight({ callsign: 'STALE-1', last_seen: '2026-09-13T00:00:00Z' });

    applyFlights([stale], now);

    const flights = (service as unknown as { flights: Map<string, RadiosondeFlight> }).flights;
    expect(flights.has('STALE-1')).toBe(false);
  });
});

describe('RadiosondenDataService - Track-Fetch-Bedarf & Cache-Pruning', () => {
  let controller: AbortController;
  let service: RadiosondenDataService;

  afterEach(() => {
    service?.destroy();
    controller.abort();
  });

  function makeService(): RadiosondenDataService {
    controller = new AbortController();
    return new RadiosondenDataService(controller.signal);
  }

  function flight(overrides: Partial<RadiosondeFlight> & { callsign: string }): RadiosondeFlight {
    return {
      model: 'DFM17',
      subtype: 'DFM17',
      first_seen: '2026-09-14T10:00:00Z',
      last_seen: '2026-09-15T11:00:00Z',
      position_count: 100,
      max_altitude: 20000,
      active: false,
      ...overrides
    };
  }

  function applyFlights(flights: RadiosondeFlight[], now: number): string[] {
    return (service as unknown as {
      applyFlights: (f: RadiosondeFlight[], now: number) => string[]
    }).applyFlights(flights, now);
  }

  function setCachedTrack(callsign: string) {
    (service as unknown as { tracks: Map<string, unknown> }).tracks.set(callsign, {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[1, 1], [2, 2]] },
      properties: { callsign, point_count: 2, start_time: '', end_time: '', max_altitude: null }
    });
  }

  const now = Date.parse('2026-09-15T12:00:00Z');

  it('requests a track fetch for a new, not-yet-cached flight', () => {
    service = makeService();
    const needsFetch = applyFlights([flight({ callsign: 'NEW-1' })], now);
    expect(needsFetch).toContain('NEW-1');
  });

  it('does not request a track fetch for an already-cached completed flight', () => {
    service = makeService();
    setCachedTrack('DONE-1');
    const needsFetch = applyFlights([flight({ callsign: 'DONE-1', active: false })], now);
    expect(needsFetch).not.toContain('DONE-1');
  });

  it('requests a track fetch for an already-cached but still active flight', () => {
    service = makeService();
    setCachedTrack('LIVE-1');
    const needsFetch = applyFlights([flight({ callsign: 'LIVE-1', active: true })], now);
    expect(needsFetch).toContain('LIVE-1');
  });

  it('prunes cached tracks for flights that fell out of the 24h window', () => {
    service = makeService();
    setCachedTrack('GONE-1');
    applyFlights([], now);

    const tracks = (service as unknown as { tracks: Map<string, unknown> }).tracks;
    expect(tracks.has('GONE-1')).toBe(false);
  });
});

describe('RadiosondenDataService - Output-Building (Punkte/Tracks/Sidebar-Items)', () => {
  let controller: AbortController;
  let service: RadiosondenDataService;

  afterEach(() => {
    service?.destroy();
    controller.abort();
  });

  function makeService(): RadiosondenDataService {
    controller = new AbortController();
    return new RadiosondenDataService(controller.signal);
  }

  function flight(overrides: Partial<RadiosondeFlight> & { callsign: string }): RadiosondeFlight {
    return {
      model: 'DFM17',
      subtype: 'DFM17',
      first_seen: '2026-09-14T10:00:00Z',
      last_seen: '2026-09-15T11:00:00Z',
      position_count: 100,
      max_altitude: 20000,
      active: false,
      ...overrides
    };
  }

  // Koordinaten sind [lon, lat, altitude_meters] — die radiosonden-api liefert seit der
  // API-Erweiterung 3D-Koordinaten (RFC-7946-Höhe als 3. Element) statt nur [lon, lat].
  function setTrack(callsign: string, coords: [number, number, number][], active: boolean) {
    (service as unknown as { tracks: Map<string, unknown> }).tracks.set(callsign, {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { callsign, point_count: coords.length, start_time: '', end_time: '', max_altitude: 20000 }
    });
    (service as unknown as { flights: Map<string, RadiosondeFlight> }).flights.set(
      callsign,
      flight({ callsign, active })
    );
  }

  function setActivePosition(callsign: string, lon: number, lat: number) {
    (service as unknown as { activePositions: Map<string, unknown> }).activePositions.set(callsign, {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { callsign, station: 'OE5ITH', altitude: 5000, sonde_time: '' }
    });
  }

  function getTracksGeoJson(): GeoJSON.FeatureCollection {
    return (service as unknown as { getTracksGeoJson: () => GeoJSON.FeatureCollection }).getTracksGeoJson();
  }

  function getPointsGeoJson(): GeoJSON.FeatureCollection {
    return (service as unknown as { getPointsGeoJson: () => GeoJSON.FeatureCollection }).getPointsGeoJson();
  }

  function getItems(): TrackingItem[] {
    return (service as unknown as { getItems: () => TrackingItem[] }).getItems();
  }

  it('splits a track into one 2-point segment per consecutive coordinate pair, colored by segment alt_mid', () => {
    service = makeService();
    setTrack('ACTIVE-1', [[12, 48, 0], [12.1, 48.1, 1000], [12.2, 48.2, 3000]], true);

    const segments = getTracksGeoJson().features.filter(f => f.properties?.callsign === 'ACTIVE-1');

    expect(segments).toHaveLength(2);
    expect(segments[0].properties?.alt_mid).toBe(500);
    expect(segments[1].properties?.alt_mid).toBe(2000);
    expect(segments.every(s => s.properties?.active === true)).toBe(true);
  });

  it('defaults a missing per-point altitude to 0 for alt_mid', () => {
    service = makeService();
    setTrack('NOALT-1', [[12, 48, 0], [12.1, 48.1, undefined as unknown as number]], false);

    const [segment] = getTracksGeoJson().features;
    expect(segment.properties?.alt_mid).toBe(0);
  });

  it('produces no segments for a track with fewer than 2 points', () => {
    service = makeService();
    setTrack('SINGLE-1', [[12, 48, 0]], false);

    expect(getTracksGeoJson().features).toHaveLength(0);
  });

  it('only includes active flights in the points layer', () => {
    service = makeService();
    setTrack('ACTIVE-1', [[12, 48, 0]], true);
    setActivePosition('ACTIVE-1', 12, 48);
    setTrack('DONE-1', [[13, 49, 0]], false);

    const points = getPointsGeoJson().features;
    expect(points).toHaveLength(1);
    expect(points[0].properties?.callsign).toBe('ACTIVE-1');
  });

  it('uses the live position for an active flight sidebar item', () => {
    service = makeService();
    setTrack('ACTIVE-1', [[12, 48, 0], [12.5, 48.5, 0]], true);
    setActivePosition('ACTIVE-1', 12.9, 48.9);

    const [item] = getItems();
    expect(item.lat).toBe(48.9);
    expect(item.lon).toBe(12.9);
  });

  it('falls back to the last track point for a completed flight sidebar item', () => {
    service = makeService();
    setTrack('DONE-1', [[13, 49, 0], [13.7, 49.7, 0]], false);

    const [item] = getItems();
    expect(item.lat).toBe(49.7);
    expect(item.lon).toBe(13.7);
  });
});
