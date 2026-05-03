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
  get danger() { return getCssVar('--danger', '#ef4444'); }
};
