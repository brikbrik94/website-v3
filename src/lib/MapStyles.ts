export interface RouteStyle {
  color: string;
  weight: number;
  opacity: number;
}

export type RouteStyleKey = 'active' | 'background';

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
