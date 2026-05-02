export interface RouteStyle {
  color: string;
  weight: number;
  opacity: number;
}

export type RouteStyleKey = 'active' | 'background';

export const MAP_ROUTE_STYLES: Record<RouteStyleKey, RouteStyle> = {
  active: {
    color: '#3b82f6', // --accent
    weight: 5,
    opacity: 1.0
  },
  background: {
    color: '#888888', // --muted
    weight: 3,
    opacity: 0.6
  }
};
