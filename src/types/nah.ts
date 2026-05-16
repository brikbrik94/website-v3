export interface NahStation {
    name: string;
    callsign: string;
    region: string;
    op_type: string;
    is_active: boolean;
    in_season: boolean;
    is_night_ready: boolean;
    calculated_start?: string | null;
    calculated_end?: string | null;
    months_active?: number[];
    fixed_start?: string | null;
    fixed_end?: string | null;
    lat: number;
    lon: number;
    osm_id?: string;
}

export interface NahResponse {
    refresh_at?: string;
    stations: NahStation[];
    timestamp?: string;
    count?: number;
    reload_after?: number;
}

export interface NahStationResult extends NahStation {
    distance: number;
    duration: number;
    durationStr?: string;
    eta?: string;
}
