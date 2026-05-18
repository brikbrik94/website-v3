import { describe, it, expect } from 'vitest';
import { ShipTypeMapper } from './ShipTypeMapper';
import { MAP_COLORS } from './MapStyles';

describe('ShipTypeMapper', () => {
  it('should map Inland AIS cargo codes correctly', () => {
    expect(ShipTypeMapper.getSprite(8010)).toBe('ship-cargo');
    expect(ShipTypeMapper.getClassName(8010)).toBe('Gütermotorschiff');
  });

  it('should map Inland AIS passenger codes correctly', () => {
    expect(ShipTypeMapper.getSprite(8440)).toBe('ship-passenger');
    expect(ShipTypeMapper.getColor(8440)).toBe(MAP_COLORS.warning);
  });

  it('should map standard AIS pleasure craft correctly', () => {
    expect(ShipTypeMapper.getSprite(37)).toBe('ship-small');
    expect(ShipTypeMapper.getClassName(37)).toBe('Sportboot');
  });

  it('should handle unknown codes gracefully', () => {
    expect(ShipTypeMapper.getSprite(9999)).toBe('ship-unknown');
    expect(ShipTypeMapper.getClassName(9999)).toContain('9999');
  });
});
