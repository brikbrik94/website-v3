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
  // Utility
  get white() { return getCssVar('--white', '#ffffff'); },
  get black() { return getCssVar('--black', '#000000'); }
};

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = parseInt(expanded, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const mixRgb = (from: [number, number, number], to: [number, number, number], t: number): string => {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Farbe für einen Isochronen-Ring nach seiner Position in der aufsteigend sortierten
 * Ring-Reihenfolge: index 0 (kürzeste Zeit/Distanz, innerster Ring) ist die volle Akzentfarbe,
 * höhere Indizes werden zunehmend Richtung Weiß aufgehellt (max. 75% Mischung, damit der
 * äußerste Ring auf hellem Kartenhintergrund nicht unsichtbar wird). Bei total <= 1 immer die
 * volle Akzentfarbe.
 */
export function getIsochroneRingColor(index: number, total: number): string {
  const accent = hexToRgb(getCssVar('--accent', '#3b82f6'));
  const white = hexToRgb(getCssVar('--white', '#ffffff'));
  const t = total <= 1 ? 0 : (index / (total - 1)) * 0.75;
  return mixRgb(accent, white, t);
}
