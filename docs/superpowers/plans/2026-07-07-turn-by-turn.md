# Turn-by-Turn-Anzeige (Routing Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn-by-Turn-Wegbeschreibung für A→B-Routen in der Routing-Sidebar anzeigen, als eingeklapptes `oe5ith-ci`-Disclosure-Panel mit einem Abbiege-Icon pro Schritt.

**Architecture:** ORS liefert `segments[].steps[]` bereits standardmäßig in der Routen-Response. Ein neues, reines Formatter-Modul wandelt sie in Anzeige-Strings um (Icon-Markup + Text + Distanz), ein neues Icon-Modul liefert das SVG-Markup pro ORS-Manöver-Code, `RoutingSidebar.ts` rendert das Ergebnis als natives `<details>`-Element (kein JS für Auf-/Zuklappen).

**Tech Stack:** TypeScript, Vitest, vanilla DOM-String-Templates (bestehendes Muster aus `RoutingSidebar.ts`), `oe5ith-ci` CSS-Submodul (disclosure.css, manuell nach `src/styles/` synchronisiert).

**Referenz-Spec:** [docs/superpowers/specs/2026-07-07-turn-by-turn-design.md](../specs/2026-07-07-turn-by-turn-design.md)

## Global Constraints

- `npx tsc --noEmit && npm test` muss nach jedem Task grün bleiben.
- Keine hartkodierten Farben/Radii/Spacing — nur bestehende CI-Klassen (`.disclosure-*`, `.badge-gray`) verwenden, keine neuen CSS-Regeln in website-v3-eigenen Dateien nötig.
- UI-Text und Kommentare auf Deutsch, passend zur Umgebung der jeweiligen Datei.
- Kein Fix/keine Änderung im `oe5ith-ci`-Submodul selbst aus diesem Repo heraus — nur Pointer-Bump + Datei-Sync nach `src/styles/`.
- Scope nur A→B-Modus (SEW/NEF bleibt unverändert, siehe ROADMAP.md).
- Jeder Task endet mit einem eigenen Commit (Conventional Commits, deutsches Subject).

---

### Task 1: `oe5ith-ci` Submodul-Bump + `disclosure.css`-Sync

**Files:**
- Modify: `oe5ith-ci` (Submodul-Pointer)
- Create: `src/styles/disclosure.css`
- Modify: `src/app.css:14` (Import-Block)

**Interfaces:**
- Produces: CSS-Klassen `.disclosure`, `.disclosure-header`, `.disclosure-title`, `.disclosure-count`, `.disclosure-chevron`, `.disclosure-body`, `.disclosure-item`, `.disclosure-item-icon`, `.disclosure-item-text`, `.disclosure-item-meta` — verfügbar für Task 4.

- [ ] **Step 1: Submodul-Pointer auf v1.20.0 heben**

```bash
cd oe5ith-ci && git fetch origin && git checkout v1.20.0 && cd ..
git status
```

Erwartet: `git status` zeigt `oe5ith-ci` als modifizierten Pfad (neuer committeter Commit-Hash `56ea05a17cacb4570901da0991da46d7eb991dce`).

- [ ] **Step 2: `disclosure.css` nach `src/styles/` kopieren**

Datei `src/styles/disclosure.css` mit exakt folgendem Inhalt anlegen (1:1 aus `oe5ith-ci/css/disclosure.css` v1.20.0):

```css
/*
 * OE5ITH CI — disclosure.css
 * Disclosure (Single-Panel): ein einzelnes auf-/zuklappbares Panel
 * ohne Auswahlzustand, nativ auf <details>/<summary> aufgebaut.
 * Kein JS für Auf-/Zu nötig (Unterschied zu .accordion in sidebar.css).
 *
 * Voraussetzung: css/common.css, css/badges.css (für .disclosure-count)
 */

/* ═══════════════════════════════════════
   WRAPPER
   ═══════════════════════════════════════ */
.disclosure {
  /* Kein eigener Rahmen zwingend — fügt sich in .panel/.panel-body ein */
}

/* ═══════════════════════════════════════
   HEADER (<summary>)
   ═══════════════════════════════════════ */
.disclosure-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  list-style: none;
  transition: background var(--transition-base);
}
.disclosure-header::-webkit-details-marker {
  display: none;
}
.disclosure-header:hover {
  background: var(--surface-hover);
}
.disclosure-header:focus-visible {
  outline: 2px solid var(--accent-border);
  outline-offset: -2px;
}

.disclosure-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* .disclosure-count erbt Optik vollständig von .badge (badges.css) */

.disclosure-chevron {
  font-size: 0.65rem;
  color: var(--muted);
  transition: transform var(--transition-base);
  flex-shrink: 0;
}
details.disclosure[open] .disclosure-chevron {
  transform: rotate(180deg);
}

/* ═══════════════════════════════════════
   BODY
   Kein max-height-Hack: <details> übernimmt
   Ein-/Ausblenden nativ.
   ═══════════════════════════════════════ */
.disclosure-body {
  padding: 4px 10px 8px;
}

/* ═══════════════════════════════════════
   ITEM
   ═══════════════════════════════════════ */
.disclosure-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}
.disclosure-item:last-child {
  border-bottom: none;
}

.disclosure-item-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--text);
}

.disclosure-item-text {
  flex: 1;
  min-width: 0;
  color: var(--text);
  font-size: 0.82rem;
}

.disclosure-item-meta {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 0.72rem;
}

/* ═══════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .disclosure-header,
  .disclosure-chevron {
    transition: none;
  }
}
```

- [ ] **Step 3: Import in `src/app.css` ergänzen**

In `src/app.css`, direkt nach der Zeile `@import "./styles/badges.css";` (disclosure.css setzt laut Kopfkommentar `common.css` + `badges.css` voraus) folgende Zeile einfügen:

```css
@import "./styles/disclosure.css";
```

- [ ] **Step 4: Build-Check**

Run: `npx tsc --noEmit && npm run build`
Expected: Beide Befehle laufen ohne Fehler durch (CSS-Import wird von Vite ohne Fehler verarbeitet).

- [ ] **Step 5: Commit**

```bash
git add oe5ith-ci src/styles/disclosure.css src/app.css
git commit -m "$(cat <<'EOF'
chore(ci): oe5ith-ci Submodul auf v1.20.0 aktualisiert (Maneuver-Icons, Disclosure-Item-Icon)

disclosure.css nach src/styles/ synchronisiert (analog zum bestehenden
CSS-Sync-Muster), Grundlage für die Turn-by-Turn-Anzeige.
EOF
)"
```

---

### Task 2: `src/lib/ManeuverIcons.ts` — ORS-Manöver-Code → Icon-Markup

**Files:**
- Create: `src/lib/ManeuverIcons.ts`
- Test: `src/lib/ManeuverIcons.test.ts`

**Interfaces:**
- Produces: `getManeuverIconMarkup(orsCode: number): string` — konsumiert von Task 3 (`RoutingDetailsFormatter.formatSteps`).

- [ ] **Step 1: Test schreiben**

`src/lib/ManeuverIcons.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getManeuverIconMarkup } from './ManeuverIcons';

describe('getManeuverIconMarkup', () => {
  it('returns svg markup with the disclosure-item-icon class and a 16x16 viewBox for a known ORS code', () => {
    const markup = getManeuverIconMarkup(1);
    expect(markup).toContain('class="disclosure-item-icon"');
    expect(markup).toContain('viewBox="0 0 16 16"');
    expect(markup).toContain('M8 13 Q8 7 13.4 7');
  });

  it('returns distinct markup for each of the 14 known ORS codes (0-13)', () => {
    const codes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const markups = codes.map(getManeuverIconMarkup);
    expect(new Set(markups).size).toBe(codes.length);
  });

  it('falls back to the straight-arrow icon (code 6) for an unknown ORS code', () => {
    expect(getManeuverIconMarkup(99)).toBe(getManeuverIconMarkup(6));
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/ManeuverIcons.test.ts`
Expected: FAIL mit „Cannot find module './ManeuverIcons'" (Datei existiert noch nicht).

- [ ] **Step 3: Implementierung schreiben**

`src/lib/ManeuverIcons.ts` (Icon-Pfade 1:1 aus `oe5ith-ci/assets/maneuver-icons/*.svg` v1.20.0 übernommen):

```ts
// ORS-Manöver-Code (0-13) → inneres SVG-Markup, 1:1 aus oe5ith-ci/assets/maneuver-icons/*.svg
// (v1.20.0) übernommen. Siehe oe5ith-ci/docs/maneuver-icons.md für den vollständigen Katalog.
const MANEUVER_ICON_PATHS: Record<number, string> = {
  0: '<path d="M8 13 Q8 7 2.6 7"/><path d="M2 4.7 L2.6 7 L4.1 5.2"/>',
  1: '<path d="M8 13 Q8 7 13.4 7"/><path d="M14 4.7 L13.4 7 L11.9 5.2"/>',
  2: '<path d="M8 13 Q8 11.5 3.8 11.5"/><path d="M1.6 10.5 L3.8 11.5 L3.4 9.2"/>',
  3: '<path d="M8 13 Q8 11.5 12.2 11.5"/><path d="M14.4 10.5 L12.2 11.5 L12.6 9.2"/>',
  4: '<path d="M8 13 Q8 3 5.7 3"/><path d="M7.3 1.2 L5.7 3 L8.1 3.2"/>',
  5: '<path d="M8 13 Q8 3 10.3 3"/><path d="M8.7 1.2 L10.3 3 L7.9 3.2"/>',
  6: '<path d="M8 13 V4"/><path d="M5.5 6.5 L8 4 L10.5 6.5"/>',
  7: '<circle cx="8" cy="8" r="4"/><path d="M8 14 V12"/><path d="M6 12.5 L8 10.5 L10 12.5"/>',
  8: '<circle cx="8" cy="8" r="4"/><path d="M8 4 V2"/><path d="M6 3.5 L8 1.5 L10 3.5"/>',
  9: '<path d="M11 13 V6 A3 3 0 0 0 5 6 V9"/><path d="M2.8 7 L5 9.5 L7.2 7"/>',
  10: '<path d="M5 14.5 V2.5"/><path d="M5 3 L11.5 5.2 L5 7.4 Z" fill="currentColor" stroke="none"/>',
  11: '<circle cx="8" cy="8" r="5" stroke-width="1.3"/><circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none"/>',
  12: '<path d="M8 13 V9"/><path d="M8 9 Q8 6 5.5 4.5"/><path d="M7.2 2.8 L5.3 4.3 L6.8 6.4"/><path d="M8 9 Q8 6.5 10 5.5" opacity="0.35"/>',
  13: '<path d="M8 13 V9"/><path d="M8 9 Q8 6 10.5 4.5"/><path d="M8.8 2.8 L10.7 4.3 L9.2 6.4"/><path d="M8 9 Q8 6.5 6 5.5" opacity="0.35"/>',
};

// ORS könnte künftig neue Manöver-Codes einführen; "Straight" ist der neutralste Fallback.
const FALLBACK_ORS_CODE = 6;

export function getManeuverIconMarkup(orsCode: number): string {
  const inner = MANEUVER_ICON_PATHS[orsCode] ?? MANEUVER_ICON_PATHS[FALLBACK_ORS_CODE];
  return `<svg class="disclosure-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npx vitest run src/lib/ManeuverIcons.test.ts`
Expected: PASS (3/3 Tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ManeuverIcons.ts src/lib/ManeuverIcons.test.ts
git commit -m "$(cat <<'EOF'
feat(routing): ManeuverIcons-Modul für ORS-Manöver-Code → Icon-Markup

Übernimmt die 14 ci-maneuver-*-SVGs aus oe5ith-ci v1.20.0 als
statisches Mapping, Grundlage für die Turn-by-Turn-Anzeige.
EOF
)"
```

---

### Task 3: Typen + `formatSteps` in `RoutingDetailsFormatter.ts`

**Files:**
- Modify: `src/types/common.ts:57-67`
- Modify: `src/features/routing/RoutingDetailsFormatter.ts`
- Test: `src/features/routing/RoutingDetailsFormatter.test.ts`

**Interfaces:**
- Consumes: `getManeuverIconMarkup(orsCode: number): string` (Task 2)
- Produces: `RouteStep`, `RouteSegment` (Typen, aus `types/common.ts`), `FormattedStep { iconMarkup: string; text: string; meta: string }`, `formatSteps(segments: RouteSegment[] | undefined): FormattedStep[]` — konsumiert von Task 4 (`RoutingSidebar.ts`) und Task 5 (`RoutingSidebarAdapter.ts`, indirekt über den `segments`-Durchreich-Typ).

- [ ] **Step 1: Typen in `types/common.ts` ergänzen**

In `src/types/common.ts`, zwischen `RouteExtras` (Zeile 61) und `RouteFeatureProperties` (Zeile 63) einfügen:

```ts
export interface RouteStep {
    distance: number;
    duration: number;
    type: number;
    instruction: string;
    name: string;
    way_points: [number, number];
}

export interface RouteSegment {
    distance: number;
    duration: number;
    steps: RouteStep[];
}

```

Und `RouteFeatureProperties` (aktuell Zeile 63-67) um `segments` erweitern:

```ts
export interface RouteFeatureProperties {
    summary: { distance: number; duration: number };
    extras?: RouteExtras;
    segments?: RouteSegment[];
    [key: string]: any;
}
```

- [ ] **Step 2: Test für `formatSteps` schreiben**

In `src/features/routing/RoutingDetailsFormatter.test.ts`, Import-Zeile 2-3 erweitern:

```ts
import { getProfileBadge, getRouteWarnings, formatSteps } from './RoutingDetailsFormatter';
import { RouteExtras, RouteSegment } from '../../types/common';
```

Am Ende der Datei (nach dem letzten `});` von `describe('getRouteWarnings', ...)`) ergänzen:

```ts

describe('formatSteps', () => {
  it('returns an empty array when segments is undefined', () => {
    expect(formatSteps(undefined)).toEqual([]);
  });

  it('returns an empty array when segments is an empty array', () => {
    expect(formatSteps([])).toEqual([]);
  });

  it('flattens steps in order, keeps the instruction text unchanged, and formats distance under 1000 m in meters', () => {
    const segments: RouteSegment[] = [
      {
        distance: 1175.2,
        duration: 144.3,
        steps: [
          { distance: 176.2, duration: 63.4, type: 11, instruction: 'Head south on Hauptplatz', name: 'Hauptplatz', way_points: [0, 10] },
          { distance: 999, duration: 80.9, type: 6, instruction: 'Continue straight onto Hauptstraße', name: 'Hauptstraße', way_points: [10, 20] },
        ],
      },
    ];

    const result = formatSteps(segments);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Head south on Hauptplatz');
    expect(result[0].meta).toBe('176 m');
    expect(result[0].iconMarkup).toContain('disclosure-item-icon');
    expect(result[1].text).toBe('Continue straight onto Hauptstraße');
    expect(result[1].meta).toBe('999 m');
  });

  it('formats distance at and above 1000 m in km with one decimal', () => {
    const segments: RouteSegment[] = [
      {
        distance: 2500,
        duration: 200,
        steps: [
          { distance: 1000, duration: 60, type: 6, instruction: 'Continue straight', name: '', way_points: [0, 5] },
          { distance: 1500, duration: 90, type: 1, instruction: 'Turn right', name: '', way_points: [5, 10] },
        ],
      },
    ];

    const result = formatSteps(segments);

    expect(result[0].meta).toBe('1.0 km');
    expect(result[1].meta).toBe('1.5 km');
  });

  it('flattens steps from multiple segments in order', () => {
    const segments: RouteSegment[] = [
      { distance: 100, duration: 10, steps: [{ distance: 100, duration: 10, type: 11, instruction: 'Depart', name: '', way_points: [0, 1] }] },
      { distance: 200, duration: 20, steps: [{ distance: 200, duration: 20, type: 10, instruction: 'Arrive', name: '', way_points: [1, 2] }] },
    ];

    const result = formatSteps(segments);

    expect(result.map((s) => s.text)).toEqual(['Depart', 'Arrive']);
  });
});
```

- [ ] **Step 3: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/features/routing/RoutingDetailsFormatter.test.ts`
Expected: FAIL mit „formatSteps is not a function" bzw. TS-Fehler (Export existiert noch nicht).

- [ ] **Step 4: `formatSteps` implementieren**

In `src/features/routing/RoutingDetailsFormatter.ts`, Import-Zeile 1 erweitern:

```ts
import { RouteExtras, RouteSegment } from '../../types/common';
import { getManeuverIconMarkup } from '../../lib/ManeuverIcons';
```

Am Ende der Datei (nach `getRouteWarnings`) ergänzen:

```ts

export interface FormattedStep {
  iconMarkup: string;
  text: string;
  meta: string;
}

function formatStepDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatSteps(segments: RouteSegment[] | undefined): FormattedStep[] {
  if (!segments) return [];
  return segments.flatMap((segment) =>
    segment.steps.map((step) => ({
      iconMarkup: getManeuverIconMarkup(step.type),
      text: step.instruction,
      meta: formatStepDistance(step.distance),
    }))
  );
}
```

- [ ] **Step 5: Test ausführen, Erfolg bestätigen**

Run: `npx tsc --noEmit && npx vitest run src/features/routing/RoutingDetailsFormatter.test.ts`
Expected: PASS (11/11 Tests: 3 bestehende `getProfileBadge` + 6 bestehende `getRouteWarnings` + 4 neue `formatSteps`... — genaue Zahl per `npm test`-Gesamtlauf am Ende von Task 6 verifizieren)

- [ ] **Step 6: Commit**

```bash
git add src/types/common.ts src/features/routing/RoutingDetailsFormatter.ts src/features/routing/RoutingDetailsFormatter.test.ts
git commit -m "$(cat <<'EOF'
feat(routing): formatSteps — ORS segments/steps in Anzeige-Steps umwandeln

Neue Typen RouteStep/RouteSegment (additiv, RouteFeatureProperties um
segments erweitert). formatSteps flacht Segments ab und formatiert
Distanz adaptiv (< 1000 m in Metern, sonst km mit einer Nachkommastelle).
EOF
)"
```

---

### Task 4: Disclosure-Rendering in `RoutingSidebar.ts`

**Files:**
- Modify: `src/components/RoutingSidebar.ts:1-6` (Imports), `:278-326` (`updateRoutingSummary`)
- Test: `src/components/RoutingSidebar.test.ts`

**Interfaces:**
- Consumes: `formatSteps(segments): FormattedStep[]` (Task 3), Typ `RouteSegment` (Task 3/`types/common.ts`)
- Produces: `updateRoutingSummary(distance, duration, title?, profile?, extras?, segments?)` — erweiterte Signatur, konsumiert von Task 5 (`RoutingSidebarAdapter.ts`)

- [ ] **Step 1: Test schreiben**

In `src/components/RoutingSidebar.test.ts`, nach dem letzten `});` von `describe('updateRoutingSummary badges', ...)` (vor `describe('renderStationResults empty state', ...)`) einfügen:

```ts

describe('updateRoutingSummary turn-by-turn disclosure', () => {
  let details: ReturnType<typeof createFakeElement>;

  beforeEach(() => {
    details = createFakeElement();
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'routing-details' ? details : null),
    });
  });

  it('renders no disclosure block when segments is undefined', () => {
    updateRoutingSummary(1000, 60);
    expect(details.innerHTML).not.toContain('disclosure-header');
  });

  it('renders no disclosure block when segments has no steps', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', undefined, undefined, [
      { distance: 0, duration: 0, steps: [] },
    ]);
    expect(details.innerHTML).not.toContain('disclosure-header');
  });

  it('renders the Wegbeschreibung disclosure collapsed by default with one item per step', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', undefined, undefined, [
      {
        distance: 1176.2,
        duration: 144.3,
        steps: [
          { distance: 176.2, duration: 63.4, type: 11, instruction: 'Head south on Hauptplatz', name: 'Hauptplatz', way_points: [0, 10] },
          { distance: 1000, duration: 80.9, type: 6, instruction: 'Continue straight onto Hauptstraße', name: 'Hauptstraße', way_points: [10, 20] },
        ],
      },
    ]);

    expect(details.innerHTML).toContain('disclosure-header');
    expect(details.innerHTML).not.toContain('<details class="disclosure" open>');
    expect(details.innerHTML).toContain('2 Schritte');
    expect(details.innerHTML).toContain('Head south on Hauptplatz');
    expect(details.innerHTML).toContain('176 m');
    expect(details.innerHTML).toContain('Continue straight onto Hauptstraße');
    expect(details.innerHTML).toContain('1.0 km');
    expect(details.innerHTML).toContain('disclosure-item-icon');
  });

  it('places the disclosure block outside the result-item, after the result-list', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', undefined, undefined, [
      { distance: 100, duration: 10, steps: [{ distance: 100, duration: 10, type: 6, instruction: 'Continue straight', name: '', way_points: [0, 1] }] },
    ]);

    const resultItemIdx = details.innerHTML.indexOf('result-item active no-click');
    const disclosureIdx = details.innerHTML.indexOf('<details class="disclosure">');
    const divsBetween = (details.innerHTML.slice(resultItemIdx, disclosureIdx).match(/<\/div>/g) || []).length;

    expect(resultItemIdx).toBeGreaterThanOrEqual(0);
    expect(disclosureIdx).toBeGreaterThan(resultItemIdx);
    // Mindestens 2 schließende </div> (.result-item + .result-list) vor der Disclosure
    expect(divsBetween).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/components/RoutingSidebar.test.ts`
Expected: FAIL (TS-Fehler: `updateRoutingSummary` erwartet nur 5 Argumente; bzw. Assertions auf `disclosure-header` schlagen fehl, da noch nicht gerendert)

- [ ] **Step 3: `RoutingSidebar.ts` erweitern**

Import-Zeilen 3 und 6 ändern:

```ts
import { GeocodeResult, RouteExtras, RouteSegment } from '../types/common';
```

```ts
import { getProfileBadge, getRouteWarnings, formatSteps } from '../features/routing/RoutingDetailsFormatter';
```

`updateRoutingSummary` (aktuell Zeilen 278-326) komplett ersetzen durch:

```ts
export const updateRoutingSummary = (
  distance: number,
  duration: number,
  title: string = 'Zusammenfassung',
  profile?: string,
  extras?: RouteExtras,
  segments?: RouteSegment[]
) => {
  const details = document.getElementById('routing-details')!;
  const distKm = (distance / 1000).toFixed(2);
  const durMin = Math.round(duration / 60);

  const kvHtml = `
    <div class="result-kv">
      <div class="result-kv-item"><span class="result-kv-label">Distanz</span><span class="result-kv-value">${distKm} km</span></div>
      <div class="result-kv-item"><span class="result-kv-label">Dauer</span><span class="result-kv-value">${durMin} min</span></div>
    </div>
  `;

  const summaryRowHtml = profile
    ? (() => {
        const badge = getProfileBadge(profile);
        return `
          <div class="result-summary-row">
            <span class="result-mode-icon" title="${badge.label}" aria-label="${badge.label}" role="img">
              <i class="${badge.icon}" aria-hidden="true"></i>
            </span>
            ${kvHtml}
          </div>
        `;
      })()
    : kvHtml;

  const warningBadgesHtml = getRouteWarnings(extras)
    .map((w) => `<span class="badge badge-yellow"><i class="${w.icon}"></i> ${w.label}</span>`)
    .join('');

  const steps = formatSteps(segments);
  const disclosureHtml = steps.length > 0
    ? `
      <details class="disclosure">
        <summary class="disclosure-header">
          <span class="disclosure-title">Wegbeschreibung</span>
          <span class="disclosure-count badge badge-gray">${steps.length} Schritte</span>
          <i class="fa-solid fa-chevron-down disclosure-chevron"></i>
        </summary>
        <div class="disclosure-body">
          ${steps.map((s) => `
            <div class="disclosure-item">
              ${s.iconMarkup}
              <span class="disclosure-item-text">${s.text}</span>
              <span class="disclosure-item-meta mono">${s.meta}</span>
            </div>
          `).join('')}
        </div>
      </details>
    `
    : '';

  details.classList.remove('hidden');
  details.innerHTML = `
    <div class="result-header">
      <span class="result-label">${title}</span>
    </div>
    <div class="result-list">
      <div class="result-item active no-click">
        ${summaryRowHtml}
        ${warningBadgesHtml ? `<div class="result-badges">${warningBadgesHtml}</div>` : ''}
      </div>
    </div>
    ${disclosureHtml}
  `;
};
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npx tsc --noEmit && npx vitest run src/components/RoutingSidebar.test.ts`
Expected: PASS (alle Tests inkl. der 4 neuen)

- [ ] **Step 5: Commit**

```bash
git add src/components/RoutingSidebar.ts src/components/RoutingSidebar.test.ts
git commit -m "$(cat <<'EOF'
feat(routing): Turn-by-Turn-Disclosure in updateRoutingSummary rendern

Neuer optionaler segments-Parameter; bei vorhandenen Steps wird nach
der Zusammenfassungs-Karte ein eingeklapptes oe5ith-ci-Disclosure-Panel
mit Icon+Text+Distanz pro Schritt gerendert.
EOF
)"
```

---

### Task 5: `segments` von ORS bis zur Sidebar durchreichen

**Files:**
- Modify: `src/features/routing/RoutingSidebarAdapter.ts:47-48`
- Test: `src/features/routing/RoutingSidebarAdapter.test.ts`

**Interfaces:**
- Consumes: `updateRoutingSummary(distance, duration, title?, profile?, extras?, segments?)` (Task 4)

- [ ] **Step 1: Test schreiben**

In `src/features/routing/RoutingSidebarAdapter.test.ts`, innerhalb von `describe('RoutingSidebarAdapter A→B route details', ...)`, nach dem letzten Test (`'does not request extra_info for driving-emergency...'`) ergänzen:

```ts

  it('passes segments through so the sidebar renders the turn-by-turn disclosure', async () => {
    const dataService = new RoutingDataService();
    const map = { fitBounds: vi.fn() } as any;
    const adapter = new RoutingSidebarAdapter(dataService, map, new AbortController().signal);
    adapter.init({} as any);

    const routeResult = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          summary: { distance: 1176.2, duration: 144.3 },
          segments: [
            {
              distance: 1176.2,
              duration: 144.3,
              steps: [
                { distance: 176.2, duration: 63.4, type: 11, instruction: 'Head south on Hauptplatz', name: 'Hauptplatz', way_points: [0, 10] },
              ],
            },
          ],
        },
        geometry: { type: 'LineString', coordinates: [[14.1, 48.1], [14.2, 48.2]] },
      }],
    };
    const calculateRouteSpy = vi.spyOn(RoutingService, 'calculateRoute').mockResolvedValue(routeResult as any);

    expect(capturedOnRouteStart).not.toBeNull();
    await capturedOnRouteStart!({
      mode: 'ab',
      start: [48.1, 14.1],
      target: [48.2, 14.2],
      profile: 'driving-car',
    });

    const details = elements['routing-details'];
    expect(details.innerHTML).toContain('disclosure-header');
    expect(details.innerHTML).toContain('1 Schritte');
    expect(details.innerHTML).toContain('Head south on Hauptplatz');

    calculateRouteSpy.mockRestore();
  });
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/features/routing/RoutingSidebarAdapter.test.ts`
Expected: FAIL (kein `disclosure-header` im gerenderten Markup, da `segments` noch nicht durchgereicht wird)

- [ ] **Step 3: `RoutingSidebarAdapter.ts` anpassen**

Zeile 47-48 (aktuell):

```ts
          if (route && route.features && route.features.length > 0) {
            const { summary, extras } = route.features[0].properties;
            updateRoutingSummary(summary.distance, summary.duration, 'Zusammenfassung', params.profile, extras);
```

Ersetzen durch:

```ts
          if (route && route.features && route.features.length > 0) {
            const { summary, extras, segments } = route.features[0].properties;
            updateRoutingSummary(summary.distance, summary.duration, 'Zusammenfassung', params.profile, extras, segments);
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npx tsc --noEmit && npx vitest run src/features/routing/RoutingSidebarAdapter.test.ts`
Expected: PASS (alle Tests inkl. des neuen)

- [ ] **Step 5: Commit**

```bash
git add src/features/routing/RoutingSidebarAdapter.ts src/features/routing/RoutingSidebarAdapter.test.ts
git commit -m "$(cat <<'EOF'
feat(routing): segments von ORS-Response an die Sidebar durchreichen

RoutingSidebarAdapter destrukturiert jetzt auch segments und reicht sie
an updateRoutingSummary durch — letzter Baustein der Turn-by-Turn-Anzeige.
EOF
)"
```

---

### Task 6: Gesamt-Verifikation, Live-Check, Doku

**Files:**
- Modify: `TODO.md` (Turn-by-Turn-Eintrag entfernen/abhaken)
- Modify: `CHANGELOG.md` (neuer Eintrag)
- Modify: `src/lib/GlobalModals.ts` (In-App-Changelog, falls beim nächsten UI-Touch fällig — siehe CLAUDE.md „Known debt")

**Interfaces:**
- Consumes: alles aus Task 1-5

- [ ] **Step 1: Volle Test-/Typecheck-Suite**

Run: `npx tsc --noEmit && npm test`
Expected: Alle Tests grün, keine TS-Fehler.

- [ ] **Step 2: Live-Verifikation (Playwright gegen laufenden Dev-Server)**

Dev-Server muss laufen (`npm run dev`, siehe `CLAUDE.md`). Playwright-Skript gegen `/routing`:
1. A→B-Modus, eine echte Route berechnen (Start/Ziel-Koordinaten oder Adresse eingeben, „Start" klicken).
2. Screenshot: Disclosure-Panel „Wegbeschreibung" ist sichtbar und **eingeklappt** (kein `open`-Attribut sichtbar, Body nicht sichtbar).
3. Auf den Disclosure-Header klicken, Screenshot: Panel ist jetzt **aufgeklappt**, zeigt eine Liste von Schritten, jeder mit Icon + Text + Distanz.
4. `console --errors`-Äquivalent prüfen (page.on('pageerror')/('console') sammeln): keine Fehler.
5. Route zurücksetzen (`clearRoute()`-Pfad, z.B. neue Route mit leeren Feldern oder Modus-Wechsel): Disclosure-Panel verschwindet wieder vollständig aus dem DOM.

Expected: Alle 5 Punkte bestätigt, keine Konsolenfehler.

- [ ] **Step 3: `TODO.md` aktualisieren**

Im Abschnitt „Kleinere Map-Bugs (Sammeltask)" den Turn-by-Turn-Eintrag (beginnt mit „Turn-by-Turn-Anzeige für A→B-Routen (Phase 2 aus ...") durch folgende Zeile ersetzen:

```markdown
- [x] Turn-by-Turn-Anzeige für A→B-Routen (Phase 2) umgesetzt (2026-07-07) — siehe
  [docs/superpowers/specs/2026-07-07-turn-by-turn-design.md](./docs/superpowers/specs/2026-07-07-turn-by-turn-design.md).
```

- [ ] **Step 4: `CHANGELOG.md`-Eintrag ergänzen**

Neuen `[Unreleased]`-Block **oben** einfügen (nicht mit bestehendem Tages-Block mergen, siehe `AGENT_INSTRUCTIONS.md`):

```markdown
## [Unreleased] - 2026-07-07 <HH:MM einsetzen>

### Hinzugefügt
- **Turn-by-Turn-Wegbeschreibung für A→B-Routen** (Phase 2 von
  [docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md](./docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md),
  Design: [docs/superpowers/specs/2026-07-07-turn-by-turn-design.md](./docs/superpowers/specs/2026-07-07-turn-by-turn-design.md)).
  War blockiert auf einer generischen Disclosure-Komponente + Abbiege-Icons im `oe5ith-ci`-Submodul —
  beides seit `oe5ith-ci` v1.20.0 verfügbar (Submodul-Pointer aktualisiert). Neues Modul
  `src/lib/ManeuverIcons.ts` (ORS-Manöver-Code 0-13 → SVG-Icon-Markup, 14 `ci-maneuver-*`-Icons
  1:1 übernommen), `RoutingDetailsFormatter.formatSteps()` wandelt ORS' `segments[].steps[]`
  (kommt standardmäßig ohne Zusatzparameter mit) in Anzeige-Steps um (Icon + Instruction-Text +
  adaptiv formatierte Distanz). `RoutingSidebar.ts` rendert die Steps als eingeklapptes
  `oe5ith-ci`-Disclosure-Panel „Wegbeschreibung" unterhalb der Zusammenfassungs-Karte. Live
  verifiziert (Playwright, `/routing`, A→B-Route: Panel eingeklappt beim Laden, klappt auf/zu,
  verschwindet beim Zurücksetzen).

`npx tsc --noEmit && npm test` grün.
```

- [ ] **Step 5: Commit**

```bash
git add TODO.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: Turn-by-Turn-Anzeige in TODO.md/CHANGELOG.md als erledigt vermerkt
EOF
)"
```

## Self-Review (bereits durchgeführt)

- **Spec-Abdeckung:** CI-Sync (Task 1), ManeuverIcons-Modul (Task 2), Typen + formatSteps (Task 3), Disclosure-Rendering + Platzierung außerhalb `.result-item` (Task 4), Adapter-Durchreichung (Task 5), Error-Handling (leere/fehlende Segments in Task 3/4 getestet), Live-Verifikation (Task 6) — alle Abschnitte der Spec sind abgedeckt.
- **Placeholder-Scan:** keine TBD/TODO, kein "ähnlich wie Task N" — jeder Code-Block ist vollständig.
- **Typ-Konsistenz:** `RouteSegment`/`RouteStep` (Task 3) werden identisch in Task 4/5 verwendet; `FormattedStep { iconMarkup, text, meta }` wird in Task 3 definiert und in Task 4 exakt so konsumiert; `getManeuverIconMarkup(orsCode: number): string` (Task 2) wird in Task 3 mit `step.type: number` aufgerufen — Typen passen durchgehend.
