# Tracking Gateway V2 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the live tracking system to Tracking Gateway Protocol V2.1 with dynamic BBox filtering and vessel tracks.

**Architecture:** Update `TrackingDataService` to handle the V2 subscription lifecycle (hello -> subscribe -> ack -> data). Integrate map bounds from `TrackingPage` into the service with a 500ms debounce. Extend the service to generate GeoJSON for vessel tracks.

**Tech Stack:** TypeScript, WebSocket, MapLibre GL JS, GeoJSON.

---

### Task 1: Update Tracking Types

**Files:**
- Modify: `src/types/tracking.ts`

- [ ] **Step 1: Update HelloMessage and add Ack/Error messages**

```typescript
// src/types/tracking.ts

// ... update HelloMessage ...
export type HelloMessage = {
  type: 'hello';
  protocolVersion: 1 | 2; // Allow both during transition, but target 2
  serverTime: string;
};

// ... add Ack and Error messages ...
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

// ... update ServerMessage ...
export type ServerMessage = 
  | HelloMessage 
  | SnapshotMessage 
  | UpdateMessage 
  | HeartbeatMessage 
  | AckMessage 
  | ErrorMessage;

// ... update VesselEntity and UpdateMessage for tracks ...
export type VesselEntity = {
  kind: 'vessel';
  id: string;
  // ... existing fields ...
  track?: AircraftTrackPoint[]; // Reuse track point type
  trackPoints?: AircraftTrackPoint[];
  lastSeen: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Commit changes**

```bash
git add src/types/tracking.ts
git commit -m "types(tracking): update for gateway protocol v2.1"
```

---

### Task 2: Refactor TrackingDataService for V2 Lifecycle

**Files:**
- Modify: `src/features/tracking/TrackingDataService.ts`

- [ ] **Step 1: Update WebSocket URL and add subscription state**

```typescript
// src/features/tracking/TrackingDataService.ts

// Change URL
private wsUrl = 'wss://api.oe5ith.at/tracking/ws/v2';

// Add state
private hasSubscribed = false;
private currentBounds: [number, number, number, number] | null = null;
private subscribeDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
```

- [ ] **Step 2: Update handleMessage to support V2 flow**

```typescript
// src/features/tracking/TrackingDataService.ts

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
            this.hasSubscribed = true;
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
```

- [ ] **Step 3: Implement sendSubscription method**

```typescript
// src/features/tracking/TrackingDataService.ts

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
```

- [ ] **Step 4: Commit changes**

```bash
git add src/features/tracking/TrackingDataService.ts
git commit -m "feat(tracking): implement v2 subscription lifecycle"
```

---

### Task 3: Implement Bounds Management & Debouncing

**Files:**
- Modify: `src/features/tracking/TrackingDataService.ts`

- [ ] **Step 1: Add setBounds method with debouncing**

```typescript
// src/features/tracking/TrackingDataService.ts

public setBounds(bounds: { getWest: () => number, getSouth: () => number, getEast: () => number, getNorth: () => number }) {
    this.currentBounds = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
    ];

    if (this.subscribeDebounceTimeout) clearTimeout(this.subscribeDebounceTimeout);
    
    // Only send if we are already connected and had an initial hello
    this.subscribeDebounceTimeout = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.sendSubscription();
        }
    }, 500);
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/features/tracking/TrackingDataService.ts
git commit -m "feat(tracking): add debounced bounds filtering"
```

---

### Task 4: Integrate Map Events in TrackingPage

**Files:**
- Modify: `src/features/tracking/TrackingPage.ts`

- [ ] **Step 1: Subscribe to map moveend events**

```typescript
// src/features/tracking/TrackingPage.ts

// Inside TrackingPageController.mount, after map is initialized:
this.map.on('moveend', () => {
    if (this.dataService && this.map) {
        this.dataService.setBounds(this.map.getBounds());
    }
});

// Send initial bounds
this.dataService.setBounds(this.map.getBounds());
```

- [ ] **Step 2: Commit changes**

```bash
git add src/features/tracking/TrackingPage.ts
git commit -m "feat(tracking): link map bounds to tracking service"
```

---

### Task 5: Implement Vessel Tracks

**Files:**
- Modify: `src/features/tracking/TrackingDataService.ts`

- [ ] **Step 1: Update handleUpdate to merge vessel trackPoints**

```typescript
// src/features/tracking/TrackingDataService.ts

// Inside handleUpdate, add vessel merging logic:
msg.vessels.forEach(v => {
    const existing = this.vesselState.get(v.id);
    if (existing) {
        const newTrack = existing.track ? [...existing.track] : [];
        if (v.trackPoints && v.trackPoints.length > 0) {
            newTrack.push(...v.trackPoints);
        }
        const prunedTrack = newTrack.slice(-200);
        
        this.vesselState.set(v.id, { 
            ...existing, 
            ...v,
            track: prunedTrack.length > 0 ? prunedTrack : undefined,
            trackPoints: undefined
        });
    } else {
        this.vesselState.set(v.id, {
            ...v,
            track: v.trackPoints,
            trackPoints: undefined
        });
    }
});
```

- [ ] **Step 2: Update handleSnapshot for vessel tracks**

```typescript
// src/features/tracking/TrackingDataService.ts

// Inside handleSnapshot:
msg.vessels.forEach(v => this.vesselState.set(v.id, v));
```

- [ ] **Step 3: Implement getAisTracksGeoJson**

```typescript
// src/features/tracking/TrackingDataService.ts

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
```

- [ ] **Step 4: Update emitData to include aisTracks**

```typescript
// src/features/tracking/TrackingDataService.ts

private emitData() {
    const adsbData = this.getAdsbGeoJson();
    const aisData = this.getAisGeoJson();
    const adsbTracks = this.getAdsbTracksGeoJson();
    const aisTracks = this.getAisTracksGeoJson(); // Use real tracks
    
    // ... rest of emitData ...
}
```

- [ ] **Step 5: Commit changes**

```bash
git add src/features/tracking/TrackingDataService.ts
git commit -m "feat(tracking): implement live vessel tracks"
```

---

### Task 6: Final Validation

- [ ] **Step 1: Build and Verify**

Run: `npm run build && npm run typecheck`
Expected: SUCCESS

- [ ] **Step 2: Test in browser**
1. Open Tracking Page.
2. Check Console for "Gateway Hello: Protocol V2" and "Subscription acknowledged".
3. Move map and verify BBox values in network/console (if logging enabled).
4. Verify aircraft and vessel tracks are rendered correctly.
