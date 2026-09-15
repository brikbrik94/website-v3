import { RouteStyle, RouteStyleKey } from '../types/common';

/**

 * Resolves a CSS variable from :root, with a safe fallback.
 */
const getCssVar = (name: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
};

/**
 * Dynamic map styles that resolve colors from CI tokens.
 */
export const MAP_ROUTE_STYLES: Record<RouteStyleKey, RouteStyle> = {
  get active() {
    return {
      color: getCssVar('--accent', '#3b82f6'),
      weight: 5,
      opacity: 1.0
    };
  },
  get background() {
    return {
      color: getCssVar('--muted', '#888888'),
      weight: 3,
      opacity: 0.6
    };
  }
};

/**
 * Global map colors for markers and UI elements, resolved from CI tokens.
 */
export const MAP_COLORS = {
  get accent() { return getCssVar('--accent', '#3b82f6'); },
  get muted() { return getCssVar('--muted', '#888888'); },
  get success() { return getCssVar('--success', '#22c55e'); },
  get warning() { return getCssVar('--warning', '#eab308'); },
  get danger() { return getCssVar('--danger', '#ef4444'); },
  // Altitude Gradient
  get alt0() { return getCssVar('--alt-0', '#22c55e'); },
  get alt5k() { return getCssVar('--alt-5k', '#38bdf8'); },
  get alt15k() { return getCssVar('--alt-15k', '#818cf8'); },
  get alt35k() { return getCssVar('--alt-35k', '#e879f9'); },
  get alt40k() { return getCssVar('--alt-40k', '#ef4444'); },
  // Utility
  get white() { return getCssVar('--white', '#ffffff'); },
  get black() { return getCssVar('--black', '#000000'); }
};

/**
 * Umrechnungsfaktor Meter → Fuß — die gemeinsame Höhenfarbskala (getAltitudeColorStops()) ist in
 * Fuß kalibriert (ADS-B `alt_baro` ist nativ Fuß), Radiosonden-`altitude`/`max_altitude` aus der
 * radiosonden-api sind dagegen in Metern (verifiziert über die Steigrate eines realen Flugs).
 */
export const METERS_TO_FEET = 3.28084;

/**
 * Gemeinsame Höhenfarb-Stufen für ADS-B- und Radiosonden-Layer (TrackingMapLayers.ts,
 * RadiosondeMapLayers.ts) — eine Quelle, damit beide Domänen dieselbe Skala zeigen: Flugzeuge
 * bleiben im lila Bereich (bis 35.000 ft), hochfliegende Privatjets werden rot (ab 40.000 ft),
 * Radiosonden, die weit darüber steigen, laufen nach Schwarz aus (100.000 ft — typische
 * Platzhöhe/Bersthöhe liegt bei ~30km ≈ 98.000 ft).
 */
export function getAltitudeColorStops(): (number | string)[] {
  return [
    0,      MAP_COLORS.alt0,
    5000,   MAP_COLORS.alt5k,
    15000,  MAP_COLORS.alt15k,
    35000,  MAP_COLORS.alt35k,
    40000,  MAP_COLORS.alt40k,
    100000, MAP_COLORS.black
  ];
}

// Fallbacks spiegeln die aktuellen oe5ith-ci-Werte (ab v1.22.0) 1:1 — nur für
// Umgebungen ohne geladenes CI-Stylesheet (z.B. Tests), siehe getCssVar().
const SCALE_REACH_FALLBACK: Record<number, string> = {
  1: '#ef4444', 2: '#ec6b3d', 3: '#ea9537', 4: '#e8c131', 5: '#dbe52b',
  6: '#a7e225', 7: '#71e01f', 8: '#3dd620', 9: '#21cd33', 10: '#22c55e'
};

/**
 * Farbe für einen Isochronen-Ring nach seiner Position in der aufsteigend sortierten
 * Ring-Reihenfolge, gemappt auf die CI-Erreichbarkeits-Skala `--scale-reach-1..10`
 * (1 = rot/schlechteste, 10 = grün/beste Erreichbarkeit, oe5ith-ci ab v1.22.0):
 * index 0 (kürzeste Zeit/Distanz, innerster Ring, am schnellsten erreichbar) = Stufe 10,
 * der äußerste Ring = Stufe 1. Bei total <= 1 immer Stufe 10 (voll erreichbar).
 */
export function getIsochroneRingColor(index: number, total: number): string {
  const step = total <= 1 ? 10 : Math.round(10 - (index / (total - 1)) * 9);
  return getCssVar(`--scale-reach-${step}`, SCALE_REACH_FALLBACK[step]);
}
