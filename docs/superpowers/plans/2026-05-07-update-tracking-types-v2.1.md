# Update Tracking Types for Gateway Protocol V2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `src/types/tracking.ts` to support Gateway Protocol V2.1, including protocol version updates, new message types, and track support for vessels.

**Architecture:** Extend existing TypeScript types to accommodate protocol changes while maintaining backward compatibility where possible.

**Tech Stack:** TypeScript

---

### Task 1: Update HelloMessage and Add Ack/Error Messages

**Files:**
- Modify: `src/types/tracking.ts`

- [ ] **Step 1: Update HelloMessage**
Update `protocolVersion` to support both 1 and 2.

```typescript
export type HelloMessage = {
  type: 'hello';
  protocolVersion: 1 | 2;
  serverTime: string;
};
```

- [ ] **Step 2: Add AckMessage and ErrorMessage**
Add the new message types after `HelloMessage`.

```typescript
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
```

- [ ] **Step 3: Update ServerMessage union type**
Include `AckMessage` and `ErrorMessage` in the `ServerMessage` union.

```typescript
export type ServerMessage = 
  | HelloMessage 
  | SnapshotMessage 
  | UpdateMessage 
  | HeartbeatMessage 
  | AckMessage 
  | ErrorMessage;
```

### Task 2: Update VesselEntity with Track Support

**Files:**
- Modify: `src/types/tracking.ts`

- [ ] **Step 1: Add track and trackPoints to VesselEntity**
Update `VesselEntity` to include optional track information.

```typescript
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
```

### Task 3: Verification

- [ ] **Step 1: Run type checking**
Run `npm run typecheck` to ensure no regressions or type errors.

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Commit changes**
Commit the changes with the required message.

Run: `git add src/types/tracking.ts && git commit -m "types(tracking): update for gateway protocol v2.1"`
