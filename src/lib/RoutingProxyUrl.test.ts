import { describe, it, expect } from 'vitest';
import { buildRoutingProxyUrl } from './RoutingProxyUrl';

describe('buildRoutingProxyUrl', () => {
  it('builds an ORS URL with the provider and path query params', () => {
    expect(buildRoutingProxyUrl('ors', 'health')).toBe('/api/routing-proxy.php?provider=ors&path=health');
  });

  it('builds a Valhalla URL with the provider and path query params', () => {
    expect(buildRoutingProxyUrl('valhalla', 'route')).toBe('/api/routing-proxy.php?provider=valhalla&path=route');
  });

  it('passes a nested path segment through unchanged (e.g. directions/{profile}/geojson)', () => {
    expect(buildRoutingProxyUrl('ors', 'directions/driving-car/geojson'))
      .toBe('/api/routing-proxy.php?provider=ors&path=directions/driving-car/geojson');
  });
});
