import { RouteResult } from '../types/common';
import { toRouteResult, ValhallaTrip } from './ValhallaRouteInterpreter';
import { buildRoutingProxyUrl } from './RoutingProxyUrl';

/**
 * Abstraktionsschicht über den `/api/valhalla.php`-Proxy zur selbst gehosteten
 * Valhalla-Testinstanz — analog RoutingService, aber bewusst reduziert auf reine
 * A→B-Routenberechnung (keine Matrix-Suche, siehe Design-Spec).
 */
export const ValhallaService = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(buildRoutingProxyUrl('valhalla', 'status'), { cache: 'no-store' });
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
      const res = await fetch(buildRoutingProxyUrl('valhalla', 'route'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [
            { lat: start[0], lon: start[1] },
            { lat: target[0], lon: target[1] },
          ],
          costing,
          units: 'kilometers',
          // Turn-by-Turn-Anweisungen (legs[].maneuvers[].instruction) sonst auf Englisch,
          // obwohl der Rest der UI Deutsch ist. Valhalla erwartet hier ein BCP-47-artiges
          // Locale-Tag ('de-DE'), nicht ORS' knappes 'de'.
          directions_options: { language: 'de-DE' },
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
