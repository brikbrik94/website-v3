# Isochronen-Abfrage-Seite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Karten-Seite `/isochrones` (Alias `/isochronen`), auf der Nutzer per Kartenklick, Adresssuche oder roher Koordinaten-Eingabe einen Punkt setzen, ein ORS-Fahrprofil sowie Zeit- oder Distanz-Ringe wählen und die resultierenden Isochronen-Polygone auf der Karte sehen — mehrere Abfragen können gestapelt und einzeln ein-/ausgeblendet werden.

**Architecture:** Mirrored 1:1 an das bestehende `/routing`-Feature (`DataService` + `MapLayers` + `SidebarAdapter` + Sidebar-Rendering-Komponente + `PageController`). Kein neuer PHP-Endpoint — `api/ors.php?path=isochrones/{profile}` läuft über den bereits bestehenden generischen Proxy. Eine gemeinsame GeoJSON-Source/-Layer für alle gestapelten Abfragen, Sichtbarkeit/Farbe über Feature-`properties` statt separater Sources pro Abfrage.

**Tech Stack:** TypeScript, MapLibre GL JS, Vitest (node-Umgebung, kein DOM nötig — Tests mocken `document`/`fetch`/Map-Objekte direkt), oe5ith-ci Sidebar-Typ-4-Pattern (`.result-item`, `.result-action`, `.segmented`).

## Global Constraints

- `npx tsc --noEmit && npm test` müssen nach jedem Task grün sein (strict TS, `noUnusedLocals`/`noUnusedParameters`).
- Keine hartcodierten Farben/Radien/Z-Index — CI-Tokens über `MAP_COLORS`/`getCssVar()`-Pattern in `src/lib/MapStyles.ts`.
- Deutsche UI-Copy, deutsche Code-Kommentare (nur wo die Motivation nicht aus dem Code selbst hervorgeht).
- Bestehende CI-Klassen wiederverwenden (`.form-field`, `.form-select`, `.segmented`, `.result-item`, `.result-action`, `.tool-sep`, `.result-empty`) — keine neuen lokalen CSS-Klassen, keine neue CSS-Datei nötig.
- `BasePageController`-Lifecycle einhalten: alle Fetches über `this.signal`/`this.fetchJson()`, kein Leak über Seitenwechsel hinaus.
- Spec: [docs/superpowers/specs/2026-07-18-isochrones-page-design.md](../specs/2026-07-18-isochrones-page-design.md) — bei Widersprüchen zwischen Plan und Spec gilt die Spec, Abweichungen hier sind bewusste Konkretisierungen (z.B. ein einzelnes Punkt-Feld statt zwei getrennter Felder, siehe Task 7).

---

### Task 1: Typen ergänzen

**Files:**
- Modify: `src/types/common.ts`

**Interfaces:**
- Consumes: nichts (reiner Typ-Task)
- Produces: `IsochroneRangeType`, `IsochroneQuery` — von allen folgenden Tasks importiert aus `../../types/common` (bzw. `./types/common` je nach Verzeichnistiefe)

- [ ] **Step 1: Typen ergänzen**

Am Ende von `src/types/common.ts` (nach `StatsResponse`) einfügen. Der `Polygon`-Typ kommt aus demselben `geojson`-Paket, das oben schon für `Feature, LineString` importiert wird — Import-Zeile 1 erweitern:

```ts
// Zeile 1, vorher:
// import type { Feature, LineString } from 'geojson';
// nachher:
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson';
```

Am Dateiende ergänzen:

```ts
export type IsochroneRangeType = 'time' | 'distance';

export interface IsochroneQuery {
    id: number;
    /** [lat, lon] — konsistent mit RoutingDataService-Konvention. */
    point: [number, number];
    /** Reverse-geocodierte Adresse oder formatierte Koordinaten, für die Ergebnis-Liste. */
    label: string;
    profile: string;
    rangeType: IsochroneRangeType;
    /** Nutzereingabe in Minuten (time) bzw. km (distance), aufsteigend sortiert. */
    ranges: number[];
    geojson: FeatureCollection<Polygon>;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine neuen Fehler (der `Polygon`-Import ist zunächst ungenutzt an anderer Stelle nicht relevant, da er sofort in `IsochroneQuery` verwendet wird).

- [ ] **Step 3: Commit**

```bash
git add src/types/common.ts
git commit -m "feat(isochrones): Typen für Isochronen-Abfragen ergänzen"
```

---

### Task 2: `parseRangeList()` — Ring-Werte-Parser (TDD)

**Files:**
- Create: `src/features/isochrones/parseRangeList.ts`
- Test: `src/features/isochrones/parseRangeList.test.ts`

**Interfaces:**
- Consumes: `parseDecimalInput` aus `../coords/parseDecimalInput` (bestehender Helper, unverändert)
- Produces: `parseRangeList(value: string): number[] | null` — aufsteigend sortierte, deduplizierte, positive Zahlen; `null` bei leerem/ungültigem Input. Wird von `IsochronesSidebar.ts` (Task 7) beim Formular-Submit aufgerufen.

- [ ] **Step 1: Failing Test schreiben**

```ts
import { describe, it, expect } from 'vitest';
import { parseRangeList } from './parseRangeList';

describe('parseRangeList', () => {
  it('parses a single value', () => {
    expect(parseRangeList('5')).toEqual([5]);
  });

  it('parses multiple space-separated values', () => {
    expect(parseRangeList('5 10 15')).toEqual([5, 10, 15]);
  });

  it('sorts values ascending regardless of input order', () => {
    expect(parseRangeList('15 5 10')).toEqual([5, 10, 15]);
  });

  it('accepts a comma as decimal separator without treating it as a list separator', () => {
    expect(parseRangeList('1,5 3 5,5')).toEqual([1.5, 3, 5.5]);
  });

  it('accepts a dot as decimal separator', () => {
    expect(parseRangeList('1.5 3')).toEqual([1.5, 3]);
  });

  it('collapses extra whitespace between values', () => {
    expect(parseRangeList('  5    10  ')).toEqual([5, 10]);
  });

  it('deduplicates identical values', () => {
    expect(parseRangeList('5 5 10')).toEqual([5, 10]);
  });

  it('returns null for an empty string', () => {
    expect(parseRangeList('')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(parseRangeList('   ')).toBeNull();
  });

  it('returns null when any token is not a number', () => {
    expect(parseRangeList('5 abc 10')).toBeNull();
  });

  it('returns null when any value is zero', () => {
    expect(parseRangeList('0 5')).toBeNull();
  });

  it('returns null when any value is negative', () => {
    expect(parseRangeList('-5 5')).toBeNull();
  });
});
```

- [ ] **Step 2: Test-Lauf, muss fehlschlagen**

Run: `npx vitest run src/features/isochrones/parseRangeList.test.ts`
Expected: FAIL — `Cannot find module './parseRangeList'`

- [ ] **Step 3: Implementierung**

```ts
import { parseDecimalInput } from '../coords/parseDecimalInput';

/**
 * Parst eine leerzeichen-getrennte Liste von Ring-Werten (z.B. "5 10 15" oder "1,5 3 5,5") in
 * aufsteigend sortierte, deduplizierte, positive Zahlen. Leerzeichen statt Komma als
 * Listentrennzeichen, damit das Komma für Dezimalwerte frei bleibt (siehe parseDecimalInput,
 * das denselben Komma-als-Dezimaltrennzeichen-Bug behebt wie in Wgs84Block.ts/UtmBlock.ts/
 * BmnBlock.ts).
 */
export function parseRangeList(value: string): number[] | null {
  const tokens = value.trim().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return null;

  const numbers = tokens.map(parseDecimalInput);
  if (numbers.some((n) => isNaN(n) || n <= 0)) return null;

  return [...new Set(numbers)].sort((a, b) => a - b);
}
```

- [ ] **Step 4: Test-Lauf, muss bestehen**

Run: `npx vitest run src/features/isochrones/parseRangeList.test.ts`
Expected: PASS (12 Tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/features/isochrones/parseRangeList.ts src/features/isochrones/parseRangeList.test.ts
git commit -m "feat(isochrones): Parser für leerzeichengetrennte Ring-Werte-Liste"
```

---

### Task 3: `getIsochroneRingColor()` — Farbverlauf (TDD)

**Files:**
- Modify: `src/lib/MapStyles.ts`
- Test: `src/lib/MapStyles.test.ts` (neu)

**Interfaces:**
- Consumes: `getCssVar()` (bereits in `MapStyles.ts` vorhanden, modul-lokal)
- Produces: `getIsochroneRingColor(index: number, total: number): string` (Format `rgb(r, g, b)`) — von `IsochronesMapLayers.ts` (Task 6) und `IsochronesSidebarAdapter.ts` (Task 8) verwendet.

- [ ] **Step 1: Failing Test schreiben**

`getCssVar()` liefert im Vitest-node-Environment immer den Fallback-Wert zurück (kein `document` vorhanden — siehe `typeof document === 'undefined'`-Zweig), das macht die Tests deterministisch ohne Mocking.

```ts
import { describe, it, expect } from 'vitest';
import { getIsochroneRingColor } from './MapStyles';

function parseRgb(color: string): [number, number, number] {
  const match = color.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  if (!match) throw new Error(`Not an rgb() string: ${color}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

describe('getIsochroneRingColor', () => {
  it('returns the full accent color fallback for the only ring when total is 1', () => {
    expect(getIsochroneRingColor(0, 1)).toBe('rgb(59, 130, 246)');
  });

  it('returns the full accent color for index 0 regardless of total', () => {
    expect(getIsochroneRingColor(0, 4)).toBe('rgb(59, 130, 246)');
  });

  it('lightens monotonically as the index increases', () => {
    const [r0, g0, b0] = parseRgb(getIsochroneRingColor(0, 4));
    const [r1, g1, b1] = parseRgb(getIsochroneRingColor(1, 4));
    const [r2, g2, b2] = parseRgb(getIsochroneRingColor(2, 4));
    const [r3, g3, b3] = parseRgb(getIsochroneRingColor(3, 4));

    expect(r0).toBeLessThanOrEqual(r1);
    expect(r1).toBeLessThanOrEqual(r2);
    expect(r2).toBeLessThanOrEqual(r3);
    expect(g0).toBeLessThanOrEqual(g1);
    expect(g1).toBeLessThanOrEqual(g2);
    expect(g2).toBeLessThanOrEqual(g3);
    expect(b0).toBeLessThanOrEqual(b1);
    expect(b1).toBeLessThanOrEqual(b2);
    expect(b2).toBeLessThanOrEqual(b3);
  });

  it('never reaches pure white even for the last ring, so it stays visible on a light basemap', () => {
    const [r, g, b] = parseRgb(getIsochroneRingColor(9, 10));
    expect(r < 255 || g < 255 || b < 255).toBe(true);
  });

  it('produces the same color sequence for two queries with the same ring count', () => {
    expect(getIsochroneRingColor(1, 3)).toBe(getIsochroneRingColor(1, 3));
  });
});
```

- [ ] **Step 2: Test-Lauf, muss fehlschlagen**

Run: `npx vitest run src/lib/MapStyles.test.ts`
Expected: FAIL — `getIsochroneRingColor is not exported`

- [ ] **Step 3: Implementierung**

In `src/lib/MapStyles.ts` ergänzen (nach dem bestehenden `MAP_COLORS`-Objekt):

```ts
const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = parseInt(expanded, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const mixRgb = (from: [number, number, number], to: [number, number, number], t: number): string => {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Farbe für einen Isochronen-Ring nach seiner Position in der aufsteigend sortierten
 * Ring-Reihenfolge: index 0 (kürzeste Zeit/Distanz, innerster Ring) ist die volle Akzentfarbe,
 * höhere Indizes werden zunehmend Richtung Weiß aufgehellt (max. 75% Mischung, damit der
 * äußerste Ring auf hellem Kartenhintergrund nicht unsichtbar wird). Bei total <= 1 immer die
 * volle Akzentfarbe.
 */
export function getIsochroneRingColor(index: number, total: number): string {
  const accent = hexToRgb(getCssVar('--accent', '#3b82f6'));
  const white = hexToRgb(getCssVar('--white', '#ffffff'));
  const t = total <= 1 ? 0 : (index / (total - 1)) * 0.75;
  return mixRgb(accent, white, t);
}
```

- [ ] **Step 4: Test-Lauf, muss bestehen**

Run: `npx vitest run src/lib/MapStyles.test.ts`
Expected: PASS (5 Tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/lib/MapStyles.ts src/lib/MapStyles.test.ts
git commit -m "feat(isochrones): Farbverlauf-Helper für Isochronen-Ringe"
```

---

### Task 4: `IsochronesDataService` (TDD)

**Files:**
- Create: `src/features/isochrones/IsochronesDataService.ts`
- Test: `src/features/isochrones/IsochronesDataService.test.ts`

**Interfaces:**
- Consumes: `IsochroneQuery` aus `../../types/common` (Task 1)
- Produces: `IsochronesDataService` Klasse mit `addQuery`, `removeQuery`, `clearAll`, `getQueries`, `getQuery`, `getEyeActiveStates`, `isEyeActive`, `setEyeActiveState` — konsumiert von `IsochronesMapLayers.ts` (Task 6) und `IsochronesSidebarAdapter.ts` (Task 8).

- [ ] **Step 1: Failing Test schreiben**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IsochronesDataService } from './IsochronesDataService';
import { IsochroneQuery } from '../../types/common';

function makeQueryInput(overrides: Partial<Omit<IsochroneQuery, 'id'>> = {}): Omit<IsochroneQuery, 'id'> {
  return {
    point: [48.3, 14.28],
    label: '48.3000, 14.2800',
    profile: 'driving-car',
    rangeType: 'time',
    ranges: [5, 10, 15],
    geojson: { type: 'FeatureCollection', features: [] },
    ...overrides
  };
}

describe('IsochronesDataService', () => {
  let service: IsochronesDataService;

  beforeEach(() => {
    service = new IsochronesDataService();
  });

  it('assigns incrementing ids starting at 1', () => {
    const first = service.addQuery(makeQueryInput());
    const second = service.addQuery(makeQueryInput());
    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });

  it('stores the query retrievable by id', () => {
    const added = service.addQuery(makeQueryInput({ label: 'Linz' }));
    expect(service.getQuery(added.id)?.label).toBe('Linz');
  });

  it('marks a newly added query as eye-active by default', () => {
    const added = service.addQuery(makeQueryInput());
    expect(service.isEyeActive(added.id)).toBe(true);
  });

  it('removes a query from both the query map and eye-active states', () => {
    const added = service.addQuery(makeQueryInput());
    service.removeQuery(added.id);
    expect(service.getQuery(added.id)).toBeUndefined();
    expect(service.isEyeActive(added.id)).toBe(false);
  });

  it('toggles eye-active state independently of query removal', () => {
    const added = service.addQuery(makeQueryInput());
    service.setEyeActiveState(added.id, false);
    expect(service.isEyeActive(added.id)).toBe(false);
    expect(service.getQuery(added.id)).toBeDefined();
  });

  it('clears all queries and eye-active states', () => {
    service.addQuery(makeQueryInput());
    service.addQuery(makeQueryInput());
    service.clearAll();
    expect(service.getQueries().size).toBe(0);
    expect(service.getEyeActiveStates().size).toBe(0);
  });
});
```

- [ ] **Step 2: Test-Lauf, muss fehlschlagen**

Run: `npx vitest run src/features/isochrones/IsochronesDataService.test.ts`
Expected: FAIL — `Cannot find module './IsochronesDataService'`

- [ ] **Step 3: Implementierung**

```ts
import { IsochroneQuery } from '../../types/common';

/**
 * State-Container für gestapelte Isochronen-Abfragen. Struktur analog zu
 * RoutingDataService.stationRoutes/eyeActiveStates — eine Query pro Berechnung, per Augen-Icon
 * einzeln ein-/ausblendbar.
 */
export class IsochronesDataService {
  private queries = new Map<number, IsochroneQuery>();
  private eyeActiveStates = new Set<number>();
  private nextId = 1;

  public addQuery(query: Omit<IsochroneQuery, 'id'>): IsochroneQuery {
    const id = this.nextId++;
    const full: IsochroneQuery = { ...query, id };
    this.queries.set(id, full);
    // Neu berechnete Abfrage ist sofort sichtbar — der Nutzer hat gerade aktiv danach gefragt,
    // ein zusätzlicher Klick aufs Auge wäre unnötige Reibung.
    this.eyeActiveStates.add(id);
    return full;
  }

  public removeQuery(id: number): void {
    this.queries.delete(id);
    this.eyeActiveStates.delete(id);
  }

  public clearAll(): void {
    this.queries.clear();
    this.eyeActiveStates.clear();
  }

  public getQueries(): Map<number, IsochroneQuery> {
    return this.queries;
  }

  public getQuery(id: number): IsochroneQuery | undefined {
    return this.queries.get(id);
  }

  public getEyeActiveStates(): Set<number> {
    return this.eyeActiveStates;
  }

  public isEyeActive(id: number): boolean {
    return this.eyeActiveStates.has(id);
  }

  public setEyeActiveState(id: number, active: boolean): void {
    if (active) this.eyeActiveStates.add(id);
    else this.eyeActiveStates.delete(id);
  }
}
```

- [ ] **Step 4: Test-Lauf, muss bestehen**

Run: `npx vitest run src/features/isochrones/IsochronesDataService.test.ts`
Expected: PASS (6 Tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/features/isochrones/IsochronesDataService.ts src/features/isochrones/IsochronesDataService.test.ts
git commit -m "feat(isochrones): DataService für gestapelte Isochronen-Abfragen"
```

---

### Task 5: `IsochronesService` (TDD, ORS-Proxy-Aufruf)

**Files:**
- Create: `src/lib/IsochronesService.ts`
- Test: `src/lib/IsochronesService.test.ts`

**Interfaces:**
- Consumes: `RoutingService.checkHealth`/`RoutingService.getProfiles` aus `./RoutingService` (bestehend, unverändert), `IsochroneRangeType` aus `../types/common` (Task 1)
- Produces: `IsochronesService.calculateIsochrones(point, profile, ranges, rangeType): Promise<FeatureCollection<Polygon> | null>`, `IsochronesService.checkHealth`, `IsochronesService.getProfiles` — konsumiert von `IsochronesSidebarAdapter.ts` (Task 8) und `IsochronesSidebar.ts` (Task 7, für Profil-Liste/Health-Status beim Formular-Aufbau).

- [ ] **Step 1: Failing Test schreiben**

Mocking-Pattern identisch zu `src/lib/RoutingService.test.ts` (`vi.stubGlobal('fetch', ...)`).

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { IsochronesService } from './IsochronesService';

describe('IsochronesService.calculateIsochrones', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts locations as [lon, lat] and converts minutes to seconds for range_type=time', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
      });
    }));

    await IsochronesService.calculateIsochrones([48.3, 14.28], 'driving-car', [5, 10], 'time');

    expect(capturedUrl).toBe('/api/ors.php?path=isochrones/driving-car');
    expect(capturedBody.locations).toEqual([[14.28, 48.3]]);
    expect(capturedBody.range).toEqual([300, 600]);
    expect(capturedBody.range_type).toBe('time');
  });

  it('converts km to meters for range_type=distance', async () => {
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
      });
    }));

    await IsochronesService.calculateIsochrones([48.3, 14.28], 'driving-car', [2.5, 5], 'distance');

    expect(capturedBody.range).toEqual([2500, 5000]);
    expect(capturedBody.range_type).toBe('distance');
  });

  it('returns null when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500 })));

    const result = await IsochronesService.calculateIsochrones([48.3, 14.28], 'driving-car', [5], 'time');

    expect(result).toBeNull();
  });

  it('returns null on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));

    const result = await IsochronesService.calculateIsochrones([48.3, 14.28], 'driving-car', [5], 'time');

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Test-Lauf, muss fehlschlagen**

Run: `npx vitest run src/lib/IsochronesService.test.ts`
Expected: FAIL — `Cannot find module './IsochronesService'`

- [ ] **Step 3: Implementierung**

```ts
import type { FeatureCollection, Polygon } from 'geojson';
import { IsochroneRangeType } from '../types/common';
import { RoutingService } from './RoutingService';

const ORS_BASE_URL = '/api/ors.php';

/**
 * Abstraktionsschicht über den `/api/ors.php`-Proxy für ORS-Isochronen-Abfragen. Health-Check
 * und Profil-Liste sind generische ORS-Abfragen, die schon in RoutingService existieren — hier
 * direkt wiederverwendet statt dupliziert.
 */
export const IsochronesService = {
  checkHealth: RoutingService.checkHealth,
  getProfiles: RoutingService.getProfiles,

  async calculateIsochrones(
    point: [number, number],
    profile: string,
    ranges: number[],
    rangeType: IsochroneRangeType
  ): Promise<FeatureCollection<Polygon> | null> {
    const url = `${ORS_BASE_URL}?path=isochrones/${profile}`;
    const rangeValues = rangeType === 'time' ? ranges.map((r) => r * 60) : ranges.map((r) => r * 1000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [[point[1], point[0]]],
          range: rangeValues,
          range_type: rangeType
        })
      });

      if (!res.ok) throw new Error('Isochronen-Berechnung fehlgeschlagen');
      const data = await res.json();
      return data as FeatureCollection<Polygon>;
    } catch (e) {
      console.error('Isochronen Fehler:', e);
      return null;
    }
  }
};
```

- [ ] **Step 4: Test-Lauf, muss bestehen**

Run: `npx vitest run src/lib/IsochronesService.test.ts`
Expected: PASS (4 Tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/lib/IsochronesService.ts src/lib/IsochronesService.test.ts
git commit -m "feat(isochrones): ORS-Isochronen-Proxy-Anbindung"
```

---

### Task 6: `IsochronesMapLayers` (TDD)

**Files:**
- Create: `src/features/isochrones/IsochronesMapLayers.ts`
- Test: `src/features/isochrones/IsochronesMapLayers.test.ts`

**Interfaces:**
- Consumes: `IsochronesDataService` (Task 4), `getIsochroneRingColor`, `MAP_COLORS` aus `../../lib/MapStyles` (Task 3), `MapCore`, `MapRegistry` (bestehend, unverändert)
- Produces: `IsochronesMapLayers.registerResources()`, `.ensureBaseLayers(map)`, `.updateRingsLayer(map, dataService)`, `.updatePointsLayer(map, dataService)` — konsumiert von `IsochronesSidebarAdapter.ts` (Task 8) und `IsochronesPage.ts` (Task 9).

- [ ] **Step 1: Failing Test schreiben**

Mocking-Pattern identisch zu `src/features/nah/NahMapLayers.test.ts` (`mockMapWithSource()`).

```ts
import { describe, it, expect } from 'vitest';
import { IsochronesMapLayers } from './IsochronesMapLayers';
import { IsochronesDataService } from './IsochronesDataService';
import { MapRegistry } from '../../lib/MapRegistry';
import { getIsochroneRingColor } from '../../lib/MapStyles';
import { IsochroneQuery } from '../../types/common';
import type { Feature, Polygon } from 'geojson';

function ring(value: number): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: { value },
    geometry: { type: 'Polygon', coordinates: [[[14.0, 48.0], [14.1, 48.0], [14.1, 48.1], [14.0, 48.0]]] }
  };
}

function mockMapWithSource() {
  const calls: { sourceId: string; data: unknown }[] = [];
  const map = {
    getSource: (id: string) => ({ setData: (data: unknown) => calls.push({ sourceId: id, data }) }),
  } as any;
  return { map, calls };
}

function makeQuery(overrides: Partial<Omit<IsochroneQuery, 'id'>> = {}): Omit<IsochroneQuery, 'id'> {
  return {
    point: [48.3, 14.28],
    label: '48.3000, 14.2800',
    profile: 'driving-car',
    rangeType: 'time',
    ranges: [5, 10, 15],
    geojson: { type: 'FeatureCollection', features: [ring(300), ring(600), ring(900)] },
    ...overrides
  };
}

describe('IsochronesMapLayers.updateRingsLayer', () => {
  it('writes rings sorted descending by value, so the smallest ring is drawn last (on top)', () => {
    const { map, calls } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQuery());

    IsochronesMapLayers.updateRingsLayer(map, dataService);

    const data = calls.find((c) => c.sourceId === 'isochrones-rings')!.data as any;
    expect(data.features).toHaveLength(3);
    expect(data.features[0].properties.color).toBe(getIsochroneRingColor(2, 3));
    expect(data.features[1].properties.color).toBe(getIsochroneRingColor(1, 3));
    expect(data.features[2].properties.color).toBe(getIsochroneRingColor(0, 3));
  });

  it('excludes rings of queries whose eye-active state is off', () => {
    const { map, calls } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    const added = dataService.addQuery(makeQuery());
    dataService.setEyeActiveState(added.id, false);

    IsochronesMapLayers.updateRingsLayer(map, dataService);

    const data = calls.find((c) => c.sourceId === 'isochrones-rings')!.data as any;
    expect(data.features).toHaveLength(0);
  });

  it('tags every ring feature with its query id', () => {
    const { map, calls } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    const added = dataService.addQuery(makeQuery());

    IsochronesMapLayers.updateRingsLayer(map, dataService);

    const data = calls.find((c) => c.sourceId === 'isochrones-rings')!.data as any;
    expect(data.features.every((f: any) => f.properties.queryId === added.id)).toBe(true);
  });

  it('re-registers the current data in MapRegistry for restore-after-basemap-switch', () => {
    const { map } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQuery());

    IsochronesMapLayers.updateRingsLayer(map, dataService);

    const registered = MapRegistry.getSource('isochrones-rings');
    const definition = registered?.definition as { data: GeoJSON.FeatureCollection } | undefined;
    expect(definition?.data.features).toHaveLength(3);
  });
});

describe('IsochronesMapLayers.updatePointsLayer', () => {
  it('writes one point feature per eye-active query', () => {
    const { map, calls } = mockMapWithSource();
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQuery({ point: [48.3, 14.28] }));

    IsochronesMapLayers.updatePointsLayer(map, dataService);

    const data = calls.find((c) => c.sourceId === 'isochrones-points')!.data as any;
    expect(data.features).toHaveLength(1);
    expect(data.features[0].geometry.coordinates).toEqual([14.28, 48.3]);
  });
});
```

- [ ] **Step 2: Test-Lauf, muss fehlschlagen**

Run: `npx vitest run src/features/isochrones/IsochronesMapLayers.test.ts`
Expected: FAIL — `Cannot find module './IsochronesMapLayers'`

- [ ] **Step 3: Implementierung**

```ts
import maplibregl, { GeoJSONSource, LayerSpecification } from 'maplibre-gl';
import { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import { MapCore, MARKERS_SPRITE_BASE } from '../../lib/MapCore';
import { MapRegistry } from '../../lib/MapRegistry';
import { IsochronesDataService } from './IsochronesDataService';
import { getIsochroneRingColor, MAP_COLORS } from '../../lib/MapStyles';

const RINGS_SOURCE_ID = 'isochrones-rings';
const RINGS_LAYER_ID = 'isochrones-rings-layer';
const POINTS_SOURCE_ID = 'isochrones-points';
const POINTS_LAYER_ID = 'isochrones-points-layer';
const RINGS_FILL_OPACITY = 0.35;

export class IsochronesMapLayers {
  public static registerResources(): void {
    MapRegistry.registerImage('oe5ith-markers', MARKERS_SPRITE_BASE);
  }

  public static ensureBaseLayers(map: maplibregl.Map): void {
    const ringsLayerDef: LayerSpecification = {
      id: RINGS_LAYER_ID,
      type: 'fill',
      source: RINGS_SOURCE_ID,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': RINGS_FILL_OPACITY,
        'fill-outline-color': ['get', 'color']
      }
    };
    MapCore.ensureGeoJsonLayer(map, RINGS_SOURCE_ID, ringsLayerDef);

    const pointsLayerDef = MapCore.createPinLayer(POINTS_LAYER_ID, POINTS_SOURCE_ID, {
      icon: 'ci-pin',
      size: 0.5,
      anchor: 'bottom',
      color: MAP_COLORS.accent,
      haloColor: MAP_COLORS.white,
      haloWidth: 2
    });
    MapCore.ensureGeoJsonLayer(map, POINTS_SOURCE_ID, pointsLayerDef);
  }

  /**
   * Baut die FeatureCollection aller sichtbaren (eye-aktiven) Ringe neu auf. ORS liefert Ringe
   * kumulativ (größerer Ring enthält kleineren vollständig) — Features werden je Query
   * absteigend nach `properties.value` einsortiert (größter zuerst), damit kleinere Ringe beim
   * Zeichnen nicht vom größeren überdeckt werden. Farb-Index (0 = kürzeste Zeit/Distanz) ergibt
   * sich aus dem aufsteigenden Rang innerhalb der Query — setzt voraus, dass ORS genau ein
   * Feature pro angefragtem Range-Wert liefert (Standardverhalten bei einer einzelnen location).
   */
  public static updateRingsLayer(map: maplibregl.Map, dataService: IsochronesDataService): void {
    if (!map.getSource(RINGS_SOURCE_ID)) {
      this.ensureBaseLayers(map);
    }

    const features: Feature<Polygon>[] = [];
    dataService.getQueries().forEach((query, id) => {
      if (!dataService.isEyeActive(id)) return;

      const sortedAsc = [...query.geojson.features].sort(
        (a, b) => ((a.properties?.value as number) ?? 0) - ((b.properties?.value as number) ?? 0)
      );
      const total = sortedAsc.length;

      for (let index = total - 1; index >= 0; index--) {
        const feature = sortedAsc[index];
        features.push({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            queryId: id,
            color: getIsochroneRingColor(index, total)
          }
        });
      }
    });

    const data: FeatureCollection<Polygon> = { type: 'FeatureCollection', features };
    const source = map.getSource(RINGS_SOURCE_ID) as GeoJSONSource;
    if (source) source.setData(data);
    MapRegistry.registerSource(RINGS_SOURCE_ID, { type: 'geojson', data });
  }

  public static updatePointsLayer(map: maplibregl.Map, dataService: IsochronesDataService): void {
    if (!map.getSource(POINTS_SOURCE_ID)) {
      this.ensureBaseLayers(map);
    }

    const features: Feature<Point>[] = [];
    dataService.getQueries().forEach((query, id) => {
      if (!dataService.isEyeActive(id)) return;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [query.point[1], query.point[0]] },
        properties: { queryId: id }
      });
    });

    const data: FeatureCollection<Point> = { type: 'FeatureCollection', features };
    const source = map.getSource(POINTS_SOURCE_ID) as GeoJSONSource;
    if (source) source.setData(data);
    MapRegistry.registerSource(POINTS_SOURCE_ID, { type: 'geojson', data });
  }
}
```

- [ ] **Step 4: Test-Lauf, muss bestehen**

Run: `npx vitest run src/features/isochrones/IsochronesMapLayers.test.ts`
Expected: PASS (5 Tests)

- [ ] **Step 5: Typecheck über das gesamte Projekt**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/features/isochrones/IsochronesMapLayers.ts src/features/isochrones/IsochronesMapLayers.test.ts
git commit -m "feat(isochrones): MapLayers für gestapelte Isochronen-Ringe"
```

---

### Task 7: `IsochronesSidebar` — Formular + Ergebnis-Liste (Rendering-Komponente)

**Files:**
- Create: `src/components/IsochronesSidebar.ts`
- Test: `src/components/IsochronesSidebar.test.ts`
- Modify: `src/components/RoutingSidebar.ts:28` (nur die Sichtbarkeit von `parseCoords` — bereits `export`, keine Code-Änderung nötig, siehe Hinweis in Step 3)

**Interfaces:**
- Consumes: `parseCoords` aus `../components/RoutingSidebar` (bestehend, bereits exportiert — Wiederverwendung statt Duplikation eines zweiten "lat, lon"-Parsers), `GeocoderService`, `GeocoderSearchField`, `getSidebarFooterHtml`/`setupSidebarToggle` aus `../lib/SidebarUtils`, `IsochronesService` (Task 5), `parseRangeList` (Task 2), `IsochroneQuery`/`IsochroneRangeType` aus `../types/common` (Task 1)
- Produces: `IsochronesFormParams` Interface, `initIsochronesSidebar(container, callbacks, signal)`, `renderIsochronesResults(queries, eyeActiveIds, onToggle, onSelect, onDelete)`, `setIsochronesPoint(lat, lon)` — konsumiert von `IsochronesSidebarAdapter.ts` (Task 8).

**Konkretisierung gegenüber der Spec:** Die Spec nennt „Geocoder-Suchfeld" und „manuelles Koordinaten-Feld" als zwei Punkte in der Formular-Reihenfolge. Bei genauerer Betrachtung des bestehenden `/routing`-Formulars (`RoutingSidebar.ts:60-237`) ist das dort bereits **ein einziges** Feld: Freitext-Eingabe, die entweder eine Geocoder-Suche auslöst (`GeocoderSearchField`) oder — wenn sie wie "48.3, 14.28" aussieht — direkt als Koordinate geparst wird (`suppressWhen: (query) => parseCoords(query) !== null`, `getCoordsFromInput()` prüft zuerst `dataset.lat/lon`, sonst `parseCoords(input.value)`). Diese Isochronen-Seite übernimmt exakt dasselbe Ein-Feld-Muster (`input-point`) statt zwei separater Felder — deckt Geocoder-Suche und rohe Koordinaten-Eingabe ab, Kartenklick befüllt dasselbe Feld von außen über `setIsochronesPoint()` (analog `setRoutingCoord()`). Kein UX-Verlust gegenüber der Spec, nur DRY-er (kein zweiter Koordinaten-Parser) und konsistent mit dem einzigen bestehenden Präzedenzfall im Repo.

- [ ] **Step 1: Failing Test schreiben**

Mocking-Pattern identisch zu `src/components/RoutingSidebar.test.ts` (`vi.stubGlobal('document', ...)`).

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderIsochronesResults } from './IsochronesSidebar';
import { IsochroneQuery } from '../types/common';

function createFakeElement() {
  const classes = new Set<string>();
  return {
    innerHTML: '',
    textContent: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
    querySelectorAll: () => [] as any[],
  };
}

function makeQuery(overrides: Partial<IsochroneQuery> = {}): IsochroneQuery {
  return {
    id: 1,
    point: [48.3, 14.28],
    label: 'Linz, Hauptplatz',
    profile: 'driving-car',
    rangeType: 'time',
    ranges: [5, 10, 15],
    geojson: { type: 'FeatureCollection', features: [] },
    ...overrides
  };
}

describe('renderIsochronesResults', () => {
  let results: ReturnType<typeof createFakeElement>;
  let count: ReturnType<typeof createFakeElement>;

  beforeEach(() => {
    results = createFakeElement();
    count = createFakeElement();
    vi.stubGlobal('document', {
      getElementById: (id: string) => {
        if (id === 'isochrones-results') return results;
        if (id === 'iso-result-count') return count;
        return null;
      },
    });
  });

  it('shows the empty state and a zero count when there are no queries', () => {
    renderIsochronesResults([], new Set(), vi.fn(), vi.fn(), vi.fn());
    expect(results.innerHTML).toContain('result-empty');
    expect(count.textContent).toBe('0 Abfragen');
  });

  it('renders one result-item per query with its label and profile', () => {
    const query = makeQuery();
    renderIsochronesResults([query], new Set([1]), vi.fn(), vi.fn(), vi.fn());
    expect(results.innerHTML).toContain('Linz, Hauptplatz');
    expect(results.innerHTML).toContain('driving-car');
    expect(count.textContent).toBe('1 Abfrage');
  });

  it('marks the eye button active only for eye-active queries', () => {
    const query = makeQuery({ id: 2 });
    renderIsochronesResults([query], new Set(), vi.fn(), vi.fn(), vi.fn());
    expect(results.innerHTML).not.toMatch(/toggle-iso-btn active/);
  });

  it('uses plural wording for more than one query', () => {
    renderIsochronesResults([makeQuery({ id: 1 }), makeQuery({ id: 2 })], new Set([1, 2]), vi.fn(), vi.fn(), vi.fn());
    expect(count.textContent).toBe('2 Abfragen');
  });
});
```

- [ ] **Step 2: Test-Lauf, muss fehlschlagen**

Run: `npx vitest run src/components/IsochronesSidebar.test.ts`
Expected: FAIL — `Cannot find module './IsochronesSidebar'`

- [ ] **Step 3: Implementierung**

```ts
import { IsochronesService } from '../lib/IsochronesService';
import { GeocoderService } from '../lib/GeocoderService';
import { GeocoderSearchField } from '../lib/GeocoderSearchField';
import { parseCoords } from './RoutingSidebar';
import { parseRangeList } from '../features/isochrones/parseRangeList';
import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';
import { IsochroneQuery, IsochroneRangeType } from '../types/common';

export interface IsochronesFormParams {
  point: [number, number];
  profile: string;
  rangeType: IsochroneRangeType;
  ranges: number[];
}

export interface IsochronesSidebarCallbacks {
  onCalculate: (params: IsochronesFormParams) => void;
  onClearAll: () => void;
}

const getPointFromInput = (input: HTMLInputElement): [number, number] | null => {
  if (input.dataset.lat && input.dataset.lon) {
    return [parseFloat(input.dataset.lat), parseFloat(input.dataset.lon)];
  }
  return parseCoords(input.value);
};

const updateSubmitState = (): void => {
  const input = document.getElementById('input-point') as HTMLInputElement | null;
  const btn = document.getElementById('btn-calculate-isochrone') as HTMLButtonElement | null;
  if (!input || !btn) return;
  const hasPoint = getPointFromInput(input) !== null;
  btn.disabled = btn.dataset.online !== '1' || !hasPoint;
};

/**
 * Setzt den Punkt von außen (Kartenklick) — analog `setRoutingCoord()` in RoutingSidebar.ts.
 * Reverse-geocodiert, damit die Ergebnis-Liste später eine lesbare Adresse statt roher
 * Koordinaten zeigt, mit Koordinaten-Fallback falls kein Treffer.
 */
export const setIsochronesPoint = async (lat: number, lon: number): Promise<void> => {
  const input = document.getElementById('input-point') as HTMLInputElement | null;
  if (!input) return;

  const address = await GeocoderService.reverse(lat, lon);
  if (address && address.display_name) {
    input.value = address.display_name;
    input.dataset.lat = lat.toString();
    input.dataset.lon = lon.toString();
  } else {
    input.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    delete input.dataset.lat;
    delete input.dataset.lon;
  }
  document.getElementById('results-point')?.classList.add('hidden');
  updateSubmitState();
};

export const initIsochronesSidebar = async (
  container: HTMLElement,
  callbacks: IsochronesSidebarCallbacks,
  signal: AbortSignal
): Promise<void> => {
  const isOnline = await IsochronesService.checkHealth();
  const profiles = isOnline ? await IsochronesService.getProfiles() : [];

  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Isochronen</div>

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
          <label class="form-label" for="iso-profile">Profil</label>
          <select class="form-select" id="iso-profile" ${!isOnline ? 'disabled' : ''}>
            ${profiles.length > 0
              ? profiles.map((p) => `<option value="${p}">${p}</option>`).join('')
              : '<option>Dienst offline</option>'
            }
          </select>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Ring-Typ</span>
          <div class="segmented" id="iso-range-type">
            <button class="segmented-btn active" data-range-type="time">Zeit</button>
            <button class="segmented-btn" data-range-type="distance">Distanz</button>
          </div>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <label class="form-label" for="iso-ranges" id="iso-ranges-label">Werte (Minuten, leerzeichengetrennt)</label>
          <input type="text" class="form-input" id="iso-ranges" placeholder="5 10 15" value="5 10 15" autocomplete="off">
        </div>

        <div class="tool-sep"></div>

        <div class="form-field pos-relative" style="margin-bottom:7px" id="field-point">
          <label class="form-label" for="input-point">Punkt</label>
          <div class="form-input-wrap">
            <i class="fa-solid fa-location-crosshairs form-input-icon"></i>
            <input type="text" class="form-input" id="input-point" placeholder="Adresse oder Lat, Lon" ${!isOnline ? 'disabled' : ''} autocomplete="off">
          </div>
          <div id="results-point" class="geocoder-results hidden"></div>
        </div>

        <button class="form-submit" style="margin-bottom:10px" id="btn-calculate-isochrone" data-online="${isOnline ? '1' : '0'}" disabled>
          <i class="fa-solid fa-bullseye"></i> Berechnen
        </button>

        <div class="tool-sep"></div>

        <div class="result-header">
          <span class="result-count" id="iso-result-count">0 Abfragen</span>
          <button class="btn btn-sm btn-ghost" id="btn-clear-all" title="Alle löschen"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div id="isochrones-results"></div>
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

  const rangeTypeGroup = document.getElementById('iso-range-type')!;
  const rangesInput = document.getElementById('iso-ranges') as HTMLInputElement;
  const rangesLabel = document.getElementById('iso-ranges-label')!;
  const inputPoint = document.getElementById('input-point') as HTMLInputElement;
  const resultsPoint = document.getElementById('results-point')!;
  const btnCalculate = document.getElementById('btn-calculate-isochrone') as HTMLButtonElement;
  const btnClearAll = document.getElementById('btn-clear-all')!;

  rangeTypeGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn) return;
    rangeTypeGroup.querySelectorAll('.segmented-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const isTime = btn.getAttribute('data-range-type') === 'time';
    rangesLabel.textContent = isTime ? 'Werte (Minuten, leerzeichengetrennt)' : 'Werte (km, leerzeichengetrennt)';
    rangesInput.placeholder = isTime ? '5 10 15' : '1 3 5';
  }, { signal });

  inputPoint.addEventListener('input', () => {
    delete inputPoint.dataset.lat;
    delete inputPoint.dataset.lon;
    updateSubmitState();
  }, { signal });

  new GeocoderSearchField(inputPoint, resultsPoint, {
    signal,
    suppressWhen: (query) => parseCoords(query) !== null,
    onSelect: (selection) => {
      inputPoint.dataset.lat = String(selection.lat);
      inputPoint.dataset.lon = String(selection.lon);
      updateSubmitState();
    }
  });

  btnClearAll.addEventListener('click', callbacks.onClearAll, { signal });

  if (isOnline) {
    btnCalculate.addEventListener('click', () => {
      const point = getPointFromInput(inputPoint);
      if (!point) return;

      const rangeType = (rangeTypeGroup.querySelector('.segmented-btn.active')?.getAttribute('data-range-type') || 'time') as IsochroneRangeType;
      const ranges = parseRangeList(rangesInput.value);
      if (!ranges) {
        alert('Bitte mindestens einen gültigen Ring-Wert eingeben.');
        return;
      }

      const profile = (document.getElementById('iso-profile') as HTMLSelectElement).value;
      callbacks.onCalculate({ point, profile, rangeType, ranges });
    }, { signal });
  }
};

export const renderIsochronesResults = (
  queries: IsochroneQuery[],
  eyeActiveIds: Set<number>,
  onToggle: (id: number, active: boolean) => void,
  onSelect: (id: number) => void,
  onDelete: (id: number) => void
): void => {
  const results = document.getElementById('isochrones-results')!;
  const count = document.getElementById('iso-result-count')!;
  count.textContent = `${queries.length} Abfrage${queries.length === 1 ? '' : 'n'}`;

  if (queries.length === 0) {
    results.innerHTML = `
      <div class="result-empty">
        <i class="fa-solid fa-arrow-pointer"></i>
        Klicke auf die Karte oder suche eine Adresse, um eine Isochrone zu berechnen.
      </div>
    `;
    return;
  }

  results.innerHTML = `
    <div class="result-list">
      ${queries.map((q, i) => `
        <div class="result-item" data-id="${q.id}">
          <div class="result-item-header">
            <span class="result-num">${i + 1}</span>
            <span class="result-item-title">${q.label}</span>
          </div>
          <div class="result-item-sub">${q.profile} · ${q.rangeType === 'time' ? 'Zeit' : 'Distanz'}</div>
          <button class="result-action toggle-iso-btn ${eyeActiveIds.has(q.id) ? 'active' : ''}" title="Ein-/ausblenden"><i class="fa-solid fa-eye"></i></button>
          <button class="result-action delete-iso-btn" title="Entfernen"><i class="fa-solid fa-trash"></i></button>
        </div>
      `).join('')}
    </div>
  `;

  results.querySelectorAll('.result-item').forEach((item) => {
    const id = parseInt(item.getAttribute('data-id')!);
    const toggleBtn = item.querySelector('.toggle-iso-btn') as HTMLButtonElement;
    const deleteBtn = item.querySelector('.delete-iso-btn') as HTMLButtonElement;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = toggleBtn.classList.toggle('active');
      onToggle(id, isActive);
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(id);
    });

    item.addEventListener('click', () => {
      if (!toggleBtn.classList.contains('active')) {
        toggleBtn.classList.add('active');
        onToggle(id, true);
      }
      onSelect(id);
    });
  });
};
```

`RoutingSidebar.ts` selbst wird nicht verändert (`parseCoords` ist bereits `export const`, siehe `src/components/RoutingSidebar.ts:28`) — der oben unter „Files" genannte Eintrag ist rein informativ (Wiederverwendungs-Abhängigkeit), kein Code-Diff.

- [ ] **Step 4: Test-Lauf, muss bestehen**

Run: `npx vitest run src/components/IsochronesSidebar.test.ts`
Expected: PASS (4 Tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/components/IsochronesSidebar.ts src/components/IsochronesSidebar.test.ts
git commit -m "feat(isochrones): Sidebar-Formular + Ergebnis-Liste (Typ 4)"
```

---

### Task 8: `IsochronesSidebarAdapter` (mit testbarer Legenden-Logik)

**Files:**
- Create: `src/features/isochrones/IsochronesSidebarAdapter.ts`
- Test: `src/features/isochrones/IsochronesSidebarAdapter.test.ts`

**Interfaces:**
- Consumes: `IsochronesDataService` (Task 4), `IsochronesMapLayers` (Task 6), `IsochronesService` (Task 5), `GeocoderService`, `Toast`, `MapLegend`, `getIsochroneRingColor` (Task 3), `initIsochronesSidebar`/`renderIsochronesResults`/`setIsochronesPoint`/`IsochronesFormParams` aus `../../components/IsochronesSidebar` (Task 7)
- Produces: `IsochronesSidebarAdapter` Klasse mit `init(container)`, `handleMapClick(lngLat)`, `reapplyLayers()`; exportierte pure Funktion `buildLegendEntries(dataService)` — konsumiert von `IsochronesPage.ts` (Task 9).

- [ ] **Step 1: Failing Test schreiben**

Nur die pure, testbare Legenden-Logik wird unit-getestet (analog `NahMapLayers.computeGroupStatus` — DOM-/Map-Aufrufe bleiben ungetestet wie bei `RoutingSidebarAdapter`, siehe `RoutingSidebarAdapter.test.ts` das ebenfalls nur ausgelagerte reine Logik prüft).

```ts
import { describe, it, expect } from 'vitest';
import { buildLegendEntries } from './IsochronesSidebarAdapter';
import { IsochronesDataService } from './IsochronesDataService';
import { getIsochroneRingColor } from '../../lib/MapStyles';
import { IsochroneQuery } from '../../types/common';

function makeQueryInput(overrides: Partial<Omit<IsochroneQuery, 'id'>> = {}): Omit<IsochroneQuery, 'id'> {
  return {
    point: [48.3, 14.28],
    label: 'Linz',
    profile: 'driving-car',
    rangeType: 'time',
    ranges: [5, 10],
    geojson: { type: 'FeatureCollection', features: [] },
    ...overrides
  };
}

describe('buildLegendEntries', () => {
  it('returns one entry per ring value, formatted with unit', () => {
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQueryInput({ ranges: [5, 10], rangeType: 'time' }));

    const entries = buildLegendEntries(dataService);

    expect(entries).toHaveLength(2);
    expect(entries[0].label).toBe('5 min');
    expect(entries[1].label).toBe('10 min');
    expect(entries[0].color).toBe(getIsochroneRingColor(0, 2));
    expect(entries[1].color).toBe(getIsochroneRingColor(1, 2));
  });

  it('formats distance ranges with km and a German decimal comma', () => {
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQueryInput({ ranges: [1.5, 3], rangeType: 'distance' }));

    const entries = buildLegendEntries(dataService);

    expect(entries[0].label).toBe('1,5 km');
    expect(entries[1].label).toBe('3 km');
  });

  it('excludes queries that are not eye-active', () => {
    const dataService = new IsochronesDataService();
    const added = dataService.addQuery(makeQueryInput());
    dataService.setEyeActiveState(added.id, false);

    expect(buildLegendEntries(dataService)).toHaveLength(0);
  });

  it('deduplicates entries with identical color+label across queries', () => {
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQueryInput({ ranges: [5, 10], rangeType: 'time' }));
    dataService.addQuery(makeQueryInput({ ranges: [5, 10], rangeType: 'time' }));

    expect(buildLegendEntries(dataService)).toHaveLength(2);
  });

  it('assigns type "area" to every entry', () => {
    const dataService = new IsochronesDataService();
    dataService.addQuery(makeQueryInput({ ranges: [5] }));

    expect(buildLegendEntries(dataService)[0].type).toBe('area');
  });
});
```

- [ ] **Step 2: Test-Lauf, muss fehlschlagen**

Run: `npx vitest run src/features/isochrones/IsochronesSidebarAdapter.test.ts`
Expected: FAIL — `Cannot find module './IsochronesSidebarAdapter'`

- [ ] **Step 3: Implementierung**

```ts
import maplibregl from 'maplibre-gl';
import { IsochronesDataService } from './IsochronesDataService';
import { IsochronesMapLayers } from './IsochronesMapLayers';
import { IsochronesService } from '../../lib/IsochronesService';
import { GeocoderService } from '../../lib/GeocoderService';
import { Toast } from '../../lib/Toast';
import { MapLegend } from '../../lib/MapLegend';
import { getIsochroneRingColor } from '../../lib/MapStyles';
import {
  initIsochronesSidebar,
  renderIsochronesResults,
  setIsochronesPoint,
  IsochronesFormParams
} from '../../components/IsochronesSidebar';
import { LegendEntry } from '../../types/common';

/**
 * Baut die dedupliziert Legenden-Einträge aus allen aktuell eye-aktiven Queries — ein Eintrag
 * pro Ring mit Farbe + formatiertem Wert (z.B. "5 min", "2,5 km"). Rein funktional (keine
 * DOM-/Map-Zugriffe), damit unabhängig von MapLegend testbar; analog zum bestehenden
 * Dedupe-Muster der Anfahrtszeit-Ringe (siehe docs/superpowers/specs/
 * 2026-07-12-map-legend-granularity-design.md).
 */
export function buildLegendEntries(dataService: IsochronesDataService): LegendEntry[] {
  const entries: LegendEntry[] = [];
  const seen = new Set<string>();

  dataService.getQueries().forEach((query, id) => {
    if (!dataService.isEyeActive(id)) return;

    const total = query.ranges.length;
    const unit = query.rangeType === 'time' ? 'min' : 'km';

    query.ranges.forEach((value, index) => {
      const color = getIsochroneRingColor(index, total);
      const label = `${String(value).replace('.', ',')} ${unit}`;
      const key = `${color}|${label}`;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({ id: key, type: 'area', color, label });
    });
  });

  return entries;
}

export class IsochronesSidebarAdapter {
  constructor(
    private dataService: IsochronesDataService,
    private map: maplibregl.Map,
    private legend: MapLegend,
    private abortSignal: AbortSignal
  ) {}

  public async init(container: HTMLElement): Promise<void> {
    await initIsochronesSidebar(container, {
      onCalculate: (params) => this.handleCalculate(params),
      onClearAll: () => {
        this.dataService.clearAll();
        this.refresh();
      }
    }, this.abortSignal);

    this.refresh();
  }

  public async handleMapClick(lngLat: { lat: number; lng: number }): Promise<void> {
    await setIsochronesPoint(lngLat.lat, lngLat.lng);
  }

  public reapplyLayers(): void {
    IsochronesMapLayers.ensureBaseLayers(this.map);
    IsochronesMapLayers.updateRingsLayer(this.map, this.dataService);
    IsochronesMapLayers.updatePointsLayer(this.map, this.dataService);
  }

  private async handleCalculate(params: IsochronesFormParams): Promise<void> {
    const btn = document.getElementById('btn-calculate-isochrone') as HTMLButtonElement;
    btn?.classList.add('loading');

    const geojson = await IsochronesService.calculateIsochrones(
      params.point, params.profile, params.ranges, params.rangeType
    );
    if (this.abortSignal.aborted) return;
    btn?.classList.remove('loading');

    if (!geojson || geojson.features.length === 0) {
      Toast.error('Isochronen-Berechnung fehlgeschlagen');
      return;
    }

    const address = await GeocoderService.reverse(params.point[0], params.point[1]);
    if (this.abortSignal.aborted) return;
    const label = address?.display_name || `${params.point[0].toFixed(4)}, ${params.point[1].toFixed(4)}`;

    this.dataService.addQuery({
      point: params.point,
      label,
      profile: params.profile,
      rangeType: params.rangeType,
      ranges: params.ranges,
      geojson
    });

    this.refresh();
  }

  private zoomToQuery(id: number): void {
    const query = this.dataService.getQuery(id);
    if (!query) return;

    const bounds = new maplibregl.LngLatBounds();
    query.geojson.features.forEach((f) => {
      const ring = f.geometry.coordinates[0] as [number, number][];
      ring.forEach((c) => bounds.extend(c));
    });
    this.map.fitBounds(bounds, { padding: 50 });
  }

  private refresh(): void {
    IsochronesMapLayers.updateRingsLayer(this.map, this.dataService);
    IsochronesMapLayers.updatePointsLayer(this.map, this.dataService);

    this.legend.clearEntries();
    buildLegendEntries(this.dataService).forEach((entry) => this.legend.addEntry(entry));

    const queries = Array.from(this.dataService.getQueries().values());
    renderIsochronesResults(
      queries,
      this.dataService.getEyeActiveStates(),
      (id, active) => {
        this.dataService.setEyeActiveState(id, active);
        this.refresh();
      },
      (id) => this.zoomToQuery(id),
      (id) => {
        this.dataService.removeQuery(id);
        this.refresh();
      }
    );
  }
}
```

- [ ] **Step 4: Test-Lauf, muss bestehen**

Run: `npx vitest run src/features/isochrones/IsochronesSidebarAdapter.test.ts`
Expected: PASS (5 Tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/features/isochrones/IsochronesSidebarAdapter.ts src/features/isochrones/IsochronesSidebarAdapter.test.ts
git commit -m "feat(isochrones): SidebarAdapter mit testbarer Legenden-Logik"
```

---

### Task 9: `IsochronesPageController`

**Files:**
- Create: `src/pages/IsochronesPage.ts`

**Interfaces:**
- Consumes: `BasePageController`, `MapCore`, `attachHoverCursor`, `initTopbar`, `MapLegend`, `LayoutHelper`, `InventoryService` (alle bestehend, unverändert), `IsochronesDataService` (Task 4), `IsochronesMapLayers` (Task 6), `IsochronesSidebarAdapter` (Task 8)
- Produces: `IsochronesPageController` — importiert von `main.ts` (Task 10)

Kein dedizierter Test — `RoutingPageController`/`NahPageController` haben ebenfalls keine Tests (reine Orchestrierung bereits getesteter Bausteine, DOM-/Map-Init nicht sinnvoll isoliert testbar ohne Playwright).

- [ ] **Step 1: Implementierung**

```ts
import maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { attachHoverCursor } from '../lib/HoverCursor';
import { initTopbar } from '../components/Topbar';
import { MapLegend } from '../lib/MapLegend';
import { LayoutHelper } from '../lib/LayoutHelper';
import { InventoryService } from '../services/InventoryService';

import { IsochronesDataService } from '../features/isochrones/IsochronesDataService';
import { IsochronesMapLayers } from '../features/isochrones/IsochronesMapLayers';
import { IsochronesSidebarAdapter } from '../features/isochrones/IsochronesSidebarAdapter';

/**
 * IsochronesPageController - Orchestriert die Isochronen-Seite.
 */
export class IsochronesPageController extends BasePageController {
  private map?: maplibregl.Map;
  private sidebarAdapter?: IsochronesSidebarAdapter;

  public async mount(container: HTMLElement): Promise<void> {
    try {
      const invService = InventoryService.getInstance();
      const basemaps = await invService.getBasemaps();

      const mounts = LayoutHelper.renderBaseLayout(container, {
        withLegend: true,
        legendTitle: 'Isochronen'
      });

      IsochronesMapLayers.registerResources();
      const dataService = new IsochronesDataService();

      this.map = MapCore.init(
        mounts.map,
        basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
        () => this.handleMapRestore()
      );

      const legend = new MapLegend(mounts.legend!);

      this.sidebarAdapter = new IsochronesSidebarAdapter(dataService, this.map, legend, this.signal);
      await this.sidebarAdapter.init(mounts.sidebar);

      initTopbar(mounts.topbar, basemaps, (url) => {
        if (this.map) this.map.setStyle(url);
      }, () => legend.toggle());

      this.setupMapListeners();

      console.debug('[IsochronesPageController] Mounted successfully');
    } catch (err) {
      console.error('[IsochronesPageController] Initialization failed:', err);
    }
  }

  private setupMapListeners(): void {
    if (!this.map || !this.sidebarAdapter) return;
    attachHoverCursor(this.map, ['isochrones-rings-layer']);
    this.map.on('click', (e) => this.sidebarAdapter?.handleMapClick(e.lngLat));
  }

  private handleMapRestore(): void {
    this.sidebarAdapter?.reapplyLayers();
  }

  public destroy(): void {
    super.destroy();
    this.map?.remove();
    console.debug('[IsochronesPageController] Destroyed');
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 3: Commit**

```bash
git add src/pages/IsochronesPage.ts
git commit -m "feat(isochrones): PageController orchestriert Karte/Sidebar/Topbar"
```

---

### Task 10: Routing, Landing-Page-Karte, Topbar-Dropdown

**Files:**
- Modify: `src/main.ts`
- Modify: `src/components/TopbarNav.ts`

**Interfaces:**
- Consumes: `IsochronesPageController` aus `./pages/IsochronesPage` (Task 9, lazy `import()`)
- Produces: nichts (Ende der Kette — Route ist von außen über die URL erreichbar)

- [ ] **Step 1: Router-Einträge ergänzen**

In `src/main.ts`, im `router()`-Block (siehe vorhandene `else if (path === '/tracking') { ... }`), **vor** dem abschließenden `else { renderLandingPage(); }` zwei neue Zweige einfügen — `/isochronen` redirected zuerst clientseitig auf den kanonischen Pfad, dann der eigentliche `/isochrones`-Zweig:

```ts
  } else if (path === '/isochronen') {
    // Alias auf den kanonischen Pfad — history.replaceState statt pushState, damit kein
    // zusätzlicher Browser-History-Eintrag für den Alias selbst entsteht.
    window.history.replaceState({}, '', '/isochrones');
    await router();
  } else if (path === '/isochrones') {
    const { IsochronesPageController } = await import('./pages/IsochronesPage');
    currentPage = new IsochronesPageController();
    await currentPage.mount(app);
  } else if (path.startsWith('/info')) {
```

(Genauer Einfügeort: direkt vor dem bestehenden `} else if (path.startsWith('/info')) {`-Zweig aus `src/main.ts:153`.)

- [ ] **Step 2: Landing-Page-Karte ergänzen**

In `src/main.ts`, im `.card-grid`-Block, nach der bestehenden `/tracking`-Karte (`src/main.ts:75-80`) einfügen:

```html
          <a href="/isochrones" class="card card-nav nav-link">
            <div class="card-nav-icon"><i class="fa-solid fa-bullseye"></i></div>
            <h3>Isochronen</h3>
            <p>Erreichbarkeitsanalyse: welches Gebiet ist von einem Punkt aus in X Minuten oder km erreichbar?</p>
            <span class="card-nav-btn"><i class="fa-solid fa-arrow-right"></i> Öffnen</span>
          </a>
```

- [ ] **Step 3: Topbar-Dropdown-Eintrag ergänzen**

In `src/components/TopbarNav.ts`, im `.topbar-nav-dropdown-menu`-Block, nach dem bestehenden `/tracking`-Eintrag:

```html
        <a href="/isochrones" class="topbar-nav-dropdown-item nav-link ${currentPath === '/isochrones' ? 'active' : ''}" role="menuitem">Isochronen</a>
```

- [ ] **Step 4: Typecheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: keine Fehler, `dist/` wird erzeugt

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/components/TopbarNav.ts
git commit -m "feat(isochrones): Route /isochrones (+/isochronen-Alias), Landing-Karte, Topbar-Eintrag"
```

---

### Task 11: Doku aktualisieren (bausteine.md, CHANGELOG.md, In-App-Changelog, TODO.md)

**Files:**
- Modify: `docs/architecture/bausteine.md` (autogeneriert)
- Modify: `docs/CHANGELOG.md`
- Modify: `src/lib/GlobalModals.ts`
- Modify: `docs/TODO.md`

**Interfaces:**
- Consumes: keine Code-Abhängigkeit — reine Doku-Konsolidierung nach abgeschlossener Implementierung (Tasks 1-10)
- Produces: nichts

- [ ] **Step 1: `bausteine.md` neu generieren**

`src/lib/` hat mit `IsochronesService.ts` und dem `getIsochroneRingColor`-Export in `MapStyles.ts` neue Bausteine bekommen — laut `CLAUDE.md` muss der Katalog danach neu generiert werden.

Run: `npm run docs:bausteine`
Expected: `docs/architecture/bausteine.md` wird aktualisiert (neuer Eintrag für `IsochronesService.ts`, `MapStyles.ts`-Eintrag um `getIsochroneRingColor` ergänzt)

- [ ] **Step 2: `CHANGELOG.md`-Journal-Block ergänzen**

Neuer, eigenständiger `## [Unreleased] - YYYY-MM-DD HH:mm`-Block (aktuelle Uhrzeit einsetzen, nicht mit einem bestehenden Tages-Block mergen — siehe Journal-Konvention in `AGENT_INSTRUCTIONS.md` §4) mit Kategorie `Hinzugefügt`:

```markdown
## [Unreleased] - 2026-07-18 HH:MM

### Hinzugefügt

- Neue Karten-Seite `/isochrones` (Alias `/isochronen`) für Erreichbarkeitsanalyse: Punkt per
  Kartenklick/Geocoder/Koordinaten setzen, ORS-Fahrprofil + Zeit- oder Distanz-Ringe wählen,
  Isochronen-Polygone erscheinen auf der Karte. Mehrere Abfragen können gestapelt und einzeln
  per Augen-Icon ein-/ausgeblendet werden (Sidebar-Typ 4). Kein neuer PHP-Endpoint — nutzt den
  bestehenden generischen `api/ors.php`-Proxy. Spec:
  `docs/superpowers/specs/2026-07-18-isochrones-page-design.md`.
```

(Uhrzeit beim Ausführen dieses Tasks mit der tatsächlichen Systemzeit füllen, nicht raten.)

- [ ] **Step 3: In-App-Changelog nachziehen**

In `src/lib/GlobalModals.ts`, im `changelog-modal-body`-HTML, unter „Neuigkeiten & Features" einen kurzen, nutzerorientierten Eintrag ohne interne Datei-/Funktionsnamen ergänzen (Formulierung an den bestehenden Stil der umgebenden Einträge anpassen), z.B.:

```html
<li>Neu: Isochronen-Seite — zeigt, welches Gebiet von einem Punkt aus in einer wählbaren Zeit oder Distanz erreichbar ist.</li>
```

- [ ] **Step 4: `TODO.md` — Punkt als erledigt markieren**

In `docs/TODO.md`, Abschnitt „Neue Seiten (nächste Schritte)" (aktuell Zeilen 191-196), den Isochronen-Punkt von `- [ ]` auf `- [x]` umstellen und mit demselben Kurzbeschreibungs-Stil wie die übrigen erledigten Einträge im Abschnitt „Map-Subsystem: Anschlussfeatures" versehen (Route, Kernfunktionen, Test-/Typecheck-Stand, Verweis auf Spec+Plan). Vor `git add docs/TODO.md` per `git diff docs/TODO.md` prüfen, dass der Diff nur diesen einen Punkt betrifft (Sammel-Datei-Risiko, siehe `AGENT_INSTRUCTIONS.md`-Historie zu genau dieser Datei).

- [ ] **Step 5: Commit**

```bash
git diff docs/TODO.md   # gegenprüfen: nur der Isochronen-Punkt geändert
git add docs/architecture/bausteine.md docs/CHANGELOG.md src/lib/GlobalModals.ts docs/TODO.md
git commit -m "docs(isochrones): Bausteine-Katalog, Changelogs, TODO.md aktualisiert"
```

---

### Task 12: Abschlussverifikation

**Files:** keine Änderungen — reine Verifikation

**Interfaces:** keine

- [ ] **Step 1: Vollständiger Testlauf**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TypeScript-Fehler, alle Tests grün (bestehende + neue aus Tasks 2-4, 6-8: `parseRangeList` 12, `MapStyles`/`getIsochroneRingColor` 5, `IsochronesDataService` 6, `IsochronesService` 4, `IsochronesMapLayers` 6, `IsochronesSidebar` 4, `IsochronesSidebarAdapter` 5 — 42 neue Tests)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: erfolgreicher Build, `dist/` enthält die neue Seite

- [ ] **Step 3: Manuelle Hinweis-Notiz**

Keine Playwright-/Headless-Browser-Umgebung hier verfügbar (bekannte Repo-Einschränkung, siehe Spec „Tests"-Abschnitt) — Live-Verifikation im Browser durch den Nutzer nach Abschluss aller Tasks, wie bei allen vorherigen Karten-Features. Konkret zu prüfen: Kartenklick setzt Punkt + reverse-geocodierte Adresse, „Berechnen" zeigt Ringe mit Farbverlauf, mehrere Abfragen stapeln sich sichtbar, Augen-Icon blendet einzeln aus, Löschen entfernt Query + Legenden-Einträge, `/isochronen` redirected zu `/isochrones`, Landing-Page-Karte + Topbar-Dropdown-Eintrag funktionieren.

- [ ] **Step 4: Kein Commit in diesem Task** — reine Verifikation, alle Änderungen sind bereits in Tasks 1-11 committet.

---

## Nach Abschluss

Release-Vorschlag laut `AGENT_INSTRUCTIONS.md` §4 („nach Abschluss eines größeren, in sich geschlossenen Arbeitsblocks schlägt der Agent aktiv ein Release vor") — nach Task 12 dem Nutzer eine Release-Checkliste (`CLAUDE.md` → Releases) vorschlagen, nicht automatisch ausführen.
