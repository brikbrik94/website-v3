import type { Feature, LineString } from 'geojson';

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
    type: 'dot' | 'line' | 'area';
    color: string | null;
    label: string;
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

export interface RouteStep {
    distance: number;
    duration: number;
    type: number;
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
