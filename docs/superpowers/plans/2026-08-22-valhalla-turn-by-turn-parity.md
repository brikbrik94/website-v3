# Valhalla Turn-by-Turn-Parität — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Valhalla-Routen (`/routing`, Provider Valhalla) bekommen dieselbe Turn-by-Turn-
Wegbeschreibung wie ORS — vollständig, alle 30 relevanten Manöver-Konzepte (37 Valhalla-Typen
minus 7 technisch unerreichbare Transit-Typen), nicht nur die auf ORS abbildbaren.

**Architecture:** `RouteStep.type` wechselt von einem ORS-Zahlencode (`number`) auf einen
providerneutralen String-Typ `ManeuverKind` (30 Werte). Beide Provider bekommen eine eigene, kleine
Übersetzungstabelle ihres jeweiligen nativen Codes auf `ManeuverKind`
(`OrsManeuverKind.ts`/`ValhallaRouteInterpreter.ts`) — `ManeuverIcons.ts` und
`RoutingDetailsFormatter.ts` kennen nur noch `ManeuverKind`, keinen provider-spezifischen Code
mehr. 16 der 30 Icons existieren noch nicht in `oe5ith-ci` — lokal bereits gezeichnet (Issue
[oe5ith-ci#2](https://github.com/brikbrik94/oe5ith-ci/issues/2) läuft parallel, nicht blockierend).

**Tech Stack:** TypeScript (Vite), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md`

## Global Constraints

- Kein Verlust von Valhalla-Informationsgehalt zur Bequemlichkeit — jedes der 30 relevanten
  Manöver-Konzepte bekommt einen eigenen `ManeuverKind`-Wert und ein eigenes Icon (Nutzer-
  Entscheidung: „wir sparen hier nirgends").
- Die 7 Transit-Manöver-Typen (Valhalla 30–36) bleiben bewusst ausgeschlossen — technisch mit den
  unterstützten Profilen (`auto`/`emergency`/`bicycle`/`pedestrian`) nie erreichbar, fallen auf
  `'straight'` zurück wie jeder unbekannte Wert.
- Icon-Stilregeln (für alle neuen SVGs in `ManeuverIcons.ts`, exakt aus
  `oe5ith-ci/docs/maneuver-icons.md`): `viewBox="0 0 16 16"`, `fill="none"`,
  `stroke="currentColor"`, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- `RouteStep.type` ist ab Task 1 überall `ManeuverKind`, nie mehr `number` — nach Task 1 kompiliert
  `tsc` an allen Stellen, die noch numerische `type`-Werte annehmen, absichtlich nicht (wird in
  Folge-Tasks behoben).
- Nach jedem Task: `npx tsc --noEmit` muss für die in diesem Task geänderten Dateien sauber sein
  (Cross-Task-Fehler in noch nicht migrierten Dateien sind bis zum jeweils zuständigen Task
  erwartet, siehe Task-Reihenfolge).
- Deutsche Kommentare/Copy.

---

## Task 1: `ManeuverKind`-Typ + `ManeuverIcons.ts` auf 30 Icons umstellen

**Files:**
- Modify: `src/types/common.ts`
- Modify: `src/lib/ManeuverIcons.ts`
- Modify: `src/lib/ManeuverIcons.test.ts`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: `ManeuverKind` (Typ, aus `types/common.ts`, exportiert); `RouteStep.type: ManeuverKind`
  (geändert von `number`); `getManeuverIconMarkup(kind: ManeuverKind): string` (Signatur geändert
  von `orsCode: number`) — wird von Task 2 (`OrsManeuverKind.ts`), Task 4
  (`ValhallaRouteInterpreter.ts`) und `RoutingDetailsFormatter.ts` (unverändert, konsumiert
  weiterhin `step.type` positional, keine Anpassung nötig) verwendet.

- [ ] **Step 1: `ManeuverKind` in `types/common.ts` definieren, `RouteStep.type` umstellen**

Füge in `src/types/common.ts` vor `export interface RouteStep {` ein:

```typescript
/**
 * Providerneutraler Manöver-Typ — beide Routing-Provider (ORS, Valhalla) übersetzen ihren
 * jeweiligen nativen numerischen Code hierher (siehe OrsManeuverKind.ts/ValhallaRouteInterpreter.ts),
 * damit ManeuverIcons.ts/RoutingDetailsFormatter.ts providerunabhängig bleiben. 30 Werte: die 14
 * bestehenden oe5ith-ci-Icons plus 16 neue (geodata-plugin-standard-analoges Muster: lokal bereits
 * gezeichnet, Issue an oe5ith-ci läuft parallel, siehe docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md).
 */
export type ManeuverKind =
  | 'depart' | 'depart-right' | 'depart-left'
  | 'goal' | 'goal-right' | 'goal-left'
  | 'becomes'
  | 'straight'
  | 'slight-right' | 'turn-right' | 'sharp-right'
  | 'slight-left' | 'turn-left' | 'sharp-left'
  | 'uturn' | 'uturn-right' | 'uturn-left'
  | 'ramp-straight' | 'ramp-right' | 'ramp-left'
  | 'exit-right' | 'exit-left'
  | 'stay-straight' | 'keep-right' | 'keep-left'
  | 'merge'
  | 'roundabout-enter' | 'roundabout-exit'
  | 'ferry-enter' | 'ferry-exit';
```

Ändere in `RouteStep`:

```typescript
export interface RouteStep {
    distance: number;
    duration: number;
    type: ManeuverKind;
    instruction: string;
    name: string;
    way_points: [number, number];
}
```

- [ ] **Step 2: `ManeuverIcons.test.ts` komplett neu schreiben (failing)**

Ersetze den kompletten Inhalt von `src/lib/ManeuverIcons.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getManeuverIconMarkup } from './ManeuverIcons';
import type { ManeuverKind } from '../types/common';

const ALL_KINDS: ManeuverKind[] = [
  'depart', 'depart-right', 'depart-left',
  'goal', 'goal-right', 'goal-left',
  'becomes',
  'straight',
  'slight-right', 'turn-right', 'sharp-right',
  'slight-left', 'turn-left', 'sharp-left',
  'uturn', 'uturn-right', 'uturn-left',
  'ramp-straight', 'ramp-right', 'ramp-left',
  'exit-right', 'exit-left',
  'stay-straight', 'keep-right', 'keep-left',
  'merge',
  'roundabout-enter', 'roundabout-exit',
  'ferry-enter', 'ferry-exit',
];

describe('getManeuverIconMarkup', () => {
  it('returns svg markup with the disclosure-item-icon class and a 16x16 viewBox for a known kind', () => {
    const markup = getManeuverIconMarkup('turn-right');
    expect(markup).toContain('class="disclosure-item-icon"');
    expect(markup).toContain('viewBox="0 0 16 16"');
    expect(markup).toContain('M8 13 Q8 7 13.4 7');
  });

  it('returns distinct markup for each of the 30 known ManeuverKind values', () => {
    const markups = ALL_KINDS.map(getManeuverIconMarkup);
    expect(new Set(markups).size).toBe(ALL_KINDS.length);
  });

  it('falls back to the straight-arrow icon for an unknown/undefined kind', () => {
    expect(getManeuverIconMarkup('nonexistent-kind' as ManeuverKind)).toBe(getManeuverIconMarkup('straight'));
  });

  it('renders the directional uturn icons distinctly from the undirected ORS uturn icon', () => {
    const bare = getManeuverIconMarkup('uturn');
    const right = getManeuverIconMarkup('uturn-right');
    const left = getManeuverIconMarkup('uturn-left');
    expect(new Set([bare, right, left]).size).toBe(3);
  });
});
```

- [ ] **Step 3: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/ManeuverIcons.test.ts`
Expected: FAIL — `getManeuverIconMarkup('turn-right')` liefert noch das alte, numerisch gekeyte
Icon-Set (Funktion erwartet noch `orsCode: number`), TypeScript-Fehler oder falsche Icons je nach
aktuellem Stand.

- [ ] **Step 4: `ManeuverIcons.ts` komplett neu schreiben**

Ersetze den kompletten Dateiinhalt von `src/lib/ManeuverIcons.ts`:

```typescript
import type { ManeuverKind } from '../types/common';

// Providerneutrale Manöver-Icons — 14 Icons 1:1 aus oe5ith-ci/assets/maneuver-icons/*.svg
// (v1.20.0) übernommen (siehe oe5ith-ci/docs/maneuver-icons.md), 16 neue Icons für Valhalla-
// Konzepte ohne ORS-Entsprechung lokal entworfen und als Vorschlag an oe5ith-ci gemeldet
// (https://github.com/brikbrik94/oe5ith-ci/issues/2, docs/ci/open-items.md) — siehe
// docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md für die vollständige
// Herleitung. Die exakte grafische Form der 16 neuen Icons ist bewusst nicht final — sobald
// oe5ith-ci eine offizielle Version liefert, werden diese Einträge synchronisiert.
const MANEUVER_ICON_PATHS: Record<ManeuverKind, string> = {
  // Bestehende 14 (oe5ith-ci v1.20.0, vormals ORS-Code 0-13)
  'turn-left': '<path d="M8 13 Q8 7 2.6 7"/><path d="M2 4.7 L2.6 7 L4.1 5.2"/>',
  'turn-right': '<path d="M8 13 Q8 7 13.4 7"/><path d="M14 4.7 L13.4 7 L11.9 5.2"/>',
  'sharp-left': '<path d="M8 13 Q8 11.5 3.8 11.5"/><path d="M1.6 10.5 L3.8 11.5 L3.4 9.2"/>',
  'sharp-right': '<path d="M8 13 Q8 11.5 12.2 11.5"/><path d="M14.4 10.5 L12.2 11.5 L12.6 9.2"/>',
  'slight-left': '<path d="M8 13 Q8 3 5.7 3"/><path d="M7.3 1.2 L5.7 3 L8.1 3.2"/>',
  'slight-right': '<path d="M8 13 Q8 3 10.3 3"/><path d="M8.7 1.2 L10.3 3 L7.9 3.2"/>',
  'straight': '<path d="M8 13 V4"/><path d="M5.5 6.5 L8 4 L10.5 6.5"/>',
  'roundabout-enter': '<circle cx="8" cy="8" r="4"/><path d="M8 14 V12"/><path d="M6 12.5 L8 10.5 L10 12.5"/>',
  'roundabout-exit': '<circle cx="8" cy="8" r="4"/><path d="M8 4 V2"/><path d="M6 3.5 L8 1.5 L10 3.5"/>',
  'uturn': '<path d="M11 13 V6 A3 3 0 0 0 5 6 V9"/><path d="M2.8 7 L5 9.5 L7.2 7"/>',
  'goal': '<path d="M5 14.5 V2.5"/><path d="M5 3 L11.5 5.2 L5 7.4 Z" fill="currentColor" stroke="none"/>',
  'depart': '<circle cx="8" cy="8" r="5" stroke-width="1.3"/><circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none"/>',
  'keep-left': '<path d="M8 13 V9"/><path d="M8 9 Q8 6 5.5 4.5"/><path d="M7.2 2.8 L5.3 4.3 L6.8 6.4"/><path d="M8 9 Q8 6.5 10 5.5" opacity="0.35"/>',
  'keep-right': '<path d="M8 13 V9"/><path d="M8 9 Q8 6 10.5 4.5"/><path d="M8.8 2.8 L10.7 4.3 L9.2 6.4"/><path d="M8 9 Q8 6.5 6 5.5" opacity="0.35"/>',

  // Neu — Valhalla-only, Vorschlag an oe5ith-ci#2. Eigenständige Pfade, bewusst NICHT identisch
  // zum bestehenden bare 'uturn' oben (sonst kollidieren zwei ManeuverKind-Werte auf ein Icon —
  // 'uturn' bedient weiterhin ORS' richtungslosen Code, diese beiden nur Valhallas gerichtete Typen).
  'uturn-left': '<path d="M9 13 V8 A4 4 0 0 0 3 8 V11"/><path d="M1 9.5 L3 11.5 L5 9.5"/>',
  'uturn-right': '<path d="M7 13 V8 A4 4 0 0 1 13 8 V11"/><path d="M11 9.5 L13 11.5 L15 9.5"/>',
  'ramp-right': '<path d="M8 13 V9"/><path d="M8 9 Q8 6 11 5"/><path d="M12.8 3.5 L11 5 L11.8 7"/><path d="M8 9 V3" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'ramp-left': '<path d="M8 13 V9"/><path d="M8 9 Q8 6 5 5"/><path d="M3.2 3.5 L5 5 L4.2 7"/><path d="M8 9 V3" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'ramp-straight': '<path d="M8 13 V3"/><path d="M5.5 5.5 L8 3 L10.5 5.5"/><path d="M11 11 Q11 8 9 6" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'exit-right': '<path d="M8 13 Q8 11.5 12.2 11.5"/><path d="M14.4 10.5 L12.2 11.5 L12.6 9.2"/><path d="M8 13 V3" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'exit-left': '<path d="M8 13 Q8 11.5 3.8 11.5"/><path d="M1.6 10.5 L3.8 11.5 L3.4 9.2"/><path d="M8 13 V3" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'stay-straight': '<path d="M8 13 V4"/><path d="M5.5 6.5 L8 4 L10.5 6.5"/><path d="M8 9 Q8 6 5.5 4.5" opacity="0.35"/><path d="M8 9 Q8 6.5 10 5.5" opacity="0.35"/>',
  'merge': '<path d="M4 13 Q4 9 8 8"/><path d="M12 13 Q12 9 8 8"/><path d="M8 8 V3"/><path d="M5.5 5.5 L8 3 L10.5 5.5"/>',
  'ferry-enter': '<path d="M8 13 V6"/><path d="M5.5 8.5 L8 6 L10.5 8.5"/><path d="M2.5 13 Q8 15.5 13.5 13" opacity="0.6"/>',
  'ferry-exit': '<path d="M8 3 V10"/><path d="M5.5 7.5 L8 10 L10.5 7.5"/><path d="M2.5 13 Q8 15.5 13.5 13" opacity="0.6"/>',
  'depart-right': '<circle cx="6" cy="8" r="4" stroke-width="1.3"/><circle cx="6" cy="8" r="1.8" fill="currentColor" stroke="none"/><path d="M11 8 H14"/><path d="M12.3 6.3 L14 8 L12.3 9.7"/>',
  'depart-left': '<circle cx="10" cy="8" r="4" stroke-width="1.3"/><circle cx="10" cy="8" r="1.8" fill="currentColor" stroke="none"/><path d="M5 8 H2"/><path d="M3.7 6.3 L2 8 L3.7 9.7"/>',
  'goal-right': '<path d="M2 9 H6.5"/><path d="M4.8 7.3 L6.5 9 L4.8 10.7"/><path d="M10 14.5 V2.5"/><path d="M10 3 L15.5 5.2 L10 7.4 Z" fill="currentColor" stroke="none"/>',
  'goal-left': '<path d="M14 9 H9.5"/><path d="M11.2 7.3 L9.5 9 L11.2 10.7"/><path d="M6 14.5 V2.5"/><path d="M6 3 L0.5 5.2 L6 7.4 Z" fill="currentColor" stroke="none"/>',
  'becomes': '<path d="M8 13 V3"/><path d="M5.5 5.5 L8 3 L10.5 5.5"/><path d="M4.5 9 H11.5" stroke-dasharray="1 1.5" opacity="0.5"/>',
};

const FALLBACK_KIND: ManeuverKind = 'straight';

/**
 * Baut das SVG-Markup für ein Turn-by-Turn-Manöver-Icon (z.B. für die Wegbeschreibung in
 * `RoutingSidebar.ts`). Unbekannte/künftige Werte fallen auf "Straight" zurück statt nichts
 * anzuzeigen.
 */
export function getManeuverIconMarkup(kind: ManeuverKind): string {
  const inner = MANEUVER_ICON_PATHS[kind] ?? MANEUVER_ICON_PATHS[FALLBACK_KIND];
  return `<svg class="disclosure-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
```

- [ ] **Step 5: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/lib/ManeuverIcons.test.ts`
Expected: PASS (4/4 Tests grün).

- [ ] **Step 6: Typecheck der geänderten Dateien**

Run: `npx tsc --noEmit`
Expected: Fehler sind an dieser Stelle noch zu erwarten (`RoutingDetailsFormatter.ts`,
`RoutingService.ts`, `ValhallaRouteInterpreter.ts` nutzen `RouteStep.type` noch als `number` bzw.
liefern noch keinen `ManeuverKind`) — werden in Task 2-5 behoben. Prüfe konkret, dass keine Fehler
*innerhalb* von `types/common.ts` oder `ManeuverIcons.ts` selbst auftauchen.

- [ ] **Step 7: Commit**

```bash
git add src/types/common.ts src/lib/ManeuverIcons.ts src/lib/ManeuverIcons.test.ts
git commit -m "feat(routing): ManeuverKind-Typ + ManeuverIcons.ts auf 30 providerneutrale Icons umgestellt"
```

---

## Task 2: `OrsManeuverKind.ts` — ORS-Code-Übersetzung

**Files:**
- Create: `src/lib/OrsManeuverKind.ts`
- Create: `src/lib/OrsManeuverKind.test.ts`

**Interfaces:**
- Consumes: `ManeuverKind` aus `../types/common` (Task 1).
- Produces: `orsCodeToManeuverKind(code: number): ManeuverKind` — wird von Task 3
  (`RoutingService.ts`) konsumiert.

- [ ] **Step 1: Failing Test schreiben**

Erstelle `src/lib/OrsManeuverKind.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { orsCodeToManeuverKind } from './OrsManeuverKind';

describe('orsCodeToManeuverKind', () => {
  it('maps all 14 known ORS codes (0-13) to their exact ManeuverKind', () => {
    expect(orsCodeToManeuverKind(0)).toBe('turn-left');
    expect(orsCodeToManeuverKind(1)).toBe('turn-right');
    expect(orsCodeToManeuverKind(2)).toBe('sharp-left');
    expect(orsCodeToManeuverKind(3)).toBe('sharp-right');
    expect(orsCodeToManeuverKind(4)).toBe('slight-left');
    expect(orsCodeToManeuverKind(5)).toBe('slight-right');
    expect(orsCodeToManeuverKind(6)).toBe('straight');
    expect(orsCodeToManeuverKind(7)).toBe('roundabout-enter');
    expect(orsCodeToManeuverKind(8)).toBe('roundabout-exit');
    expect(orsCodeToManeuverKind(9)).toBe('uturn');
    expect(orsCodeToManeuverKind(10)).toBe('goal');
    expect(orsCodeToManeuverKind(11)).toBe('depart');
    expect(orsCodeToManeuverKind(12)).toBe('keep-left');
    expect(orsCodeToManeuverKind(13)).toBe('keep-right');
  });

  it('falls back to "straight" for an unknown ORS code', () => {
    expect(orsCodeToManeuverKind(99)).toBe('straight');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/OrsManeuverKind.test.ts`
Expected: FAIL — Modul `./OrsManeuverKind` existiert noch nicht.

- [ ] **Step 3: `OrsManeuverKind.ts` implementieren**

Erstelle `src/lib/OrsManeuverKind.ts`:

```typescript
import type { ManeuverKind } from '../types/common';

// ORS' numerischer Manöver-Code (0-13, siehe oe5ith-ci/docs/maneuver-icons.md "ORS-Code-Katalog")
// → providerneutraler ManeuverKind.
const ORS_CODE_TO_KIND: Record<number, ManeuverKind> = {
  0: 'turn-left',
  1: 'turn-right',
  2: 'sharp-left',
  3: 'sharp-right',
  4: 'slight-left',
  5: 'slight-right',
  6: 'straight',
  7: 'roundabout-enter',
  8: 'roundabout-exit',
  9: 'uturn',
  10: 'goal',
  11: 'depart',
  12: 'keep-left',
  13: 'keep-right',
};

/** ORS könnte künftig neue Manöver-Codes einführen; "straight" ist der neutralste Fallback. */
export function orsCodeToManeuverKind(code: number): ManeuverKind {
  return ORS_CODE_TO_KIND[code] ?? 'straight';
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/lib/OrsManeuverKind.test.ts`
Expected: PASS (2/2 Tests grün).

- [ ] **Step 5: Commit**

```bash
git add src/lib/OrsManeuverKind.ts src/lib/OrsManeuverKind.test.ts
git commit -m "feat(routing): OrsManeuverKind.ts — ORS-Code-zu-ManeuverKind-Übersetzung"
```

---

## Task 3: `RoutingService.ts` — ORS-Antworten übersetzen

**Files:**
- Modify: `src/lib/RoutingService.ts`
- Modify: `src/lib/RoutingService.test.ts`

**Interfaces:**
- Consumes: `orsCodeToManeuverKind` aus `./OrsManeuverKind` (Task 2).
- Produces: `RoutingService.calculateRoute()` liefert `RouteStep.type` jetzt als `ManeuverKind`
  statt roher ORS-Zahl — Konsumenten (`RoutingSidebar.ts`/`RoutingDetailsFormatter.ts`) merken
  nichts von der Änderung (gleicher öffentlicher Vertrag, nur korrekt typisiert befüllt).

- [ ] **Step 1: Failing Test schreiben**

Füge in `src/lib/RoutingService.test.ts` an (nach dem bestehenden `describe('RoutingService.calculateRoute extraInfo', ...)`-Block):

```typescript
describe('RoutingService.calculateRoute maneuver type translation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('translates raw ORS numeric step types into ManeuverKind strings', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: {
            summary: { distance: 1000, duration: 60 },
            segments: [{
              distance: 1000, duration: 60,
              steps: [
                { distance: 500, duration: 30, type: 1, instruction: 'Turn right', name: 'X', way_points: [0, 5] },
                { distance: 500, duration: 30, type: 6, instruction: 'Continue', name: 'Y', way_points: [5, 10] },
              ],
            }],
          },
        }],
        metadata: {},
      }),
    })));

    const result = await RoutingService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'driving-car');

    const steps = result!.features[0].properties.segments![0].steps;
    expect(steps[0].type).toBe('turn-right');
    expect(steps[1].type).toBe('straight');
  });

  it('leaves the route intact when the response has no segments (e.g. a profile without turn-by-turn)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: { summary: { distance: 1000, duration: 60 } },
        }],
        metadata: {},
      }),
    })));

    const result = await RoutingService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'driving-car');
    expect(result!.features[0].properties.segments).toBeUndefined();
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/RoutingService.test.ts`
Expected: FAIL — `steps[0].type` ist noch `1` (roh durchgereicht), nicht `'turn-right'`.

- [ ] **Step 3: Übersetzung in `calculateRoute()` einbauen**

In `src/lib/RoutingService.ts`, füge den Import hinzu:

```typescript
import { RouteResult, RoutingStation } from '../types/common';
import { orsCodeToManeuverKind } from './OrsManeuverKind';
```

Füge vor `export const RoutingService = {` eine neue Funktion ein:

```typescript
/**
 * Übersetzt die rohen ORS-Zahlencodes in properties.segments[].steps[].type auf ManeuverKind —
 * ORS liefert weiterhin Zahlen, ManeuverIcons.ts/RoutingDetailsFormatter.ts kennen nur noch
 * ManeuverKind (siehe docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md).
 * Alles andere an der Antwort bleibt unverändert (Zero-Transform-Prinzip bleibt für den Rest
 * erhalten).
 */
function translateOrsManeuverKinds(data: any): RouteResult {
  const features = (data.features ?? []).map((feature: any) => {
    const segments = feature.properties?.segments?.map((segment: any) => ({
      ...segment,
      steps: (segment.steps ?? []).map((step: any) => ({
        ...step,
        type: orsCodeToManeuverKind(step.type),
      })),
    }));
    return segments
      ? { ...feature, properties: { ...feature.properties, segments } }
      : feature;
  });
  return { ...data, features };
}
```

Ändere in `calculateRoute()`:

```typescript
      if (!res.ok) throw new Error('Routing fehlgeschlagen');
      const data = await res.json();
      return data as RouteResult;
```

zu:

```typescript
      if (!res.ok) throw new Error('Routing fehlgeschlagen');
      const data = await res.json();
      return translateOrsManeuverKinds(data);
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/lib/RoutingService.test.ts`
Expected: PASS (alle Tests grün, inkl. der bestehenden `extraInfo`-Tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: Keine Fehler mehr in `RoutingService.ts`. Fehler in `ValhallaRouteInterpreter.ts`
(liefert `RouteStep.type` noch nicht) sind an dieser Stelle noch erwartet — Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/lib/RoutingService.ts src/lib/RoutingService.test.ts
git commit -m "feat(routing): RoutingService übersetzt ORS-Manöver-Codes zu ManeuverKind"
```

---

## Task 4: `ValhallaRouteInterpreter.ts` — Turn-by-Turn parsen

**Files:**
- Modify: `src/lib/ValhallaRouteInterpreter.ts`
- Modify: `src/lib/ValhallaRouteInterpreter.test.ts`

**Interfaces:**
- Consumes: `ManeuverKind` aus `../types/common` (Task 1); `RouteStep`/`RouteSegment` aus
  `../types/common`.
- Produces: `valhallaTypeToManeuverKind(type: number): ManeuverKind` (exportiert, für
  Direkttests); `toRouteResult()` liefert jetzt befüllte `properties.segments`, wenn `maneuvers[]`
  vorhanden ist.

- [ ] **Step 1: Bestehenden "no turn-by-turn"-Test ersetzen, neue Tests schreiben (failing)**

Ersetze in `src/lib/ValhallaRouteInterpreter.test.ts` den Test
`'leaves extras and segments undefined (no turn-by-turn support yet)'` durch:

```typescript
  it('leaves segments undefined when no leg has maneuvers (no turn-by-turn data available)', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    const result = toRouteResult({ legs: [{ shape }], summary: { time: 1, length: 1 } });
    expect(result.features[0].properties.extras).toBeUndefined();
    expect(result.features[0].properties.segments).toBeUndefined();
  });

  it('populates segments[0].steps from maneuvers, translating type/length/time/street_names/shape-indices', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.15, 14.15], [48.2, 14.2]], 6);
    const result = toRouteResult({
      legs: [{
        shape,
        maneuvers: [
          { type: 1, instruction: 'Fahren Sie los', time: 10, length: 0.5, begin_shape_index: 0, end_shape_index: 1, street_names: ['Hauptplatz'] },
          { type: 10, instruction: 'Biegen Sie rechts ab', time: 20, length: 1.2, begin_shape_index: 1, end_shape_index: 2 },
        ],
      }],
      summary: { time: 30, length: 1.7 },
    });

    const steps = result.features[0].properties.segments![0].steps;
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({
      distance: 500, duration: 10, type: 'depart', instruction: 'Fahren Sie los', name: 'Hauptplatz', way_points: [0, 1],
    });
    expect(steps[1]).toEqual({
      distance: 1200, duration: 20, type: 'turn-right', instruction: 'Biegen Sie rechts ab', name: '', way_points: [1, 2],
    });
  });

  it('sets segments[0].distance/duration from the trip summary, not the sum of maneuver lengths', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    const result = toRouteResult({
      legs: [{ shape, maneuvers: [{ type: 8, instruction: 'x', time: 5, length: 0.1, begin_shape_index: 0, end_shape_index: 1 }] }],
      summary: { time: 300, length: 12.5 },
    });
    expect(result.features[0].properties.segments![0].distance).toBeCloseTo(12500, 1);
    expect(result.features[0].properties.segments![0].duration).toBe(300);
  });
});

describe('valhallaTypeToManeuverKind', () => {
  it('maps every documented, reachable Valhalla maneuver type to its exact ManeuverKind', () => {
    const cases: [number, string][] = [
      [1, 'depart'], [2, 'depart-right'], [3, 'depart-left'],
      [4, 'goal'], [5, 'goal-right'], [6, 'goal-left'],
      [7, 'becomes'],
      [8, 'straight'],
      [9, 'slight-right'], [10, 'turn-right'], [11, 'sharp-right'],
      [12, 'uturn-right'], [13, 'uturn-left'],
      [14, 'sharp-left'], [15, 'turn-left'], [16, 'slight-left'],
      [17, 'ramp-straight'], [18, 'ramp-right'], [19, 'ramp-left'],
      [20, 'exit-right'], [21, 'exit-left'],
      [22, 'stay-straight'], [23, 'keep-right'], [24, 'keep-left'],
      [25, 'merge'],
      [26, 'roundabout-enter'], [27, 'roundabout-exit'],
      [28, 'ferry-enter'], [29, 'ferry-exit'],
    ];
    for (const [type, expected] of cases) {
      expect(valhallaTypeToManeuverKind(type)).toBe(expected);
    }
  });

  it('falls back to "straight" for kNone (0) and all 7 transit maneuver types (30-36)', () => {
    for (const type of [0, 30, 31, 32, 33, 34, 35, 36]) {
      expect(valhallaTypeToManeuverKind(type)).toBe('straight');
    }
  });

  it('falls back to "straight" for an entirely unknown type', () => {
    expect(valhallaTypeToManeuverKind(999)).toBe('straight');
  });
});
```

Passe den Import am Dateianfang an:

```typescript
import { toRouteResult, valhallaTypeToManeuverKind } from './ValhallaRouteInterpreter';
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/ValhallaRouteInterpreter.test.ts`
Expected: FAIL — `valhallaTypeToManeuverKind` existiert noch nicht, `maneuvers[]` wird noch nicht
verarbeitet, `segments` bleibt immer `undefined`.

- [ ] **Step 3: `ValhallaRouteInterpreter.ts` erweitern**

Ersetze den kompletten Dateiinhalt von `src/lib/ValhallaRouteInterpreter.ts`:

```typescript
import * as polyline from '@mapbox/polyline';
import { Position } from 'geojson';
import { RouteResult, RouteStep, ManeuverKind } from '../types/common';

export interface ValhallaManeuver {
  type: number;
  instruction: string;
  street_names?: string[];
  time: number;
  length: number;
  begin_shape_index: number;
  end_shape_index: number;
}

export interface ValhallaLeg {
  shape: string;
  maneuvers?: ValhallaManeuver[];
}

export interface ValhallaTripSummary {
  time: number;
  length: number;
}

export interface ValhallaTrip {
  legs: ValhallaLeg[];
  summary: ValhallaTripSummary;
}

// Valhallas numerischer Manöver-Typ (0-36, siehe valhalla-docs/turn-by-turn/api-reference.md)
// → providerneutraler ManeuverKind. kNone (0) und die 7 Transit-Typen (30-36) sind bewusst nicht
// gelistet — Transit/Multimodal-Costing ist in dieser Instanz mangels GTFS-Daten nicht nutzbar
// (docs/valhalla-api-guide.md), keines der unterstützten Profile kann diese Typen je liefern;
// beide fallen auf 'straight' zurück wie jeder unbekannte Wert (siehe
// docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md).
const VALHALLA_TYPE_TO_KIND: Record<number, ManeuverKind> = {
  1: 'depart', 2: 'depart-right', 3: 'depart-left',
  4: 'goal', 5: 'goal-right', 6: 'goal-left',
  7: 'becomes',
  8: 'straight',
  9: 'slight-right', 10: 'turn-right', 11: 'sharp-right',
  12: 'uturn-right', 13: 'uturn-left',
  14: 'sharp-left', 15: 'turn-left', 16: 'slight-left',
  17: 'ramp-straight', 18: 'ramp-right', 19: 'ramp-left',
  20: 'exit-right', 21: 'exit-left',
  22: 'stay-straight', 23: 'keep-right', 24: 'keep-left',
  25: 'merge',
  26: 'roundabout-enter', 27: 'roundabout-exit',
  28: 'ferry-enter', 29: 'ferry-exit',
};

export function valhallaTypeToManeuverKind(type: number): ManeuverKind {
  return VALHALLA_TYPE_TO_KIND[type] ?? 'straight';
}

/**
 * Übersetzt Valhallas `/route`-Antwort (komprimiertes Polyline6-`shape` pro Leg,
 * `summary.length` in km, optional `maneuvers[]` pro Leg) in dieselbe `RouteResult`-Struktur, die
 * ORS liefert (Meter/Sekunden) — damit RoutingMapLayers/updateRoutingSummary unverändert bleiben.
 */
export function toRouteResult(trip: ValhallaTrip): RouteResult {
  const coordinates: Position[] = trip.legs.flatMap((leg) =>
    polyline.decode(leg.shape, 6).map(([lat, lon]) => [lon, lat] as Position)
  );

  const steps: RouteStep[] = trip.legs.flatMap((leg) =>
    (leg.maneuvers ?? []).map((m): RouteStep => ({
      distance: m.length * 1000,
      duration: m.time,
      type: valhallaTypeToManeuverKind(m.type),
      instruction: m.instruction,
      name: m.street_names?.[0] ?? '',
      way_points: [m.begin_shape_index, m.end_shape_index],
    }))
  );

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: {
          summary: {
            distance: trip.summary.length * 1000,
            duration: trip.summary.time,
          },
          ...(steps.length > 0
            ? { segments: [{ distance: trip.summary.length * 1000, duration: trip.summary.time, steps }] }
            : {}),
        },
      },
    ],
    metadata: {},
  };
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/lib/ValhallaRouteInterpreter.test.ts`
Expected: PASS (alle Tests grün, inkl. der bestehenden Shape-Decoding-/Multi-Leg-Tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, keine Fehler mehr im gesamten Projekt (letzter Task, der `RouteStep`-Erzeuger
ändert).

- [ ] **Step 6: Commit**

```bash
git add src/lib/ValhallaRouteInterpreter.ts src/lib/ValhallaRouteInterpreter.test.ts
git commit -m "feat(routing): Valhalla-Turn-by-Turn — maneuvers[] parsen, alle 30 ManeuverKind-Werte übersetzt"
```

---

## Task 5: Bestehende Test-Fixtures auf `ManeuverKind`-Strings umstellen

**Files:**
- Modify: `src/components/RoutingSidebar.test.ts`

**Interfaces:**
- Consumes: nichts Neues (reine Test-Fixture-Anpassung an den seit Task 1 geänderten Typ).
- Produces: nichts, das andere Tasks konsumieren.

- [ ] **Step 1: Numerische `type`-Werte in Turn-by-Turn-Test-Fixtures ersetzen**

In `src/components/RoutingSidebar.test.ts`, im `describe('updateRoutingSummary turn-by-turn disclosure', ...)`-Block:

Ersetze:

```typescript
          { distance: 176.2, duration: 63.4, type: 11, instruction: 'Head south on Hauptplatz', name: 'Hauptplatz', way_points: [0, 10] },
          { distance: 1000, duration: 80.9, type: 6, instruction: 'Continue straight onto Hauptstraße', name: 'Hauptstraße', way_points: [10, 20] },
```

durch:

```typescript
          { distance: 176.2, duration: 63.4, type: 'depart', instruction: 'Head south on Hauptplatz', name: 'Hauptplatz', way_points: [0, 10] },
          { distance: 1000, duration: 80.9, type: 'straight', instruction: 'Continue straight onto Hauptstraße', name: 'Hauptstraße', way_points: [10, 20] },
```

und in der Test-Fixture direkt darunter (`'places the disclosure block at or after...'`):

```typescript
      { distance: 100, duration: 10, steps: [{ distance: 100, duration: 10, type: 6, instruction: 'Continue straight', name: '', way_points: [0, 1] }] },
```

durch:

```typescript
      { distance: 100, duration: 10, steps: [{ distance: 100, duration: 10, type: 'straight', instruction: 'Continue straight', name: '', way_points: [0, 1] }] },
```

- [ ] **Step 2: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/components/RoutingSidebar.test.ts`
Expected: PASS (alle 27 Tests grün — die Icon-Markup-Assertions selbst prüfen keine konkreten
Pfad-Inhalte, nur Vorhandensein von `disclosure-item-icon`, bleiben also unverändert grün).

- [ ] **Step 3: Projektweiter Typecheck + volle Testsuite**

Run: `npx tsc --noEmit && npm test`
Expected: Beide PASS, keine Fehler/Fehlschläge im gesamten Projekt.

- [ ] **Step 4: Commit**

```bash
git add src/components/RoutingSidebar.test.ts
git commit -m "test(routing): Turn-by-Turn-Test-Fixtures auf ManeuverKind-Strings umgestellt"
```

---

## Task 6: Verifikation, Live-Check, Abschluss

**Files:**
- Keine (Verifikation + optionale Nachbesserung).

**Interfaces:**
- Consumes: alles aus Task 1-5 (fertige Implementierung).
- Produces: nichts (Abschluss-Task).

- [ ] **Step 1: Volle Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: Beide PASS.

- [ ] **Step 2: Live-Check, so weit wie in dieser Umgebung möglich**

Run: `npm run dev:vite` (Hintergrund), dann `/routing` im Browser (oder Playwright) öffnen, Provider
Valhalla wählen, A→B mit zwei realen Koordinaten in Oberösterreich berechnen.

**Bekannte Einschränkung dieser Umgebung:** `VALHALLA_URL`/`ORS_URL` sind typischerweise nur via
Tailscale/internes Netz erreichbar — in einer Sandbox ohne diese Konnektivität liefert
`api/valhalla.php`/`api/ors.php` ggf. 502/Fehler, unabhängig vom hier implementierten Code (siehe
bereits bei der Status-Anzeige-Runde beobachtet). Falls das der Fall ist: das ist **kein**
Implementierungsfehler dieses Plans — dokumentiere es im Abschlussbericht ehrlich statt einen
Erfolg zu behaupten, der nicht stattgefunden hat. Verifiziere stattdessen ersatzweise:
- Keine Konsolenfehler beim Öffnen von `/routing` und beim Umschalten des Providers.
- `npx vitest run src/lib/ManeuverIcons.test.ts src/lib/OrsManeuverKind.test.ts src/lib/ValhallaRouteInterpreter.test.ts src/lib/RoutingService.test.ts src/components/RoutingSidebar.test.ts`
  deckt bereits alle 30 `ManeuverKind`-Werte tabellengetrieben ab (Task 1-5) — das ist in dieser
  Umgebung die primäre Korrektheits-Evidenz, nicht der Live-Check.

Falls echte Netzwerk-Konnektivität zu ORS/Valhalla in dieser Umgebung doch vorhanden ist: gezielt
eine Route über eine Autobahnauf-/-abfahrt wählen, damit mindestens eines der 16 neuen Icons
(`ramp-*`/`exit-*`) real durchläuft, nicht nur per Unit-Test.

- [ ] **Step 3: Commit (falls Step 2 Nachbesserungen ergab)**

Nur falls Step 2 einen echten Fehler fand, der noch nicht durch Task 1-5 abgedeckt ist — sonst
diesen Schritt überspringen (nichts zu committen).

## Self-Review-Hinweis für die Ausführung

- Nach Task 5 darf `grep -rn ": number" src/types/common.ts` für `RouteStep.type` keinen Treffer
  mehr liefern — falls doch, wurde Task 1 Step 1 nicht vollständig angewendet.
- `grep -rn "orsCode" src/lib/ManeuverIcons.ts` muss nach Task 1 leer sein — die alte
  zahlenbasierte Signatur darf nirgends überlebt haben.
- Alle 30 `ManeuverKind`-Werte müssen nach Task 1 in `MANEUVER_ICON_PATHS` UND nach Task 4 in
  mindestens einer der beiden Übersetzungstabellen (ORS oder Valhalla) als Zielwert vorkommen —
  ein Wert, der nirgends als Ziel auftaucht, ist niemals über echte Provider-Daten erreichbar und
  ein Hinweis auf eine vergessene Zuordnung.
