import { describe, it, expect, afterEach } from 'vitest';
import { TrackingDataService } from './TrackingDataService';
import type { AircraftEntity } from '../../types/tracking';

// Zugriff auf privates Aircraft-State/GeoJSON-Building über bracket-notation,
// da der WebSocket-Verbindungsaufbau selbst hier nicht getestet wird.
describe('TrackingDataService - ADS-B Sprite-Zuweisung', () => {
  let service: TrackingDataService;

  afterEach(() => {
    service?.destroy();
  });

  function makeService(): TrackingDataService {
    return new TrackingDataService(
      () => {},
      () => {}
    );
  }

  function setAircraft(entity: Partial<AircraftEntity> & { id: string }) {
    const full: AircraftEntity = {
      kind: 'aircraft',
      sourceIds: [],
      lat: 48.2,
      lon: 14.3,
      lastSeen: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...entity
    };
    (service as unknown as { aircraftState: Map<string, AircraftEntity> }).aircraftState.set(full.id, full);
  }

  function getAdsbFeatures(): GeoJSON.Feature[] {
    return (service as unknown as { getAdsbGeoJson: () => GeoJSON.FeatureCollection }).getAdsbGeoJson().features;
  }

  it('uses the server-provided spriteType directly as sprite', () => {
    service = makeService();
    setAircraft({ id: 'abc123', icaoType: 'C172', spriteType: 'plane-a5' });

    const [feature] = getAdsbFeatures();

    expect(feature.properties?.sprite).toBe('plane-a5');
  });

  it('falls back to plane-unknown when spriteType is missing', () => {
    service = makeService();
    setAircraft({ id: 'def456', icaoType: 'B738' });

    const [feature] = getAdsbFeatures();

    expect(feature.properties?.sprite).toBe('plane-unknown');
  });
});
