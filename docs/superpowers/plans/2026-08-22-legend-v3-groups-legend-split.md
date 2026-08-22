# Legend v3.0 `groups[]`/`legend[]`-Split — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Client-Konsum der Kartenlegende (`/karte`) von `geodata-plugin-standard` v2.0/v2.1
(`groups[].render`/`variants`) auf v3.0 (`legend[]`-Top-Level-Block, getrennt von `groups[]`)
umstellen — kein Dual-Pfad, alter `render`/`variants`-Konsum entfällt ersatzlos.

**Architecture:** Reines Client-Consumer-Update, kein Backend-Code betroffen. `groups[]` bleibt
Toggle-Metadaten-Quelle für die Sidebar-Accordion-Items. Ein neuer, von einzelnen Gruppen-Toggles
entkoppelter Top-Level-Block `legend[]` (kann Zeilen aus mehreren `groups[]`-Einträgen bündeln)
wird bei **jedem** Layer-Toggle komplett aus der aktuellen Menge aktiver Style-Layer-IDs
(`OverlayLoader.getActiveLayerIds()`) neu berechnet (Union-Sichtbarkeit: eine Zeile ist sichtbar,
sobald mindestens eine ihrer `style_layer_ids` aktiv ist) und in `MapLegend` synchronisiert. Die
bestehende SVG-Chip-Zeichenlogik (`MapLegend._buildPartsChip()`) bleibt unverändert — nur die
Datenherkunft ändert sich.

**Tech Stack:** TypeScript (Vite), Vitest (+ `happy-dom` für DOM-Tests), MapLibre GL JS.

**Spec:** `docs/superpowers/specs/2026-08-22-legend-v3-groups-legend-split-design.md`

## Global Constraints

- Kein Dual-Pfad v2.1/v3.0 — alter `render`/`variants`-Konsum wird ersatzlos entfernt, nicht nur
  deaktiviert (kein toter Code).
- `legend`/`legend_scales` werden global (nicht pro Overlay/Style) behandelt — Präsenz eines
  nicht-leeren `legend[]`-Arrays im Fetch-Response ist das einzige Gate, keine separate
  `version`-Prüfung mehr (kein natürlicher Anker mehr seit `legend[]`-Zeilen mehrere
  `groups[]`-Einträge referenzieren können, siehe Spec).
- `LegendSection` (Typ) wird zu `LegendScale` umbenannt, überall im Code (nicht nur an der
  Definitionsstelle) — Inhalt/Form unverändert.
- Keine neue lokale CSS-Klasse für die neue Heading-Darstellung — `.overlay-section-label`
  (bestehende `oe5ith-ci`-Klasse, `oe5ith-ci/css/sidebar.css:41`, bereits in `Topbar.ts` für
  "Basemap" genutzt) wird wiederverwendet.
- Nach jedem Task: `npx tsc --noEmit` muss sauber durchlaufen (strict, `noUnusedLocals`/
  `noUnusedParameters`) — entfernte Felder/Imports konsequent mit-entfernen, nicht nur
  auskommentieren.
- Deutsche Kommentare/Copy, passend zur restlichen Codebasis.

---

## Task 1: `renderPartsLegend.ts` auf v3.0-Datenmodell umstellen

**Files:**
- Modify: `src/lib/renderPartsLegend.ts`
- Modify: `src/lib/renderPartsLegend.test.ts`

**Interfaces:**
- Consumes: `LegendScale` aus `./resolveLegendSwatch` (wird erst in Task 2 umbenannt — dieser
  Task importiert bereits unter dem neuen Namen; Task 2 liefert die Typdefinition nach. Bis Task 2
  abgeschlossen ist, schlägt `tsc` an dieser Stelle fehl — beide Tasks müssen in Reihenfolge 1→2
  oder in derselben Session vor dem nächsten `tsc`-Check laufen. Reihenfolge in diesem Plan bereits
  so gewählt: Task 2 direkt danach.)
- Produces: `RenderPart`, `RenderColor`, `RenderPartsChip`, `LegendRow`, `LegendHeading`,
  `VisibleLegendRow`, `VisibleLegendHeading` (Typen); `findDrivingScaleId(parts: RenderPart[]):
  string | null`; `buildChipsForRow(render: RenderPart[], legendScalesById: Map<string,
  LegendScale>): RenderPartsChip[]`; `resolveVisibleLegend(headings: LegendHeading[],
  activeStyleLayerIds: ReadonlySet<string>, legendScalesById: Map<string, LegendScale>):
  VisibleLegendHeading[]` — werden von Task 4 (`MapLegend.test.ts` nutzt nur `RenderPartsChip`,
  unverändert) und Task 6 (`MapPage.ts`) konsumiert.

- [ ] **Step 1: Alten Test-Inhalt für `resolveRenderPartsRows`/`findGroupDrivingScaleId` entfernen, neue Tests für `buildChipsForRow` schreiben (failing)**

Ersetze den kompletten Inhalt von `src/lib/renderPartsLegend.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { findDrivingScaleId, buildChipsForRow, resolveVisibleLegend, type RenderPart, type LegendHeading } from './renderPartsLegend';
import type { LegendScale } from './resolveLegendSwatch';

const fixedLine = (value: string, dasharray: [number, number] | null = null): RenderPart => ({
  kind: 'line', color: { mode: 'fixed', value }, stroke_color: null, opacity: 1,
  width: 3, dasharray, radius: null, stroke_width: null, icon: null,
});

const scaleLine = (scale_id: string, dasharray: [number, number] | null = null): RenderPart => ({
  kind: 'line', color: { mode: 'scale', scale_id }, stroke_color: null, opacity: 1,
  width: 3, dasharray, radius: null, stroke_width: null, icon: null,
});

const scaleFill = (scale_id: string): RenderPart => ({
  kind: 'fill', color: { mode: 'scale', scale_id }, stroke_color: null, opacity: 0.25,
  width: null, dasharray: null, radius: null, stroke_width: null, icon: null,
});

const difficultyScale: LegendScale = {
  id: 'ski-difficulty-v1',
  label: 'Schwierigkeitsgrade',
  items: [
    { label: 'Novice', color: 'green' },
    { label: 'Easy', color: 'blue' },
    { label: 'Intermediate', color: 'red' },
  ],
};

describe('findDrivingScaleId', () => {
  it('returns the scale_id of the first scale-mode part', () => {
    const parts = [fixedLine('#fff'), scaleLine('ski-difficulty-v1')];
    expect(findDrivingScaleId(parts)).toBe('ski-difficulty-v1');
  });

  it('returns null when no part references a scale', () => {
    const parts = [fixedLine('#fff'), fixedLine('#000')];
    expect(findDrivingScaleId(parts)).toBeNull();
  });
});

describe('buildChipsForRow', () => {
  it('returns a single unresolved-color chip for a fixed-color render', () => {
    const render = [fixedLine('purple')];
    expect(buildChipsForRow(render, new Map())).toEqual([{ parts: render, itemColor: null }]);
  });

  it('expands into one chip per scale item when render has a scale-mode part', () => {
    const render = [scaleFill('ski-difficulty-v1')];
    const scales = new Map([['ski-difficulty-v1', difficultyScale]]);
    const chips = buildChipsForRow(render, scales);
    expect(chips).toHaveLength(3);
    expect(chips.map(c => c.itemColor)).toEqual(['green', 'blue', 'red']);
    expect(chips[0].parts).toBe(render);
  });

  it('falls back to a single unresolved chip when the referenced scale is missing from legendScalesById', () => {
    const render = [scaleLine('unknown-scale')];
    expect(buildChipsForRow(render, new Map())).toEqual([{ parts: render, itemColor: null }]);
  });
});

describe('resolveVisibleLegend', () => {
  const headings: LegendHeading[] = [
    {
      heading: 'Pisten',
      rows: [
        { label: 'Präpariert', render: [scaleLine('ski-difficulty-v1')], style_layer_ids: ['ski-runs-downhill-line'] },
        { label: 'Skitour', render: [scaleLine('ski-difficulty-v1')], style_layer_ids: ['ski-runs-skitour-line'] },
        { label: 'Freeride', render: [fixedLine('orange')], style_layer_ids: ['ski-runs-downhill-line', 'ski-runs-skitour-line'] },
      ],
    },
    {
      heading: 'Loipen',
      rows: [
        { label: 'Präpariert', render: [fixedLine('white')], style_layer_ids: ['ski-runs-nordic-line'] },
      ],
    },
  ];
  const scales = new Map([['ski-difficulty-v1', difficultyScale]]);

  it('returns only rows whose style_layer_ids intersect the active set', () => {
    const active = new Set(['ski-runs-downhill-line']);
    const visible = resolveVisibleLegend(headings, active, scales);
    expect(visible).toHaveLength(1);
    expect(visible[0].heading).toBe('Pisten');
    expect(visible[0].rows.map(r => r.label)).toEqual(['Präpariert', 'Freeride']);
  });

  it('shows a row when at least one of multiple style_layer_ids is active (union semantics)', () => {
    const active = new Set(['ski-runs-skitour-line']);
    const visible = resolveVisibleLegend(headings, active, scales);
    expect(visible[0].rows.map(r => r.label)).toEqual(['Skitour', 'Freeride']);
  });

  it('drops a heading entirely when none of its rows are visible', () => {
    const active = new Set(['ski-runs-nordic-line']);
    const visible = resolveVisibleLegend(headings, active, scales);
    expect(visible).toHaveLength(1);
    expect(visible[0].heading).toBe('Loipen');
  });

  it('returns an empty array when nothing is active', () => {
    expect(resolveVisibleLegend(headings, new Set(), scales)).toEqual([]);
  });

  it('resolves chips per visible row using the scale map', () => {
    const active = new Set(['ski-runs-downhill-line']);
    const visible = resolveVisibleLegend(headings, active, scales);
    const row = visible[0].rows.find(r => r.label === 'Präpariert')!;
    expect(row.chips.map(c => c.itemColor)).toEqual(['green', 'blue', 'red']);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/renderPartsLegend.test.ts`
Expected: FAIL — `buildChipsForRow`/`resolveVisibleLegend`/`LegendHeading` existieren noch nicht
(alte Exporte `resolveRenderPartsRows`/`findGroupDrivingScaleId`/`RenderVariant` noch vorhanden).

- [ ] **Step 3: `renderPartsLegend.ts` komplett neu schreiben**

Ersetze den kompletten Dateiinhalt von `src/lib/renderPartsLegend.ts`:

```typescript
import type { LegendScale } from './resolveLegendSwatch';

export type RenderColor = { mode: 'fixed'; value: string } | { mode: 'scale'; scale_id: string };

/** Ein Darstellungsteil aus `legend[].rows[].render` (geodata-plugin-standard §5.4, ab
 *  Schema-Version 3.0) — ein Eintrag pro echtem MapLibre-Style-Layer. */
export interface RenderPart {
  kind: 'fill' | 'line' | 'outline' | 'icon' | 'text' | 'circle';
  color: RenderColor | null;
  stroke_color: RenderColor | null;
  opacity: number | null;
  width: number | null;
  dasharray: [number, number] | null;
  radius: number | null;
  stroke_width: number | null;
  icon: string | null;
}

/** Eine Legend-Zeile aus `legend[].rows[]` — bereits vom Server fertig betitelt/gruppiert, im
 *  Gegensatz zum alten `variants[]`-Modell (bis v2.1) muss der Client hier nichts mehr aus
 *  `axis`/`label` zusammenbauen. */
export interface LegendRow {
  label: string;
  render: RenderPart[];
  style_layer_ids: string[];
}

/** Ein `legend[]`-Top-Level-Eintrag — kann Zeilen bündeln, deren `style_layer_ids` aus
 *  mehreren verschiedenen `groups[]`-Einträgen stammen (geodata-plugin-standard §5.4). */
export interface LegendHeading {
  heading: string;
  rows: LegendRow[];
}

export interface RenderPartsChip {
  parts: RenderPart[];
  /** Aufgelöste Farbe für diesen Chip, falls die Zeile durch eine Skala läuft — sonst `null`
   *  (die Parts tragen dann selbst nur fixe Farben). */
  itemColor: string | null;
}

export interface VisibleLegendRow {
  label: string;
  chips: RenderPartsChip[];
}

export interface VisibleLegendHeading {
  heading: string;
  rows: VisibleLegendRow[];
}

/** Erster Part mit `color.mode: "scale"` bestimmt, welche Skala diese Zeile antreibt. */
export function findDrivingScaleId(parts: RenderPart[]): string | null {
  for (const p of parts) {
    if (p.color?.mode === 'scale') return p.color.scale_id;
  }
  return null;
}

/**
 * Baut die Chip-Liste für eine `legend[].rows[]`-Zeile: referenziert ihr `render` eine Skala
 * (`color.mode: "scale"` an irgendeinem Part), entsteht ein Chip pro Skalen-Item; sonst genau
 * ein Chip mit den fixen Farben der Parts selbst.
 */
export function buildChipsForRow(render: RenderPart[], legendScalesById: Map<string, LegendScale>): RenderPartsChip[] {
  const scaleId = findDrivingScaleId(render);
  if (scaleId) {
    const scale = legendScalesById.get(scaleId);
    if (scale) {
      return scale.items.map(item => ({ parts: render, itemColor: item.color }));
    }
  }
  return [{ parts: render, itemColor: null }];
}

/**
 * Berechnet den sichtbaren Ausschnitt von `legend[]` aus der aktuellen Menge aktiver
 * MapLibre-Style-Layer-IDs (`OverlayLoader.getActiveLayerIds()`) — eine Zeile ist sichtbar,
 * sobald mindestens eine ihrer `style_layer_ids` aktiv ist (Union-Semantik, siehe
 * `docs/superpowers/specs/2026-08-22-legend-v3-groups-legend-split-design.md`). Headings ohne
 * sichtbare Zeile werden weggelassen. Pure Funktion (kein DOM) für Testbarkeit — wird bei
 * JEDEM Layer-Toggle neu aufgerufen (kein inkrementelles Fortschreiben), siehe `MapPage.ts`.
 */
export function resolveVisibleLegend(
  headings: LegendHeading[],
  activeStyleLayerIds: ReadonlySet<string>,
  legendScalesById: Map<string, LegendScale>
): VisibleLegendHeading[] {
  const result: VisibleLegendHeading[] = [];
  for (const h of headings) {
    const visibleRows = h.rows.filter(r => r.style_layer_ids.some(id => activeStyleLayerIds.has(id)));
    if (visibleRows.length === 0) continue;
    result.push({
      heading: h.heading,
      rows: visibleRows.map(r => ({ label: r.label, chips: buildChipsForRow(r.render, legendScalesById) })),
    });
  }
  return result;
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/lib/renderPartsLegend.test.ts`
Expected: PASS (alle Tests grün) — `LegendScale`-Import schlägt noch fehl, wenn Task 2 nicht
schon erledigt ist (siehe Interfaces-Hinweis oben); in dem Fall zuerst Task 2 Step 1-3 ausführen,
dann hierher zurückkehren.

- [ ] **Step 5: Commit**

```bash
git add src/lib/renderPartsLegend.ts src/lib/renderPartsLegend.test.ts
git commit -m "feat(legend): render-parts-Modul auf legend[]-Top-Level-Block (v3.0) umstellen"
```

---

## Task 2: `LegendSection` → `LegendScale` umbenennen

**Files:**
- Modify: `src/lib/resolveLegendSwatch.ts`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: `LegendScale` (Typ, ersetzt `LegendSection` überall) — wird von Task 1
  (`renderPartsLegend.ts`), Task 5 (`Sidebar.ts`) und Task 6 (`MapPage.ts`) importiert.

- [ ] **Step 1: Typ umbenennen**

In `src/lib/resolveLegendSwatch.ts`, ersetze:

```typescript
export interface LegendSection {
  id: string;
  label: string;
  items: { label: string; color: string }[];
}
```

durch:

```typescript
/** Entspricht `legend_scales[]` (geodata-plugin-standard §5.7, ab Schema-Version 3.0; hieß bis
 *  v2.1.0 `legend_sections` — umbenannt zur Vermeidung der Namenskollision mit dem neuen
 *  `legend`-Block, Inhalt/Form unverändert). */
export interface LegendScale {
  id: string;
  label: string;
  items: { label: string; color: string }[];
}
```

- [ ] **Step 2: Parameter-/Variablennamen in `resolveLegendItemsForGroup` mitziehen**

In derselben Datei, in der Funktionssignatur und im Body von `resolveLegendItemsForGroup`,
ersetze jedes Vorkommen von `legendSectionsById: Map<string, LegendSection>` durch
`legendScalesById: Map<string, LegendScale>` und jedes Vorkommen der Variable
`legendSectionsById` im Funktionsrumpf durch `legendScalesById` (reines Renaming, keine
Logikänderung).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: Fehler in `renderPartsLegend.ts` (aus Task 1, falls vor Task 2 ausgeführt) sind jetzt
behoben; verbleibende Fehler in `Sidebar.ts`/`MapPage.ts` (noch `LegendSection` importierend) sind
erwartet — werden in Task 5/6 behoben.

- [ ] **Step 4: Commit**

```bash
git add src/lib/resolveLegendSwatch.ts
git commit -m "refactor(legend): LegendSection zu LegendScale umbenannt (v3.0-Terminologie)"
```

---

## Task 3: `MapLegend.addHeading()` ergänzen

**Files:**
- Modify: `src/lib/MapLegend.ts`
- Modify: `src/lib/MapLegend.test.ts`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: `MapLegend.addHeading(id: string, text: string): void` — wird von Task 6
  (`MapPage.ts`) aufgerufen.

- [ ] **Step 1: Failing Test schreiben**

Füge am Ende von `src/lib/MapLegend.test.ts` an:

```typescript
describe('MapLegend.addHeading', () => {
  let legend: MapLegend;

  beforeEach(() => {
    document.body.innerHTML = '';
    legend = new MapLegend(makeLegendFixture());
  });

  it('renders the heading text with the CI overlay-section-label class', () => {
    legend.addHeading('h1', 'Pisten');
    const el = document.querySelector('.overlay-section-label');
    expect(el?.textContent).toBe('Pisten');
  });

  it('is removable via the shared removeEntry(id) mechanism', () => {
    legend.addHeading('h2', 'Loipen');
    expect(document.querySelector('.overlay-section-label')).not.toBeNull();
    legend.removeEntry('h2');
    expect(document.querySelector('.overlay-section-label')).toBeNull();
  });

  it('replaces an existing heading when addHeading is called again with the same id', () => {
    legend.addHeading('h3', 'Alt');
    legend.addHeading('h3', 'Neu');
    const headings = document.querySelectorAll('.overlay-section-label');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Neu');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/MapLegend.test.ts`
Expected: FAIL — `legend.addHeading` ist keine Funktion.

- [ ] **Step 3: `addHeading()` implementieren**

Füge in `src/lib/MapLegend.ts` nach der `addPartsRow()`-Methode (vor `_resolvePartColor`) ein:

```typescript
  /**
   * Rendert einen `legend[].heading`-Titel (geodata-plugin-standard §5.4, ab Schema-Version 3.0)
   * als linksbündige Überschrift über einem Zeilenblock — Renderer-Vertrag aus dem Standard.
   * Wiederverwendet die bestehende CI-Klasse `.overlay-section-label` (bereits in `Topbar.ts`
   * für "Basemap" genutzt) statt eine neue lokale CSS-Klasse zu erfinden.
   */
  addHeading(id: string, text: string): void {
    if (this._entryNodes.has(id)) this.removeEntry(id);

    const div = document.createElement('div');
    div.className = 'overlay-section-label';
    div.textContent = text;

    this._entriesEl.appendChild(div);
    this._entryNodes.set(id, div);
  }
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/lib/MapLegend.test.ts`
Expected: PASS (alle Tests grün, inkl. der bestehenden `addEntry`/`addPartsRow`-Tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/MapLegend.ts src/lib/MapLegend.test.ts
git commit -m "feat(legend): MapLegend.addHeading() für legend[]-Headings ergänzt"
```

---

## Task 4: `Sidebar.ts` — alten `render`/`variants`-Zweig entfernen

**Files:**
- Modify: `src/components/Sidebar.ts`

**Interfaces:**
- Consumes: `LegendScale` aus `./resolveLegendSwatch` (Task 2).
- Produces: `LayerToggleEvent` ohne `partsRows`-Feld — Task 6 (`MapPage.ts`) darf `event.partsRows`
  danach nicht mehr referenzieren.

- [ ] **Step 1: Nicht mehr benötigten Import entfernen**

In `src/components/Sidebar.ts`, entferne die Zeile:

```typescript
import { resolveRenderPartsRows, findGroupDrivingScaleId, type RenderPart, type RenderVariant, type RenderPartsRow } from '../lib/renderPartsLegend';
```

vollständig (kein Ersatz-Import nötig — `Sidebar.ts` braucht ab jetzt nichts mehr aus
`renderPartsLegend.ts`, die v3.0-Legend-Auflösung läuft komplett in `MapPage.ts`).

- [ ] **Step 2: `LegendSection` → `LegendScale` im verbleibenden Import umbenennen**

Ersetze:

```typescript
import { resolveLegendSwatch, swatchTypeForLayerType, resolveSwatchFromLayersMetaColor, computeSwatchDedupKey, resolveLegendItemsForGroup, type LegendSwatch, type SwatchType, type LegendSection } from '../lib/resolveLegendSwatch';
```

durch:

```typescript
import { resolveLegendSwatch, swatchTypeForLayerType, resolveSwatchFromLayersMetaColor, computeSwatchDedupKey, resolveLegendItemsForGroup, type LegendSwatch, type SwatchType, type LegendScale } from '../lib/resolveLegendSwatch';
```

- [ ] **Step 3: `render`/`variants` aus `LayerMetaGroup` entfernen**

Entferne aus dem `LayerMetaGroup`-Interface die letzten beiden Felder (inkl. ihres Kommentars):

```typescript
  /** `render`/`variants` (geodata-plugin-standard §5.3, ab Schema-Version 2.0) — ersetzen für
   *  Gruppen, die sie tragen, die Flachfelder oben (type/color/legend_items/…) vollständig. */
  render?: RenderPart[] | null;
  variants?: RenderVariant[] | null;
```

- [ ] **Step 4: `partsRows` aus `LayerToggleEvent` entfernen**

Entferne aus dem `LayerToggleEvent`-Interface das Feld (inkl. seines Kommentars):

```typescript
  /**
   * Kompakte Legenden-Zeilen einer `render`/`variants`-Gruppe (eine Zeile pro Form-Variante statt
   * pro Skalen-Item, siehe resolveRenderPartsRows()) — nur gesetzt ab Schema-Version 2.0. Läuft
   * IMMER zusätzlich zu `legendItems`, falls die Gruppe eine geteilte Skala referenziert (dann
   * trägt `legendItems` den einmaligen Farb-Erklärungs-Block, `partsRows` die Chip-Streifen-Zeilen).
   */
  partsRows: RenderPartsRow[] | null;
```

- [ ] **Step 5: `initSidebar`-Parameter und internes Mapping umbenennen**

Ersetze in der `initSidebar`-Signatur:

```typescript
  legendSections: LegendSection[] = [],
```

durch:

```typescript
  legendScales: LegendScale[] = [],
```

und direkt darunter:

```typescript
  const legendSectionsById = new Map(legendSections.map(s => [s.id, s]));
```

durch:

```typescript
  const legendScalesById = new Map(legendScales.map(s => [s.id, s]));
```

- [ ] **Step 6: `buildToggleEvent()` — alten Zweig entfernen, verbleibenden Zweig entknoten**

Ersetze in `buildToggleEvent()` den kompletten Block:

```typescript
      if (metaGroup.render && isLegendSchemaAtLeast(styleEntry?.version, 2, 0)) {
        // render/variants (§5.3, ab v2.0) ersetzen die Flachfelder unten vollständig für diese
        // Gruppe — kompakte Chip-Streifen-Zeilen (partsRows) PLUS, falls die Gruppe eine geteilte
        // Skala referenziert, der bestehende legendItems/legendGroupKey-Mechanismus für den
        // einmaligen Farb-Erklärungs-Block (reuse, kein neuer Ref-Zähl-Pfad in MapPage.ts nötig).
        const rows = resolveRenderPartsRows(metaGroup.render, metaGroup.variants, metaGroup.name, legendSectionsById);
        partsRows = rows.length > 0 ? rows : null;
        const scaleId = findGroupDrivingScaleId(rows);
        if (scaleId) {
          const section = legendSectionsById.get(scaleId);
          if (section) {
            const itemType = swatchTypeForLayerType(metaGroup.type ?? layerType) ?? 'dot';
            legendItems = section.items.map(li => ({ ...li, type: itemType }));
            legendGroupKey = `scale:${scaleId}`;
          }
        }
      } else {
        const resolvedItems = resolveLegendItemsForGroup(metaGroup, overlayId, styleEntry?.version, legendSectionsById);
        if (resolvedItems) {
          const itemType = swatchTypeForLayerType(metaGroup.type ?? layerType) ?? 'dot';
          legendItems = resolvedItems.items.map(li => ({ ...li, type: itemType }));
          legendGroupKey = resolvedItems.groupKey;
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
      }
```

durch (der `else`-Zweig bleibt inhaltlich identisch, nur ohne die `if`-Umklammerung und mit
umbenannter Variable):

```typescript
      const resolvedItems = resolveLegendItemsForGroup(metaGroup, overlayId, styleEntry?.version, legendScalesById);
      if (resolvedItems) {
        const itemType = swatchTypeForLayerType(metaGroup.type ?? layerType) ?? 'dot';
        legendItems = resolvedItems.items.map(li => ({ ...li, type: itemType }));
        legendGroupKey = resolvedItems.groupKey;
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

- [ ] **Step 7: `partsRows`-Deklaration, Fallback-Check und Rückgabewert bereinigen**

Entferne die Deklaration `let partsRows: RenderPartsRow[] | null = null;` (bei den anderen
`let`-Deklarationen am Anfang von `buildToggleEvent()`).

Ersetze:

```typescript
    if (!isMetaPath || (!legendItems && swatch === null && !partsRows)) {
```

durch:

```typescript
    if (!isMetaPath || (!legendItems && swatch === null)) {
```

Entferne aus dem zurückgegebenen Objekt am Ende von `buildToggleEvent()` die Zeile `partsRows,`.

- [ ] **Step 8: Jetzt unbenutzten `isLegendSchemaAtLeast`-Import entfernen**

Entferne die Zeile:

```typescript
import { isLegendSchemaAtLeast } from '../lib/legendSchemaVersion';
```

(wird in `Sidebar.ts` nirgends mehr direkt aufgerufen — `resolveLegendItemsForGroup` in
`resolveLegendSwatch.ts` nutzt die Funktion weiterhin intern für den v1.1-Pfad, das ist ein
separater Import in einer anderen Datei und bleibt unangetastet.)

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: Keine Fehler mehr in `Sidebar.ts`. Fehler in `MapPage.ts` (ruft `initSidebar()` noch mit
dem alten 7. Parameternamen/-feld `layersMeta.legend_sections` auf) sind an dieser Stelle noch
erwartet — werden in Task 6 behoben. `tsc` meldet reine Typfehler unabhängig vom Parameternamen
selbst (der ist nur intern relevant) — prüfe konkret, dass keine Fehler *innerhalb* von
`Sidebar.ts` mehr auftauchen.

- [ ] **Step 10: Commit**

```bash
git add src/components/Sidebar.ts
git commit -m "refactor(legend): render/variants-Konsum aus Sidebar.ts entfernt (v3.0-Split)"
```

---

## Task 5: `MapPage.ts` — `legend[]`-Recompute bei jedem Toggle verdrahten

**Files:**
- Modify: `src/pages/MapPage.ts`

**Interfaces:**
- Consumes: `resolveVisibleLegend`, `LegendHeading` aus `../lib/renderPartsLegend` (Task 1);
  `LegendScale` aus `../lib/resolveLegendSwatch` (Task 2); `MapLegend.addHeading()` (Task 3);
  `LayerToggleEvent` ohne `partsRows` (Task 4); `OverlayLoader.getActiveLayerIds(): string[]`
  (bereits vorhanden, `src/lib/OverlayLoader.ts:177`).
- Produces: nichts, das andere Tasks konsumieren (Endpunkt der Kette).

- [ ] **Step 1: Imports ergänzen**

Füge in `src/pages/MapPage.ts` zu den bestehenden Imports hinzu:

```typescript
import { resolveVisibleLegend, type LegendHeading } from '../lib/renderPartsLegend';
import type { LegendScale } from '../lib/resolveLegendSwatch';
```

- [ ] **Step 2: Neue private Felder auf `MapPageController` ergänzen**

Füge zu den bestehenden privaten Feldern (nach `swatchRefCount`) hinzu:

```typescript
    // legend[]-Top-Level-Block (geodata-plugin-standard §5.4, ab Schema-Version 3.0) — global,
    // nicht pro Overlay/Gruppe (siehe docs/superpowers/specs/2026-08-22-legend-v3-groups-legend-split-design.md).
    private legendHeadings: LegendHeading[] = [];
    private legendScalesById = new Map<string, LegendScale>();
    // IDs der aktuell in der Legende gerenderten legend[]-Headings/-Zeilen — vor jedem Recompute
    // vollständig entfernt und neu aufgebaut (kein inkrementelles Fortschreiben, siehe _syncV3Legend).
    private v3LegendEntryIds: string[] = [];
```

- [ ] **Step 3: `legendHeadings`/`legendScalesById` beim Mount befüllen, `initSidebar`-Aufruf anpassen**

Ersetze in `mount()`:

```typescript
            const layersMeta = await layersRes.json();
```

durch:

```typescript
            const layersMeta = await layersRes.json();
            this.legendHeadings = layersMeta.legend ?? [];
            this.legendScalesById = new Map((layersMeta.legend_scales ?? []).map((s: LegendScale) => [s.id, s]));
```

Und ersetze in der `initSidebar(...)`-Aufrufliste:

```typescript
                layersMeta.legend_sections ?? [],
```

durch:

```typescript
                layersMeta.legend_scales ?? [],
```

- [ ] **Step 4: `_syncV3Legend()`-Methode ergänzen**

Füge nach `toggleLayer()` (vor `destroy()`) eine neue private Methode ein:

```typescript
    /**
     * Berechnet den sichtbaren `legend[]`-Ausschnitt komplett neu aus der aktuellen Menge aktiver
     * Style-Layer-IDs und synchronisiert die Legende — kein inkrementelles Add/Remove wie beim
     * alten render/variants-Pfad, weil eine legend[]-Zeile Style-Layer aus mehreren groups[]
     * referenzieren kann (siehe Design-Spec). Wird nach JEDEM Toggle aufgerufen.
     */
    private _syncV3Legend(legendPanel: MapLegend): void {
        this.v3LegendEntryIds.forEach(id => legendPanel.removeEntry(id));
        this.v3LegendEntryIds = [];

        if (this.legendHeadings.length === 0) return;

        const active = new Set(OverlayLoader.getActiveLayerIds());
        const visible = resolveVisibleLegend(this.legendHeadings, active, this.legendScalesById);

        visible.forEach((h, hIdx) => {
            const headingId = `legend3:heading:${hIdx}`;
            legendPanel.addHeading(headingId, h.heading);
            this.v3LegendEntryIds.push(headingId);
            h.rows.forEach((row, rIdx) => {
                const rowId = `legend3:row:${hIdx}:${rIdx}`;
                legendPanel.addPartsRow({ id: rowId, label: row.label, chips: row.chips });
                this.v3LegendEntryIds.push(rowId);
            });
        });
    }
```

- [ ] **Step 5: Alte `event.partsRows`-Behandlung entfernen, `_syncV3Legend()` aufrufen**

In `toggleLayer()`, entferne im `if (event.checked)`-Zweig den Block:

```typescript
                if (event.partsRows) {
                    // Kompakte render/variants-Zeilen sind gruppen-eigen (keine geteilten Zeilen
                    // über Overlays hinweg wie legendItems/swatch unten) — einfaches Add/Remove
                    // ohne Ref-Zählung, ids an legendId gehängt.
                    event.partsRows.forEach((row, idx) => {
                        legend.addPartsRow({ id: `${event.legendId}:parts-row:${idx}`, label: row.label, chips: row.chips });
                    });
                }
```

und im `else`-Zweig (checked === false) den Block:

```typescript
                if (event.partsRows) {
                    event.partsRows.forEach((_, idx) => legend.removeEntry(`${event.legendId}:parts-row:${idx}`));
                }
```

Ersetze anschließend in `toggleLayer()` die Zeile `m.triggerRepaint();` (kurz vor dem
`catch`-Block) durch:

```typescript
            this._syncV3Legend(legend);
            m.triggerRepaint();
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, keine Fehler mehr im gesamten Projekt.

- [ ] **Step 7: Testsuite laufen lassen**

Run: `npm test`
Expected: PASS, alle Tests grün (inkl. der in Task 1/3 geänderten Dateien).

- [ ] **Step 8: Commit**

```bash
git add src/pages/MapPage.ts
git commit -m "feat(legend): legend[]-Recompute bei jedem Layer-Toggle verdrahtet (v3.0)"
```

---

## Task 6: Live-Verifikation, ROADMAP-Notiz, Submodul-Pointer

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify (Submodul-Pointer, bereits lokal auf `v3.0.0` ausgecheckt, siehe Kontext): `geodata-plugin-standard`

**Interfaces:**
- Consumes: alles aus Task 1-5 (fertige Implementierung).
- Produces: nichts (Abschluss-Task).

- [ ] **Step 1: Dev-Server starten, `/karte` live gegen echte v3.0-Daten prüfen**

Run: `npm run dev` (Hintergrund), dann im Browser `/karte` öffnen (oder Playwright, falls
verfügbar), `openskimap` aufklappen. Manuell verifizieren:
- „Pisten" einzeln toggeln → Zeilen „Präpariert"/„Buckelpiste"/„Skiroute"/„Skitour"/„Freeride"
  erscheinen mit Heading „Pisten" (`.overlay-section-label`).
- „Loipen" zusätzlich toggeln → eigenes Heading „Loipen" mit „Präpariert"/„Unpräpariert"
  erscheint, „Pisten"-Block bleibt unverändert bestehen.
- „Pisten" wieder abschalten → „Pisten"-Block verschwindet vollständig, „Loipen" bleibt.
- Alle Overlays abschalten → Legende ist leer, keine verwaisten `.overlay-section-label`- oder
  `.map-legend-parts-row`-Elemente im DOM (Browser-DevTools).
- Keine Konsolenfehler während des gesamten Durchgangs.

Falls ein Playwright-MCP/-Tool in dieser Umgebung verfügbar ist, denselben Ablauf automatisiert
gegen den laufenden Dev-Server fahren statt rein manuell.

- [ ] **Step 2: `docs/ROADMAP.md` — Heading-Notiz ergänzen**

Suche den bestehenden Eintrag „**Legenden-Gruppierung/Section-Header**" (beginnt mit `- [ ]
**Legenden-Gruppierung/Section-Header**`) und füge am Ende des Eintrags (vor der Leerzeile zum
nächsten Punkt) einen neuen Satz an:

```markdown
  **Teilweise erledigt für den `legend[]`-Pfad (2026-08-22):** `legend[].heading` wird seit der
  v3.0-Umstellung (`MapLegend.addHeading()`, wiederverwendet `.overlay-section-label` aus
  `oe5ith-ci`) als Section-Header gerendert — siehe
  `docs/superpowers/plans/2026-08-22-legend-v3-groups-legend-split.md`. Das allgemeine Problem
  (Gruppierung *beliebiger* Overlays, nicht nur `legend[]`-Quellen) bleibt offen.
```

- [ ] **Step 3: Finale Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: Beide PASS, keine Fehler/Fehlschläge.

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md docs/geodata/open-items.md docs/superpowers/specs/2026-08-22-legend-v3-groups-legend-split-design.md docs/superpowers/plans/2026-08-22-legend-v3-groups-legend-split.md geodata-plugin-standard
git commit -m "docs(legend): ROADMAP-Notiz + Spec/Plan für v3.0-Legend-Umstellung nachgezogen"
```

Hinweis: `docs/geodata/open-items.md` ist aus einer vorigen, unabhängigen Session bereits
modifiziert (Stand vor diesem Plan) — beim Stagen prüfen, dass dessen Inhalt weiterhin korrekt
ist, nicht blind mitcommitten, falls sich der Stand seither geändert hat.

---

## Self-Review-Hinweis für die Ausführung

- `RenderVariant`, `AXIS_LABELS`, `axisLabel()`, `resolveRenderPartsRows()`,
  `findGroupDrivingScaleId()`, `RenderPartsRow` (Typ) existieren nach Task 1/4 nirgends mehr im
  Code — falls `tsc`/Tests nach Task 6 noch einen dieser Namen finden, wurde eine Fundstelle
  übersehen.
- `legend_sections` (alter Feldname) darf nach Task 5 nirgends mehr referenziert werden
  (`layersMeta.legend_sections` in `MapPage.ts` war die letzte Fundstelle).
