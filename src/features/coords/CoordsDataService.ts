import proj4 from 'proj4';
// @ts-ignore
import * as mgrs from 'mgrs';
// @ts-ignore
import * as olcPkg from 'open-location-code';
import { CoordsState, DmsCoords, DdmCoords, UtmCoords, BmnCoords, MgrsCoords, MaidenheadCoords, PlusCodeCoords } from './types';

const olc = new olcPkg.OpenLocationCode();

/**
 * CoordsDataService - Encapsulates coordinate conversion logic and state.
 */
export class CoordsDataService {
  private state: CoordsState = {
    lat: 48.3064,
    lon: 14.2858
  };

  private listeners: ((state: CoordsState) => void)[] = [];

  /**
   * Genauigkeit der zuletzt gesetzten Quelle. Steuert die Plus-Code-Länge:
   * 'fine' -> 11 Stellen, 'coarse' -> 10 Stellen.
   */
  private sourcePrecision: 'fine' | 'coarse' = 'fine';

  constructor() {
    // Proj4 Definitionen für Österreich (BMN / Lambert)
    proj4.defs([
      ["EPSG:31254", "+proj=tmerc +lat_0=0 +lon_0=10.33333333333333 +k=1 +x_0=150000 +y_0=0 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs"],
      ["EPSG:31255", "+proj=tmerc +lat_0=0 +lon_0=13.33333333333333 +k=1 +x_0=450000 +y_0=0 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs"],
      ["EPSG:31256", "+proj=tmerc +lat_0=0 +lon_0=16.33333333333333 +k=1 +x_0=750000 +y_0=0 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs"]
    ]);
  }

  public addListener(cb: (state: CoordsState) => void) {
    this.listeners.push(cb);
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb({ ...this.state }));
  }

  public toDms(val: number) {
    const d = Math.floor(Math.abs(val));
    const m = Math.floor((Math.abs(val) - d) * 60);
    const s = ((Math.abs(val) - d - m / 60) * 3600).toFixed(1);
    return { d, m, s };
  }

  public toDdm(val: number) {
    const d = Math.floor(Math.abs(val));
    const m = ((Math.abs(val) - d) * 60).toFixed(3);
    return { d, m };
  }

  public getDdm(): DdmCoords {
    const latDdm = this.toDdm(this.state.lat);
    const lonDdm = this.toDdm(this.state.lon);
    return {
      lat: { ...latDdm, suffix: this.state.lat >= 0 ? 'N' : 'S' },
      lon: { ...lonDdm, suffix: this.state.lon >= 0 ? 'E' : 'W' }
    };
  }

  public setDdm(latD: number, latM: number, latSuf: string, lonD: number, lonM: number, lonSuf: string) {
    if (!isNaN(latD) && !isNaN(latM) && !isNaN(lonD) && !isNaN(lonM)) {
      let lat = latD + latM / 60;
      if (latSuf === 'S') lat *= -1;
      let lon = lonD + lonM / 60;
      if (lonSuf === 'W') lon *= -1;
      this.setWgs(lat, lon);
    }
  }

  public setWgs(lat: number, lon: number, precision: 'fine' | 'coarse' = 'fine') {
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
    this.state.lat = lat;
    this.state.lon = lon;
    this.sourcePrecision = precision;
    this.notifyListeners();
  }

  public getWgs(): CoordsState {
    return { ...this.state };
  }

  public getDms(): DmsCoords {
    const latDms = this.toDms(this.state.lat);
    const lonDms = this.toDms(this.state.lon);
    return {
      lat: { ...latDms, suffix: this.state.lat >= 0 ? 'N' : 'S' },
      lon: { ...lonDms, suffix: this.state.lon >= 0 ? 'E' : 'W' }
    };
  }

  public getUtm(): UtmCoords {
    const utmZoneNum = Math.floor((this.state.lon + 180) / 6) + 1;
    const utm = proj4('EPSG:4326', `+proj=utm +zone=${utmZoneNum} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`).forward([this.state.lon, this.state.lat]);
    return {
      zone: utmZoneNum + (this.state.lat >= 0 ? 'N' : 'S'),
      e: Math.round(utm[0]).toString(),
      n: Math.round(utm[1]).toString()
    };
  }

  public getBmn(): BmnCoords {
    let epsg = "EPSG:31255";
    let m = "M31";
    if (this.state.lon < 12) { epsg = "EPSG:31254"; m = "M28"; }
    else if (this.state.lon > 15) { epsg = "EPSG:31256"; m = "M34"; }
    const bmn = proj4('EPSG:4326', epsg).forward([this.state.lon, this.state.lat]);
    return {
      m,
      rw: Math.round(bmn[0]).toString(),
      hw: Math.round(bmn[1]).toString()
    };
  }

  public getMgrs(): MgrsCoords {
    const mgrsStr = mgrs.forward([this.state.lon, this.state.lat]);
    return {
      gzd: mgrsStr.substring(0, 3),
      sq: mgrsStr.substring(3, 5),
      e: mgrsStr.substring(5, 10),
      n: mgrsStr.substring(10, 15)
    };
  }

  public getMaidenhead(): MaidenheadCoords {
    const mlon = this.state.lon + 180;
    const mlat = this.state.lat + 90;
    const f1 = String.fromCharCode(65 + Math.floor(mlon / 20));
    const f2 = String.fromCharCode(65 + Math.floor(mlat / 10));
    const s1 = Math.floor((mlon % 20) / 2);
    const s2 = Math.floor(mlat % 10);
    const t1 = String.fromCharCode(97 + Math.floor((mlon % 2) * 12));
    const t2 = String.fromCharCode(97 + Math.floor((mlat % 1) * 24));
    return {
      locator: `${f1}${f2}${s1}${s2}${t1}${t2}`
    };
  }

  public setDms(latD: number, latM: number, latS: number, latSuf: string, lonD: number, lonM: number, lonS: number, lonSuf: string) {
    if (!isNaN(latD) && !isNaN(latM) && !isNaN(latS) && !isNaN(lonD) && !isNaN(lonM) && !isNaN(lonS)) {
      let lat = latD + latM / 60 + latS / 3600;
      if (latSuf === 'S') lat *= -1;
      let lon = lonD + lonM / 60 + lonS / 3600;
      if (lonSuf === 'W') lon *= -1;
      this.setWgs(lat, lon);
    }
  }

  public setUtm(zoneStr: string, eVal: number, nVal: number) {
    const zoneNum = parseInt(zoneStr);
    if (!isNaN(zoneNum) && !isNaN(eVal) && !isNaN(nVal)) {
      const res = proj4(`+proj=utm +zone=${zoneNum} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`, 'EPSG:4326').forward([eVal, nVal]);
      this.setWgs(res[1], res[0]);
    }
  }

  public setBmn(m: string, rw: number, hw: number) {
    let epsg = m === 'M28' ? 'EPSG:31254' : (m === 'M34' ? 'EPSG:31256' : 'EPSG:31255');
    if (!isNaN(rw) && !isNaN(hw)) {
      const res = proj4(epsg, 'EPSG:4326').forward([rw, hw]);
      this.setWgs(res[1], res[0]);
    }
  }

  public setMgrs(gzd: string, sq: string, eVal: string, nVal: string) {
    if (gzd && sq && eVal.length === 5 && nVal.length === 5) {
      const res = mgrs.inverse(gzd + sq + eVal + nVal);
      this.setWgs(res[1], res[0]);
    }
  }

  public setMaidenhead(locator: string) {
    if (locator.length >= 4) {
      const l = locator.toUpperCase();
      const lon = (l.charCodeAt(0) - 65) * 20 + parseInt(l[2]) * 2 + (l.length > 4 ? (l.charCodeAt(4) - 65) * (2/24) : 1) - 180;
      const lat = (l.charCodeAt(1) - 65) * 10 + parseInt(l[3]) * 1 + (l.length > 5 ? (l.charCodeAt(5) - 65) * (1/24) : 0.5) - 90;
      // Maidenhead ist grob (~km) -> Plus Code mit 10 Stellen ausgeben
      this.setWgs(lat, lon, 'coarse');
    }
  }

  public getPlusCode(): PlusCodeCoords {
    const length = this.sourcePrecision === 'coarse' ? 10 : 11;
    return { code: olc.encode(this.state.lat, this.state.lon, length) };
  }

  public setPlusCode(code: string) {
    const c = code.trim();
    if (!olc.isValid(c) || !olc.isFull(c)) return;
    const area = olc.decode(c);
    // Anzahl signifikanter Stellen (ohne '+') bestimmt die Genauigkeit
    const sig = c.replace('+', '').length;
    this.setWgs(area.latitudeCenter, area.longitudeCenter, sig >= 11 ? 'fine' : 'coarse');
  }
}
