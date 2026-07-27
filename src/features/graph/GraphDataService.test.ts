import { describe, it, expect, beforeEach } from 'vitest';
import { GraphDataService, GraphExportState } from './GraphDataService';

function makeState(overrides: Partial<GraphExportState> = {}): GraphExportState {
  return {
    bbox: [[16.3, 48.2], [16.31, 48.205]],
    profile: 'driving-car',
    format: 'topojson',
    geometry: true,
    features: {
      nodes: { type: 'FeatureCollection', features: [] },
      edges: { type: 'FeatureCollection', features: [] },
      nodesCount: 0,
      edgesCount: 0
    },
    payloadBytes: 1234,
    ...overrides
  };
}

describe('GraphDataService', () => {
  let service: GraphDataService;

  beforeEach(() => {
    service = new GraphDataService();
  });

  it('starts with no result', () => {
    expect(service.getResult()).toBeNull();
  });

  it('stores and returns the result set via setResult', () => {
    const state = makeState({ profile: 'driving-emergency' });
    service.setResult(state);
    expect(service.getResult()?.profile).toBe('driving-emergency');
  });

  it('replaces the previous result on a new setResult call (no stacking)', () => {
    service.setResult(makeState({ profile: 'driving-car' }));
    service.setResult(makeState({ profile: 'driving-emergency' }));
    expect(service.getResult()?.profile).toBe('driving-emergency');
  });
});
