import type { FeatureCollection, Polygon } from 'geojson';
import { IsochroneRangeType } from '../types/common';
import { RoutingService } from './RoutingService';
import { buildRoutingProxyUrl } from './RoutingProxyUrl';

/**
 * Abstraktionsschicht über den `/api/routing-proxy.php`-Proxy für ORS-Isochronen-Abfragen. Health-Check
 * und Profil-Liste sind generische ORS-Abfragen, die schon in RoutingService existieren — hier
 * direkt wiederverwendet statt dupliziert.
 */
export const IsochronesService = {
  checkHealth: RoutingService.checkHealth,
  getProfiles: RoutingService.getProfiles,

  async calculateIsochrones(
    point: [number, number],
    profile: string,
    ranges: number[],
    rangeType: IsochroneRangeType
  ): Promise<FeatureCollection<Polygon> | null> {
    const url = buildRoutingProxyUrl('ors', `isochrones/${profile}`);
    const rangeValues = rangeType === 'time' ? ranges.map((r) => r * 60) : ranges.map((r) => r * 1000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [[point[1], point[0]]],
          range: rangeValues,
          range_type: rangeType
        })
      });

      if (!res.ok) throw new Error('Isochronen-Berechnung fehlgeschlagen');
      const data = await res.json();
      return data as FeatureCollection<Polygon>;
    } catch (e) {
      console.error('Isochronen Fehler:', e);
      return null;
    }
  }
};
