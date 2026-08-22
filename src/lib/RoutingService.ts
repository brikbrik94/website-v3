import { RouteResult, RoutingStation } from '../types/common';
import { orsCodeToManeuverKind } from './OrsManeuverKind';

const ORS_BASE_URL = '/api/ors.php';

/**
 * Übersetzt die rohen ORS-Zahlencodes in properties.segments[].steps[].type auf ManeuverKind —
 * ORS liefert weiterhin Zahlen, ManeuverIcons.ts/RoutingDetailsFormatter.ts kennen nur noch
 * ManeuverKind (siehe docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md).
 * Alles andere an der Antwort bleibt unverändert (Zero-Transform-Prinzip bleibt für den Rest
 * erhalten).
 */
function translateOrsManeuverKinds(data: any): RouteResult {
  const features = (data.features ?? []).map((feature: any) => {
    const segments = feature.properties?.segments?.map((segment: any) => ({
      ...segment,
      steps: (segment.steps ?? []).map((step: any) => ({
        ...step,
        type: orsCodeToManeuverKind(step.type),
      })),
    }));
    return segments
      ? { ...feature, properties: { ...feature.properties, segments } }
      : feature;
  });
  return { ...data, features };
}

/**
 * Abstraktionsschicht über den `/api/ors.php`-Proxy zum OpenRouteService (ORS): Health-Check,
 * verfügbare Fahrprofile, Routenberechnung (A→B) und Matrix-basierte Nächste-Station-Suche
 * (SEW/NEF).
 */
export const RoutingService = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${ORS_BASE_URL}?path=health`, { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'ready' || data.status === 'ok';
    } catch (e) {
      return false;
    }
  },

  async getProfiles(): Promise<string[]> {
    try {
      const res = await fetch(`${ORS_BASE_URL}?path=status`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.profiles && typeof data.profiles === 'object') {
        return Object.keys(data.profiles);
      }
      return ['driving-car'];
    } catch (e) {
      return ['driving-car'];
    }
  },

  async calculateRoute(
    start: [number, number],
    target: [number, number],
    profile: string = 'driving-car',
    extraInfo?: string[]
  ): Promise<RouteResult | null> {
    const url = `${ORS_BASE_URL}?path=directions/${profile}/geojson`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: [
            [start[1], start[0]],
            [target[1], target[0]]
          ],
          // Turn-by-Turn-Anweisungen (segments[].steps[].instruction) sonst auf Englisch,
          // obwohl der Rest der UI Deutsch ist.
          language: 'de',
          ...(extraInfo ? { extra_info: extraInfo } : {})
        })
      });

      if (!res.ok) throw new Error('Routing fehlgeschlagen');
      const data = await res.json();
      return translateOrsManeuverKinds(data);
    } catch (e) {
      console.error('Routing Fehler:', e);
      return null;
    }
  },

  async findNearestStations(
    target: [number, number],
    type: 'sew' | 'nef',
    profile: string = 'driving-car'
  ): Promise<RoutingStation[]> {
    try {
      // SONDERFALL: driving-emergency
      // Matrix-Abfrage für driving-emergency ist unzuverlässig.
      // 1. Suche 7 schnellste Stationen mit driving-car.
      // 2. Berechne für diese 7 die echte Route mit driving-emergency.
      // 3. Gib die 5 besten zurück.
      if (profile === 'driving-emergency') {
        const top7Base = await fetch(`/api/nearest-stations.php?target=${target[0]},${target[1]}&type=${type}&profile=driving-car&limit=7`);
        const stations7 = await top7Base.json();

        const detailedResults = await Promise.all(stations7.map(async (s: RoutingStation) => {
          const route = await this.calculateRoute([s.lat, s.lon], target, 'driving-emergency');
          if (route && route.features && route.features.length > 0) {
            const summary = route.features[0].properties.summary;
            return {
              ...s,
              duration: summary.duration,
              distance: summary.distance,
              // Vollständige FeatureCollection speichern – so wie calculateRoute sie liefert
              // und wie RoutingMapLayers.updateRoutesLayer sie erwartet (route.features[0].geometry).
              route: route
            };
          }
          return null;
        }));

        // Filtere Fehler raus und sortiere nach der echten Emergency-Dauer
        const final5 = detailedResults
          .filter(r => r !== null)
          .sort((a, b) => a.duration - b.duration)
          .slice(0, 5);

        return final5;
      }

      // Normalfall: Direkte Matrix-Abfrage mit dem gewählten Profil
      const res = await fetch(`/api/nearest-stations.php?target=${target[0]},${target[1]}&type=${type}&profile=${profile}`);
      if (!res.ok) throw new Error('Stations-API nicht erreichbar');
      return await res.json();
    } catch (e) {
      console.error('Stations-Suche Fehler:', e);
      return [];
    }
  }
};
