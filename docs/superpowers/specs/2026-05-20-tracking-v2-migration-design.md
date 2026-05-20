# Design Spec: Tracking Gateway V2 Migration

**Date:** 2026-05-20
**Topic:** Migration of live tracking to Tracking Gateway Protocol V2.1
**Status:** Draft

## 1. Overview
The current live tracking implementation (ADS-B and AIS) uses the Tracking Gateway V1 protocol, which streams all available data immediately upon connection. This design spec outlines the migration to Protocol V2.1, which introduces subscriptions, geographic filtering (BBox), and vessel track history.

## 2. Goals
- **Protocol Upgrade:** Switch from `/ws` (V1) to `/ws/v2` (V2.1).
- **Dynamic Filtering:** Use map bounds to filter entities on the server side, reducing bandwidth and client-side processing.
- **Vessel Tracks:** Implement support for AIS vessel track history, similar to existing aircraft tracks.
- **Efficiency:** Implement debounced subscription updates to prevent server flooding during rapid map movements.

## 3. Architecture

### 3.1 TrackingDataService (Core)
The `TrackingDataService` will be the primary component undergoing changes.
- **WebSocket Endpoint:** Update to `wss://api.oe5ith.at/tracking/ws/v2`.
- **Subscription Lifecycle:**
    1. Connect to WebSocket.
    2. Receive `hello` (check `protocolVersion: 2`).
    3. Send `subscribe` message with initial or current map bounds.
    4. Receive `ack` to confirm subscription.
    5. Handle `snapshot` and `update` messages (now filtered by BBox).
- **Bounds Management:** Add `setBounds(bounds: maplibregl.LngLatBounds)` to receive viewport updates.
- **Debouncing:** Use a 500ms debounce timer for sending `subscribe` messages after `setBounds` is called.

### 3.2 Map Integration
- **TrackingPageController:** Listen to map `moveend` events and pass the new bounds to `TrackingDataService`.
- **TrackingMapLayers:** Ensure it handles both aircraft and vessel tracks correctly using the new V2.1 data shapes.

### 3.3 Data Flow
1. **User moves map** -> `moveend` event triggered.
2. **TrackingPageController** calls `trackingService.setBounds(newBounds)`.
3. **TrackingDataService** waits 500ms (debounce).
4. **TrackingDataService** sends `subscribe` message with new BBox.
5. **Gateway** acknowledges and starts streaming entities within the new BBox.

### 3.4 InfoPage Integration
The `TrackingDataService` is also used in `InfoPage.ts` to display system and source status.
- **Behavior:** On the InfoPage, where no map is present, the service will send a "global" subscription (no BBox or a very large one) to ensure system telemetry and source status updates are still received.

## 4. Technical Details

### 4.1 Protocol V2.1 Messages
**Subscribe Message:**
```json
{
  "type": "subscribe",
  "bbox": [minLon, minLat, maxLon, maxLat],
  "rate": 1,
  "includeVesselTracks": true
}
```

**New Server Messages:**
- `type: "ack"`: Confirmation of subscription.
- `type: "error"`: Subscription or protocol error.

### 4.2 Type Updates (`src/types/tracking.ts`)
- Update `HelloMessage` to support version 2.
- Add `AckMessage` and `ErrorMessage`.
- Update `VesselEntity` to include `track` and `trackPoints`.
- Update `UpdateMessage` to include `trackPoints` for vessels.

### 4.3 Vessel Track Merging
Mirror the existing logic for aircraft tracks:
- `snapshot.vessels[].track` -> Initial history.
- `update.vessels[].trackPoints` -> Append to local history.
- Maintain a max point limit (e.g., 200 points) to prevent memory leaks.

## 5. Implementation Plan (High-Level)
1. **Type Definition:** Update `src/types/tracking.ts` with V2.1 structures.
2. **Service Upgrade:** Refactor `TrackingDataService.ts` for V2 lifecycle and BBox handling.
3. **Controller Integration:** Update `TrackingPage.ts` to link map events to the service.
4. **Vessel Track Visualization:** Update `TrackingDataService` to generate GeoJSON for vessel tracks.
5. **Validation:** Verify connection, filtering, and track rendering in the browser.

## 6. Success Criteria
- [ ] WebSocket connects to `/ws/v2` successfully.
- [ ] Map movement triggers a `subscribe` message after 500ms.
- [ ] Only entities within the map viewport are received (verified via console/network).
- [ ] Vessel tracks are visible and update live on the map.
- [ ] Existing aircraft tracking functionality remains stable.
