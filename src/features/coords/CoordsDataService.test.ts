import { describe, it, expect, beforeEach } from 'vitest';
import { CoordsDataService } from './CoordsDataService';

describe('CoordsDataService', () => {
  let service: CoordsDataService;

  beforeEach(() => {
    service = new CoordsDataService();
  });

  it('should have initial state for Linz', () => {
    const wgs = service.getWgs();
    expect(wgs.lat).toBe(48.3064);
    expect(wgs.lon).toBe(14.2858);
  });

  it('should convert WGS to DMS correctly', () => {
    const dms = service.getDms();
    expect(dms.lat.d).toBe(48);
    expect(dms.lat.m).toBe(18);
    expect(dms.lat.s).toBe('23.0');
    expect(dms.lat.suffix).toBe('N');
    expect(dms.lon.d).toBe(14);
    expect(dms.lon.m).toBe(17);
    expect(dms.lon.s).toBe('8.9');
    expect(dms.lon.suffix).toBe('E');
  });

  it('should convert WGS to UTM correctly', () => {
    const utm = service.getUtm();
    expect(utm.zone).toBe('33N');
    expect(utm.e).toBe('447040');
    expect(utm.n).toBe('5350603');
  });

  it('should convert WGS to BMN correctly', () => {
    const bmn = service.getBmn();
    expect(bmn.m).toBe('M31');
    expect(bmn.rw).toBe('520715');
    expect(bmn.hw).toBe('5352455');
  });

  it('should convert WGS to MGRS correctly', () => {
    const mgrs = service.getMgrs();
    expect(mgrs.gzd).toBe('33U');
    expect(mgrs.sq).toBe('VP');
    expect(mgrs.e).toBe('47040');
    expect(mgrs.n).toBe('50602');
  });

  it('should convert WGS to Maidenhead correctly', () => {
    const maidenhead = service.getMaidenhead();
    expect(maidenhead.locator).toBe('JN78dh');
  });

  it('should set state from DMS correctly', () => {
    service.setDms(48, 18, 23, 'N', 14, 17, 8.9, 'E');
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(48.306388, 5);
    expect(wgs.lon).toBeCloseTo(14.285805, 5);
  });

  it('should set state from UTM correctly', () => {
    service.setUtm('33N', 447040, 5350603);
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(48.3064, 4);
    expect(wgs.lon).toBeCloseTo(14.2858, 4);
  });

  it('should set state from BMN correctly', () => {
    service.setBmn('M31', 520715, 5352455);
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(48.3064, 4);
    expect(wgs.lon).toBeCloseTo(14.2858, 4);
  });

  it('should set state from MGRS correctly', () => {
    service.setMgrs('33U', 'VP', '47040', '50602');
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(48.3064, 4);
    expect(wgs.lon).toBeCloseTo(14.2858, 4);
  });

  it('should set state from Maidenhead correctly', () => {
    service.setMaidenhead('JN78dh');
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(48.3064, 1);
    expect(wgs.lon).toBeCloseTo(14.2858, 1);
  });

  it('should notify listeners on update', () => {
    let called = false;
    service.addListener((state) => {
      expect(state.lat).toBe(47.0);
      expect(state.lon).toBe(15.0);
      called = true;
    });
    service.setWgs(47.0, 15.0);
    expect(called).toBe(true);
  });
});
