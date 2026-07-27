# Routing-Graph-Export-Seite (ORS `/export`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hidden, direct-URL-only page `/graph` ("Routing-Graph") that lets a user draw or pick a bbox on the map, query the ORS `/export` endpoint (the internal routing graph — nodes & edges) for that bbox, and render the result on the map.

**Architecture:** Mirrors the existing `isochrones` feature slice (`*DataService`/`*MapLayers`/`*SidebarAdapter` + page controller + `src/lib/*Service.ts` for the ORS call). New client-side dependencies: `terra-draw` + `terra-draw-maplibre-gl-adapter` for the bbox rectangle-drawing interaction, `topojson-client` for converting ORS's TopoJSON response to GeoJSON. Backend: one allowlist-regex addition in `api/ors.php` (no new PHP file).

**Tech Stack:** TypeScript (strict), Vite, MapLibre GL `^6.0.0`, Vitest, PHP 8 (thin proxy), `terra-draw` ^1.32, `terra-draw-maplibre-gl-adapter` ^1.4, `topojson-client` ^3.1.

## Global Constraints

- `npx tsc --noEmit && npm test` must pass before any task is considered done (CLAUDE.md verification mandate).
- No hardcoded colors/hex values in map/CSS code — use `MAP_COLORS`/`MAP_ROUTE_STYLES` (`src/lib/MapStyles.ts`).
- No new visual patterns outside `oe5ith-ci` — reuse `.form-select`, `.segmented`/`.segmented-btn`, `.form-field`, `.form-hint`, `.status-panel` exactly as documented in `oe5ith-ci/docs/forms.md`/`sidebar-types.md`. `oe5ith-ci` itself is never modified from this repo.
- Every `fetch` in page-lifecycle code follows `BasePageController` conventions (`this.signal`, abort-check-after-await pattern — see existing `IsochronesSidebarAdapter.handleCalculate` precedent).
- Stage files explicitly in every commit (`git add <files>`), never `git add -A`/`-i`.
- Hard bbox area limit: **25,000,000 m² (25 km²)** — verified against real ORS `/export` timing/payload behavior (see spec).
- German UI copy/comments, matching surrounding files.

**Note on one deviation from the approved spec, corrected during planning:** the spec said the Node-Layer should be "über MapLegend ausblendbar". Checking `src/lib/MapLegend.ts`, legend entries are purely informational (color swatches, no click-to-toggle-visibility capability) — no page in this codebase uses the legend for layer toggling. The established pattern for toggling a layer's visibility via a control is a sidebar control (e.g. `/karte`'s layer accordion). This plan uses a `.segmented` control in the sidebar instead ("Knotenpunkte: Ausblenden/Anzeigen"); no `MapLegend` instance is created for this page at all, since there's nothing else to show in a legend here. Flagged for the user's awareness in the plan; not a behavior change, just a corrected implementation detail.

---

## Task 1: Dependencies & Backend Proxy Allowlist

**Files:**
- Modify: `package.json`
- Modify: `api/ors.php`
- Modify: `docs/openapi.yaml`

**Interfaces:**
- Produces: `export/[a-z0-9-]+` and `export/[a-z0-9-]+/topojson` become valid `path` values for `POST /api/ors.php`, consumed by `GraphExportService` (Task 4).

- [ ] **Step 1: Install the new dependencies**

Run:
```bash
npm install terra-draw terra-draw-maplibre-gl-adapter topojson-client
npm install --save-dev @types/topojson-client
```

Verify `package.json` now lists (versions may float within the installed major):
```json
"terra-draw": "^1.32.2",
"terra-draw-maplibre-gl-adapter": "^1.4.1",
"topojson-client": "^3.1.0",
```
and `@types/topojson-client` under `devDependencies`.

- [ ] **Step 2: Extend the `api/ors.php` allowlist**

In `api/ors.php`, find:
```php
$allowedPathPattern = '#^(health|status|directions/[a-z0-9-]+/geojson|matrix/[a-z0-9-]+|isochrones/[a-z0-9-]+)$#D';
```
Replace with:
```php
$allowedPathPattern = '#^(health|status|directions/[a-z0-9-]+/geojson|matrix/[a-z0-9-]+|isochrones/[a-z0-9-]+|export/[a-z0-9-]+(/topojson)?)$#D';
```

- [ ] **Step 3: Verify the new path is now reachable through the proxy**

Run (requires `api/config.local.php` with a valid `ORS_API_KEY`, already present in this environment):
```bash
cd api && php -S 127.0.0.1:8081 router.php &
sleep 1
curl -s -X POST 'http://127.0.0.1:8081/ors.php?path=export/driving-car' \
  -H 'Content-Type: application/json' \
  -d '{"bbox":[[16.30,48.20],[16.31,48.205]]}' | head -c 300
echo
kill %1
```
Expected: HTTP 200 with a JSON body starting `{"nodes":[...`. (A 400 with `{"error":"Invalid path"}` means the regex edit is wrong.)

- [ ] **Step 4: Update `docs/openapi.yaml`'s allowlist description**

In `docs/openapi.yaml`, find the `get`/`post` operations under `/ors.php` (the `path` parameter description reads `Fester Wert (health/status) oder Muster directions/{profil}/geojson, matrix/{profil}, isochrones/{profil} — alles andere liefert 400.`). Update it to:
```yaml
          description: >
            Fester Wert (health/status) oder Muster directions/{profil}/geojson,
            matrix/{profil}, isochrones/{profil}, export/{profil} bzw.
            export/{profil}/topojson — alles andere liefert 400.
            Kein Host-Override möglich (fest an ORS_URL angehängt).
```
Apply the same wording change to the `post` operation's `path` parameter description (it currently reads "Gleiche Allowlist wie beim GET-Zweig." — leave that line as-is, only the `get` operation's description needs the pattern list update since the post references it).

- [ ] **Step 5: Validate the OpenAPI spec**

Run: `npm run validate:openapi`
Expected: `✅ OpenAPI-Spec ist valide`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json api/ors.php docs/openapi.yaml
git commit -m "$(cat <<'EOF'
feat(api): ORS /export-Endpoint zur ors.php-Allowlist hinzugefügt

Voraussetzung für die neue /graph-Seite (Routing-Graph-Visualisierung).
Kein neuer PHP-Endpoint nötig, gleicher generischer Proxy-Mechanismus wie
bei isochrones/{profil}.
EOF
)"
```

---

## Task 2: `calculateBboxArea` utility

**Files:**
- Create: `src/features/graph/calculateBboxArea.ts`
- Create: `src/features/graph/calculateBboxArea.test.ts`

**Interfaces:**
- Produces: `calculateBboxArea(bbox: [[number, number], [number, number]]): number` — area in m², order- and sign-independent. Consumed by `GraphSidebarAdapter` (Task 6) and `GraphSidebar` (Task 6).

- [ ] **Step 1: Write the failing tests**

Create `src/features/graph/calculateBboxArea.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateBboxArea } from './calculateBboxArea';

const EARTH_RADIUS_M = 6371000;
function expectedArea(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const midLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const widthM = Math.abs(lon2 - lon1) * (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(midLatRad);
  const heightM = Math.abs(lat2 - lat1) * (Math.PI / 180) * EARTH_RADIUS_M;
  return widthM * heightM;
}

describe('calculateBboxArea', () => {
  it('computes the area of a small bbox at the equator', () => {
    const bbox: [[number, number], [number, number]] = [[0, 0], [0.01, 0.01]];
    expect(calculateBboxArea(bbox)).toBeCloseTo(expectedArea(0, 0, 0.01, 0.01), 0);
  });

  it('computes roughly the 25 km² design-limit reference bbox (Wien calibration data)', () => {
    // Aus dem Design-Spec: 5km x 5km bei Wien ~5.859 Nodes, empirisch als "an der Grenze" kalibriert.
    const bbox: [[number, number], [number, number]] = [[16.33, 48.19], [16.39, 48.235]];
    const area = calculateBboxArea(bbox);
    expect(area).toBeCloseTo(expectedArea(16.33, 48.19, 16.39, 48.235), 0);
    expect(area).toBeGreaterThan(20_000_000);
    expect(area).toBeLessThan(30_000_000);
  });

  it('returns the same area regardless of corner order (swapped coordinates)', () => {
    const a: [[number, number], [number, number]] = [[16.33, 48.19], [16.39, 48.235]];
    const b: [[number, number], [number, number]] = [[16.39, 48.235], [16.33, 48.19]];
    expect(calculateBboxArea(a)).toBeCloseTo(calculateBboxArea(b), 0);
  });

  it('returns a positive area for negative (southern/western hemisphere) coordinates', () => {
    const bbox: [[number, number], [number, number]] = [[-10, -5], [-9.99, -4.99]];
    expect(calculateBboxArea(bbox)).toBeGreaterThan(0);
  });

  it('returns 0 for a degenerate bbox (zero width or height)', () => {
    expect(calculateBboxArea([[16.3, 48.2], [16.3, 48.21]])).toBe(0);
    expect(calculateBboxArea([[16.3, 48.2], [16.31, 48.2]])).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/graph/calculateBboxArea.test.ts`
Expected: FAIL — `Cannot find module './calculateBboxArea'`.

- [ ] **Step 3: Implement**

Create `src/features/graph/calculateBboxArea.ts`:
```typescript
const EARTH_RADIUS_M = 6371000;

/**
 * Berechnet die Fläche einer WGS84-Bbox in Quadratmetern (Äquirechteck-Näherung, bei den hier
 * relevanten Größenordnungen bis ~30 km Kantenlänge ausreichend genau). Nimmt die Koordinaten
 * unabhängig von ihrer Reihenfolge (Beträge der Differenzen), damit vertauschte Ecken kein
 * falsches (negatives) Ergebnis liefern.
 */
export function calculateBboxArea(bbox: [[number, number], [number, number]]): number {
  const [[lon1, lat1], [lon2, lat2]] = bbox;
  const midLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const widthM = Math.abs(lon2 - lon1) * (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(midLatRad);
  const heightM = Math.abs(lat2 - lat1) * (Math.PI / 180) * EARTH_RADIUS_M;
  return widthM * heightM;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/graph/calculateBboxArea.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/graph/calculateBboxArea.ts src/features/graph/calculateBboxArea.test.ts
git commit -m "feat(graph): Bbox-Flächenberechnung für das 25km²-Limit"
```

---

## Task 3: `GraphExportService` (ORS `/export` call)

**Files:**
- Create: `src/lib/GraphExportService.ts`
- Create: `src/lib/GraphExportService.test.ts`

**Interfaces:**
- Consumes: `RoutingService.checkHealth`, `RoutingService.getProfiles` (`src/lib/RoutingService.ts`, already exist).
- Produces: `GraphExportFormat = 'json' | 'topojson'`; `GraphExportResult = { ok: true; raw: unknown; format: GraphExportFormat; payloadBytes: number } | { ok: false; status: number | null }`; `GraphExportService.queryExport(profile: string, format: GraphExportFormat, bbox: [[number, number], [number, number]], geometry: boolean): Promise<GraphExportResult>`. Consumed by `GraphSidebarAdapter` (Task 6).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/GraphExportService.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GraphExportService } from './GraphExportService';

describe('GraphExportService.queryExport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts bbox and geometry to the json path (no suffix) for format=json', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ nodes: [], edges: [], nodes_count: 0, edges_count: 0 }),
      });
    }));

    const bbox: [[number, number], [number, number]] = [[16.3, 48.2], [16.31, 48.205]];
    await GraphExportService.queryExport('driving-car', 'json', bbox, true);

    expect(capturedUrl).toBe('/api/ors.php?path=export/driving-car');
    expect(capturedBody.bbox).toEqual(bbox);
    expect(capturedBody.geometry).toBe(true);
  });

  it('posts to the topojson path (with suffix) for format=topojson', async () => {
    let capturedUrl = '';
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ type: 'Topology' }) });
    }));

    await GraphExportService.queryExport('driving-car', 'topojson', [[16.3, 48.2], [16.31, 48.205]], false);

    expect(capturedUrl).toBe('/api/ors.php?path=export/driving-car/topojson');
  });

  it('returns { ok: true, payloadBytes } derived from the response size', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ nodes: [1, 2, 3], edges: [] }),
    })));

    const result = await GraphExportService.queryExport('driving-car', 'json', [[0, 0], [1, 1]], true);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payloadBytes).toBeGreaterThan(0);
      expect(result.format).toBe('json');
    }
  });

  it('returns { ok: false, status } when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 504 })));

    const result = await GraphExportService.queryExport('driving-car', 'json', [[0, 0], [1, 1]], true);

    expect(result).toEqual({ ok: false, status: 504 });
  });

  it('returns { ok: false, status: null } on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));

    const result = await GraphExportService.queryExport('driving-car', 'json', [[0, 0], [1, 1]], true);

    expect(result).toEqual({ ok: false, status: null });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/GraphExportService.test.ts`
Expected: FAIL — `Cannot find module './GraphExportService'`.

- [ ] **Step 3: Implement**

Create `src/lib/GraphExportService.ts`:
```typescript
import { RoutingService } from './RoutingService';

const ORS_BASE_URL = '/api/ors.php';

export type GraphExportFormat = 'json' | 'topojson';

export type GraphExportResult =
  | { ok: true; raw: unknown; format: GraphExportFormat; payloadBytes: number }
  | { ok: false; status: number | null };

/**
 * Abstraktionsschicht über den `/api/ors.php`-Proxy für den ORS-`/export`-Endpoint (interner
 * Routing-Graph als Bbox-Ausschnitt). Health-Check/Profil-Liste wiederverwendet von
 * RoutingService (generische ORS-Abfragen), analog IsochronesService. `status` im
 * Fehlerfall wird durchgereicht, damit der Adapter gezielt auf 504 (Bbox zu groß/Timeout,
 * siehe Design-Spec-Kalibrierung) reagieren kann statt auf eine generische Fehlermeldung.
 */
export const GraphExportService = {
  checkHealth: RoutingService.checkHealth,
  getProfiles: RoutingService.getProfiles,

  async queryExport(
    profile: string,
    format: GraphExportFormat,
    bbox: [[number, number], [number, number]],
    geometry: boolean
  ): Promise<GraphExportResult> {
    const path = format === 'topojson' ? `export/${profile}/topojson` : `export/${profile}`;
    const url = `${ORS_BASE_URL}?path=${path}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox, geometry })
      });

      if (!res.ok) return { ok: false, status: res.status };
      const raw = await res.json();
      return { ok: true, raw, format, payloadBytes: JSON.stringify(raw).length };
    } catch (e) {
      console.error('Graph-Export Fehler:', e);
      return { ok: false, status: null };
    }
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/GraphExportService.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/GraphExportService.ts src/lib/GraphExportService.test.ts
git commit -m "feat(graph): GraphExportService für den ORS /export-Endpoint"
```

---

## Task 4: `GraphDataService` (state container)

**Files:**
- Create: `src/features/graph/GraphDataService.ts`
- Create: `src/features/graph/GraphDataService.test.ts`

**Interfaces:**
- Consumes: `GraphFeatures` (defined in Task 5, `src/features/graph/GraphMapLayers.ts`).
- Produces: `GraphExportState { bbox, profile, format, geometry, features, payloadBytes }`; `class GraphDataService { setResult(state), getResult(), clear() }`. Consumed by `GraphSidebarAdapter` (Task 6) and `GraphPage` (Task 8, via `reapplyLayers`).

- [ ] **Step 1: Write the failing tests**

Create `src/features/graph/GraphDataService.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { GraphDataService, GraphExportState } from './GraphDataService';

function makeState(overrides: Partial<GraphExportState> = {}): GraphExportState {
  return {
    bbox: [[16.3, 48.2], [16.31, 48.205]],
    profile: 'driving-car',
    format: 'topojson',
    geometry: true,
    features: {
      nodes: { type: 'FeatureCollection', features: [] },
      edges: { type: 'FeatureCollection', features: [] },
      nodesCount: 0,
      edgesCount: 0
    },
    payloadBytes: 1234,
    ...overrides
  };
}

describe('GraphDataService', () => {
  let service: GraphDataService;

  beforeEach(() => {
    service = new GraphDataService();
  });

  it('starts with no result', () => {
    expect(service.getResult()).toBeNull();
  });

  it('stores and returns the result set via setResult', () => {
    const state = makeState({ profile: 'driving-emergency' });
    service.setResult(state);
    expect(service.getResult()?.profile).toBe('driving-emergency');
  });

  it('replaces the previous result on a new setResult call (no stacking)', () => {
    service.setResult(makeState({ profile: 'driving-car' }));
    service.setResult(makeState({ profile: 'driving-emergency' }));
    expect(service.getResult()?.profile).toBe('driving-emergency');
  });

  it('clears the result', () => {
    service.setResult(makeState());
    service.clear();
    expect(service.getResult()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/graph/GraphDataService.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/features/graph/GraphDataService.ts`:
```typescript
import { GraphFeatures } from './GraphMapLayers';
import { GraphExportFormat } from '../../lib/GraphExportService';

export interface GraphExportState {
  bbox: [[number, number], [number, number]];
  profile: string;
  format: GraphExportFormat;
  geometry: boolean;
  features: GraphFeatures;
  payloadBytes: number;
}

/**
 * Hält genau eine aktive Graph-Abfrage — kein Stapeln mehrerer Abfragen wie bei Isochronen,
 * jede neue Abfrage ersetzt die vorherige (siehe Design-Spec "Out of Scope").
 */
export class GraphDataService {
  private current: GraphExportState | null = null;

  public setResult(state: GraphExportState): void {
    this.current = state;
  }

  public getResult(): GraphExportState | null {
    return this.current;
  }

  public clear(): void {
    this.current = null;
  }
}
```

Note: this creates a circular-looking import (`GraphDataService` imports `GraphFeatures` from `GraphMapLayers`, and Task 6's `GraphSidebarAdapter` imports both) — this is fine, it's a type-only dependency on an interface, not a runtime circular call.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/graph/GraphDataService.test.ts`
Expected: PASS (4 tests). (Will only fully pass once Task 5 creates `GraphMapLayers.ts` — if implementing strictly in order, `npx tsc --noEmit` will fail until Task 5 is done; `vitest` alone may still run since it doesn't type-check. Proceed to Task 5 directly if `tsc` errors here.)

- [ ] **Step 5: Commit**

```bash
git add src/features/graph/GraphDataService.ts src/features/graph/GraphDataService.test.ts
git commit -m "feat(graph): GraphDataService als State-Container für die aktive Graph-Abfrage"
```

---

## Task 5: `GraphMapLayers` (GeoJSON transform + map layers)

**Files:**
- Create: `src/features/graph/GraphMapLayers.ts`
- Create: `src/features/graph/GraphMapLayers.test.ts`

**Interfaces:**
- Consumes: `MapCore.ensureGeoJsonLayer` (`src/lib/MapCore.ts`), `MapRegistry.registerSource` (`src/lib/MapRegistry.ts`), `MAP_COLORS` (`src/lib/MapStyles.ts`), `feature` from `topojson-client`.
- Produces: `EDGES_SOURCE_ID`, `EDGES_LAYER_ID`, `NODES_SOURCE_ID`, `NODES_LAYER_ID` (string constants); `GraphFeatures { nodes: FeatureCollection<Point>; edges: FeatureCollection<LineString>; nodesCount: number; edgesCount: number }`; `buildGraphFeatures(response: unknown, format: 'json' | 'topojson'): GraphFeatures`; `class GraphMapLayers { static ensureBaseLayers(map), static update(map, features), static clear(map), static setNodesVisible(map, visible) }`. Consumed by `GraphDataService` (Task 4, type only), `GraphSidebarAdapter` (Task 6), `GraphPage` (Task 8).

- [ ] **Step 1: Write the failing tests**

Create `src/features/graph/GraphMapLayers.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GraphMapLayers, buildGraphFeatures, EDGES_SOURCE_ID, NODES_SOURCE_ID, NODES_LAYER_ID } from './GraphMapLayers';
import { MapRegistry } from '../../lib/MapRegistry';

const ORS_JSON_RESPONSE = {
  nodes: [
    { nodeId: 1, location: [16.30, 48.20] },
    { nodeId: 2, location: [16.31, 48.205] },
    { nodeId: 3, location: [16.32, 48.21] }
  ],
  edges: [
    { fromId: 1, toId: 2, weight: '6.47' },
    { fromId: 2, toId: 3, weight: '5.10' },
    { fromId: 1, toId: 999, weight: '1.00' } // referenziert einen nicht existierenden Node
  ],
  nodes_count: 3,
  edges_count: 3
};

const ORS_TOPOJSON_RESPONSE = {
  type: 'Topology',
  objects: {
    network: {
      type: 'GeometryCollection',
      geometries: [
        {
          type: 'LineString',
          properties: { weight: '6.47', node_from: 1, node_to: 2 },
          arcs: [0]
        },
        {
          type: 'LineString',
          properties: { weight: '5.10', node_from: 2, node_to: 3 },
          arcs: [1]
        }
      ]
    }
  },
  arcs: [
    [[16.30, 48.20], [16.31, 48.205]],
    [[16.31, 48.205], [16.32, 48.21]]
  ]
};

describe('buildGraphFeatures (format=json)', () => {
  it('builds one point feature per node with nodeId in properties', () => {
    const result = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');
    expect(result.nodes.features).toHaveLength(3);
    expect(result.nodes.features[0].properties?.nodeId).toBe(1);
    expect(result.nodes.features[0].geometry).toEqual({ type: 'Point', coordinates: [16.30, 48.20] });
  });

  it('builds edges with coordinates resolved from the node lookup and normalized property names', () => {
    const result = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');
    const edge = result.edges.features.find((f) => f.properties?.node_from === 1 && f.properties?.node_to === 2);
    expect(edge?.geometry).toEqual({
      type: 'LineString',
      coordinates: [[16.30, 48.20], [16.31, 48.205]]
    });
    expect(edge?.properties?.weight).toBe('6.47');
  });

  it('skips edges referencing a node outside the response', () => {
    const result = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');
    expect(result.edges.features).toHaveLength(2);
    expect(result.edgesCount).toBe(2);
  });

  it('reports nodesCount matching the built features', () => {
    const result = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');
    expect(result.nodesCount).toBe(3);
  });
});

describe('buildGraphFeatures (format=topojson)', () => {
  it('returns an empty node collection (TopoJSON has no separate node objects)', () => {
    const result = buildGraphFeatures(ORS_TOPOJSON_RESPONSE, 'topojson');
    expect(result.nodes.features).toHaveLength(0);
    expect(result.nodesCount).toBe(0);
  });

  it('converts each LineString geometry to an edge feature, preserving properties', () => {
    const result = buildGraphFeatures(ORS_TOPOJSON_RESPONSE, 'topojson');
    expect(result.edges.features).toHaveLength(2);
    expect(result.edgesCount).toBe(2);
    const first = result.edges.features[0];
    expect(first.properties?.node_from).toBe(1);
    expect(first.properties?.node_to).toBe(2);
    expect(first.properties?.weight).toBe('6.47');
    expect(first.geometry).toEqual({
      type: 'LineString',
      coordinates: [[16.30, 48.20], [16.31, 48.205]]
    });
  });
});

function mockMapWithSource() {
  const calls: { sourceId: string; data: unknown }[] = [];
  const layers = new Set<string>();
  const layoutProps: { layerId: string; prop: string; value: unknown }[] = [];
  const map = {
    getSource: (id: string) => ({ setData: (data: unknown) => calls.push({ sourceId: id, data }) }),
    getLayer: (id: string) => (layers.has(id) ? {} : undefined),
    setLayoutProperty: (layerId: string, prop: string, value: unknown) => layoutProps.push({ layerId, prop, value }),
    _registerLayer: (id: string) => layers.add(id)
  } as any;
  return { map, calls, layoutProps };
}

describe('GraphMapLayers.update', () => {
  it('writes edges and nodes to their respective sources and registers them in MapRegistry', () => {
    const { map, calls } = mockMapWithSource();
    const features = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');

    GraphMapLayers.update(map, features);

    const edgesCall = calls.find((c) => c.sourceId === EDGES_SOURCE_ID);
    const nodesCall = calls.find((c) => c.sourceId === NODES_SOURCE_ID);
    expect((edgesCall?.data as any).features).toHaveLength(2);
    expect((nodesCall?.data as any).features).toHaveLength(3);
    expect((MapRegistry.getSource(EDGES_SOURCE_ID)?.definition as any).data.features).toHaveLength(2);
  });
});

describe('GraphMapLayers.setNodesVisible', () => {
  it('sets the node layer visibility property when the layer exists', () => {
    const { map, layoutProps } = mockMapWithSource();
    map._registerLayer(NODES_LAYER_ID);

    GraphMapLayers.setNodesVisible(map, false);

    expect(layoutProps).toContainEqual({ layerId: NODES_LAYER_ID, prop: 'visibility', value: 'none' });
  });

  it('does nothing when the layer does not exist yet', () => {
    const { map, layoutProps } = mockMapWithSource();
    GraphMapLayers.setNodesVisible(map, true);
    expect(layoutProps).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/graph/GraphMapLayers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/features/graph/GraphMapLayers.ts`:
```typescript
import * as maplibregl from 'maplibre-gl';
import { GeoJSONSource, LayerSpecification } from 'maplibre-gl';
import { Feature, FeatureCollection, Point, LineString } from 'geojson';
import { feature as topoFeature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { MapCore } from '../../lib/MapCore';
import { MapRegistry } from '../../lib/MapRegistry';
import { MAP_COLORS } from '../../lib/MapStyles';

export const EDGES_SOURCE_ID = 'graph-edges';
export const EDGES_LAYER_ID = 'graph-edges-layer';
export const NODES_SOURCE_ID = 'graph-nodes';
export const NODES_LAYER_ID = 'graph-nodes-layer';

interface OrsJsonNode {
  nodeId: number;
  location: [number, number];
}
interface OrsJsonEdge {
  fromId: number;
  toId: number;
  weight: string;
}
interface OrsJsonExport {
  nodes: OrsJsonNode[];
  edges: OrsJsonEdge[];
}

export interface GraphFeatures {
  nodes: FeatureCollection<Point>;
  edges: FeatureCollection<LineString>;
  nodesCount: number;
  edgesCount: number;
}

const EMPTY_FEATURES: GraphFeatures = {
  nodes: { type: 'FeatureCollection', features: [] },
  edges: { type: 'FeatureCollection', features: [] },
  nodesCount: 0,
  edgesCount: 0
};

/**
 * Baut GeoJSON aus der ORS-`/export`-Antwort. Bei `json` liefert ORS ein eigenes
 * {nodes, edges}-Graph-Format (kein GeoJSON) — wird hier manuell übersetzt, Edge-Properties
 * werden dabei auf dieselben Schlüssel wie im TopoJSON-Fall normalisiert (`node_from`/`node_to`
 * statt `fromId`/`toId`), damit Styling/Popup unabhängig vom Format funktionieren. Bei
 * `topojson` liefert ORS bereits ein Topology-Objekt mit einer GeometryCollection aus
 * LineStrings — `topojson-client` löst die Arcs zu echten Koordinaten auf (ORS liefert hier
 * keine Quantisierung/`transform`, Arcs sind bereits absolute Koordinaten). TopoJSON kennt
 * keine eigenen Node-Objekte, daher bleibt der Node-Layer in diesem Fall leer.
 */
export function buildGraphFeatures(response: unknown, format: 'json' | 'topojson'): GraphFeatures {
  if (format === 'topojson') {
    const topology = response as Topology;
    const network = topology.objects.network as GeometryCollection;
    const collection = topoFeature(topology, network) as FeatureCollection<LineString>;
    return {
      nodes: { type: 'FeatureCollection', features: [] },
      edges: collection,
      nodesCount: 0,
      edgesCount: collection.features.length
    };
  }

  const data = response as OrsJsonExport;
  const nodeIndex = new Map<number, [number, number]>();
  const nodeFeatures: Feature<Point>[] = data.nodes.map((n) => {
    nodeIndex.set(n.nodeId, n.location);
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: n.location },
      properties: { nodeId: n.nodeId }
    };
  });

  const edgeFeatures: Feature<LineString>[] = [];
  for (const e of data.edges) {
    const from = nodeIndex.get(e.fromId);
    const to = nodeIndex.get(e.toId);
    if (!from || !to) continue; // Randknoten außerhalb der Bbox-Antwort, defensiv überspringen
    edgeFeatures.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [from, to] },
      properties: { node_from: e.fromId, node_to: e.toId, weight: e.weight }
    });
  }

  return {
    nodes: { type: 'FeatureCollection', features: nodeFeatures },
    edges: { type: 'FeatureCollection', features: edgeFeatures },
    nodesCount: nodeFeatures.length,
    edgesCount: edgeFeatures.length
  };
}

export class GraphMapLayers {
  public static ensureBaseLayers(map: maplibregl.Map): void {
    const edgesLayerDef: LayerSpecification = {
      id: EDGES_LAYER_ID,
      type: 'line',
      source: EDGES_SOURCE_ID,
      paint: {
        'line-color': MAP_COLORS.accent,
        'line-width': 2
      }
    };
    MapCore.ensureGeoJsonLayer(map, EDGES_SOURCE_ID, edgesLayerDef);

    const nodesLayerDef: LayerSpecification = {
      id: NODES_LAYER_ID,
      type: 'circle',
      source: NODES_SOURCE_ID,
      paint: {
        'circle-color': MAP_COLORS.muted,
        'circle-radius': 3,
        'circle-opacity': 0.85
      }
    };
    MapCore.ensureGeoJsonLayer(map, NODES_SOURCE_ID, nodesLayerDef);
  }

  public static setNodesVisible(map: maplibregl.Map, visible: boolean): void {
    if (!map.getLayer(NODES_LAYER_ID)) return;
    map.setLayoutProperty(NODES_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
  }

  public static update(map: maplibregl.Map, features: GraphFeatures): void {
    if (!map.getSource(EDGES_SOURCE_ID) || !map.getSource(NODES_SOURCE_ID)) {
      this.ensureBaseLayers(map);
    }

    const edgesSource = map.getSource(EDGES_SOURCE_ID) as GeoJSONSource;
    if (edgesSource) edgesSource.setData(features.edges);
    MapRegistry.registerSource(EDGES_SOURCE_ID, { type: 'geojson', data: features.edges });

    const nodesSource = map.getSource(NODES_SOURCE_ID) as GeoJSONSource;
    if (nodesSource) nodesSource.setData(features.nodes);
    MapRegistry.registerSource(NODES_SOURCE_ID, { type: 'geojson', data: features.nodes });
  }

  public static clear(map: maplibregl.Map): void {
    this.update(map, EMPTY_FEATURES);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/graph/GraphMapLayers.test.ts src/features/graph/GraphDataService.test.ts`
Expected: PASS (all tests in both files — this also completes Task 4's deferred type dependency).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (this confirms the `topojson-specification` types pulled in transitively by `@types/topojson-client` resolve correctly).

- [ ] **Step 6: Commit**

```bash
git add src/features/graph/GraphMapLayers.ts src/features/graph/GraphMapLayers.test.ts
git commit -m "feat(graph): GraphMapLayers - Nodes/Edges-Layer + json/topojson-Transformation"
```

---

## Task 6: `PopupManager` — graph edge/node popup config

**Files:**
- Modify: `src/lib/PopupManager.ts`
- Modify: `docs/architecture/bausteine.md` (regenerated, not hand-edited)

**Interfaces:**
- Produces: two new keys in `POPUP_CONFIGS`: `'graph-edges-layer'`, `'graph-nodes-layer'`. Consumed by `GraphSidebarAdapter` (Task 7).

- [ ] **Step 1: Add the two config entries**

In `src/lib/PopupManager.ts`, add to `POPUP_CONFIGS` (after the existing `'ais-icons'` entry):
```typescript
    'graph-edges-layer': {
        title: () => 'Kante',
        icon: 'fa-solid fa-route',
        fields: [
            { key: 'node_from', label: 'Von Node' },
            { key: 'node_to', label: 'Zu Node' },
            { key: 'weight', label: 'Gewicht (s)', format: (v) => v != null ? Number(v).toFixed(1) : null }
        ]
    },
    'graph-nodes-layer': {
        title: (p) => `Node ${p.nodeId}`,
        icon: 'fa-solid fa-circle-dot',
        fields: [
            { key: 'nodeId', label: 'Node-ID' }
        ]
    }
```
(ORS liefert `weight` als String, `Number(v)` konvertiert korrekt — siehe Design-Spec-Kalibrierung, `weight` ist sowohl im `json`- als auch im `topojson`-Format ein String.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Regenerate the Bausteine catalog**

Run: `npm run docs:bausteine`
Expected: `docs/architecture/bausteine.md` regenerated without errors; `git diff docs/architecture/bausteine.md` shows the `PopupManager.ts` section updated (or unchanged if the generator only lists exports, not config keys — either way, no manual edit needed).

- [ ] **Step 4: Commit**

```bash
git add src/lib/PopupManager.ts docs/architecture/bausteine.md
git commit -m "feat(graph): Popup-Konfiguration für Graph-Edges/-Nodes"
```

---

## Task 7: `GraphSidebar` component (rendering)

**Files:**
- Create: `src/components/GraphSidebar.ts`

**Interfaces:**
- Consumes: `GraphExportService` (Task 3), `getSidebarFooterHtml`/`setupSidebarToggle` (`src/lib/SidebarUtils.ts`), `calculateBboxArea` (Task 2).
- Produces: `MAX_BBOX_AREA_M2 = 25_000_000` (const); `GraphExportFormat` re-export; `GraphFormParams { profile: string; format: GraphExportFormat; geometry: boolean }`; `GraphSidebarCallbacks { onDrawBbox: () => void; onUseCurrentView: () => void; onSubmit: (params: GraphFormParams) => void; onNodesVisibleChange: (visible: boolean) => void }`; `initGraphSidebar(container, callbacks, signal): Promise<void>`; `setGraphBbox(bbox: [[number, number], [number, number]] | null): void`; `renderGraphResult(result: { nodesCount: number; edgesCount: number; payloadBytes: number; format: GraphExportFormat } | null): void`. Consumed by `GraphSidebarAdapter` (Task 8).

No dedicated unit test for this file — matches the existing precedent (`IsochronesSidebar.ts`/`IsochronesPage.ts` are pure rendering/orchestration and are verified via manual browser testing only, not unit tests; the testable logic (`calculateBboxArea`, `buildGraphFeatures`) already lives in dedicated tested modules).

- [ ] **Step 1: Implement**

Create `src/components/GraphSidebar.ts`:
```typescript
import { GraphExportService, GraphExportFormat } from '../lib/GraphExportService';
import { calculateBboxArea } from '../features/graph/calculateBboxArea';
import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';

export const MAX_BBOX_AREA_M2 = 25_000_000;

export interface GraphFormParams {
  profile: string;
  format: GraphExportFormat;
  geometry: boolean;
}

export interface GraphSidebarCallbacks {
  onDrawBbox: () => void;
  onUseCurrentView: () => void;
  onSubmit: (params: GraphFormParams) => void;
  onNodesVisibleChange: (visible: boolean) => void;
}

export const initGraphSidebar = async (
  container: HTMLElement,
  callbacks: GraphSidebarCallbacks,
  signal: AbortSignal
): Promise<void> => {
  const isOnline = await GraphExportService.checkHealth();
  const profiles = isOnline ? await GraphExportService.getProfiles() : [];

  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Routing-Graph</div>

        <div class="form-field" style="margin-bottom:8px">
          <span class="form-label">Service Status</span>
          <div class="status-panel">
            <div class="status-row">
              <div class="status-row-left">
                <i class="fa-solid fa-server status-row-icon"></i>
                <span class="status-row-name">ORS API</span>
              </div>
              <div class="status-row-right">
                <span class="status-dot ${isOnline ? 'on' : 'off'}"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="tool-sep"></div>

        <div class="form-field" style="margin-bottom:7px">
          <label class="form-label" for="graph-profile">Profil</label>
          <select class="form-select" id="graph-profile" ${!isOnline ? 'disabled' : ''}>
            ${profiles.length > 0
              ? profiles.map((p) => `<option value="${p}">${p}</option>`).join('')
              : '<option>Dienst offline</option>'
            }
          </select>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Format</span>
          <div class="segmented" id="graph-format" role="group" aria-label="Format wählen">
            <button class="segmented-btn" aria-pressed="false" data-format="json">JSON</button>
            <button class="segmented-btn active" aria-pressed="true" data-format="topojson">TopoJSON</button>
          </div>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Kantengeometrie</span>
          <div class="segmented" id="graph-geometry" role="group" aria-label="Kantengeometrie wählen">
            <button class="segmented-btn" aria-pressed="false" data-geometry="false">Luftlinie</button>
            <button class="segmented-btn active" aria-pressed="true" data-geometry="true">Straßenverlauf</button>
          </div>
          <span class="form-hint hidden" id="graph-geometry-hint">Nur bei TopoJSON wirksam.</span>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Knotenpunkte</span>
          <div class="segmented" id="graph-nodes-visible" role="group" aria-label="Knotenpunkte ein-/ausblenden">
            <button class="segmented-btn" aria-pressed="false" data-visible="false">Ausblenden</button>
            <button class="segmented-btn active" aria-pressed="true" data-visible="true">Anzeigen</button>
          </div>
        </div>

        <div class="tool-sep"></div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Bbox</span>
          <button class="form-submit" id="btn-draw-bbox" ${!isOnline ? 'disabled' : ''}>
            <i class="fa-solid fa-draw-polygon"></i> Bbox zeichnen
          </button>
          <button class="form-submit" id="btn-use-view" style="margin-top:6px" ${!isOnline ? 'disabled' : ''}>
            <i class="fa-solid fa-expand"></i> Aktuelle Ansicht verwenden
          </button>
          <span class="form-hint" id="graph-bbox-info">Keine Bbox gesetzt.</span>
        </div>

        <button class="form-submit" style="margin-top:8px" id="btn-query-export" data-online="${isOnline ? '1' : '0'}" disabled>
          <i class="fa-solid fa-diagram-project"></i> Export abfragen
        </button>

        <div class="tool-sep"></div>
        <div id="graph-result-info" class="form-hint">Noch keine Abfrage.</div>
      </div>

      ${getSidebarFooterHtml()}
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;

  setupSidebarToggle(
    document.getElementById('sidebar')!,
    document.getElementById('sidebar-tab')!,
    document.getElementById('sidebar-backdrop')!
  );

  const formatGroup = document.getElementById('graph-format')!;
  const geometryGroup = document.getElementById('graph-geometry')!;
  const geometryHint = document.getElementById('graph-geometry-hint')!;
  const nodesGroup = document.getElementById('graph-nodes-visible')!;
  const btnDraw = document.getElementById('btn-draw-bbox') as HTMLButtonElement;
  const btnUseView = document.getElementById('btn-use-view') as HTMLButtonElement;
  const btnSubmit = document.getElementById('btn-query-export') as HTMLButtonElement;

  const selectSegment = (group: HTMLElement, btn: Element) => {
    group.querySelectorAll('.segmented-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  };

  const updateGeometryDisabledState = () => {
    const isJson = formatGroup.querySelector('.segmented-btn.active')?.getAttribute('data-format') === 'json';
    geometryGroup.querySelectorAll('.segmented-btn').forEach((b) => {
      (b as HTMLButtonElement).disabled = isJson;
    });
    geometryHint.classList.toggle('hidden', !isJson);
  };

  formatGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn) return;
    selectSegment(formatGroup, btn);
    updateGeometryDisabledState();
  }, { signal });

  geometryGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn || (btn as HTMLButtonElement).disabled) return;
    selectSegment(geometryGroup, btn);
  }, { signal });

  nodesGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn) return;
    selectSegment(nodesGroup, btn);
    callbacks.onNodesVisibleChange(btn.getAttribute('data-visible') === 'true');
  }, { signal });

  updateGeometryDisabledState();

  btnDraw.addEventListener('click', callbacks.onDrawBbox, { signal });
  btnUseView.addEventListener('click', callbacks.onUseCurrentView, { signal });

  if (isOnline) {
    btnSubmit.addEventListener('click', () => {
      const profile = (document.getElementById('graph-profile') as HTMLSelectElement).value;
      const format = (formatGroup.querySelector('.segmented-btn.active')?.getAttribute('data-format') || 'topojson') as GraphExportFormat;
      const geometry = geometryGroup.querySelector('.segmented-btn.active')?.getAttribute('data-geometry') === 'true';
      callbacks.onSubmit({ profile, format, geometry });
    }, { signal });
  }
};

/**
 * Aktualisiert Bbox-Info-Text + Submit-Button-Gating anhand der aktuellen Bbox-Fläche.
 * `null` bedeutet "keine Bbox gesetzt" (z.B. nach `onDrawBbox`, bevor gezeichnet wurde).
 */
export const setGraphBbox = (bbox: [[number, number], [number, number]] | null): void => {
  const info = document.getElementById('graph-bbox-info')!;
  const submitBtn = document.getElementById('btn-query-export') as HTMLButtonElement;
  if (!bbox) {
    info.textContent = 'Keine Bbox gesetzt.';
    info.classList.remove('form-error');
    submitBtn.disabled = true;
    return;
  }

  const areaKm2 = (calculateBboxArea(bbox) / 1_000_000).toFixed(1);
  if (calculateBboxArea(bbox) > MAX_BBOX_AREA_M2) {
    info.textContent = `Fläche ${areaKm2} km² — über dem Limit von ${MAX_BBOX_AREA_M2 / 1_000_000} km².`;
    info.classList.add('form-error');
    submitBtn.disabled = true;
  } else {
    info.textContent = `Fläche ${areaKm2} km².`;
    info.classList.remove('form-error');
    submitBtn.disabled = submitBtn.dataset.online !== '1';
  }
};

export const renderGraphResult = (
  result: { nodesCount: number; edgesCount: number; payloadBytes: number; format: GraphExportFormat } | null
): void => {
  const el = document.getElementById('graph-result-info')!;
  if (!result) {
    el.textContent = 'Noch keine Abfrage.';
    return;
  }
  const kb = (result.payloadBytes / 1024).toFixed(0);
  const nodesText = result.format === 'topojson'
    ? 'TopoJSON enthält keine einzelnen Knotenpunkte'
    : `${result.nodesCount.toLocaleString('de-DE')} Nodes`;
  el.textContent = `${nodesText} / ${result.edgesCount.toLocaleString('de-DE')} Edges, ${kb} KB`;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (will still fail until Task 8's `GraphSidebarAdapter` doesn't yet exist — that's fine, `GraphSidebar.ts` itself has no unresolved imports at this point since it only depends on already-created files).

- [ ] **Step 3: Commit**

```bash
git add src/components/GraphSidebar.ts
git commit -m "feat(graph): GraphSidebar-Komponente (Formular: Profil/Format/Geometrie/Bbox)"
```

---

## Task 8: `GraphSidebarAdapter` (terra-draw wiring + orchestration)

**Files:**
- Create: `src/features/graph/GraphSidebarAdapter.ts`
- Create: `src/features/graph/GraphSidebarAdapter.test.ts`

**Interfaces:**
- Consumes: `TerraDraw`, `TerraDrawRectangleMode`, `TerraDrawRenderMode`, `ValidateMaxAreaSquareMeters` (`terra-draw`), `TerraDrawMapLibreGLAdapter` (`terra-draw-maplibre-gl-adapter`), `GraphDataService` (Task 4), `GraphMapLayers`/`buildGraphFeatures`/`EDGES_LAYER_ID`/`NODES_LAYER_ID` (Task 5), `GraphExportService` (Task 3), `PopupManager` (Task 6), `Toast` (`src/lib/Toast.ts`), `initGraphSidebar`/`setGraphBbox`/`renderGraphResult`/`MAX_BBOX_AREA_M2`/`GraphFormParams` (Task 7), `calculateBboxArea` (Task 2).
- Produces: `rectangleFeatureToBbox(feature: Feature<Polygon>): [[number, number], [number, number]]` (exported for direct testing); `class GraphSidebarAdapter { constructor(map, abortSignal); init(container); reapplyLayers(); handleMapClick(e); destroy() }`. Consumed by `GraphPage` (Task 9).

- [ ] **Step 1: Write the failing test for `rectangleFeatureToBbox`**

Create `src/features/graph/GraphSidebarAdapter.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { rectangleFeatureToBbox } from './GraphSidebarAdapter';
import type { Feature, Polygon } from 'geojson';

function rectangle(coords: [number, number][]): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] }
  };
}

describe('rectangleFeatureToBbox', () => {
  it('extracts the axis-aligned bounding box from a closed rectangle ring', () => {
    const feature = rectangle([
      [16.30, 48.20], [16.31, 48.20], [16.31, 48.205], [16.30, 48.205], [16.30, 48.20]
    ]);
    expect(rectangleFeatureToBbox(feature)).toEqual([[16.30, 48.20], [16.31, 48.205]]);
  });

  it('works even if the ring is not perfectly axis-aligned (e.g. a rotated/pitched map)', () => {
    const feature = rectangle([
      [16.300, 48.2001], [16.3105, 48.2000], [16.3110, 48.2049], [16.2995, 48.2050], [16.300, 48.2001]
    ]);
    expect(rectangleFeatureToBbox(feature)).toEqual([[16.2995, 48.2000], [16.3110, 48.2050]]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/graph/GraphSidebarAdapter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/features/graph/GraphSidebarAdapter.ts`:
```typescript
import * as maplibregl from 'maplibre-gl';
import { TerraDraw, TerraDrawRectangleMode, TerraDrawRenderMode, ValidateMaxAreaSquareMeters } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import type { Feature, Polygon } from 'geojson';
import { GraphDataService } from './GraphDataService';
import { GraphMapLayers, buildGraphFeatures, EDGES_LAYER_ID, NODES_LAYER_ID } from './GraphMapLayers';
import { calculateBboxArea } from './calculateBboxArea';
import { GraphExportService } from '../../lib/GraphExportService';
import { PopupManager } from '../../lib/PopupManager';
import { Toast } from '../../lib/Toast';
import {
  initGraphSidebar,
  setGraphBbox,
  renderGraphResult,
  MAX_BBOX_AREA_M2,
  GraphFormParams
} from '../../components/GraphSidebar';

/**
 * Übersetzt ein von terra-draw gezeichnetes Rechteck (Polygon, ggf. nicht perfekt
 * achsenparallel bei gedrehter/geneigter Karte) in eine achsenparallele ORS-Bbox
 * [[minLon,minLat],[maxLon,maxLat]] über die Min/Max-Koordinaten des Rings.
 */
export function rectangleFeatureToBbox(feature: Feature<Polygon>): [[number, number], [number, number]] {
  const ring = feature.geometry.coordinates[0];
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLon, minLat], [maxLon, maxLat]];
}

export class GraphSidebarAdapter {
  private dataService = new GraphDataService();
  private draw: TerraDraw;
  private currentBbox: [[number, number], [number, number]] | null = null;
  private nodesVisible = true;

  constructor(private map: maplibregl.Map, private abortSignal: AbortSignal) {
    this.draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawRenderMode({ styles: {} }),
        new TerraDrawRectangleMode({
          validation: (feature) => ValidateMaxAreaSquareMeters(feature, MAX_BBOX_AREA_M2)
        })
      ]
    });
    this.draw.start();
    this.draw.setMode('render');

    this.draw.on('finish', (id) => {
      const feature = this.draw.getSnapshotFeature(id) as Feature<Polygon> | undefined;
      if (!feature) return;
      this.currentBbox = rectangleFeatureToBbox(feature);
      setGraphBbox(this.currentBbox);
      this.draw.setMode('render');
    });
  }

  public async init(container: HTMLElement): Promise<void> {
    await initGraphSidebar(container, {
      onDrawBbox: () => {
        this.draw.clear();
        this.currentBbox = null;
        setGraphBbox(null);
        this.draw.setMode('rectangle');
      },
      onUseCurrentView: () => this.handleUseCurrentView(),
      onSubmit: (params) => this.handleSubmit(params),
      onNodesVisibleChange: (visible) => {
        this.nodesVisible = visible;
        GraphMapLayers.setNodesVisible(this.map, visible);
      }
    }, this.abortSignal);

    GraphMapLayers.ensureBaseLayers(this.map);
    setGraphBbox(null);
  }

  public reapplyLayers(): void {
    GraphMapLayers.ensureBaseLayers(this.map);
    const state = this.dataService.getResult();
    if (state) GraphMapLayers.update(this.map, state.features);
    GraphMapLayers.setNodesVisible(this.map, this.nodesVisible);
  }

  public handleMapClick(e: maplibregl.MapMouseEvent): void {
    const features = this.map.queryRenderedFeatures(e.point, { layers: [EDGES_LAYER_ID, NODES_LAYER_ID] });
    if (features.length === 0) {
      PopupManager.closePopup();
      return;
    }
    const feat = features[0];
    const html = PopupManager.buildHtml(feat.layer.id, feat.properties || {});
    PopupManager.showFeaturePopup(this.map, [e.lngLat.lng, e.lngLat.lat], html);
  }

  public destroy(): void {
    this.draw.stop();
    PopupManager.closePopup();
  }

  private handleUseCurrentView(): void {
    const bounds = this.map.getBounds();
    const bbox: [[number, number], [number, number]] = [
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()]
    ];
    if (calculateBboxArea(bbox) > MAX_BBOX_AREA_M2) {
      Toast.warning('Ansicht zu groß, bitte weiter hineinzoomen.');
      return;
    }
    this.currentBbox = bbox;
    setGraphBbox(bbox);
  }

  private async handleSubmit(params: GraphFormParams): Promise<void> {
    if (!this.currentBbox) return;
    const btn = document.getElementById('btn-query-export') as HTMLButtonElement;
    btn?.classList.add('loading');

    const response = await GraphExportService.queryExport(params.profile, params.format, this.currentBbox, params.geometry);
    if (this.abortSignal.aborted) return;
    btn?.classList.remove('loading');

    if (!response.ok) {
      const message = response.status === 504
        ? 'Zeitüberschreitung — Bbox verkleinern und erneut versuchen.'
        : 'Export fehlgeschlagen.';
      Toast.error(message);
      return;
    }

    const features = buildGraphFeatures(response.raw, response.format);
    this.dataService.setResult({
      bbox: this.currentBbox,
      profile: params.profile,
      format: params.format,
      geometry: params.geometry,
      features,
      payloadBytes: response.payloadBytes
    });

    GraphMapLayers.update(this.map, features);
    GraphMapLayers.setNodesVisible(this.map, this.nodesVisible);
    renderGraphResult({
      nodesCount: features.nodesCount,
      edgesCount: features.edgesCount,
      payloadBytes: response.payloadBytes,
      format: params.format
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/graph/GraphSidebarAdapter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/graph/GraphSidebarAdapter.ts src/features/graph/GraphSidebarAdapter.test.ts
git commit -m "feat(graph): GraphSidebarAdapter mit terra-draw-Bbox-Zeichnen + Viewport-Button"
```

---

## Task 9: `GraphPage` controller + route registration

**Files:**
- Create: `src/pages/GraphPage.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `BasePageController` (`src/core/BasePageController.ts`), `MapCore` (`src/lib/MapCore.ts`), `attachHoverCursor` (`src/lib/HoverCursor.ts`), `initTopbar` (`src/components/Topbar.ts`), `LayoutHelper` (`src/lib/LayoutHelper.ts`), `InventoryService` (`src/services/InventoryService.ts`), `GraphSidebarAdapter` (Task 8), `EDGES_LAYER_ID`/`NODES_LAYER_ID` (Task 5).
- Produces: `class GraphPageController extends BasePageController`. Route `/graph` in `src/main.ts`'s router.

No dedicated unit test — matches the existing precedent (`IsochronesPage.ts` has no test file; page controllers are orchestration glue, verified via manual browser testing, see Task 10).

- [ ] **Step 1: Implement the page controller**

Create `src/pages/GraphPage.ts`:
```typescript
import * as maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { attachHoverCursor } from '../lib/HoverCursor';
import { initTopbar } from '../components/Topbar';
import { LayoutHelper } from '../lib/LayoutHelper';
import { InventoryService } from '../services/InventoryService';
import { GraphSidebarAdapter } from '../features/graph/GraphSidebarAdapter';
import { EDGES_LAYER_ID, NODES_LAYER_ID } from '../features/graph/GraphMapLayers';

/**
 * GraphPageController - Orchestriert die versteckte /graph-Seite (ORS-Routing-Graph-Export).
 * Kein Homepage-Card/Nav-Link (analog /info) - nur über direkte URL erreichbar.
 */
export class GraphPageController extends BasePageController {
  private map?: maplibregl.Map;
  private sidebarAdapter?: GraphSidebarAdapter;

  public async mount(container: HTMLElement): Promise<void> {
    try {
      const invService = InventoryService.getInstance();
      const basemaps = await invService.getBasemaps();

      const mounts = LayoutHelper.renderBaseLayout(container, {});

      this.map = MapCore.init(
        mounts.map,
        basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
        () => this.handleMapRestore()
      );

      this.sidebarAdapter = new GraphSidebarAdapter(this.map, this.signal);
      await this.sidebarAdapter.init(mounts.sidebar);

      initTopbar(mounts.topbar, basemaps, (url) => {
        if (this.map) this.map.setStyle(url);
      });

      this.setupMapListeners();

      console.debug('[GraphPageController] Mounted successfully');
    } catch (err) {
      console.error('[GraphPageController] Initialization failed:', err);
    }
  }

  private setupMapListeners(): void {
    if (!this.map || !this.sidebarAdapter) return;
    attachHoverCursor(this.map, [EDGES_LAYER_ID, NODES_LAYER_ID]);
    this.map.on('click', (e) => this.sidebarAdapter?.handleMapClick(e));
  }

  private handleMapRestore(): void {
    this.sidebarAdapter?.reapplyLayers();
  }

  public destroy(): void {
    super.destroy();
    this.sidebarAdapter?.destroy();
    this.map?.remove();
    console.debug('[GraphPageController] Destroyed');
  }
}
```

- [ ] **Step 2: Register the `/graph` route**

In `src/main.ts`, find:
```typescript
  } else if (path.startsWith('/info')) {
```
Insert immediately before it:
```typescript
  } else if (path === '/graph') {
    const { GraphPageController } = await import('./pages/GraphPage');
    currentPage = new GraphPageController();
    await currentPage.mount(app);
  } else if (path.startsWith('/info')) {
```
(No `.card-nav` added to `renderLandingPage()` — page is intentionally reachable only via direct URL, per the approved design spec.)

- [ ] **Step 3: Type-check and run the full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, all tests pass (including every test file from Tasks 2–8).

- [ ] **Step 4: Commit**

```bash
git add src/pages/GraphPage.ts src/main.ts
git commit -m "feat(graph): /graph-Seite (Routing-Graph-Export) - versteckt, nur per Direkt-URL"
```

---

## Task 10: Manual browser verification & docs sync

**Files:** none (verification only), except as noted in Step 5.

- [ ] **Step 1: Start the dev servers**

Run: `npm run dev`
(If a previous session left stale processes: `npm run dev:reset` first, per `CLAUDE.md`.)

- [ ] **Step 2: Manually verify in the browser**

Navigate to `http://localhost:8000/graph` (adjust port to whatever `npm run dev` prints) and check:
- Page loads with map + sidebar, no console errors.
- "Bbox zeichnen" → click-drag a small rectangle on the map → bbox info shows an area, "Export abfragen" becomes enabled.
- Drawing a rectangle clearly larger than 25 km² is rejected by terra-draw's validation (no bbox gets set, or the shape doesn't finish).
- "Aktuelle Ansicht verwenden" at a zoomed-in level sets a bbox; at a zoomed-out (large) level shows the "Ansicht zu groß" toast instead.
- Submitting with Format=TopoJSON, Geometry=Straßenverlauf renders edges on the map; result info shows "… enthält keine einzelnen Knotenpunkte".
- Submitting with Format=JSON renders both nodes and edges; the "Knotenpunkte: Ausblenden" toggle hides/shows the node layer live.
- Switching Format to JSON visually disables the Geometry segmented control and shows the "Nur bei TopoJSON wirksam" hint.
- Clicking a rendered edge/node shows a popup with the expected fields (weight / node IDs).
- Switching basemap (topbar dropdown) preserves the rendered graph layers (tests `reapplyLayers`/`MapRegistry` restore).
- Navigating away to another page and back to `/graph` doesn't leak console errors or duplicate layers.
- `/` (homepage) and the nav dropdown do **not** show a "Routing-Graph" entry (confirms the hidden-page requirement).

- [ ] **Step 3: Report results**

If any check fails, treat it as a bug to fix before proceeding (per `superpowers:verification-before-completion` — evidence before completion claims), not as a follow-up TODO.

- [ ] **Step 4: Final full verification**

Run: `npx tsc --noEmit && npm test && npm run validate:openapi`
Expected: all green.

- [ ] **Step 5: Update `docs/CHANGELOG.md`**

Add an `## [Unreleased] - <today's date/time>` entry (or append to an existing same-day `[Unreleased]` block, each distinct change as its own bullet — do not merge into an unrelated existing block) under `### Hinzugefügt`:
```markdown
- Neue, versteckte Seite `/graph` ("Routing-Graph"): visualisiert den internen ORS-Routing-Graphen
  (Nodes/Edges) für eine per Karte gesetzte Bbox (frei gezeichnet via terra-draw oder aktueller
  Kartenausschnitt), mit Profil-/Format- (JSON/TopoJSON) und Geometrie-Auswahl. Nur über
  Direkt-URL erreichbar (kein Nav-Link/Homepage-Card).
```
Do **not** touch the in-app changelog (`GlobalModals.ts`) yet — per `CLAUDE.md`, that's curated and updated at release time, not per change.

- [ ] **Step 6: Commit**

```bash
git add docs/CHANGELOG.md
git commit -m "docs(changelog): /graph-Seite (Routing-Graph-Export) ergänzt"
```

---

## Self-Review Notes (from writing this plan)

- **Spec coverage:** every spec section has a task — ORS-facts/allowlist (Task 1), bbox area limit (Task 2, 7, 8), ORS call incl. 504-handling (Task 3, 8), state (Task 4), json/topojson→GeoJSON incl. node/edge normalization (Task 5), popups (Task 6), sidebar form incl. format/geometry/node-visibility controls (Task 7), draw/viewport-button/submit orchestration (Task 8), page/route (Task 9), manual verification + changelog (Task 10).
- **Corrected during planning:** the "Node-Layer über MapLegend ausblendbar" line from the approved spec was replaced with a sidebar segmented control, because `MapLegend` has no click-to-toggle capability in this codebase (see Global Constraints note above) — flagging this explicitly rather than silently drifting from the approved spec.
- **Type consistency checked:** `GraphExportFormat` (Task 3) is reused verbatim in `GraphDataService` (Task 4), `GraphSidebar` (Task 7) and `GraphSidebarAdapter` (Task 8) — no redefinition. `GraphFeatures` (Task 5) is reused verbatim in `GraphDataService` (Task 4). Layer/source ID constants (`EDGES_LAYER_ID` etc., Task 5) are imported wherever referenced (Task 8, Task 9), never re-typed as string literals.
- **No placeholders:** every step above has complete, concrete code — no "add tests for the above" or "handle errors appropriately" left unresolved.
