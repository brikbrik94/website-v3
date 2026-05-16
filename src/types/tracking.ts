export interface Aircraft {
    hex: string;
    callsign?: string;
    flight?: string;
    lat: number;
    lon: number;
    alt_baro?: number | string;
    alt_geom?: number;
    gs?: number;
    track?: number;
    baro_rate?: number;
    vert_rate?: number;
    squawk?: string;
    category?: string;
    type?: string;
    registration?: string;
    messages?: number;
    seen?: number;
    rssi?: number;
    dst?: number;
    dir?: number;
}

export interface Ship {
    mmsi: number;
    name?: string;
    shipname?: string;
    callsign?: string;
    lat: number;
    lon: number;
    sog?: number;
    cog?: number;
    speed?: number;
    heading?: number;
    type?: number;
    shipclass?: number;
    status?: number;
    dest?: string;
    eta?: string;
    seen?: number;
    rssi?: number;
    dst?: number;
    dir?: number;
}

export interface TrackingItem {
    id: string | number;
    label?: string;
    info?: string;
    type: 'adsb' | 'ais';
    lat: number;
    lon: number;
    details?: {
        [key: string]: string | number;
    };
    heading?: number;
    speed?: number;
    alt?: number;
    name?: string;
    meta?: string;
    raw?: Aircraft | Ship;
    seen?: number;
}
