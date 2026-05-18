# Gateway Status Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate real-time gateway status and telemetry into the tracking sidebar and a new info page module.

**Architecture:**
- Update `src/types/tracking.ts` with system telemetry types.
- Update `TrackingDataService.ts` to parse and broadcast telemetry.
- Refine dot logic in `TrackingSidebar.ts`.
- Create `TrackingGatewayModule.ts` for detailed status on the info page.

**Tech Stack:** TypeScript, Vanilla JS, MapLibre GL.

---

### Task 1: Update Tracking Types

**Files:**
- Modify: `src/types/tracking.ts`

- [ ] **Step 1: Add SystemTelemetry type and update messages**

```typescript
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

// ... Update SnapshotMessage, UpdateMessage, HeartbeatMessage ...
export type SnapshotMessage = {
  type: 'snapshot';
  aircraft: AircraftEntity[];
  vessels: VesselEntity[];
  sources: SourceStatus[];
  system?: SystemTelemetry; // Added
  serverTime: string;
  sequence: number;
};

export type UpdateMessage = {
  type: 'update';
  aircraft: AircraftEntity[];
  vessels: VesselEntity[];
  removed: RemovedEntity[];
  sources: SourceStatus[];
  system?: SystemTelemetry; // Added
  serverTime: string;
  sequence: number;
};

export type HeartbeatMessage = {
  type: 'heartbeat';
  system?: SystemTelemetry; // Added
  serverTime: string;
  sequence: number;
};
```

- [ ] **Step 2: Commit changes**

```bash
git add src/types/tracking.ts
git commit -m "feat(tracking): add system telemetry types to gateway messages"
```

---

### Task 2: Update TrackingDataService

**Files:**
- Modify: `src/features/tracking/TrackingDataService.ts`

- [ ] **Step 1: Update TrackingStatusCallback and handle telemetry**

```typescript
// Update type
export type TrackingStatusCallback = (
    success: boolean,
    adsbCount: number,
    aisCount: number,
    packetRate: number,
    sources: SourceStatus[],
    system?: SystemTelemetry // Added
) => void;

// Update handleMessage to extract system block
    private handleMessage(msg: ServerMessage) {
        this.packetCount++;
        
        // Extract system telemetry from any message that has it
        if ('system' in msg && msg.system) {
            this.lastSystemTelemetry = msg.system;
        }

        switch (msg.type) {
            // ... cases ...
        }
    }

// Update emitStatus to include lastSystemTelemetry
    private emitStatus() {
        const isConnected = this.ws !== null && this.ws.readyState === WebSocket.OPEN;
        const sources = Array.from(this.sourceState.values());
        this.onStatus(
            isConnected, 
            this.aircraftState.size, 
            this.vesselState.size, 
            this.lastSystemTelemetry?.decodedPerMinute || this.currentPacketRate, 
            sources,
            this.lastSystemTelemetry
        );
    }
```

- [ ] **Step 2: Commit changes**

```bash
git add src/features/tracking/TrackingDataService.ts
git commit -m "feat(tracking): parse and broadcast gateway system telemetry"
```

---

### Task 3: Refine TrackingSidebar Status Logic

**Files:**
- Modify: `src/components/TrackingSidebar.ts`

- [ ] **Step 1: Update updateTrackingServerStatus logic**

```typescript
export const updateTrackingServerStatus = (
  isConnected: boolean, 
  adsbCount: number = 0, 
  aisCount: number = 0,
  packetsPerMin: number = 0,
  sources: SourceStatus[] = [],
  system?: SystemTelemetry // Added
) => {
  // ... get elements ...

  const getDotClass = (kind: 'adsb' | 'ais') => {
    const filtered = sources.filter(s => s.kind === kind);
    if (!isConnected || filtered.length === 0) return 'off';
    
    const onlineCount = filtered.filter(s => s.state === 'online').length;
    if (onlineCount === filtered.length && filtered.length > 0) return 'on';
    if (onlineCount > 0) return 'warn';
    return 'off';
  };

  if (adsbDot) adsbDot.className = `status-dot ${getDotClass('adsb')}`;
  if (aisDot) aisDot.className = `status-dot ${getDotClass('ais')}`;
  
  // Use decodedPerMinute if available from system
  if (packetsVal) {
    packetsVal.textContent = String(system?.decodedPerMinute ?? packetsPerMin);
  }

  // ... rest of logic ...
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/TrackingSidebar.ts
git commit -m "style(tracking): refine sidebar status dots and packet rate display"
```

---

### Task 4: Create TrackingGatewayModule for Info Page

**Files:**
- Create: `src/components/info/TrackingGatewayModule.ts`

- [ ] **Step 1: Implement the module**

```typescript
import { SourceStatus, SystemTelemetry } from '../../types/tracking';

export class TrackingGatewayModule {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.renderInitial();
    }

    private renderInitial() {
        this.container.innerHTML = `
            <div class="info-module">
                <h3><i class="fa-solid fa-server"></i> Tracking Gateway</h3>
                <div class="info-module-content">
                    <p class="t-small">Warte auf Telemetrie-Daten vom Gateway...</p>
                </div>
            </div>
        `;
    }

    public update(sources: SourceStatus[], system?: SystemTelemetry) {
        if (!system) return;

        const uptime = Math.floor(system.uptimeSec / 3600);
        const mem = system.process.memoryMiB.toFixed(1);
        
        const sourceRows = sources.map(s => `
            <tr>
                <td>${s.id}</td>
                <td><span class="badge badge-gray">${s.kind.toUpperCase()}</span></td>
                <td><span class="status-dot ${s.state === 'online' ? 'on' : s.state === 'degraded' ? 'warn' : 'off'}"></span> ${s.state}</td>
                <td class="mono t-small">${s.lastDataAt ? new Date(s.lastDataAt).toLocaleTimeString() : '---'}</td>
                <td class="t-small">${s.message || '-'}</td>
            </tr>
        `).join('');

        this.container.innerHTML = `
            <div class="info-module">
                <h3><i class="fa-solid fa-server"></i> Tracking Gateway</h3>
                <div class="info-module-content">
                    <div class="status-panel mb-gap">
                        <div class="status-row">
                            <span class="status-row-name">Uptime</span>
                            <span class="status-row-value">${uptime}h</span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Memory</span>
                            <span class="status-row-value">${mem} MiB</span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Clients</span>
                            <span class="status-row-value">${system.clients}</span>
                        </div>
                    </div>
                    
                    <div class="tool-sep"></div>
                    
                    <table class="popup-kv" style="width: 100%">
                        <thead>
                            <tr>
                                <th class="t-label">Source</th>
                                <th class="t-label">Typ</th>
                                <th class="t-label">Status</th>
                                <th class="t-label">Last Data</th>
                                <th class="t-label">Info</th>
                            </tr>
                        </thead>
                        <tbody>${sourceRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
}
```

- [ ] **Step 2: Commit module**

```bash
git add src/components/info/TrackingGatewayModule.ts
git commit -m "feat(info): add TrackingGatewayModule for detailed status"
```

---

### Task 5: Integrate into Info Page

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Add module and subscribe to TrackingDataService**

```typescript
// ... imports ...
import { TrackingGatewayModule } from '../components/info/TrackingGatewayModule';
import { TrackingDataService } from '../features/tracking/TrackingDataService';

// In InfoPageController.mount:
    const gatewayContainer = document.createElement('div');
    mounts.main.appendChild(gatewayContainer);
    const gatewayModule = new TrackingGatewayModule(gatewayContainer);

    // Subscribe to tracking data service for live updates
    const trackingService = new TrackingDataService(
        () => {}, // No entities needed here
        (success, adsb, ais, rate, sources, system) => {
            gatewayModule.update(sources, system);
        }
    );
    this.trackingService = trackingService;
    trackingService.refresh();
```

- [ ] **Step 2: Commit changes**

```bash
git add src/pages/InfoPage.ts
git commit -m "feat(info): integrate TrackingGatewayModule into InfoPage"
```
