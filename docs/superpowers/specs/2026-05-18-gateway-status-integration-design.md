# Design Spec: Gateway Status Integration (Tracking & Info)

**Date:** 2026-05-18
**Status:** Draft
**Topic:** Integrating real-time status and telemetry from the tracking gateway into the UI.

## 1. Objective
Improve the reliability and detail of the status indicators in the tracking sidebar and add a dedicated "Tracking Gateway" module to the Info Page. All information will be sourced from the live WebSocket stream (`system` and `sources` blocks).

## 2. Architecture

### 2.1 Tracking Sidebar (`TrackingSidebar.ts`)
The existing graphical representation will remain unchanged, but the logic for updating the status dots and values will be refined:
- **ADS-B / AIS Dots:**
  - `on` (green): All configured sources of this kind are `online`.
  - `warn` (yellow): At least one source is `online`, but others are `offline` or `degraded`.
  - `off` (red): No sources of this kind are receiving data (or gateway is offline).
- **Receiver Dot:** Reflects the WebSocket connection state to the gateway.
- **Packets/min:** Displays the `decodedPerMinute` value directly from the gateway's system telemetry.

### 2.2 Info Page - Tracking Gateway Module (`src/components/info/TrackingGatewayModule.ts`)
A new module for the `/info` page (Option B) that displays:
- **Gateway Telemetry:** Uptime, memory usage, and connected client count.
- **Source Health Table:** A detailed list of all active sources:
  | Source | Type | State | Last Data | Message |
  | :--- | :--- | :--- | :--- | :--- |
  | SBS-1 | ADS-B | online | 2s ago | - |
  | Hub-AIS | AIS | degraded | 45s ago | High latency |
- **Real-time Updates:** This module will subscribe to the `TrackingDataService` when the Info Page is active.

### 2.3 Data Service (`TrackingDataService.ts`)
The service will be updated to:
- Properly parse the `system` telemetry block.
- Maintain the state of the `sources` array.
- Pass this information to subscribers (TrackingPage or InfoPage).

## 3. Implementation Details

### 3.1 Mapping Logic for Sidebar Dots
```typescript
function getStatusDotClass(sources: SourceStatus[], kind: 'adsb' | 'ais'): string {
  const filtered = sources.filter(s => s.kind === kind);
  if (filtered.length === 0) return 'off';
  
  const onlineCount = filtered.filter(s => s.state === 'online').length;
  if (onlineCount === filtered.length) return 'on';
  if (onlineCount > 0) return 'warn';
  return 'off';
}
```

### 3.2 Info Page Integration
The `InfoPage.ts` will be updated to include the `TrackingGatewayModule`. Since the `TrackingDataService` is primarily used in `TrackingPage`, the `InfoPage` will initialize a lightweight instance or use a shared singleton to get status updates.

## 4. Testing & Validation
- **Visual Check:** Verify that disconnecting a local AIS feed (simulated) turns the AIS dot to yellow.
- **Telemetry Check:** Verify that uptime and message rates on the Info page update in real-time.
- **Consistency:** Ensure the "Packets/min" in the sidebar matches the value on the Info page.

## 5. Future Extensions
- Historical uptime graphs for the gateway.
- Map-based visualization of receiver locations.
