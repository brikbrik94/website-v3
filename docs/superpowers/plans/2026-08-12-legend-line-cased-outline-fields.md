# Legend width/dasharray/outline/line-cased: Client-Konsumierung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume `width`/`dasharray` (line), `outline_color`/`outline_width` (area), and the new
`line-cased` swatch type from `tiles.oe5ith.at/layers.json` in the map legend, now that
`oe5ith-ci` v1.25.0+`0092387` provides the CSS/rendering contract for them.

**Architecture:** `resolveSwatchFromLayersMetaColor()` (`src/lib/resolveLegendSwatch.ts`) gains a
decision tree that picks `line-cased` only when all 4 required fields resolve, otherwise degrades
to plain `line`/`area` without fabricating data. `MapLegend.ts`'s `addEntry()` is extended to
mirror `oe5ith-ci`'s reference implementation 1:1 (same clamp ranges, same dasharray-to-8px-cycle
scaling, same validation). `Sidebar.ts`/`MapPage.ts` thread the 4 new fields through unchanged in
shape — they already pass a single `LegendSwatch` object end-to-end.

**Tech Stack:** TypeScript, Vitest (`happy-dom` for DOM-touching tests) — no new dependencies.

## Global Constraints

- This round only touches the **single-swatch path**. `legend_items`/`legend_scale_id` rows stay
  `{label, color}` — no per-item `width`/`outline` concept, per `geodata-plugin-standard`.
- Never fabricate data: when `line-cased`'s 4 required fields aren't all resolvable, fall back to
  plain `line` with whatever IS resolvable (drop the outline), never substitute a placeholder
  color or force a "❓ unresolvable" marker just because outline data is partially present. This
  was explicitly discussed and approved by the user during brainstorming (see
  `docs/superpowers/specs/2026-08-12-legend-line-cased-outline-fields-design.md`).
  Same for `area`: a lone `outline_color` or `outline_width` (seen live on `ski-runs-downhill`/
  `-nordic`) is dropped, never passed partially (would make `oe5ith-ci`'s `addEntry()` throw).
- Clamp ranges and the dasharray-scaling formula in `MapLegend.ts` are copied verbatim from
  `oe5ith-ci/components/modal.html`'s reference implementation (the design system's own
  authoritative values, not invented locally) — line width 1-6px, area outline 1-3px, line-cased
  outline 2-8px, line-cased inner 1-6px additionally capped to (clamped outline_width − 1), dash
  cycle scaled to 8px (`scale = 8 / (dash + gap)`).
- Always run `npx tsc --noEmit && npm test` before considering any task or the whole plan done.
- Spec: `docs/superpowers/specs/2026-08-12-legend-line-cased-outline-fields-design.md` — read it
  for the full rationale (including why `color: null` + outline data is a real, if currently
  dormant, case — the "zoom-based interpolate expression" scenario).
- `happy-dom` (this repo's DOM test environment) has previously been observed to NOT normalize
  color values the way a real browser/jsdom would (e.g. keeps `#ff0000` instead of converting to
  `rgb(255, 0, 0)`) — if an assertion in this plan doesn't match actual test output for that
  reason, adjusting the assertion to match real `happy-dom` behavior is a legitimate adaptation,
  not a spec violation, as long as the underlying style property is still verified as set.

---

### Task 1: `resolveLegendSwatch.ts` — decision tree + dedup key extension

**Files:**
- Modify: `src/lib/resolveLegendSwatch.ts:4-13` (`SwatchType`, `LegendSwatch`)
- Modify: `src/lib/resolveLegendSwatch.ts:140-146` (`resolveSwatchFromLayersMetaColor`)
- Modify: `src/lib/resolveLegendSwatch.ts:158-160` (`computeSwatchDedupKey`)
- Test: `src/lib/resolveLegendSwatch.test.ts`

**Interfaces:**
- Produces: `SwatchType` includes `'line-cased'`. `LegendSwatch` gains `width?: number;
  dasharray?: [number, number]; outline_color?: string; outline_width?: number;`.
  `resolveSwatchFromLayersMetaColor(type, color, width?, dasharray?, outline_color?,
  outline_width?): LegendSwatch | null` — new 4 trailing optional parameters, existing 2-arg
  call sites keep working unchanged. `computeSwatchDedupKey()` signature unchanged, but the key
  string now includes the 4 new fields.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/resolveLegendSwatch.test.ts`, inside `describe('resolveSwatchFromLayersMetaColor',
...)` (after the existing `it('does not set icon for non-icon swatch types', ...)`, before the
closing `});`):

```ts
  it('resolves a full line-cased swatch when all 4 fields are present', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#3b82f6', 3, null, 'hsl(0, 0%, 100%)', 5)).toEqual({
      type: 'line-cased',
      color: '#3b82f6',
      width: 3,
      outline_color: 'hsl(0, 0%, 100%)',
      outline_width: 5,
    });
  });

  it('falls back to plain line when outline is set but color is unresolvable (ski-lifts case: zoom-interpolate expression)', () => {
    const color = ['interpolate', ['linear'], ['zoom'], 0, '#000000', 10, '#ffffff'];
    expect(resolveSwatchFromLayersMetaColor('line', color, 3, null, 'hsl(0, 0%, 100%)', 5)).toEqual({
      type: 'line',
      color: null,
      width: 3,
    });
  });

  it('falls back to plain line when outline is set but width is missing', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#3b82f6', null, null, 'hsl(0, 0%, 100%)', 5)).toEqual({
      type: 'line',
      color: '#3b82f6',
    });
  });

  it('resolves a plain line swatch with only width', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#3b82f6', 5)).toEqual({ type: 'line', color: '#3b82f6', width: 5 });
  });

  it('resolves a plain line swatch with only dasharray', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#3b82f6', null, [2, 1])).toEqual({
      type: 'line', color: '#3b82f6', dasharray: [2, 1],
    });
  });

  it('resolves an area swatch with both outline fields', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', '#3b82f6', null, null, '#1d4ed8', 1)).toEqual({
      type: 'area', color: '#3b82f6', outline_color: '#1d4ed8', outline_width: 1,
    });
  });

  it('drops a lone outline_width without outline_color for area (ski-runs-downhill/-nordic case)', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', null, null, null, null, 5)).toEqual({ type: 'area', color: null });
  });

  it('drops a lone outline_color without outline_width for area', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', '#3b82f6', null, null, '#1d4ed8', null)).toEqual({
      type: 'area', color: '#3b82f6',
    });
  });
```

Add to `describe('computeSwatchDedupKey', ...)` (after the existing `it('handles a null color
without throwing', ...)`, before the closing `});`):

```ts
  it('keeps different widths within the same overlay+template+type+color distinct', () => {
    const key1 = computeSwatchDedupKey('x', 'y', { type: 'line', color: '#111111', width: 3 });
    const key2 = computeSwatchDedupKey('x', 'y', { type: 'line', color: '#111111', width: 5 });
    expect(key1).not.toBe(key2);
  });

  it('keeps different dasharrays distinct', () => {
    const key1 = computeSwatchDedupKey('x', 'y', { type: 'line', color: '#111111', dasharray: [2, 1] });
    const key2 = computeSwatchDedupKey('x', 'y', { type: 'line', color: '#111111', dasharray: [4, 2] });
    expect(key1).not.toBe(key2);
  });

  it('keeps different outline fields distinct', () => {
    const key1 = computeSwatchDedupKey('x', 'y', { type: 'area', color: '#111111', outline_color: '#fff', outline_width: 1 });
    const key2 = computeSwatchDedupKey('x', 'y', { type: 'area', color: '#111111', outline_color: '#fff', outline_width: 2 });
    expect(key1).not.toBe(key2);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/resolveLegendSwatch.test.ts`
Expected: FAIL — `resolveSwatchFromLayersMetaColor` doesn't accept extra arguments yet / returns
wrong shape, `computeSwatchDedupKey` doesn't vary by the new fields yet.

- [ ] **Step 3: Write the implementation**

In `src/lib/resolveLegendSwatch.ts`, change `SwatchType` and `LegendSwatch` (currently lines 4-14):

```ts
export type SwatchType = 'dot' | 'line' | 'area' | 'icon' | 'line-cased';

export interface LegendSwatch {
  type: SwatchType;
  color: string | null;
  /** FontAwesome-Klasse, nur bei type: 'icon' relevant. layers.json liefert nur einen
   *  Tile-Server-Sprite-Namen (z.B. "aerialway-station-11"), kein echtes Sprite-Rendering in
   *  der Legende — dieses Feld trägt stattdessen einen generischen Fallback-Marker (siehe
   *  resolveSwatchFromLayersMetaColor()). */
  icon?: string;
  /** type:'line' (Höhe, geclampt 1-6px in MapLegend.ts) | type:'line-cased' (Pflicht, Innenbreite) */
  width?: number;
  /** type:'line' — [Strich, Lücke], proportional auf 8px-Zyklus skaliert in MapLegend.ts */
  dasharray?: [number, number];
  /** type:'area' (mit outline_width) | type:'line-cased' (Pflicht) */
  outline_color?: string;
  /** type:'area' (geclampt 1-3px) | type:'line-cased' (Pflicht, geclampt 2-8px) */
  outline_width?: number;
}
```

Replace `resolveSwatchFromLayersMetaColor` (currently lines 140-146):

```ts
/**
 * Wie resolveLegendSwatch(), aber für layers.json-Metadata (LayerMetaGroup), wo `type`/`color`
 * bereits direkt mitgeliefert werden statt aus einer echten LayerSpecification mit `paint`
 * extrahiert werden zu müssen (siehe docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md).
 *
 * Entscheidet für `type: 'line'`-Gruppen zwischen `line-cased` (nur wenn ALLE 4 Felder — color,
 * width, outline_color, outline_width — auflösbar sind) und plain `line` (Fallback, verwirft
 * dabei outline_*, statt Daten zu erfinden — siehe
 * docs/superpowers/specs/2026-08-12-legend-line-cased-outline-fields-design.md). Für
 * `type: 'area'`-Gruppen wird outline_color/outline_width nur übernommen, wenn BEIDE gesetzt
 * sind (ein einzelnes Feld wird verworfen, sonst würde MapLegend.addEntry() werfen).
 */
export function resolveSwatchFromLayersMetaColor(
  type: string | undefined,
  color: unknown,
  width?: number | null,
  dasharray?: [number, number] | null,
  outline_color?: string | null,
  outline_width?: number | null
): LegendSwatch | null {
  const swatchType = swatchTypeForLayerType(type ?? '');
  if (!swatchType) return null;
  const resolvedColor = extractLiteralColor(color);

  if (swatchType === 'line') {
    if (outline_color != null && outline_width != null && resolvedColor !== null && width != null) {
      return { type: 'line-cased', color: resolvedColor, width, outline_color, outline_width };
    }
    const resolved: LegendSwatch = { type: 'line', color: resolvedColor };
    if (width != null) resolved.width = width;
    if (dasharray != null) resolved.dasharray = dasharray;
    return resolved;
  }

  if (swatchType === 'area') {
    const resolved: LegendSwatch = { type: 'area', color: resolvedColor };
    if (outline_color != null && outline_width != null) {
      resolved.outline_color = outline_color;
      resolved.outline_width = outline_width;
    }
    return resolved;
  }

  const resolved: LegendSwatch = { type: swatchType, color: resolvedColor };
  if (swatchType === 'icon') resolved.icon = GENERIC_ICON_SWATCH_CLASS;
  return resolved;
}
```

Replace `computeSwatchDedupKey` (currently lines 158-160, keep the existing doc comment above it
unchanged, only change the function body):

```ts
export function computeSwatchDedupKey(overlayId: string, template: string, swatch: LegendSwatch): string {
  const dasharrayKey = swatch.dasharray ? swatch.dasharray.join(',') : 'null';
  return `${overlayId}:${template}:${swatch.type}:${swatch.color ?? 'null'}:${swatch.width ?? 'null'}:${dasharrayKey}:${swatch.outline_color ?? 'null'}:${swatch.outline_width ?? 'null'}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/resolveLegendSwatch.test.ts`
Expected: PASS (all tests, including the 8 new `resolveSwatchFromLayersMetaColor` tests and 3
new `computeSwatchDedupKey` tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/resolveLegendSwatch.ts src/lib/resolveLegendSwatch.test.ts
git commit -m "feat(legend): line-cased-Entscheidungsbaum + width/dasharray/outline im Dedup-Key"
```

---

### Task 2: `MapLegend.ts` — line-cased rendering + width/dasharray/outline

**Files:**
- Modify: `src/types/common.ts:19-29` (`LegendEntry`)
- Modify: `src/lib/MapLegend.ts:38-86` (`addEntry`, new private `_buildLineCased`)
- Test: `src/lib/MapLegend.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (different files, no import relationship).
- Produces: `LegendEntry`/`AddLegendEntryOptions` accept `type: '... | line-cased'` plus
  `width?/dasharray?/outline_color?/outline_width?`. Task 4 (`MapPage.ts`) passes these through
  from `event.swatch`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/MapLegend.test.ts`, inside `describe('MapLegend.addEntry', ...)` (after the last
existing `it`, before the closing `});`):

```ts
  it('renders a line-cased entry with two stacked bars, clamped heights', () => {
    legend.addEntry({ id: 'lc1', type: 'line-cased', color: '#3b82f6', width: 3, outline_color: '#ffffff', outline_width: 5, label: 'Skilift' });
    const wrapper = document.querySelector('.map-legend-line-cased') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.style.height).toBe('5px');
    const outline = wrapper.querySelector('.map-legend-line-cased-outline') as HTMLElement;
    const inner = wrapper.querySelector('.map-legend-line-cased-inner') as HTMLElement;
    expect(outline.style.height).toBe('5px');
    expect(inner.style.height).toBe('3px');
  });

  it('clamps line-cased outline_width to the 2-8px range', () => {
    // width=3 stays within its own 1-6px clamp and well below outline_width's clamped max, so
    // this isolates the outline clamp without triggering the inner-width cap rule (see next test).
    legend.addEntry({ id: 'lc2', type: 'line-cased', color: '#000000', width: 3, outline_color: '#ffffff', outline_width: 20, label: 'Test' });
    const wrapper = document.querySelector('.map-legend-line-cased') as HTMLElement;
    const outline = wrapper.querySelector('.map-legend-line-cased-outline') as HTMLElement;
    const inner = wrapper.querySelector('.map-legend-line-cased-inner') as HTMLElement;
    expect(outline.style.height).toBe('8px');
    expect(inner.style.height).toBe('3px');
  });

  it('caps line-cased inner width to outline_width - 1 when width would otherwise reach/exceed it', () => {
    // width=5 clamps to 5 (within 1-6px), outline_width=3 clamps to 3 (within 2-8px) — since
    // 5 >= 3, the inner bar must be capped to max(1, 3-1) = 2, not shown at its own clamped 5.
    legend.addEntry({ id: 'lc2b', type: 'line-cased', color: '#000000', width: 5, outline_color: '#ffffff', outline_width: 3, label: 'Test' });
    const wrapper = document.querySelector('.map-legend-line-cased') as HTMLElement;
    const outline = wrapper.querySelector('.map-legend-line-cased-outline') as HTMLElement;
    const inner = wrapper.querySelector('.map-legend-line-cased-inner') as HTMLElement;
    expect(outline.style.height).toBe('3px');
    expect(inner.style.height).toBe('2px');
  });

  it('throws when line-cased is missing a required field', () => {
    expect(() => legend.addEntry({ id: 'lc3', type: 'line-cased', color: '#000000', width: 3, label: 'Test' } as never))
      .toThrow("MapLegend.addEntry: type 'line-cased' benötigt color, width, outline_color, outline_width");
  });

  it('applies line width as a clamped height', () => {
    legend.addEntry({ id: 'lw1', type: 'line', color: '#000000', width: 20, label: 'Breit' });
    const marker = document.querySelector('.map-legend-line') as HTMLElement;
    expect(marker.style.height).toBe('6px');
  });

  it('applies dasharray as a repeating background gradient', () => {
    legend.addEntry({ id: 'ld1', type: 'line', color: '#3b82f6', dasharray: [2, 1], label: 'Gestrichelt' });
    const marker = document.querySelector('.map-legend-line') as HTMLElement;
    expect(marker.style.backgroundImage).toContain('repeating-linear-gradient');
  });

  it('throws when dasharray does not have exactly 2 values', () => {
    expect(() => legend.addEntry({ id: 'ld2', type: 'line', color: '#000000', dasharray: [1, 2, 3] as never, label: 'Test' }))
      .toThrow('MapLegend.addEntry: dasharray muss genau 2 Werte [dash, gap] enthalten');
  });

  it('applies area outline as a border', () => {
    legend.addEntry({ id: 'ao1', type: 'area', color: '#3b82f6', outline_color: '#1d4ed8', outline_width: 1, label: 'Bezirk' });
    const marker = document.querySelector('.map-legend-area') as HTMLElement;
    expect(marker.style.borderWidth).toBe('1px');
    expect(marker.style.borderStyle).toBe('solid');
  });

  it('clamps area outline_width to 1-3px', () => {
    legend.addEntry({ id: 'ao2', type: 'area', color: '#3b82f6', outline_color: '#1d4ed8', outline_width: 10, label: 'Test' });
    const marker = document.querySelector('.map-legend-area') as HTMLElement;
    expect(marker.style.borderWidth).toBe('3px');
  });

  it('throws when area has only outline_width without outline_color', () => {
    expect(() => legend.addEntry({ id: 'ao3', type: 'area', color: '#000000', outline_width: 1, label: 'Test' } as never))
      .toThrow("MapLegend.addEntry: 'area' benötigt outline_color UND outline_width zusammen");
  });
```

If `happy-dom` reports `marker.style.border` differently than the `borderWidth`/`borderStyle`
split used above (e.g. combines into one non-empty `border` string instead), adjust to whatever
`happy-dom` actually reports for a `style.border = "1px solid #1d4ed8"` assignment — see the
Global Constraints note on environment-driven color/style normalization.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/MapLegend.test.ts`
Expected: FAIL — `'line-cased'` isn't a recognized type yet, `width`/`dasharray`/`outline_*` are
ignored by the current `addEntry()`.

- [ ] **Step 3: Write the implementation**

In `src/types/common.ts`, replace `LegendEntry` (currently lines 19-29):

```ts
export interface LegendEntry {
    id?: string;
    type: 'dot' | 'line' | 'area' | 'icon' | 'line-cased';
    color: string | null;
    label: string;
    /** FontAwesome-Klassen (z.B. 'fa-solid fa-helicopter'), nur bei type: 'icon' relevant. */
    icon?: string;
    /** Deckkraft (0-1) aus den echten Layer-Paint-Daten, z.B. layers.json `opacity`-Feld — spiegelt
     *  die tatsächliche Kartendarstellung, statt den Swatch immer volldeckend zu zeigen. */
    opacity?: number;
    /** type:'line' (Höhe, geclampt 1-6px) | type:'line-cased' (Pflicht, Innenbreite) */
    width?: number;
    /** type:'line' — [Strich, Lücke], proportional auf 8px-Zyklus skaliert */
    dasharray?: [number, number];
    /** type:'area' (mit outline_width) | type:'line-cased' (Pflicht) */
    outline_color?: string;
    /** type:'area' (geclampt 1-3px, mit outline_color) | type:'line-cased' (Pflicht, geclampt 2-8px) */
    outline_width?: number;
}
```

In `src/lib/MapLegend.ts`, replace the body of `addEntry()` from the `const typeClass = ...` line
through the closing of its color-branch `if/else` chain (currently lines 47-67) with:

```ts
    if (entry.type === 'line-cased') {
      if (entry.color == null || entry.width == null || entry.outline_color == null || entry.outline_width == null) {
        throw new Error("MapLegend.addEntry: type 'line-cased' benötigt color, width, outline_color, outline_width");
      }
      div.appendChild(this._buildLineCased(entry.color, entry.width, entry.outline_color, entry.outline_width));
    } else {
      const typeClass = { dot: 'map-legend-dot', line: 'map-legend-line', area: 'map-legend-area', icon: 'map-legend-icon' }[entry.type];

      if (entry.type === 'icon' && entry.icon) {
        const marker = document.createElement('i');
        marker.className = `${entry.icon} ${typeClass}`;
        if (entry.color) marker.style.color = entry.color;
        div.appendChild(marker);
      } else if (entry.type === 'icon' || entry.color === null) {
        const unknown = document.createElement('i');
        unknown.className = 'fa-solid fa-circle-question map-legend-unknown';
        unknown.title = 'Farbe nicht auflösbar';
        div.appendChild(unknown);
      } else {
        const marker = document.createElement('div');
        marker.className = typeClass;
        marker.style.background = entry.color;
        // Inline-Style überschreibt CI-Defaults (z.B. .map-legend-area's statische opacity: 0.8) —
        // spiegelt die echte Deckkraft der Kartendarstellung statt sie zu erfinden.
        if (entry.opacity !== undefined) marker.style.opacity = String(entry.opacity);

        if (entry.type === 'line' && entry.width != null) {
          marker.style.height = `${Math.max(1, Math.min(6, entry.width))}px`;
        }

        if (entry.type === 'line' && entry.dasharray != null) {
          if (entry.dasharray.length !== 2) {
            throw new Error('MapLegend.addEntry: dasharray muss genau 2 Werte [dash, gap] enthalten');
          }
          const [dash, gap] = entry.dasharray;
          const cycle = dash + gap;
          const scale = 8 / cycle;
          const dashPx = dash * scale;
          const gapPx = gap * scale;
          marker.style.background = 'transparent';
          marker.style.backgroundImage =
            `repeating-linear-gradient(to right, ${entry.color} 0 ${dashPx}px, transparent ${dashPx}px ${dashPx + gapPx}px)`;
        }

        if (entry.type === 'area' && (entry.outline_color != null || entry.outline_width != null)) {
          if (entry.outline_color == null || entry.outline_width == null) {
            throw new Error("MapLegend.addEntry: 'area' benötigt outline_color UND outline_width zusammen");
          }
          const w = Math.max(1, Math.min(3, entry.outline_width));
          marker.style.border = `${w}px solid ${entry.outline_color}`;
        }

        div.appendChild(marker);
      }
    }
```

Add a new private method to the `MapLegend` class, right after `addEntry()` (before
`removeEntry()`):

```ts
  private _buildLineCased(color: string, width: number, outline_color: string, outline_width: number): HTMLElement {
    const oW = Math.max(2, Math.min(8, outline_width));
    let iW = Math.max(1, Math.min(6, width));
    if (iW >= oW) iW = Math.max(1, oW - 1);

    const wrapper = document.createElement('div');
    wrapper.className = 'map-legend-line-cased';
    wrapper.style.height = `${oW}px`;

    const outline = document.createElement('div');
    outline.className = 'map-legend-line-cased-outline';
    outline.style.height = `${oW}px`;
    outline.style.background = outline_color;

    const inner = document.createElement('div');
    inner.className = 'map-legend-line-cased-inner';
    inner.style.height = `${iW}px`;
    inner.style.background = color;

    wrapper.append(outline, inner);
    return wrapper;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/MapLegend.test.ts`
Expected: PASS (all tests). If any `happy-dom` style-string assertion doesn't match, adjust per
the Global Constraints note — do not weaken the assertion to "truthy"/"not empty", keep it
checking the actual value `happy-dom` reports.

- [ ] **Step 5: Commit**

```bash
git add src/types/common.ts src/lib/MapLegend.ts src/lib/MapLegend.test.ts
git commit -m "feat(legend): line-cased-Rendering + width/dasharray/outline in MapLegend.addEntry()"
```

---

### Task 3: `Sidebar.ts` — thread the 4 new fields through

**Files:**
- Modify: `src/components/Sidebar.ts:7-16` (`LayerMetaGroup`)
- Modify: `src/components/Sidebar.ts:245-250` (`buildToggleEvent`, the `resolveSwatchFromLayersMetaColor` call)

**Interfaces:**
- Consumes: `resolveSwatchFromLayersMetaColor(type, color, width?, dasharray?, outline_color?,
  outline_width?)` from Task 1.
- Produces: nothing new — `LayerToggleEvent.swatch` already carries whatever `LegendSwatch` has
  (Task 1 extended that type), no change needed to `LayerToggleEvent` itself.

- [ ] **Step 1: Extend `LayerMetaGroup`**

In `src/components/Sidebar.ts`, replace the interface (currently lines 7-16):

```ts
export interface LayerMetaGroup {
  name: string;
  style_layers: string[];
  template: string;
  type?: string;
  color?: unknown;
  opacity?: number;
  legend_items?: { label: string; color: string }[] | null;
  legend_scale_id?: string | null;
  width?: number | null;
  dasharray?: [number, number] | null;
  outline_color?: string | null;
  outline_width?: number | null;
}
```

- [ ] **Step 2: Pass the new fields to `resolveSwatchFromLayersMetaColor`**

In `buildToggleEvent`, replace the call (currently lines 245-249):

```ts
      } else if (metaGroup.color !== undefined) {
        swatch = resolveSwatchFromLayersMetaColor(
          metaGroup.type,
          metaGroup.color,
          metaGroup.width,
          metaGroup.dasharray,
          metaGroup.outline_color,
          metaGroup.outline_width
        );
        if (swatch) {
          dedupKey = computeSwatchDedupKey(overlayId, metaGroup.template, swatch);
        }
      }
```

- [ ] **Step 3: Verify types compile and the full suite passes**

Run: `npx tsc --noEmit && npm test`
Expected: 0 errors, all tests pass (this task has no new test file — `Sidebar.ts` has no direct
unit tests today, per the same pattern established in the prior legend-fields round; correctness
is covered by Task 1's pure-function tests plus Task 5's live verification).

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.ts
git commit -m "feat(legend): width/dasharray/outline aus layers.json in Sidebar.ts durchreichen"
```

---

### Task 4: `MapPage.ts` — pass the new swatch fields to `addEntry()`

**Files:**
- Modify: `src/pages/MapPage.ts:202-209` (dedupKey branch)
- Modify: `src/pages/MapPage.ts:211-220` (plain-swatch fallback branch)

**Interfaces:**
- Consumes: `event.swatch.width`/`.dasharray`/`.outline_color`/`.outline_width` (from Task 1's
  `LegendSwatch` extension, flowing through `LayerToggleEvent.swatch` unchanged in shape).

- [ ] **Step 1: Add the 4 fields to both `addEntry()` calls**

In `src/pages/MapPage.ts`'s `toggleLayer()`, replace the `event.swatch && event.dedupKey` branch
(currently lines 194-210):

```ts
                } else if (event.swatch && event.dedupKey) {
                    // Mehrere Gruppen mit identischem Swatch (z.B. jede Autobahn einzeln) teilen
                    // sich eine Zeile — analog legendItemsRefCount oben. Kein onRemove: bei >1
                    // aktiven Instanzen wäre unklar, welche der "×"-Klick abschalten sollte
                    // (gleiches Muster wie beim legendItems-Zweig, der ebenfalls kein onRemove hat).
                    const count = (this.swatchRefCount.get(event.dedupKey) ?? 0) + 1;
                    this.swatchRefCount.set(event.dedupKey, count);
                    if (count === 1) {
                        legend.addEntry({
                            id: event.dedupKey,
                            label: event.overlayLabel,
                            type: event.swatch.type,
                            color: event.swatch.color,
                            icon: event.swatch.icon,
                            width: event.swatch.width,
                            dasharray: event.swatch.dasharray,
                            outline_color: event.swatch.outline_color,
                            outline_width: event.swatch.outline_width,
                            opacity: event.opacity ?? undefined,
                        });
                    }
                } else if (event.swatch) {
                    legend.addEntry({
                        id: event.legendId,
                        label: event.legendLabel,
                        type: event.swatch.type,
                        color: event.swatch.color,
                        icon: event.swatch.icon,
                        width: event.swatch.width,
                        dasharray: event.swatch.dasharray,
                        outline_color: event.swatch.outline_color,
                        outline_width: event.swatch.outline_width,
                        opacity: event.opacity ?? undefined,
                        onRemove: () => event.itemEl.click()
                    });
                }
```

- [ ] **Step 2: Verify types compile and the full suite passes**

Run: `npx tsc --noEmit && npm test`
Expected: 0 errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MapPage.ts
git commit -m "feat(legend): width/dasharray/outline-Swatch-Felder an addEntry() durchreichen"
```

---

### Task 5: Full verification — type-check, test suite, live browser check, docs

**Files:** none (verification) plus doc updates at the end.

- [ ] **Step 1: Full type-check and test suite**

Run: `npx tsc --noEmit && npm test`
Expected: 0 type errors, all tests pass (including the ~19 new/modified tests from Tasks 1-2).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev` (per `CLAUDE.md`, `npm run dev:reset` first if port 8000/8081 are already
occupied from a previous session).

- [ ] **Step 3: Synthetic Playwright verification (no live overlay currently exercises this path)**

As established in the spec's "Live-Daten-Befund" section, no current overlay reaches the
single-swatch path with `width`/`dasharray`/`outline_*` set (the 3 real groups that have these
fields all go through `legend_items`/`legend_scale_id` first). Verify end-to-end via a
network-mocked `layers.json` response (same technique used for the `icon` fallback in the prior
round): inject one synthetic group with `type: 'line'`, `color` set, `width` set, `outline_color`/
`outline_width` set (no `legend_items`/`legend_scale_id`) into a real fetched `layers.json` copy,
intercept the request with Playwright's `page.route()`, and confirm:
- The synthetic group renders `.map-legend-line-cased` with `.map-legend-line-cased-outline` and
  `.map-legend-line-cased-inner` children (not a plain `.map-legend-line`).
- A second synthetic group with only `dasharray` set (no outline) renders `.map-legend-line` with
  a `backgroundImage` containing `repeating-linear-gradient`.
- A third synthetic group with `type: 'fill'` and both `outline_color`/`outline_width` set (no
  `legend_items`/`legend_scale_id`) renders `.map-legend-area` with a visible border.

- [ ] **Step 4: Regression-check existing legend behavior**

Toggle a non-`line-cased`/non-`dasharray` overlay that already worked before this plan (e.g.
"Autobahnen" or the ski-difficulty shared scale from the prior round). Expected: unchanged
behavior.

- [ ] **Step 5: Update tracking docs**

Add a `docs/CHANGELOG.md` entry (`## [Unreleased] - <timestamp>`, `### Hinzugefügt` category)
documenting: `line-cased`/`width`/`dasharray`/`outline_color`/`outline_width` consumed in the map
legend, ski-lifts-style casing lines and bordered areas now rendered, `oe5ith-ci#1` fully closed
on both sides (design system + client). Update `docs/ROADMAP.md`'s "Karten-Legende: weitere
Optimierung" section — mark the `- [ ]` bullet added in the prior round's final-review fix
(referencing `oe5ith-ci#1`) as `[x]` ERLEDIGT with a short technical note, same pattern as the
prior round's entries. Update `docs/ci/open-items.md` — move the `oe5ith-ci#1` tracking entry
from noting "website-v3-seitige Konsumierung steht noch aus" to fully resolved, or into the
"Erledigt (archiviert)" section if nothing else is open for it.

- [ ] **Step 6: Final commit**

```bash
git add docs/CHANGELOG.md docs/ROADMAP.md docs/ci/open-items.md
git commit -m "docs: line-cased/width/dasharray/outline-Client-Umsetzung in CHANGELOG/ROADMAP/CI-Tracking erfasst"
```

---

## Self-Review Notes

- **Spec coverage:** decision tree (Task 1) ✓, dedup key extension (Task 1) ✓, `MapLegend.ts`
  rendering incl. validation (Task 2) ✓, `Sidebar.ts` wiring (Task 3) ✓, `MapPage.ts` wiring
  (Task 4) ✓, live/synthetic verification + docs (Task 5) ✓. `legend_items`/`legend_scale_id`
  rows correctly left untouched (no task modifies that code path).
- **Type consistency:** `LegendSwatch` (Task 1, `resolveLegendSwatch.ts`) and `LegendEntry`
  (Task 2, `common.ts`) are two separate interfaces that happen to need the same 4 new optional
  fields with matching names/types (`width?: number`, `dasharray?: [number, number]`,
  `outline_color?: string`, `outline_width?: number`) — verified both tasks use identical field
  names/types so `MapPage.ts` (Task 4) can spread one into the other without a mapping step.
  `resolveSwatchFromLayersMetaColor`'s new parameter order (`type, color, width, dasharray,
  outline_color, outline_width`) is used identically in Task 1's own tests and Task 3's call site.
- **No placeholders:** every step has concrete, complete code — no "add validation"/"handle
  edge cases" stand-ins. The one intentional flexibility (Global Constraints' `happy-dom`
  color-normalization note) is scoped to test *assertions*, not implementation behavior.
