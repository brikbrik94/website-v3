import * as polyline from '@mapbox/polyline';
import { Position } from 'geojson';
import { RouteResult, RouteStep, ManeuverKind } from '../types/common';

export interface ValhallaManeuver {
  type: number;
  instruction: string;
  street_names?: string[];
  time: number;
  length: number;
  begin_shape_index: number;
  end_shape_index: number;
}

export interface ValhallaLeg {
  shape: string;
  maneuvers?: ValhallaManeuver[];
}

export interface ValhallaTripSummary {
  time: number;
  length: number;
}

export interface ValhallaTrip {
  legs: ValhallaLeg[];
  summary: ValhallaTripSummary;
}

// Valhallas numerischer Manöver-Typ (0-36, siehe
// https://github.com/valhalla/valhalla-docs/blob/master/turn-by-turn/api-reference.md)
// → providerneutraler ManeuverKind. kNone (0) und die 7 Transit-Typen (30-36) sind bewusst nicht
// gelistet — Transit/Multimodal-Costing ist in dieser Instanz mangels GTFS-Daten nicht nutzbar
// (docs/valhalla-api-guide.md), keines der unterstützten Profile kann diese Typen je liefern;
// beide fallen auf 'straight' zurück wie jeder unbekannte Wert (siehe
// docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md).
// Hinweis (2026-08-22, finale Branch-Review): der Bereich 0-36 stammt aus der Doku, gegen die
// zur Planungszeit entworfen wurde. Live gegen die produktiv erreichbare Instanz (v3.8.3)
// verifiziert, dass es real weitere Typen jenseits 36 gibt — mindestens 39/40/41
// (Aufzug/Treppe/Rolltreppe im `pedestrian`-Costing, das diese App anbietet). Nicht gemappt,
// fällt sicher auf 'straight' zurück — kein Fehlverhalten, aber keine vollständige Abdeckung.
const VALHALLA_TYPE_TO_KIND: Record<number, ManeuverKind> = {
  1: 'depart', 2: 'depart-right', 3: 'depart-left',
  4: 'goal', 5: 'goal-right', 6: 'goal-left',
  7: 'becomes',
  8: 'straight',
  9: 'slight-right', 10: 'turn-right', 11: 'sharp-right',
  12: 'uturn-right', 13: 'uturn-left',
  14: 'sharp-left', 15: 'turn-left', 16: 'slight-left',
  17: 'ramp-straight', 18: 'ramp-right', 19: 'ramp-left',
  20: 'exit-right', 21: 'exit-left',
  22: 'stay-straight', 23: 'keep-right', 24: 'keep-left',
  25: 'merge',
  26: 'roundabout-enter', 27: 'roundabout-exit',
  28: 'ferry-enter', 29: 'ferry-exit',
};

export function valhallaTypeToManeuverKind(type: number): ManeuverKind {
  return VALHALLA_TYPE_TO_KIND[type] ?? 'straight';
}

/**
 * Übersetzt Valhallas `/route`-Antwort (komprimiertes Polyline6-`shape` pro Leg,
 * `summary.length` in km, optional `maneuvers[]` pro Leg) in dieselbe `RouteResult`-Struktur, die
 * ORS liefert (Meter/Sekunden) — damit RoutingMapLayers/updateRoutingSummary unverändert bleiben.
 */
export function toRouteResult(trip: ValhallaTrip): RouteResult {
  const coordinates: Position[] = trip.legs.flatMap((leg) =>
    polyline.decode(leg.shape, 6).map(([lat, lon]) => [lon, lat] as Position)
  );

  const steps: RouteStep[] = trip.legs.flatMap((leg) =>
    (leg.maneuvers ?? []).map((m): RouteStep => ({
      distance: m.length * 1000,
      duration: m.time,
      type: valhallaTypeToManeuverKind(m.type),
      instruction: m.instruction,
      name: m.street_names?.[0] ?? '',
      way_points: [m.begin_shape_index, m.end_shape_index],
    }))
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
          ...(steps.length > 0
            ? { segments: [{ distance: trip.summary.length * 1000, duration: trip.summary.time, steps }] }
            : {}),
        },
      },
    ],
    metadata: {},
  };
}
