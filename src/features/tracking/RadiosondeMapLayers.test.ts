import { describe, it, expect } from 'vitest';
import { RadiosondeMapLayers } from './RadiosondeMapLayers';
import { METERS_TO_FEET } from '../../lib/MapStyles';

describe('RadiosondeMapLayers.getTracksLayerDefinition', () => {
  it('colors each track segment by its (meters-to-feet converted) alt_mid, not by active/inactive', () => {
    const def = RadiosondeMapLayers.getTracksLayerDefinition();
    expect(def.id).toBe('radiosonde-tracks-layer');
    expect(def.type).toBe('line');
    const lineColor = (def.paint as Record<string, unknown>)['line-color'] as unknown[];
    expect(lineColor[0]).toBe('interpolate');
    const valueExpr = lineColor[2] as unknown[];
    expect(valueExpr).toEqual(['*', ['coalesce', ['get', 'alt_mid'], 0], METERS_TO_FEET]);
  });

  it('still distinguishes active from completed flights via line-width, not color', () => {
    const def = RadiosondeMapLayers.getTracksLayerDefinition();
    const lineWidth = (def.paint as Record<string, unknown>)['line-width'] as unknown[];
    expect(lineWidth[0]).toBe('case');
    expect(lineWidth[1]).toEqual(['==', ['get', 'active'], true]);
  });
});

describe('RadiosondeMapLayers.getPointsLayerDefinition', () => {
  it('colors the point by its (meters-to-feet converted) live altitude', () => {
    const def = RadiosondeMapLayers.getPointsLayerDefinition();
    expect(def.id).toBe('radiosonde-points-layer');
    expect(def.type).toBe('circle');
    const circleColor = (def.paint as Record<string, unknown>)['circle-color'] as unknown[];
    expect(circleColor[0]).toBe('interpolate');
    const valueExpr = circleColor[2] as unknown[];
    expect(valueExpr).toEqual(['*', ['coalesce', ['get', 'altitude'], 0], METERS_TO_FEET]);
  });
});
