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
    type: 'dot' | 'line' | 'area';
    color: string;
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
    features: any[];
    metadata: any;
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

export interface RouteFeatureProperties {
    summary: { distance: number; duration: number };
    extras?: RouteExtras;
    [key: string]: any;
}

export interface RoutingStation {
    id: number;
    name: string;
    org: string;
    lat: number;
    lon: number;
    distance: number;
    duration: number;
    route?: any;
}

export interface StatsResponse {
    generated_at: string;
    nah: Record<string, { total: number, active: number }>;
    rd: Record<string, number>;
    nef: Record<string, number>;
}
