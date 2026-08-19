import * as polyline from '@mapbox/polyline';
import { Position } from 'geojson';
import { RouteResult } from '../types/common';

export interface ValhallaLeg {
  shape: string;
}

export interface ValhallaTripSummary {
  time: number;
  length: number;
}

export interface ValhallaTrip {
  legs: ValhallaLeg[];
  summary: ValhallaTripSummary;
}

/**
 * Übersetzt Valhallas `/route`-Antwort (komprimiertes Polyline6-`shape` pro Leg,
 * `summary.length` in km) in dieselbe `RouteResult`-Struktur, die ORS liefert
 * (Meter/Sekunden) — damit RoutingMapLayers/updateRoutingSummary unverändert bleiben.
 */
export function toRouteResult(trip: ValhallaTrip): RouteResult {
  const coordinates: Position[] = trip.legs.flatMap((leg) =>
    polyline.decode(leg.shape, 6).map(([lat, lon]) => [lon, lat] as Position)
  );

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: {
          summary: {
            distance: trip.summary.length * 1000,
            duration: trip.summary.time,
          },
        },
      },
    ],
    metadata: {},
  };
}
