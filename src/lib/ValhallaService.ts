import { RouteResult } from '../types/common';
import { toRouteResult, ValhallaTrip } from './ValhallaRouteInterpreter';

const VALHALLA_BASE_URL = '/api/valhalla.php';

/**
 * Abstraktionsschicht über den `/api/valhalla.php`-Proxy zur selbst gehosteten
 * Valhalla-Testinstanz — analog RoutingService, aber bewusst reduziert auf reine
 * A→B-Routenberechnung (kein Turn-by-Turn, keine Matrix-Suche, siehe Design-Spec).
 */
export const ValhallaService = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${VALHALLA_BASE_URL}?path=status`, { cache: 'no-store' });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async calculateRoute(
    start: [number, number],
    target: [number, number],
    costing: string
  ): Promise<RouteResult | null> {
    try {
      const res = await fetch(`${VALHALLA_BASE_URL}?path=route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [
            { lat: start[0], lon: start[1] },
            { lat: target[0], lon: target[1] },
          ],
          costing,
          units: 'kilometers',
        }),
      });

      if (!res.ok) throw new Error('Valhalla-Routing fehlgeschlagen');
      const data = await res.json();
      if (!data.trip) throw new Error('Valhalla-Response ohne trip');
      return toRouteResult(data.trip as ValhallaTrip);
    } catch (e) {
      console.error('Valhalla-Routing Fehler:', e);
      return null;
    }
  },
};
