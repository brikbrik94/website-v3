import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingDataService } from './RoutingDataService';

describe('RoutingDataService', () => {
  let service: RoutingDataService;

  beforeEach(() => {
    service = new RoutingDataService();
  });

  it('should store and retrieve start coordinates', () => {
    const coord: [number, number] = [48.2, 16.3];
    service.setCoords('start', coord);
    expect(service.getStartCoord()).toEqual(coord);
  });

  it('should store and retrieve target coordinates', () => {
    const coord: [number, number] = [48.3, 16.4];
    service.setCoords('target', coord);
    expect(service.getTargetCoord()).toEqual(coord);
  });

  it('should manage eye active states', () => {
    service.setEyeActiveState(1, true);
    expect(service.getEyeActiveStates().has(1)).toBe(true);
    
    service.setEyeActiveState(1, false);
    expect(service.getEyeActiveStates().has(1)).toBe(false);
  });

  it('should clear results but keep coords', () => {
    service.setCoords('start', [1, 2]);
    const mockStation = { id: 1, name: 'Test', org: 'Test', lat: 0, lon: 0, distance: 0, duration: 0 };
    service.setNearestStations([mockStation]);
    service.setCurrentHighlightedId(1);
    
    service.clearResults();
    
    expect(service.getStartCoord()).toEqual([1, 2]);
    expect(service.getNearestStations()).toEqual([]);
    expect(service.getCurrentHighlightedId()).toBeNull();
  });

  it('should clear coords', () => {
    service.setCoords('start', [1, 2]);
    service.clearCoords();
    expect(service.getStartCoord()).toBeNull();
  });
});
