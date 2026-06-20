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

  it('should convert WGS to DDM correctly', () => {
    const ddm = service.getDdm();
    expect(ddm.lat.d).toBe(48);
    expect(ddm.lat.m).toBe('18.384');
    expect(ddm.lat.suffix).toBe('N');
    expect(ddm.lon.d).toBe(14);
    expect(ddm.lon.m).toBe('17.148');
    expect(ddm.lon.suffix).toBe('E');
  });

  it('should set state from DDM correctly', () => {
    service.setDdm(48, 18.384, 'N', 14, 17.148, 'E');
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(48.3064, 5);
    expect(wgs.lon).toBeCloseTo(14.2858, 5);
  });

  it('should apply S/W signs when setting from DDM', () => {
    service.setDdm(48, 18.384, 'S', 14, 17.148, 'W');
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(-48.3064, 5);
    expect(wgs.lon).toBeCloseTo(-14.2858, 5);
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

  it('should convert WGS to an 11-digit Plus Code when the source is precise', () => {
    const pc = service.getPlusCode();
    expect(pc.code).toBe('8FWP874P+H83');
  });

  it('should set state from a 10-digit Plus Code and echo it back as 10 digits', () => {
    service.setPlusCode('8FWP874P+H8');
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(48.3064, 3);
    expect(wgs.lon).toBeCloseTo(14.2858, 3);
    expect(service.getPlusCode().code).toBe('8FWP874P+H8');
  });

  it('should set state from an 11-digit Plus Code and echo it back as 11 digits', () => {
    service.setPlusCode('8FWP874P+H83');
    expect(service.getPlusCode().code).toBe('8FWP874P+H83');
  });

  it('should output 11 digits after a precise system (WGS) sets the coordinate', () => {
    service.setPlusCode('8FWP874P+H8'); // coarse first
    service.setWgs(48.3064, 14.2858);
    expect(service.getPlusCode().code.split('+')[1].length).toBe(3);
  });

  it('should fall back to a 10-digit Plus Code for a coarse system (Maidenhead)', () => {
    service.setMaidenhead('JN78dh');
    expect(service.getPlusCode().code.split('+')[1].length).toBe(2);
  });

  it('should ignore invalid or short Plus Codes', () => {
    service.setWgs(48.3064, 14.2858);
    service.setPlusCode('not-a-code');
    const wgs = service.getWgs();
    expect(wgs.lat).toBeCloseTo(48.3064, 5);
    expect(wgs.lon).toBeCloseTo(14.2858, 5);
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
