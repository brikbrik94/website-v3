export interface CoordsState {
  lat: number;
  lon: number;
}

export interface DmsCoords {
  lat: { d: number; m: number; s: string; suffix: string };
  lon: { d: number; m: number; s: string; suffix: string };
}

export interface DdmCoords {
  lat: { d: number; m: string; suffix: string };
  lon: { d: number; m: string; suffix: string };
}

export interface UtmCoords {
  zone: string;
  e: string;
  n: string;
}

export interface BmnCoords {
  m: string;
  rw: string;
  hw: string;
}

export interface MgrsCoords {
  gzd: string;
  sq: string;
  e: string;
  n: string;
}

export interface MaidenheadCoords {
  locator: string;
}

export interface PlusCodeCoords {
  code: string;
}
