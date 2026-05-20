import { 
    TrackingItem, 
    AircraftEntity, 
    VesselEntity, 
    ServerMessage, 
    SnapshotMessage, 
    UpdateMessage,
    SourceStatus,
    SystemTelemetry
} from '../../types/tracking';
import { MapRegistry } from '../../lib/MapRegistry';
import { ShipTypeMapper } from '../../lib/ShipTypeMapper';

export type TrackingDataCallback = (data: {
    adsbData: any;
    adsbTracks: any;
    aisData: any;
    aisTracks: any;
    adsbItems: TrackingItem[];
    aisItems: TrackingItem[];
}) => void;

export type TrackingStatusCallback = (
    success: boolean,
    adsbCount: number,
    aisCount: number,
    packetRate: number,
    sources: SourceStatus[],
    system?: SystemTelemetry
) => void;

export class TrackingDataService {
    private static readonly MAX_TRACK_POINTS = 200;
    private ws: WebSocket | null = null;
    private aircraftState = new Map<string, AircraftEntity>();
    private vesselState = new Map<string, VesselEntity>();
    private sourceState = new Map<string, SourceStatus>();
    private lastSystemTelemetry?: SystemTelemetry;
    
    private isDestroyed = false;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private packetCount = 0;
    private packetRateInterval: ReturnType<typeof setInterval> | null = null;
    private currentPacketRate = 0;

    private onData: TrackingDataCallback;
    private onStatus: TrackingStatusCallback;

    private wsUrl = 'wss://api.oe5ith.at/tracking/ws/v2';
    private currentBounds: [number, number, number, number] | null = null;
    private subscribeDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(onData: TrackingDataCallback, onStatus: TrackingStatusCallback) {
        this.onData = onData;
        this.onStatus = onStatus;
        
        // Ensure sources exist in Registry immediately for persistence
        if (!MapRegistry.getSource('adsb')) MapRegistry.registerSource('adsb', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: 0 });
        if (!MapRegistry.getSource('adsb-tracks')) MapRegistry.registerSource('adsb-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: 0 });
        if (!MapRegistry.getSource('ais')) MapRegistry.registerSource('ais', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: 0 });
        if (!MapRegistry.getSource('ais-tracks')) MapRegistry.registerSource('ais-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: 0 });

        // Start packet rate calculator (every 10s for more immediate feedback)
        this.packetRateInterval = setInterval(() => {
            this.currentPacketRate = this.packetCount * 6; // Estimate per minute
            this.packetCount = 0;
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.emitStatus();
            }
        }, 10000);
    }

    private mergeTrack(existingTrack: any[] | undefined, newPoints: any[] | undefined): any[] | undefined {
        const track = existingTrack ? [...existingTrack] : [];
        if (newPoints && newPoints.length > 0) {
            track.push(...newPoints);
        }
        if (track.length === 0) return undefined;
        return track.slice(-TrackingDataService.MAX_TRACK_POINTS);
    }

    public refresh() {
        if (this.isDestroyed || (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))) return;
        this.connect();
    }

    public setBounds(bounds: { getWest: () => number, getSouth: () => number, getEast: () => number, getNorth: () => number }) {
        this.currentBounds = [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth()
        ];

        if (this.subscribeDebounceTimeout) clearTimeout(this.subscribeDebounceTimeout);
        
        this.subscribeDebounceTimeout = setTimeout(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.sendSubscription();
            }
        }, 500);
    }

    private connect() {
        if (this.isDestroyed) return;
        
        console.log('[TrackingDataService] Connecting to WebSocket...');
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            console.log('[TrackingDataService] WebSocket connected');
            this.emitStatus();
        };

        this.ws.onmessage = (event) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);
                this.handleMessage(msg);
            } catch (e) {
                console.warn('[TrackingDataService] Failed to parse message', e);
            }
        };

        this.ws.onclose = () => {
            console.log('[TrackingDataService] WebSocket closed');
            this.ws = null;
            if (!this.isDestroyed) {
                this.scheduleReconnect();
            }
            this.emitStatus();
        };

        this.ws.onerror = (err) => {
            console.error('[TrackingDataService] WebSocket error', err);
            this.emitStatus();
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    }

    private handleMessage(msg: ServerMessage) {
        this.packetCount++;
        
        if ('system' in msg && msg.system) {
            this.lastSystemTelemetry = msg.system;
        }

        switch (msg.type) {
            case 'hello':
                console.log(`[TrackingDataService] Gateway Hello: Protocol V${msg.protocolVersion}`);
                this.sendSubscription();
                break;
            case 'ack':
                console.log('[TrackingDataService] Subscription acknowledged');
                break;
            case 'error':
                console.error('[TrackingDataService] Gateway error:', msg.message);
                break;
            case 'snapshot':
                this.handleSnapshot(msg);
                break;
            case 'update':
                this.handleUpdate(msg);
                break;
            case 'heartbeat':
                this.emitStatus();
                break;
        }
    }

    private sendSubscription() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const sub = {
            type: 'subscribe',
            bbox: this.currentBounds, // null means global/server-default
            rate: 1,
            includeVesselTracks: true
        };

        console.log('[TrackingDataService] Sending subscription:', sub);
        this.ws.send(JSON.stringify(sub));
    }

    private handleSnapshot(msg: SnapshotMessage) {
        this.aircraftState.clear();
        this.vesselState.clear();
        this.sourceState.clear();
        msg.aircraft.forEach(a => {
            const track = this.mergeTrack(undefined, a.track || a.trackPoints);
            this.aircraftState.set(a.id, { ...a, track, trackPoints: undefined });
        });
        msg.vessels.forEach(v => {
            const track = this.mergeTrack(undefined, v.track || v.trackPoints);
            this.vesselState.set(v.id, { ...v, track, trackPoints: undefined });
        });
        msg.sources.forEach(s => this.sourceState.set(s.id, s));
        this.emitData();
    }

    private handleUpdate(msg: UpdateMessage) {
        msg.aircraft.forEach(a => {
            const existing = this.aircraftState.get(a.id);
            const track = this.mergeTrack(existing?.track, a.trackPoints);
            
            this.aircraftState.set(a.id, { 
                ...existing, 
                ...a, 
                track,
                trackPoints: undefined 
            } as AircraftEntity);
        });
        msg.vessels.forEach(v => {
            const existing = this.vesselState.get(v.id);
            const track = this.mergeTrack(existing?.track, v.trackPoints);
            
            this.vesselState.set(v.id, { 
                ...existing, 
                ...v,
                track,
                trackPoints: undefined
            } as VesselEntity);
        });
        msg.removed.forEach(r => {
            if (r.kind === 'aircraft') this.aircraftState.delete(r.id);
            else this.vesselState.delete(r.id);
        });
        msg.sources.forEach(s => {
            const existing = this.sourceState.get(s.id);
            if (existing) {
                this.sourceState.set(s.id, { ...existing, ...s });
            } else {
                this.sourceState.set(s.id, s);
            }
        });
        this.emitData();
    }

    private getAdsbTracksGeoJson() {
        const features: any[] = [];
        
        for (const a of this.aircraftState.values()) {
            if (!a.track || a.track.length < 2) continue;
            
            const coords = a.track
                .filter(p => Number.isFinite(p.lon) && Number.isFinite(p.lat))
                .map(p => [p.lon, p.lat]);
            
            if (coords.length < 2) continue;
            
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coords
                },
                properties: {
                    hex: a.id,
                    alt_mid: a.track[Math.floor(a.track.length / 2)]?.altitudeFt ?? a.altitudeFt ?? 0
                }
            });
        }
        
        return { type: 'FeatureCollection', features };
    }

    private getAisTracksGeoJson() {
        const features: any[] = [];
        for (const v of this.vesselState.values()) {
            if (!v.track || v.track.length < 2) continue;
            const coords = v.track
                .filter(p => Number.isFinite(p.lon) && Number.isFinite(p.lat))
                .map(p => [p.lon, p.lat]);
            if (coords.length < 2) continue;
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: coords },
                properties: { mmsi: v.id }
            });
        }
        return { type: 'FeatureCollection', features };
    }

    private emitData() {
        const adsbData = this.getAdsbGeoJson();
        const aisData = this.getAisGeoJson();
        const adsbTracks = this.getAdsbTracksGeoJson();
        const aisTracks = this.getAisTracksGeoJson();
        
        if (adsbTracks.features.length > 0 || aisTracks.features.length > 0) {
            console.debug(`[TrackingDataService] Generated ${adsbTracks.features.length} aircraft tracks, ${aisTracks.features.length} vessel tracks`);
        }

        // Update Registry for persistent storage across page switches/style changes
        const adsbReg = MapRegistry.getSource('adsb');
        if (adsbReg) adsbReg.definition.data = adsbData;
        const aisReg = MapRegistry.getSource('ais');
        if (aisReg) aisReg.definition.data = aisData;
        
        // Update tracks in registry
        const adsbTracksReg = MapRegistry.getSource('adsb-tracks');
        if (adsbTracksReg) adsbTracksReg.definition.data = adsbTracks;
        const aisTracksReg = MapRegistry.getSource('ais-tracks');
        if (aisTracksReg) aisTracksReg.definition.data = aisTracks;

        const adsbItems: TrackingItem[] = Array.from(this.aircraftState.values()).map(a => {
            const label = a.registration || a.callsign || a.id;
            const subLabel = a.aircraftType || (a.altitudeFt != null ? `${Math.round(a.altitudeFt)}ft` : '');
            
            const details: Record<string, string | number> = {
                'ID': a.id,
                'Callsign': a.callsign || '----',
                'Höhe': a.isOnGround ? 'On Ground' : `${Math.round(a.altitudeFt || 0)} ft`,
                'Speed': `${Math.round(a.groundSpeedKt || 0)} kt`,
                'Kurs': `${Math.round(a.trackDeg || 0)}°`,
                'Squawk': a.squawk || '----'
            };

            if (a.registration) details['Reg'] = a.registration;
            if (a.aircraftType) details['Typ'] = a.aircraftType;
            if (a.manufacturer) details['Hersteller'] = a.manufacturer;
            if (a.registeredOwner) details['Besitzer'] = a.registeredOwner;
            if (a.ownerCountry) details['Land'] = a.ownerCountry;

            return {
                id: a.id,
                label: label,
                info: `${subLabel} | ${Math.round(a.groundSpeedKt || 0)}kt`,
                type: 'adsb',
                lat: a.lat || 0,
                lon: a.lon || 0,
                details: details
            };
        });

        const aisItems: TrackingItem[] = Array.from(this.vesselState.values()).map(v => ({
            id: v.id,
            label: v.name || v.callsign || `MMSI: ${v.id}`,
            info: `${v.speedKt || 0}kt | ${ShipTypeMapper.getClassName(v.shipType)}`,
            type: 'ais',
            lat: v.lat || 0,
            lon: v.lon || 0,
            details: {
                'MMSI': v.id,
                'Klasse': ShipTypeMapper.getClassName(v.shipType),
                'SOG': `${v.speedKt || 0} kt`,
                'COG': `${v.courseDeg || 0}°`,
                'Status': v.status ?? '?'
            }
        }));

        this.onData({ adsbData, adsbTracks, aisData, aisTracks, adsbItems, aisItems });
        this.emitStatus();
    }

    private emitStatus() {
        const isConnected = this.ws !== null && this.ws.readyState === WebSocket.OPEN;
        const sources = Array.from(this.sourceState.values());
        
        // Use server telemetry if available, fallback to local estimate
        const rate = (this.lastSystemTelemetry?.decodedPerMinute !== undefined)
            ? this.lastSystemTelemetry.decodedPerMinute
            : this.currentPacketRate;

        this.onStatus(
            isConnected, 
            this.aircraftState.size, 
            this.vesselState.size, 
            rate, 
            sources,
            this.lastSystemTelemetry
        );
    }

    private getAdsbGeoJson() {
        return {
            type: 'FeatureCollection',
            features: Array.from(this.aircraftState.values())
                .filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lon))
                .map(a => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [a.lon!, a.lat!] },
                    properties: {
                        hex: a.id,
                        flight: a.callsign,
                        category: this.mapIcaoToCategory(a.icaoType),
                        alt_baro: a.altitudeFt,
                        gs: a.groundSpeedKt,
                        track: a.trackDeg,
                        vert_rate: a.verticalRateFpm,
                        squawk: a.squawk,
                        seen: (Date.now() - new Date(a.lastSeen).getTime()) / 1000
                    }
                }))
        };
    }

    /**
     * Maps ICAO aircraft types to the legacy categories used for map icons.
     * Icons are defined in TrackingMapLayers.ts (A1-A7, B1-B6, C1-C3).
     */
    private mapIcaoToCategory(icao?: string): string {
        if (!icao) return 'A3'; // Default to medium/large jet
        
        const type = icao.toUpperCase();
        
        // --- B1: Helicopters ---
        if (/^(EC|H|B|A|R)(35|45|06|40|41|13|14|44|66|10|13)/.test(type) || ['EC35', 'H135', 'H145', 'EC45', 'B06', 'R44', 'R66', 'A109', 'A139', 'AW13', 'AW16'].includes(type)) {
            return 'B1';
        }

        // --- A1: Light / GA ---
        if (/^(C15|C17|C18|P28|SR2|DA2|DA4|DV2|G11|G10)/.test(type) || ['C150', 'C152', 'C172', 'C182', 'P28A', 'P28B', 'SR20', 'SR22', 'DA20', 'DA40', 'DA42', 'DV20'].includes(type)) {
            return 'A1';
        }

        // --- A2: Small Jets / Business ---
        if (/^(C5|C2|L|G)(10|25|35|45|60|L5|LF)/.test(type) || ['C510', 'C525', 'C560', 'C25A', 'C25B', 'LJ35', 'LJ45', 'LJ60', 'GL5T', 'GLF4', 'GLF5', 'GLF6'].includes(type)) {
            return 'A2';
        }

        // --- A3: Large Jets (Default for most airliners) ---
        if (/^(A3|B7|E1|CR)/.test(type) || ['A320', 'A321', 'A319', 'B738', 'B737', 'E190', 'CRJ9'].includes(type)) {
            return 'A3';
        }

        return 'A3';
    }

    private getAisGeoJson() {
        return {
            type: 'FeatureCollection',
            features: Array.from(this.vesselState.values())
                .filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lon))
                .map(v => {
                    const typeCode = v.shipType;
                    return {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [v.lon!, v.lat!] },
                        properties: {
                            mmsi: Number(v.id),
                            shipname: v.name,
                            callsign: v.callsign,
                            speed: v.speedKt,
                            cog: v.courseDeg,
                            heading: v.headingDeg,
                            shipclass: typeCode,
                            status: v.status,
                            seen: (Date.now() - new Date(v.lastSeen).getTime()) / 1000,
                            // ENRICHMENT
                            ui_sprite: ShipTypeMapper.getSprite(typeCode),
                            ui_class: ShipTypeMapper.getClassName(typeCode),
                            ui_color: ShipTypeMapper.getColor(typeCode)
                        }
                    };
                })
        };
    }

    public getInitialData() {
        return {
            adsbData: this.getAdsbGeoJson(),
            adsbTracks: this.getAdsbTracksGeoJson(),
            aisData: this.getAisGeoJson(),
            aisTracks: this.getAisTracksGeoJson()
        };
    }

    public destroy() {
        this.isDestroyed = true;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.packetRateInterval) clearInterval(this.packetRateInterval);
        if (this.subscribeDebounceTimeout) clearTimeout(this.subscribeDebounceTimeout);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
