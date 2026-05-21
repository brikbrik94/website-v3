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

// --- GATEWAY TYPES ---

export type SourceKind = 'ais' | 'adsb';
export type SourceState = 'connecting' | 'online' | 'degraded' | 'offline';

export type SourceStatus = {
  id: string;
  kind: SourceKind;
  state: SourceState;
  message?: string;
  lastConnectedAt?: string;
  lastDataAt?: string;
  updatedAt: string;
};

export type AircraftTrackPoint = {
  lat: number;
  lon: number;
  altitudeFt?: number;
  groundSpeedKt?: number;
  trackDeg?: number;
  timestamp: string;
};

export type AircraftEntity = {
  kind: 'aircraft';
  id: string;
  sourceIds: string[];
  callsign?: string;
  lat?: number;
  lon?: number;
  altitudeFt?: number;
  groundSpeedKt?: number;
  trackDeg?: number;
  verticalRateFpm?: number;
  squawk?: string;
  alert?: boolean;
  emergency?: boolean;
  spi?: boolean;
  isOnGround?: boolean;
  generatedAt?: string;
  loggedAt?: string;
  aircraftType?: string;
  icaoType?: string;
  registration?: string;
  manufacturer?: string;
  registeredOwner?: string;
  operator?: string;
  operatorCode?: string;
  ownerCountry?: string;
  photoUrl?: string;
  photoThumbnailUrl?: string;
  track?: AircraftTrackPoint[];
  trackPoints?: AircraftTrackPoint[];
  lastSeen: string;
  updatedAt: string;
};

export type VesselEntity = {
  kind: 'vessel';
  id: string;
  sourceIds: string[];
  name?: string;
  callsign?: string;
  lat?: number;
  lon?: number;
  speedKt?: number;
  courseDeg?: number;
  headingDeg?: number;
  country?: string;
  shipType?: number | string;
  status?: number;
  track?: AircraftTrackPoint[]; // Reuse track point type
  trackPoints?: AircraftTrackPoint[];
  lastSeen: string;
  updatedAt: string;
};

export type TrackingEntity = AircraftEntity | VesselEntity;

export type RemovedEntity = {
  kind: TrackingEntity['kind'];
  id: string;
  reason: 'expired' | 'source_removed';
};

export type SystemTelemetry = {
  serverStartedAt: string;
  uptimeSec: number;
  process: {
    memoryMiB: number;
  };
  clients: number;
  entities: number;
  messagesPerMinute: number;
  decodedPerMinute: number;
  invalidPerMinute: number;
  isSending: boolean;
};

export type SnapshotMessage = {
  type: 'snapshot';
  aircraft: AircraftEntity[];
  vessels: VesselEntity[];
  sources: SourceStatus[];
  system?: SystemTelemetry;
  serverTime: string;
  sequence: number;
};

export type UpdateMessage = {
  type: 'update';
  aircraft: AircraftEntity[];
  vessels: VesselEntity[];
  removed: RemovedEntity[];
  sources: SourceStatus[];
  system?: SystemTelemetry;
  serverTime: string;
  sequence: number;
};

export type HelloMessage = {
  type: 'hello';
  protocolVersion: 1 | 2; // Allow both during transition, but target 2
  serverTime: string;
};

export type AckMessage = {
  type: 'ack';
  serverTime: string;
  sequence: number;
};

export type ErrorMessage = {
  type: 'error';
  message: string;
  code?: string;
  serverTime: string;
};

export type HeartbeatMessage = {
  type: 'heartbeat';
  system?: SystemTelemetry;
  serverTime: string;
  sequence: number;
};

export type ServerMessage = 
  | HelloMessage 
  | SnapshotMessage 
  | UpdateMessage 
  | HeartbeatMessage 
  | AckMessage 
  | ErrorMessage;
