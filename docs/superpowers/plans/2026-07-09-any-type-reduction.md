# any-Escape-Reduktion (Type-Safety) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle 78 explizit annotierten `any`-Escapes (`: any` / `as any`) in Nicht-Test-`.ts`-Dateien durch präzise Typen ersetzen, ohne Laufzeitverhalten zu ändern.

**Architecture:** Reines Type-Refactoring, keine neue Logik. Reihenfolge folgt Abhängigkeiten: zuerst gemeinsame Typen (`types/common.ts`, MapLibre-Source-/Layer-Specs), danach Konsumenten. `geojson`- und `maplibre-gl`-Pakettypen (bereits Projektabhängigkeiten, `RoutingMapLayers.ts` nutzt das Muster schon) statt `any` für GeoJSON-Features/Map-Definitionen.

**Tech Stack:** TypeScript (strict), `maplibre-gl` (re-exportiert `SourceSpecification`/`LayerSpecification`/`StyleSpecification` aus `@maplibre/maplibre-gl-style-spec`), `@types/geojson` (transitive Dependency, liefert sowohl benannte Imports `from 'geojson'` als auch die globale `GeoJSON.*`-Namespace-Syntax — beide bereits im Code in Gebrauch, je Datei beim bestehenden Stil bleiben).

## Global Constraints

- **Kein Verhaltensunterschied.** Reine Typannotationen/Casts: keine neuen Features, kein Refactoring über das hier Beschriebene hinaus (ROADMAP.md-Scope: "kein neuer Code, kein neues Feature").
- **`.test.ts`-Dateien bleiben unangetastet** (43 der 121 Fundstellen, laut ROADMAP.md bewusst ausgenommen — Mocking-`any` ist dort vertretbar).
- **Nach JEDER Task:** `npx tsc --noEmit && npm test` muss grün sein (Core Mandate, CLAUDE.md → Commands). Kein Schritt gilt als abgeschlossen, ohne dass beide Befehle sauber durchlaufen.
- **Kein künstlicher TDD-Rot/Grün-Zyklus.** Das ist ein Typ-only-Refactoring ohne neues Verhalten — es gibt keinen sinnvollen fehlschlagenden Test, den man zuerst schreiben würde. Der bestehende Testsuite-Lauf (`npm test`) übernimmt die Rolle des Verifikationsschritts pro Task.
- **Falls `tsc` nach einer vorgeschlagenen Änderung einen Folgefehler an einer hier nicht explizit genannten Stelle wirft** (z.B. weil ein Konsument bisher von `any`-Durchreichung profitiert hat): den präzisesten passenden Typ einführen (ggf. einen lokalen Type-Cast wie `as { url?: string }` statt `any`), NICHT `any` wieder einführen. Kurz im Commit dokumentieren, falls von diesem Plan abgewichen wurde.
- **Commits:** ein Commit pro Task, Format `refactor(types): <Datei(en)> — any-Escapes entfernen`, Dateien explizit stagen (nie `git add -A`).
- **Reihenfolge einhalten** — spätere Tasks konsumieren Typen aus früheren (v.a. Task 1 `types/common.ts` und Task 2 Map-Spec-Typen).

---

### Task 1: `src/types/common.ts` — RouteResult/RoutingStation-Typen

**Files:**
- Modify: `src/types/common.ts`

**Interfaces:**
- Produces: `RouteResult.features: Feature<LineString, RouteFeatureProperties>[]`, `RouteResult.metadata: unknown`, `RouteFeatureProperties` mit `[key: string]: unknown` statt `any`, `RoutingStation.route?: RouteResult`.

- [ ] **Step 1: Import geojson-Typen ergänzen**

Am Dateianfang ergänzen:

```typescript
import type { Feature, LineString } from 'geojson';
```

- [ ] **Step 2: `RouteResult` typisieren**

Ersetze:

```typescript
export interface RouteResult {
    type: 'FeatureCollection';
    features: any[];
    metadata: any;
}
```

durch:

```typescript
export interface RouteResult {
    type: 'FeatureCollection';
    features: Feature<LineString, RouteFeatureProperties>[];
    metadata: unknown;
}
```

`RouteFeatureProperties` ist weiter unten in derselben Datei definiert (Forward-Reference innerhalb einer Datei ist in TS unproblematisch).

- [ ] **Step 3: `RouteFeatureProperties`-Indexsignatur typisieren**

Ersetze:

```typescript
export interface RouteFeatureProperties {
    summary: { distance: number; duration: number };
    extras?: RouteExtras;
    segments?: RouteSegment[];
    [key: string]: any;
}
```

durch:

```typescript
export interface RouteFeatureProperties {
    summary: { distance: number; duration: number };
    extras?: RouteExtras;
    segments?: RouteSegment[];
    [key: string]: unknown;
}
```

- [ ] **Step 4: `RoutingStation.route` typisieren**

Ersetze `route?: any;` durch `route?: RouteResult;` in `RoutingStation`.

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Falls Folgefehler in `RoutingMapLayers.ts` (Consumer von `RouteResult` über `RoutingDataService`) auftreten: NICHT anfassen, das Feature wird erst in Task 7 typisiert und dort mitverifiziert — bei einem Fehler an dieser Stelle jetzt schon prüfen, ob er tatsächlich von dieser Task oder von der noch ausstehenden Task 7 verursacht wird (Map `<number, any>` in `RoutingDataService` puffert `any` bis Task 7).

- [ ] **Step 6: Commit**

```bash
git add src/types/common.ts
git commit -m "refactor(types): common.ts — any-Escapes entfernen"
```

---

### Task 2: `src/lib/MapDefinitionOps.ts` + `src/lib/MapRegistry.ts` — Source/Layer-Spec-Typen

**Files:**
- Modify: `src/lib/MapDefinitionOps.ts`
- Modify: `src/lib/MapRegistry.ts`

**Interfaces:**
- Produces: `addSourceIfMissing(map, id, definition: SourceSpecification)`, `addLayerIfMissing(map, definition: LayerSpecification, beforeId?)`, `MapRegistry.registerSource(id, definition: SourceSpecification)`, `MapRegistry.registerLayer(id, definition: LayerSpecification, beforeId?)`.

- [ ] **Step 1: `MapDefinitionOps.ts` — Imports ergänzen**

Ersetze `import maplibregl from 'maplibre-gl';` durch:

```typescript
import maplibregl, { type SourceSpecification, type LayerSpecification } from 'maplibre-gl';
```

- [ ] **Step 2: `addSourceIfMissing`/`addLayerIfMissing` typisieren**

Ersetze:

```typescript
export function addSourceIfMissing(map: maplibregl.Map, id: string, definition: any): void {
```

durch:

```typescript
export function addSourceIfMissing(map: maplibregl.Map, id: string, definition: SourceSpecification): void {
```

Ersetze:

```typescript
export function addLayerIfMissing(map: maplibregl.Map, definition: any, beforeId?: string): void {
```

durch:

```typescript
export function addLayerIfMissing(map: maplibregl.Map, definition: LayerSpecification, beforeId?: string): void {
```

- [ ] **Step 3: `MapRegistry.ts` — Imports ergänzen**

Ersetze `import maplibregl from 'maplibre-gl';` durch:

```typescript
import maplibregl, { type SourceSpecification, type LayerSpecification } from 'maplibre-gl';
```

- [ ] **Step 4: `ManagedSource`/`ManagedLayer` typisieren**

Ersetze:

```typescript
interface ManagedSource {
  id: string;
  definition: any;
}

interface ManagedLayer {
  id: string;
  definition: any;
  beforeId?: string;
}
```

durch:

```typescript
interface ManagedSource {
  id: string;
  definition: SourceSpecification;
}

interface ManagedLayer {
  id: string;
  definition: LayerSpecification;
  beforeId?: string;
}
```

- [ ] **Step 5: `registerSource`/`registerLayer` typisieren**

Ersetze `registerSource(id: string, definition: any) {` durch `registerSource(id: string, definition: SourceSpecification) {`.

Ersetze `registerLayer(id: string, definition: any, beforeId?: string) {` durch `registerLayer(id: string, definition: LayerSpecification, beforeId?: string) {`.

- [ ] **Step 6: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Erwartete Folgefehler an Call-Sites (`MapCore.ts`, `NahMapLayers.ts`, `OverlayLoader.ts`, `TrackingDataService.ts` — dort wird bisher `layerDef as any` an `ensureGeoJsonLayer`/`registerLayer` übergeben) werden in den jeweiligen späteren Tasks (3, 4, 9, 11) behoben, nicht hier.

- [ ] **Step 7: Commit**

```bash
git add src/lib/MapDefinitionOps.ts src/lib/MapRegistry.ts
git commit -m "refactor(types): MapDefinitionOps/MapRegistry — any-Escapes entfernen"
```

---

### Task 3: `src/lib/MapCore.ts`

**Files:**
- Modify: `src/lib/MapCore.ts`

**Interfaces:**
- Consumes: `SourceSpecification`, `LayerSpecification` (Task 2).
- Produces: `MapCore.ensureGeoJsonLayer(map, sourceId, layerDef: LayerSpecification)`, `MapCore.resolveSourceUrls(sources: Record<string, SourceSpecification>, baseUrl: string): Record<string, SourceSpecification>`.

- [ ] **Step 1: Import ergänzen**

Ersetze die bestehende Import-Zeile:

```typescript
import maplibregl, { type LayerSpecification, type StyleImageMetadata } from 'maplibre-gl';
```

durch:

```typescript
import maplibregl, { type LayerSpecification, type SourceSpecification, type StyleImageMetadata } from 'maplibre-gl';
```

- [ ] **Step 2: `ensureGeoJsonLayer` typisieren**

Ersetze `ensureGeoJsonLayer(map: maplibregl.Map, sourceId: string, layerDef: any) {` durch `ensureGeoJsonLayer(map: maplibregl.Map, sourceId: string, layerDef: LayerSpecification) {`.

- [ ] **Step 3: `resolveSourceUrls` typisieren**

Ersetze:

```typescript
  resolveSourceUrls(sources: any, baseUrl: string): any {
```

durch:

```typescript
  resolveSourceUrls(sources: Record<string, SourceSpecification>, baseUrl: string): Record<string, SourceSpecification> {
```

- [ ] **Step 4: `Object.values(...) as any`-Schleife typisieren**

Ersetze:

```typescript
    for (const src of Object.values(resolvedSources) as any) {
      if (src.url) src.url = resolveUrl(src.url);
      if (Array.isArray(src.tiles)) {
        src.tiles = src.tiles.map((u: string) => resolveUrl(u));
      }
    }
```

durch:

```typescript
    for (const rawSrc of Object.values(resolvedSources)) {
      // Nicht alle SourceSpecification-Varianten haben url/tiles (z.B. GeoJSON-Sources nicht) —
      // dieser Cast bildet exakt das bereits vorher per any erlaubte, duck-typed Zugreifen ab.
      const src = rawSrc as { url?: string; tiles?: string[] };
      if (src.url) src.url = resolveUrl(src.url);
      if (Array.isArray(src.tiles)) {
        src.tiles = src.tiles.map((u: string) => resolveUrl(u));
      }
    }
```

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/MapCore.ts
git commit -m "refactor(types): MapCore.ts — any-Escapes entfernen"
```

---

### Task 4: `src/lib/OverlayLoader.ts`

**Files:**
- Modify: `src/lib/OverlayLoader.ts`

**Interfaces:**
- Consumes: `StyleSpecification` (maplibre-gl).
- Produces: `LoadedOverlay.style: StyleSpecification`.

- [ ] **Step 1: Import ergänzen**

Ersetze `import maplibregl from 'maplibre-gl';` durch:

```typescript
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
```

- [ ] **Step 2: `LoadedOverlay.style` typisieren**

Ersetze:

```typescript
interface LoadedOverlay {
  style: any;
```

durch:

```typescript
interface LoadedOverlay {
  style: StyleSpecification;
```

- [ ] **Step 3: `style.sprite`-Zugriff anpassen**

`StyleSpecification.sprite` ist vom Typ `SpriteSpecification` (`string | {id: string; url: string}[]`), in diesem Projekt aber immer ein einfacher String (eigene Style-JSONs). Ersetze:

```typescript
      if (style.sprite) {
        MapRegistry.registerImage(overlayId, style.sprite, styleUrl);
        await MapCore.loadSprites(map, style.sprite, styleUrl);
        entry.hasImage = true;
      }
```

durch:

```typescript
      if (style.sprite) {
        const spriteUrl = style.sprite as string;
        MapRegistry.registerImage(overlayId, spriteUrl, styleUrl);
        await MapCore.loadSprites(map, spriteUrl, styleUrl);
        entry.hasImage = true;
      }
```

- [ ] **Step 4: `(l: any) => l.id`-Stellen typisieren**

Ersetze:

```typescript
    const wantedLayerIds: string[] = opts?.layerIds ?? (style.layers || []).map((l: any) => l.id);
```

durch (Annotation entfällt, TS inferiert `l` jetzt korrekt aus `style.layers: LayerSpecification[]`):

```typescript
    const wantedLayerIds: string[] = opts?.layerIds ?? (style.layers || []).map((l) => l.id);
```

Ersetze:

```typescript
      const layerDef = (style.layers || []).find((l: any) => l.id === layerId);
```

durch:

```typescript
      const layerDef = (style.layers || []).find((l) => l.id === layerId);
```

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/OverlayLoader.ts
git commit -m "refactor(types): OverlayLoader.ts — any-Escapes entfernen"
```

---

### Task 5: `src/lib/PopupManager.ts`

**Files:**
- Modify: `src/lib/PopupManager.ts`

**Interfaces:**
- Produces: `PopupField.format?: (val: number | null | undefined) => string | null`.

- [ ] **Step 1: `PopupField.format` typisieren**

Ersetze:

```typescript
export interface PopupField {
    key: string;
    label: string;
    format?: (val: any) => string | null;
}
```

durch:

```typescript
export interface PopupField {
    key: string;
    label: string;
    format?: (val: number | null | undefined) => string | null;
}
```

Begründung: alle 7 bestehenden `format`-Implementierungen in `POPUP_CONFIGS` (unverändert lassen) sind numerische Formatierungen (`toLocaleString`, `Math.round`, Vergleiche) — `number | null | undefined` ist der präzise Typ für die tatsächlich genutzten Felder (`alt_baro`, `gs`, `track`, `vert_rate`, `seen`, `speed`, `cog`).

- [ ] **Step 2: Call-Site in `buildHtml` anpassen**

Ersetze:

```typescript
            let val = props[f.key];
            if (val == null || val === '' || val === 'null') return '';
            if (f.format) val = f.format(val);
            if (val == null) return '';
```

durch:

```typescript
            let val = props[f.key];
            if (val == null || val === '' || val === 'null') return '';
            if (f.format) val = f.format(val as number | null | undefined);
            if (val == null) return '';
```

(`props: Record<string, unknown>` — dieser eine Cast an der Aufrufstelle ersetzt die vorher pauschal am Feld-Typ hängende `any`-Durchlässigkeit; präziser, weil auf die tatsächlich erwartete Eingabe der Formatierer eingegrenzt.)

- [ ] **Step 3: Redundanten Inline-Cast entfernen**

In `POPUP_CONFIGS['ais-icons'].fields` bei `cog`, ersetze:

```typescript
            { key: 'cog', label: 'Course', format: (v) => v != null ? `${Math.round(v as number)}°` : null }
```

durch (der Cast ist jetzt überflüssig, da `v` durch die neue Signatur bereits `number | null | undefined` ist und nach `v != null` zu `number` narrowed):

```typescript
            { key: 'cog', label: 'Course', format: (v) => v != null ? `${Math.round(v)}°` : null }
```

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/PopupManager.ts
git commit -m "refactor(types): PopupManager.ts — any-Escapes entfernen"
```

---

### Task 6: `src/lib/RoutingService.ts`

**Files:**
- Modify: `src/lib/RoutingService.ts`

**Interfaces:**
- Consumes: `RouteResult` (Task 1, bereits importiert).

- [ ] **Step 1: `stations7.map`-Callback typisieren**

Die Response von `/api/stations.php` ist extern/ungetypt (`.json()` liefert implizit `any`, außerhalb des Scopes dieses Plans — siehe ROADMAP.md, nur explizite `: any`/`as any`-Annotationen sind Ziel). Der explizite `(s: any)` ist aber im Scope. `s` wird nur für `s.lat`/`s.lon` gebraucht (Spread `...s` bleibt danach unverändert vorhanden). Ersetze:

```typescript
        const detailedResults = await Promise.all(stations7.map(async (s: any) => {
```

durch:

```typescript
        const detailedResults = await Promise.all(stations7.map(async (s: { lat: number; lon: number; [key: string]: unknown }) => {
```

- [ ] **Step 2: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/RoutingService.ts
git commit -m "refactor(types): RoutingService.ts — any-Escapes entfernen"
```

---

### Task 7: `src/features/routing/RoutingDataService.ts` + `src/features/routing/RoutingSidebarAdapter.ts`

**Files:**
- Modify: `src/features/routing/RoutingDataService.ts`
- Modify: `src/features/routing/RoutingSidebarAdapter.ts`

**Interfaces:**
- Consumes: `RouteResult`, `RoutingStation` (Task 1).
- Produces: `RoutingDataService.setStationRoute(id: number, route: RouteResult)`, `RoutingDataService.getStationRoutes(): Map<number, RouteResult>`.

- [ ] **Step 1: `RoutingDataService.ts` — `stationRoutes` und `setStationRoute` typisieren**

Am Dateianfang Import ergänzen:

```typescript
import { RoutingStation, RouteResult } from '../../types/common';
```

(ersetzt die bestehende `import { RoutingStation } from '../../types/common';`)

Ersetze `private stationRoutes = new Map<number, any>();` durch `private stationRoutes = new Map<number, RouteResult>();`.

Ersetze `public setStationRoute(id: number, route: any) { this.stationRoutes.set(id, route); }` durch `public setStationRoute(id: number, route: RouteResult) { this.stationRoutes.set(id, route); }`.

- [ ] **Step 2: `RoutingSidebarAdapter.ts` — `coordinates.forEach((c: any) => ...)` typisieren (2 Stellen)**

Am Dateianfang Import ergänzen:

```typescript
import type { Position } from 'geojson';
```

Ersetze (Zeile ~52):

```typescript
            route.features[0].geometry.coordinates.forEach((c: any) => bounds.extend(c));
```

durch:

```typescript
            route.features[0].geometry.coordinates.forEach((c: Position) => bounds.extend(c as [number, number]));
```

Ersetze die zweite, identische Stelle (Zeile ~105) genauso:

```typescript
                route.features[0].geometry.coordinates.forEach((c: any) => bounds.extend(c));
```

durch:

```typescript
                route.features[0].geometry.coordinates.forEach((c: Position) => bounds.extend(c as [number, number]));
```

(`GeoJSON.Position` ist `number[]` — nicht das feste `[number, number]`-Tupel, das `LngLatLike` erwartet. Der Cast ist notwendig und präzise, kein `any`.)

- [ ] **Step 3: `params.mode as any` typisieren**

Ersetze:

```typescript
          const results: RoutingStation[] = await RoutingService.findNearestStations(params.target, params.mode as any, params.profile);
```

durch:

```typescript
          // params.mode ist hier 'ab' | 'sew' | 'nef' (durch das zusammengesetzte if oben nicht auf
          // 'sew' | 'nef' engbar, falls mode === 'ab' und params.start fehlt). Cast bildet exakt das
          // vorher durch any stillschweigend erlaubte Verhalten ab — keine Verhaltensänderung.
          const results: RoutingStation[] = await RoutingService.findNearestStations(params.target, params.mode as 'sew' | 'nef', params.profile);
```

- [ ] **Step 4: `results.forEach((r: any) => ...)` typisieren**

Ersetze:

```typescript
          results.forEach((r: any) => {
             bounds.extend([r.lon, r.lat]);
          });
```

durch (Annotation entfällt, `results: RoutingStation[]` ist bereits oben deklariert):

```typescript
          results.forEach((r) => {
             bounds.extend([r.lon, r.lat]);
          });
```

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/routing/RoutingDataService.ts src/features/routing/RoutingSidebarAdapter.ts
git commit -m "refactor(types): RoutingDataService/RoutingSidebarAdapter — any-Escapes entfernen"
```

---

### Task 8: `src/components/RoutingSidebar.ts`

**Files:**
- Modify: `src/components/RoutingSidebar.ts`

**Interfaces:**
- Consumes: `RoutingStation` (Task 1).
- Produces: `renderStationResults(stations: RoutingStation[], onToggle: (station: RoutingStation, active: boolean) => void, onHighlight: (station: RoutingStation) => void)`.

- [ ] **Step 1: Import ergänzen**

Ersetze:

```typescript
import { GeocodeResult, RouteExtras, RouteSegment } from '../types/common';
```

durch:

```typescript
import { GeocodeResult, RouteExtras, RouteSegment, RoutingStation } from '../types/common';
```

- [ ] **Step 2: `timeout: any` typisieren**

Ersetze `let timeout: any;` durch `let timeout: ReturnType<typeof setTimeout>;`.

- [ ] **Step 3: `renderStationResults`-Signatur typisieren**

Ersetze:

```typescript
export const renderStationResults = (
  stations: any[],
  onToggle: (station: any, active: boolean) => void,
  onHighlight: (station: any) => void
) => {
```

durch:

```typescript
export const renderStationResults = (
  stations: RoutingStation[],
  onToggle: (station: RoutingStation, active: boolean) => void,
  onHighlight: (station: RoutingStation) => void
) => {
```

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RoutingSidebar.ts
git commit -m "refactor(types): RoutingSidebar.ts — any-Escapes entfernen"
```

---

### Task 9: `src/features/nah/NahMapLayers.ts` (12 Stellen — größte Einzeldatei)

**Files:**
- Modify: `src/features/nah/NahMapLayers.ts`

**Interfaces:**
- Consumes: `LayerSpecification` (maplibre-gl, Task 2/3-Muster).

- [ ] **Step 1: Import ergänzen**

Ersetze:

```typescript
import maplibregl from 'maplibre-gl';
```

durch:

```typescript
import maplibregl, { type LayerSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point, LineString } from 'geojson';
```

- [ ] **Step 2: `setStations` — Feature-Array und `setData` typisieren**

Ersetze:

```typescript
    // Create one feature per group
    const features = Array.from(grouped.values()).map(group => {
      const representative = group[0];
      const groupStatus = this.computeGroupStatus(group);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [representative.lon, representative.lat] },
        properties: {
          ...representative,
          status: groupStatus,
          _station_count: group.length,
          _all_stations: group
        }
      };
    });

    const data = {
      type: 'FeatureCollection',
      features: features as any
    };

    const source = map.getSource(STATIONS_SOURCE) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data as any);
    }
```

durch:

```typescript
    // Create one feature per group
    const features: Feature<Point>[] = Array.from(grouped.values()).map(group => {
      const representative = group[0];
      const groupStatus = this.computeGroupStatus(group);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [representative.lon, representative.lat] },
        properties: {
          ...representative,
          status: groupStatus,
          _station_count: group.length,
          _all_stations: group
        }
      };
    });

    const data: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features
    };

    const source = map.getSource(STATIONS_SOURCE) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data);
    }
```

- [ ] **Step 3: `findClickedStation` — `geometry as any` und `_all_stations`-Casts typisieren**

Ersetze:

```typescript
    const feat = features[0];
    const coordinates = (feat.geometry as any).coordinates as [number, number];
    const rawProps = feat.properties as NahStation & { status: NahStationStatus };
    // MapLibre GL JS JSON-stringifies non-primitive GeoJSON feature properties
    // (z.B. Arrays) intern; months_active muss hier wieder in ein echtes Array
    // geparst werden, damit buildStationPopupHtml eine echte NahStation sieht.
    const station = {
      ...rawProps,
      months_active: typeof rawProps.months_active === 'string'
        ? JSON.parse(rawProps.months_active)
        : rawProps.months_active,
      _all_stations: typeof (rawProps as any)._all_stations === 'string'
        ? JSON.parse((rawProps as any)._all_stations)
        : (rawProps as any)._all_stations
    };
```

durch:

```typescript
    const feat = features[0];
    const coordinates = (feat.geometry as Point).coordinates as [number, number];
    const rawProps = feat.properties as NahStation & { status: NahStationStatus; _all_stations: NahStation[] | string };
    // MapLibre GL JS JSON-stringifies non-primitive GeoJSON feature properties
    // (z.B. Arrays) intern; months_active muss hier wieder in ein echtes Array
    // geparst werden, damit buildStationPopupHtml eine echte NahStation sieht.
    const station = {
      ...rawProps,
      months_active: typeof rawProps.months_active === 'string'
        ? JSON.parse(rawProps.months_active)
        : rawProps.months_active,
      _all_stations: typeof rawProps._all_stations === 'string'
        ? JSON.parse(rawProps._all_stations)
        : rawProps._all_stations
    };
```

(`Point` ist der in Step 1 importierte benannte Typ aus `geojson` — konsistent mit dem Rest der Datei, statt der ambienten `GeoJSON.*`-Namespace-Syntax aus `AisInterpreter.ts`; beide Stile existieren im Projekt, pro Datei bleibt einer davon konsistent.)

- [ ] **Step 4: `handleStationClick` — `_all_stations`-Cast typisieren**

Ersetze:

```typescript
    const allStations = (hit.station as any)._all_stations as NahStation[] | undefined;
```

durch (`hit.station` ist durch die Rückgabetyp-Deklaration von `findClickedStation` bereits `NahStation & { status: NahStationStatus }` — `_all_stations` fehlt in diesem deklarierten Rückgabetyp, obwohl `findClickedStation` es zur Laufzeit mitliefert; präzisiert den Rückgabetyp statt am Call-Site zu casten):

Ändere zusätzlich die Signatur von `findClickedStation` (wenige Zeilen oberhalb):

```typescript
  findClickedStation(map: maplibregl.Map, point: [number, number]): { station: NahStation & { status: NahStationStatus }; coordinates: [number, number] } | null {
```

zu:

```typescript
  findClickedStation(map: maplibregl.Map, point: [number, number]): { station: NahStation & { status: NahStationStatus; _all_stations: NahStation[] | undefined }; coordinates: [number, number] } | null {
```

und danach in `handleStationClick`:

```typescript
    const allStations = hit.station._all_stations;
```

- [ ] **Step 5: `initLayers` — die drei `layerDef as any`-Stellen typisieren**

Ersetze (Stations-Symbol-Layer):

```typescript
    const stationsLayerDef = {
      id: STATIONS_LAYER,
      type: 'symbol',
```

durch:

```typescript
    const stationsLayerDef: LayerSpecification = {
      id: STATIONS_LAYER,
      type: 'symbol',
```

und weiter unten `MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsLayerDef as any);` durch `MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsLayerDef);`.

Ersetze (Count-Label-Layer):

```typescript
    const stationsCountLayer = {
      id: 'nah-stations-count-label',
      type: 'symbol',
```

durch:

```typescript
    const stationsCountLayer: LayerSpecification = {
      id: 'nah-stations-count-label',
      type: 'symbol',
```

und `MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsCountLayer as any);` durch `MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsCountLayer);`.

Ersetze (Linien-Layer):

```typescript
    const layerDef = {
      id: layerId,
      type: 'line',
```

durch:

```typescript
    const layerDef: LayerSpecification = {
      id: layerId,
      type: 'line',
```

und `MapCore.ensureGeoJsonLayer(map, sourceId, layerDef as any);` durch `MapCore.ensureGeoJsonLayer(map, sourceId, layerDef);`.

- [ ] **Step 6: `updateFlightPaths` — Feature-Array und `setData` typisieren (analog Step 2)**

Ersetze:

```typescript
    const lineFeatures = results.map((s, index) => ({
      type: 'Feature',
      id: index,
      geometry: {
        type: 'LineString',
        coordinates: [[lng, lat], [s.lon, s.lat]]
      },
      properties: { osm_id: s.osm_id }
    }));

    const data = {
      type: 'FeatureCollection',
      features: lineFeatures as any
    };

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data as any);
    }
```

durch:

```typescript
    const lineFeatures: Feature<LineString>[] = results.map((s, index) => ({
      type: 'Feature',
      id: index,
      geometry: {
        type: 'LineString',
        coordinates: [[lng, lat], [s.lon, s.lat]]
      },
      properties: { osm_id: s.osm_id }
    }));

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: lineFeatures
    };

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data);
    }
```

- [ ] **Step 7: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Das ist die größte Einzeldatei in diesem Plan (12 Stellen) — bei unerwarteten Folgefehlern einzeln nachjustieren (siehe Global Constraints), nicht `any` reaktivieren.

- [ ] **Step 8: Commit**

```bash
git add src/features/nah/NahMapLayers.ts
git commit -m "refactor(types): NahMapLayers.ts — any-Escapes entfernen"
```

---

### Task 10: `src/features/nah/NahDataService.ts`

**Files:**
- Modify: `src/features/nah/NahDataService.ts`

- [ ] **Step 1: Timeout-Felder typisieren**

Ersetze `private refreshTimeout: any = null;` durch `private refreshTimeout: ReturnType<typeof setTimeout> | null = null;`.

Ersetze `private connectionInterval: any = null;` durch `private connectionInterval: ReturnType<typeof setInterval> | null = null;`.

- [ ] **Step 2: `catch (err: any)` typisieren**

Ersetze:

```typescript
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[NahDataService] Refresh failed', err);
```

durch:

```typescript
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[NahDataService] Refresh failed', err);
```

- [ ] **Step 3: `catch (e: any)` typisieren**

Ersetze:

```typescript
    } catch (e: any) {
      if (e.name === 'AbortError') return;
```

durch:

```typescript
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
```

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/nah/NahDataService.ts
git commit -m "refactor(types): NahDataService.ts — any-Escapes entfernen"
```

---

### Task 11: `src/features/tracking/TrackingDataService.ts` (7 Stellen)

**Files:**
- Modify: `src/features/tracking/TrackingDataService.ts`

**Interfaces:**
- Produces: `TrackingDataCallback` mit `GeoJSON.FeatureCollection` statt `any` für die vier Datenfelder; `mergeTrack` typisiert mit `AircraftTrackPoint[]`.

- [ ] **Step 1: `TrackingDataCallback` typisieren**

Ersetze:

```typescript
export type TrackingDataCallback = (data: {
    adsbData: any;
    adsbTracks: any;
    aisData: any;
    aisTracks: any;
    adsbItems: TrackingItem[];
    aisItems: TrackingItem[];
}) => void;
```

durch:

```typescript
export type TrackingDataCallback = (data: {
    adsbData: GeoJSON.FeatureCollection;
    adsbTracks: GeoJSON.FeatureCollection;
    aisData: GeoJSON.FeatureCollection;
    aisTracks: GeoJSON.FeatureCollection;
    adsbItems: TrackingItem[];
    aisItems: TrackingItem[];
}) => void;
```

(globale `GeoJSON.*`-Ambient-Typen, kein zusätzlicher Import nötig — analog `AisInterpreter.ts`.)

- [ ] **Step 2: Import für `AircraftTrackPoint` ergänzen**

Ersetze die bestehende Import-Zeile für `types/tracking`:

```typescript
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
```

durch:

```typescript
import { 
    TrackingItem, 
    AircraftEntity, 
    VesselEntity, 
    ServerMessage, 
    SnapshotMessage, 
    UpdateMessage,
    SourceStatus,
    SystemTelemetry,
    AircraftTrackPoint
} from '../../types/tracking';
```

- [ ] **Step 3: `mergeTrack` typisieren**

Ersetze:

```typescript
    private mergeTrack(existingTrack: any[] | undefined, newPoints: any[] | undefined): any[] | undefined {
```

durch:

```typescript
    private mergeTrack(existingTrack: AircraftTrackPoint[] | undefined, newPoints: AircraftTrackPoint[] | undefined): AircraftTrackPoint[] | undefined {
```

- [ ] **Step 4: `getAdsbTracksGeoJson`/`getAisTracksGeoJson` — `features: any[]` typisieren**

Ersetze in `getAdsbTracksGeoJson`:

```typescript
    private getAdsbTracksGeoJson() {
        const features: any[] = [];
```

durch:

```typescript
    private getAdsbTracksGeoJson(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
        const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
```

Ersetze in `getAisTracksGeoJson`:

```typescript
    private getAisTracksGeoJson() {
        const features: any[] = [];
```

durch:

```typescript
    private getAisTracksGeoJson(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
        const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
```

(Beide Funktionen `return { type: 'FeatureCollection', features };` am Ende bleiben unverändert — der Rückgabetyp ist jetzt explizit statt implizit inferiert.)

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Erwarteter Prüfpunkt: `getAdsbGeoJson`/`getAisGeoJson` (nicht in dieser Liste, da ohne explizites `any`) müssen weiterhin strukturell zu `GeoJSON.FeatureCollection` passen — falls `tsc` dort meckert, den Rückgabetyp dieser beiden Funktionen ebenfalls explizit auf `GeoJSON.FeatureCollection<GeoJSON.Point>` setzen (kein `any`, konsistent mit Step 4).

- [ ] **Step 6: Commit**

```bash
git add src/features/tracking/TrackingDataService.ts
git commit -m "refactor(types): TrackingDataService.ts — any-Escapes entfernen"
```

---

### Task 12: `src/features/tracking/TrackingMapLayers.ts`

**Files:**
- Modify: `src/features/tracking/TrackingMapLayers.ts`

- [ ] **Step 1: `handleMapClick`-Event typisieren**

Ersetze:

```typescript
    public handleMapClick(e: any, onSelect: (id: string | number | null) => void) {
```

durch:

```typescript
    public handleMapClick(e: maplibregl.MapMouseEvent, onSelect: (id: string | number | null) => void) {
```

- [ ] **Step 2: `geometry as any` typisieren**

Ersetze:

```typescript
        const coordinates = (feat.geometry as any).coordinates as [number, number];
```

durch:

```typescript
        const coordinates = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
```

- [ ] **Step 3: `updateData`-Parameter typisieren**

Ersetze:

```typescript
    public updateData(sourceId: string, data: any) {
```

durch:

```typescript
    public updateData(sourceId: string, data: GeoJSON.GeoJSON) {
```

(`GeoJSONSource.setData` erwartet `GeoJSON.GeoJSON | string` — passt direkt, siehe `node_modules/maplibre-gl/dist/maplibre-gl.d.ts`.)

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. `TrackingPage.ts` ruft `updateData` mit `data.adsbData` etc. auf, die durch Task 11 bereits `GeoJSON.FeatureCollection` sind — sollte kompatibel sein.

- [ ] **Step 5: Commit**

```bash
git add src/features/tracking/TrackingMapLayers.ts
git commit -m "refactor(types): TrackingMapLayers.ts — any-Escapes entfernen"
```

---

### Task 13: `src/features/tracking/TrackingPage.ts`

**Files:**
- Modify: `src/features/tracking/TrackingPage.ts`

- [ ] **Step 1: CustomEvent-Handler typisieren**

Ersetze:

```typescript
        mounts.sidebar.addEventListener('tracking-filter-change', (e: any) => {
            this.currentFilter = e.detail;
```

durch:

```typescript
        mounts.sidebar.addEventListener('tracking-filter-change', (e: Event) => {
            this.currentFilter = (e as CustomEvent<string>).detail;
```

(`detail` ist laut Dispatch-Stelle `src/components/TrackingSidebar.ts:95` ein `string` — `container.dispatchEvent(new CustomEvent('tracking-filter-change', { detail: filter }))` mit `filter: string`.)

- [ ] **Step 2: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/tracking/TrackingPage.ts
git commit -m "refactor(types): TrackingPage.ts — any-Escapes entfernen"
```

---

### Task 14: `src/components/Sidebar.ts`

**Files:**
- Modify: `src/components/Sidebar.ts`

**Interfaces:**
- Produces: neue lokale Typen `LayerMetaGroup`, `LayerMetaEntry` für die `layers.json`-Response von `tiles.oe5ith.at` (extern, bisher ungetypt).

- [ ] **Step 1: Import ergänzen und lokale Typen definieren**

Ersetze:

```typescript
import { MapItem } from '../types/inventory';
import { getSidebarFooterHtml } from '../lib/SidebarUtils';
```

durch:

```typescript
import { MapItem } from '../types/inventory';
import { getSidebarFooterHtml } from '../lib/SidebarUtils';
import type { LayerSpecification } from 'maplibre-gl';

export interface LayerMetaGroup {
  name: string;
  style_layers: string[];
  template: string;
}

export interface LayerMetaEntry {
  id: string;
  groups: LayerMetaGroup[];
}
```

- [ ] **Step 2: `initSidebar`-Parameter und `loadedLayers` typisieren**

Ersetze:

```typescript
export const initSidebar = (
  container: HTMLElement,
  overlays: MapItem[],
  onLayerToggle: LayerToggleCallback,
  onBulkToggle?: BulkToggleCallback,
  onGroupExpand?: (overlayId: string) => Promise<void>,
  layersMeta: any[] = []
) => {
  const loadedLayers = new Map<string, any[]>();
```

durch:

```typescript
export const initSidebar = (
  container: HTMLElement,
  overlays: MapItem[],
  onLayerToggle: LayerToggleCallback,
  onBulkToggle?: BulkToggleCallback,
  onGroupExpand?: (overlayId: string) => Promise<void>,
  layersMeta: LayerMetaEntry[] = []
) => {
  const loadedLayers = new Map<string, LayerMetaGroup[] | LayerSpecification[]>();
```

- [ ] **Step 3: `meta.groups.map((g: any) => ...)` typisieren**

Ersetze:

```typescript
      loadedLayers.set(id, meta.groups);
      listEl.innerHTML = meta.groups.map((g: any) => `
```

durch (Annotation entfällt, `meta: LayerMetaEntry` macht `g` bereits zu `LayerMetaGroup`):

```typescript
      loadedLayers.set(id, meta.groups);
      listEl.innerHTML = meta.groups.map((g) => `
```

- [ ] **Step 4: `style.layers.filter/map((l: any) => ...)` typisieren**

Ersetze:

```typescript
        const layers = style.layers.filter((l: any) => l.type !== 'background');
        loadedLayers.set(id, layers);

        listEl.innerHTML = layers.map((l: any) => `
```

durch:

```typescript
        const layers = (style.layers as LayerSpecification[]).filter((l) => l.type !== 'background');
        loadedLayers.set(id, layers);

        listEl.innerHTML = layers.map((l) => `
```

(`style` kommt aus `await res.json()`, also implizit `any` — der Cast auf `LayerSpecification[]` bei `style.layers` ersetzt die vorher am Callback-Parameter hängende `any`-Annotation und ist präziser, da er die tatsächlich erwartete Form eines MapLibre-Style-JSON benennt.)

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Sidebar.ts
git commit -m "refactor(types): Sidebar.ts — any-Escapes entfernen"
```

---

### Task 15: `src/components/TerrainControls.ts`

**Files:**
- Modify: `src/components/TerrainControls.ts`

- [ ] **Step 1: `(this as any)._listenersInitialized`-Casts entfernen**

`_listenersInitialized: false` ist bereits als Property desselben Objekt-Literals deklariert — der Cast ist unnötig, `this` ist innerhalb der Objekt-Literal-Methoden bereits korrekt typisiert.

Ersetze `if ((this as any)._listenersInitialized) return;` durch `if (this._listenersInitialized) return;`.

Ersetze `(this as any)._listenersInitialized = true;` durch `this._listenersInitialized = true;`.

- [ ] **Step 2: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/TerrainControls.ts
git commit -m "refactor(types): TerrainControls.ts — any-Escapes entfernen"
```

---

### Task 16: `src/core/BasePageController.ts` + `src/core/PageController.ts`

**Files:**
- Modify: `src/core/BasePageController.ts`
- Modify: `src/core/PageController.ts`

- [ ] **Step 1: `PageController.ts` typisieren**

Ersetze `mount(container: HTMLElement, ...args: any[]): Promise<void> | void;` durch `mount(container: HTMLElement, ...args: unknown[]): Promise<void> | void;`.

- [ ] **Step 2: `BasePageController.ts` typisieren**

Ersetze `public abstract mount(container: HTMLElement, ...args: any[]): Promise<void> | void;` durch `public abstract mount(container: HTMLElement, ...args: unknown[]): Promise<void> | void;`.

- [ ] **Step 3: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Alle konkreten `mount()`-Overrides (`MapPage.ts`, `CoordsPage.ts`, `NahPage.ts`, `RoutingPage.ts`, `TrackingPage.ts`: `(container: HTMLElement)`; `InfoPage.ts`: `(container: HTMLElement, subpath: string = 'nah')`) müssen weiterhin als gültige Implementierungen durchgehen — TS prüft Methoden-Overrides bivariant, das war schon mit `any[]` der Fall und ändert sich mit `unknown[]` nicht. Falls doch ein Fehler auftritt: NICHT auf `any[]` zurückrudern, sondern prüfen ob `InfoPage.mount` explizit `override` markiert ist und ggf. die Basissignatur exakt matchen.

- [ ] **Step 4: Commit**

```bash
git add src/core/BasePageController.ts src/core/PageController.ts
git commit -m "refactor(types): BasePageController/PageController — any-Escapes entfernen"
```

---

### Task 17: `src/features/coords/blocks/AddressBlock.ts` + `src/features/coords/CoordsSidebar.ts`

**Files:**
- Modify: `src/features/coords/blocks/AddressBlock.ts`
- Modify: `src/features/coords/CoordsSidebar.ts`

- [ ] **Step 1: `AddressBlock.ts` — Timeout-Feld typisieren**

Ersetze `private geocodeTimeout: any;` durch `private geocodeTimeout: ReturnType<typeof setTimeout> | undefined;`.

- [ ] **Step 2: `CoordsSidebar.ts` — CustomEvent-Handler typisieren**

Ersetze:

```typescript
    blocksContainer.addEventListener('block-activated', (e: any) => {
      this.setActiveBlock(e.detail.systemId);
    });
```

durch:

```typescript
    blocksContainer.addEventListener('block-activated', (e: Event) => {
      this.setActiveBlock((e as CustomEvent<{ systemId: string }>).detail.systemId);
    });
```

(Dispatch-Stelle `src/features/coords/CoordSystemBlock.ts:55`: `new CustomEvent('block-activated', { detail: { systemId: this.systemId } })`.)

- [ ] **Step 3: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/coords/blocks/AddressBlock.ts src/features/coords/CoordsSidebar.ts
git commit -m "refactor(types): AddressBlock/CoordsSidebar — any-Escapes entfernen"
```

---

### Task 18: `src/api/AisInterpreter.ts`

**Files:**
- Modify: `src/api/AisInterpreter.ts`

- [ ] **Step 1: `s: any` typisieren**

Ersetze:

```typescript
            const ships: Ship[] = (data.ships || []).map((s: any) => ({
                ...s,
                speed: s.speed ?? s.sog ?? 0 // Map sog to speed for consistency
            })).filter((s: Ship) => s.lat != null && s.lon != null);
```

durch:

```typescript
            const ships: Ship[] = (data.ships || []).map((s: Ship) => ({
                ...s,
                speed: s.speed ?? s.sog ?? 0 // Map sog to speed for consistency
            })).filter((s: Ship) => s.lat != null && s.lon != null);
```

(`Ship` ist bereits importiert und hat sowohl `speed?` als auch `sog?` als optionale Felder — passt exakt zur rohen API-Response-Form vor der Normalisierung.)

- [ ] **Step 2: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/api/AisInterpreter.ts
git commit -m "refactor(types): AisInterpreter.ts — any-Escapes entfernen"
```

---

### Task 19: `src/components/info/DebugModule.ts` + `HealthModule.ts` + `InventoryModule.ts`

**Files:**
- Modify: `src/components/info/DebugModule.ts`
- Modify: `src/components/info/HealthModule.ts`
- Modify: `src/components/info/InventoryModule.ts`

Alle drei Dateien teilen dasselbe Muster: `catch (error: any) { ... error.message/error.name ... }` → `catch (error) { ... (error as Error).message/.name ... }`, plus je ein Timeout-Feld.

- [ ] **Step 1: `DebugModule.ts` — `lastResponse` und `catch` typisieren**

Ersetze `let lastResponse: any = null;` durch `let lastResponse: unknown = null;`.

Ersetze:

```typescript
    } catch (error: any) {
      statusBadge.textContent = 'ERROR';
      statusBadge.className = 'badge badge-red';
      latencyEl.textContent = '-- ms';
      jsonViewer.textContent = `Error: ${error.message}`;
    } finally {
```

durch:

```typescript
    } catch (error) {
      statusBadge.textContent = 'ERROR';
      statusBadge.className = 'badge badge-red';
      latencyEl.textContent = '-- ms';
      jsonViewer.textContent = `Error: ${(error as Error).message}`;
    } finally {
```

(`lastResponse` wird nur mit `JSON.stringify(lastResponse, ...)` genutzt — `unknown` ist dafür ausreichend, keine weitere Anpassung nötig.)

- [ ] **Step 2: `HealthModule.ts` — `refreshTimeout` und `catch` typisieren**

Ersetze `let refreshTimeout: any = null;` durch `let refreshTimeout: ReturnType<typeof setTimeout> | null = null;`.

Ersetze:

```typescript
    } catch (e: any) {
      if (e.name === 'AbortError' && signal.aborted) return;
```

durch:

```typescript
    } catch (e) {
      if ((e as Error).name === 'AbortError' && signal.aborted) return;
```

- [ ] **Step 3: `InventoryModule.ts` — `catch` typisieren**

Ersetze:

```typescript
    } catch (error: any) {
      if (error.name === 'AbortError') return;

      Toast.error('Fehler beim Laden des Karten-Inventars');
```

durch:

```typescript
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;

      Toast.error('Fehler beim Laden des Karten-Inventars');
```

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/info/DebugModule.ts src/components/info/HealthModule.ts src/components/info/InventoryModule.ts
git commit -m "refactor(types): Debug-/Health-/InventoryModule — any-Escapes entfernen"
```

---

### Task 20: `src/components/info/NahStatusModule.ts` + `RegionsModule.ts` + `TrackingEndpointsModule.ts`

**Files:**
- Modify: `src/components/info/NahStatusModule.ts`
- Modify: `src/components/info/RegionsModule.ts`
- Modify: `src/components/info/TrackingEndpointsModule.ts`

- [ ] **Step 1: `NahStatusModule.ts` — `refreshTimeout` und `catch` typisieren**

Ersetze `let refreshTimeout: any = null;` durch `let refreshTimeout: ReturnType<typeof setTimeout> | null = null;`.

Ersetze:

```typescript
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      tableBodyActive.innerHTML = `
```

durch:

```typescript
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      
      tableBodyActive.innerHTML = `
```

- [ ] **Step 2: `RegionsModule.ts` — `refreshTimeout`, lokaler Stations-Typ, 2× `catch` typisieren**

Ersetze `let refreshTimeout: any = null;` durch `let refreshTimeout: ReturnType<typeof setTimeout> | null = null;`.

Am Dateianfang, nach dem bestehenden Import, lokalen Typ für die `/api/region_stations.php`-Response ergänzen:

```typescript
import { StatsResponse } from '../../types/common';

interface RegionStation {
  type: string;
  org: string;
  short_name: string;
  name: string;
}
```

Ersetze:

```typescript
      data.forEach((station: any) => {
```

durch:

```typescript
      data.forEach((station: RegionStation) => {
```

Ersetze die erste `catch`-Stelle (in `showRegionDetail`):

```typescript
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      const body = container.querySelector('.content-body')!;
```

durch:

```typescript
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      const body = container.querySelector('.content-body')!;
```

Ersetze die zweite `catch`-Stelle (in `fetchData`):

```typescript
    } catch (error: any) {
      if (error.name === 'AbortError') return;

      content.innerHTML = `<div class="t-danger text-center p-2rem">
```

durch:

```typescript
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;

      content.innerHTML = `<div class="t-danger text-center p-2rem">
```

- [ ] **Step 3: `TrackingEndpointsModule.ts` — `catch` und `sources.map` typisieren**

Ersetze:

```typescript
    } catch (e: any) {
        if (signal.aborted) return;
        body.innerHTML = `
            <div class="panel error-panel">
                <div class="panel-header">
                    <div class="panel-title"><i class="fa-solid fa-triangle-exclamation"></i> Fehler</div>
                </div>
                <div class="panel-body">
                    <p>Die Tracking-Endpunkte konnten nicht geladen werden.</p>
                    <p class="error-text">${e.message}</p>
                </div>
            </div>
        `;
    }
```

durch:

```typescript
    } catch (e) {
        if (signal.aborted) return;
        body.innerHTML = `
            <div class="panel error-panel">
                <div class="panel-header">
                    <div class="panel-title"><i class="fa-solid fa-triangle-exclamation"></i> Fehler</div>
                </div>
                <div class="panel-body">
                    <p>Die Tracking-Endpunkte konnten nicht geladen werden.</p>
                    <p class="error-text">${(e as Error).message}</p>
                </div>
            </div>
        `;
    }
```

Ersetze:

```typescript
    const sourceGrids = sources.map((s: any) => `
```

durch (Annotation entfällt — `sources` ist bereits als `health.system?.sources || health.sources || []` typisiert, `s` wird daraus korrekt inferiert):

```typescript
    const sourceGrids = sources.map((s) => `
```

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Das ist die letzte Task dieses Plans — danach: `grep -rln ": any\b\|as any\b" src/ --include="*.ts" | grep -v ".test.ts"` sollte keine Treffer mehr liefern.

- [ ] **Step 5: Commit**

```bash
git add src/components/info/NahStatusModule.ts src/components/info/RegionsModule.ts src/components/info/TrackingEndpointsModule.ts
git commit -m "refactor(types): NahStatus-/Regions-/TrackingEndpointsModule — any-Escapes entfernen"
```

---

## Abschluss

Nach Task 20: `TODO.md`-Eintrag „any-Reduktion" (Verweis auf ROADMAP.md-Punkt „Codebase-Qualität: Type-Safety & Modularität") aktualisieren bzw. den ROADMAP.md-Punkt selbst abhaken/archivieren (erster von vier Teilpunkten). Danach — laut Nutzer-Entscheidung vom 2026-07-09 — Release-Vorschlag an natürlichen Punkten, nicht automatisch (siehe `AGENT_INSTRUCTIONS.md` §4 „Release-Trigger").
