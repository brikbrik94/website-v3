import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

export interface ToastOptions {
    body?: string;
    duration?: number;
}

export interface ContextMenuItem {
    label: string;
    icon?: string;
    value?: string;
    danger?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}

export interface LegendEntry {
    id?: string;
    type: 'dot' | 'line' | 'area' | 'icon' | 'line-cased';
    color: string | null;
    label: string;
    /** FontAwesome-Klassen (z.B. 'fa-solid fa-helicopter'), nur bei type: 'icon' relevant. */
    icon?: string;
    /** Deckkraft (0-1) aus den echten Layer-Paint-Daten, z.B. layers.json `opacity`-Feld — spiegelt
     *  die tatsächliche Kartendarstellung, statt den Swatch immer volldeckend zu zeigen. */
    opacity?: number;
    /** type:'line' (Höhe, geclampt 1-6px) | type:'line-cased' (Pflicht, Innenbreite) */
    width?: number;
    /** type:'line' — [Strich, Lücke], proportional auf 8px-Zyklus skaliert */
    dasharray?: [number, number];
    /** type:'area' (mit outline_width) | type:'line-cased' (Pflicht) */
    outline_color?: string;
    /** type:'area' (geclampt 1-3px, mit outline_color) | type:'line-cased' (Pflicht, geclampt 2-8px) */
    outline_width?: number;
}

export interface RouteStyle {
    color: string;
    weight: number;
    opacity: number;
}

export type RouteStyleKey = 'active' | 'background';

export interface GeocodeResult {
    display_name: string;
    lat: string;
    lon: number | string;
    class: string;
    type: string;
    importance: number;
}

export interface RouteResult {
    type: 'FeatureCollection';
    features: Feature<LineString, RouteFeatureProperties>[];
    metadata: unknown;
}

export interface RouteExtraSummaryEntry {
    value: number;
    distance: number;
    amount: number;
}

export interface RouteExtra {
    values: [number, number, number][];
    summary: RouteExtraSummaryEntry[];
}

export interface RouteExtras {
    tollways?: RouteExtra;
    roadaccessrestrictions?: RouteExtra;
    waytype?: RouteExtra;
}

/**
 * Providerneutraler Manöver-Typ — beide Routing-Provider (ORS, Valhalla) übersetzen ihren
 * jeweiligen nativen numerischen Code hierher (siehe OrsManeuverKind.ts/ValhallaRouteInterpreter.ts),
 * damit ManeuverIcons.ts/RoutingDetailsFormatter.ts providerunabhängig bleiben. 30 Werte: die 14
 * bestehenden oe5ith-ci-Icons plus 16 neue (geodata-plugin-standard-analoges Muster: lokal bereits
 * gezeichnet, Issue an oe5ith-ci läuft parallel, siehe docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md).
 */
export type ManeuverKind =
  | 'depart' | 'depart-right' | 'depart-left'
  | 'goal' | 'goal-right' | 'goal-left'
  | 'becomes'
  | 'straight'
  | 'slight-right' | 'turn-right' | 'sharp-right'
  | 'slight-left' | 'turn-left' | 'sharp-left'
  | 'uturn' | 'uturn-right' | 'uturn-left'
  | 'ramp-straight' | 'ramp-right' | 'ramp-left'
  | 'exit-right' | 'exit-left'
  | 'stay-straight' | 'keep-right' | 'keep-left'
  | 'merge'
  | 'roundabout-enter' | 'roundabout-exit'
  | 'ferry-enter' | 'ferry-exit';

export interface RouteStep {
    distance: number;
    duration: number;
    type: ManeuverKind;
    instruction: string;
    name: string;
    way_points: [number, number];
}

export interface RouteSegment {
    distance: number;
    duration: number;
    steps: RouteStep[];
}

export interface RouteFeatureProperties {
    summary: { distance: number; duration: number };
    extras?: RouteExtras;
    segments?: RouteSegment[];
    [key: string]: unknown;
}

export interface RoutingStation {
    id: number;
    name: string;
    org: string;
    lat: number;
    lon: number;
    distance: number;
    duration: number;
    route?: RouteResult;
}

export interface StatsResponse {
    generated_at: string;
    nah: Record<string, { total: number, active: number }>;
    rd: Record<string, number>;
    nef: Record<string, number>;
}

export type IsochroneRangeType = 'time' | 'distance';

export interface IsochroneQuery {
    id: number;
    /** [lat, lon] — konsistent mit RoutingDataService-Konvention. */
    point: [number, number];
    /** Reverse-geocodierte Adresse oder formatierte Koordinaten, für die Ergebnis-Liste. */
    label: string;
    profile: string;
    rangeType: IsochroneRangeType;
    /** Nutzereingabe in Minuten (time) bzw. km (distance), aufsteigend sortiert. */
    ranges: number[];
    geojson: FeatureCollection<Polygon>;
}
