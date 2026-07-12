# Legenden-Granularität: layers.json-Metadata konsumieren — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/karte` nutzt die neuen `type`/`color`/`legend_items`-Felder aus `https://tiles.oe5ith.at/layers.json` für die Legende — direkt statt teurem `style.json`-Nachladen, und mit Dedupe für Gruppen, die dieselbe kuratierte Farbskala teilen (z.B. die 6 Anfahrtszeit-Ringe).

**Architecture:** Reine Erweiterung des bestehenden Schritt-1+2-Legend-Systems (kein Neubau). Ein neuer Resolver (`resolveSwatchFromLayersMetaColor`) löst Farben direkt aus `layers.json`-Metadata auf, `Sidebar.ts` bevorzugt diese Quelle vor dem `style.json`-Fallback und leitet bei `legend_items` mehrere Zeilen statt einer weiter, `MapPage.ts` zählt aktive Gruppen pro Overlay, um `legend_items`-Zeilen nur einmal zu zeigen.

**Tech Stack:** TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`), Vitest.

**Spec:** [docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md](../specs/2026-07-12-map-legend-granularity-design.md)

## Global Constraints

- Verifikation vor jedem Fortschritt: `npx tsc --noEmit && npm test` muss grün sein (CLAUDE.md).
- Keine Hardcoded-Farben/-Werte — hier nicht relevant, da nur bereits aufgelöste Farben aus `layers.json` durchgereicht werden.
- **Jede Task committet ihre eigenen Änderungen** (SDD-Standardablauf: implementieren → testen → committen → Task-Review). Anpassung ggü. der ursprünglichen Nutzer-Vorgabe „Spec zusammen mit der Implementierung committen": das Spec-/Plan-Doc sowie der TODO.md-Eintrag reiten mit **Task 1s** Commit mit (erster echter Code-Commit dieser Änderung) statt vorher solo zu stehen — kein separater reiner Doku-Commit. Dateien immer explizit stagen, nie `git add -A`.
- CHANGELOG.md-Eintrag als `## [Unreleased] - YYYY-MM-DD HH:MM`-Journal-Block (AGENT_INSTRUCTIONS.md §4), Kategorie „Geändert" (Erweiterung von Schritt 1+2, kein Neubau).
- Deutsche Kommentare/Copy, passend zum Rest der Datei.

---

### Task 1: `resolveSwatchFromLayersMetaColor()` in `resolveLegendSwatch.ts`

**Files:**
- Modify: `src/lib/resolveLegendSwatch.ts` (Ende der Datei, nach `swatchTypeForLayerType`)
- Test: `src/lib/resolveLegendSwatch.test.ts` (neuer `describe`-Block am Ende)

**Interfaces:**
- Consumes: bereits vorhandene modul-interne `extractLiteralColor(value: unknown): string | null` und exportierte `swatchTypeForLayerType(layerType: string): SwatchType | null`, exportierte `LegendSwatch`-Type (`{ type: SwatchType; color: string | null }`).
- Produces: `export function resolveSwatchFromLayersMetaColor(type: string | undefined, color: unknown): LegendSwatch | null` — wird von Task 2 (`Sidebar.ts`) importiert.

- [ ] **Step 1: Failing-Tests schreiben**

Am Ende von `src/lib/resolveLegendSwatch.test.ts` (nach dem bestehenden `describe('swatchTypeForLayerType', ...)`-Block, vor der letzten schließenden Zeile der Datei) einfügen:

```ts
describe('resolveSwatchFromLayersMetaColor', () => {
  it('resolves a literal color for a fill group as type area', () => {
    expect(resolveSwatchFromLayersMetaColor('fill', '#3b82f6')).toEqual({ type: 'area', color: '#3b82f6' });
  });

  it('resolves a literal color for a line group as type line', () => {
    expect(resolveSwatchFromLayersMetaColor('line', '#111111')).toEqual({ type: 'line', color: '#111111' });
  });

  it('extracts the fallback arm of a match expression', () => {
    const color = ['match', ['get', 'AA_MINS'], 15, '#10b981', 30, '#84cc16', '#3b82f6'];
    expect(resolveSwatchFromLayersMetaColor('fill', color)).toEqual({ type: 'area', color: '#3b82f6' });
  });

  it('returns color: null for an unresolvable expression, type still known', () => {
    const color = ['interpolate', ['linear'], ['zoom'], 0, '#000000', 10, '#ffffff'];
    expect(resolveSwatchFromLayersMetaColor('line', color)).toEqual({ type: 'line', color: null });
  });

  it('returns null for a non-legend-able type (raster)', () => {
    expect(resolveSwatchFromLayersMetaColor('raster', '#ffffff')).toBeNull();
  });

  it('returns null when type is undefined', () => {
    expect(resolveSwatchFromLayersMetaColor(undefined, '#ffffff')).toBeNull();
  });
});
```

Import ergänzen (Zeile 3 der Testdatei):
```ts
import { resolveLegendSwatch, swatchTypeForLayerType, resolveSwatchFromLayersMetaColor } from './resolveLegendSwatch';
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run src/lib/resolveLegendSwatch.test.ts`
Expected: FAIL — TypeScript-Fehler „Module has no exported member 'resolveSwatchFromLayersMetaColor'".

- [ ] **Step 3: Funktion implementieren**

Am Ende von `src/lib/resolveLegendSwatch.ts` ergänzen:

```ts
/**
 * Wie resolveLegendSwatch(), aber für layers.json-Metadata (LayerMetaGroup), wo `type`/`color`
 * bereits direkt mitgeliefert werden statt aus einer echten LayerSpecification mit `paint`
 * extrahiert werden zu müssen (siehe docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md).
 */
export function resolveSwatchFromLayersMetaColor(type: string | undefined, color: unknown): LegendSwatch | null {
  const swatchType = swatchTypeForLayerType(type ?? '');
  if (!swatchType) return null;
  return { type: swatchType, color: extractLiteralColor(color) };
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg verifizieren**

Run: `npx vitest run src/lib/resolveLegendSwatch.test.ts`
Expected: PASS, alle Tests (bestehende + 6 neue) grün.

- [ ] **Step 5: Committen**

Dieser Commit trägt zusätzlich die bereits vorhandenen, noch unkommittierten Doku-Änderungen
dieser Arbeit mit (TODO.md-Eintrag, Spec- und Plan-Doc) — kein separater reiner Doku-Commit:

```bash
git add TODO.md docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md docs/superpowers/plans/2026-07-12-map-legend-granularity.md src/lib/resolveLegendSwatch.ts src/lib/resolveLegendSwatch.test.ts
git commit -m "feat(map-legend): resolveSwatchFromLayersMetaColor() für layers.json-Farbauflösung"
```

---

### Task 2: `Sidebar.ts` — `layers.json`-Farbe/`legend_items` bevorzugt konsumieren

**Files:**
- Modify: `src/components/Sidebar.ts:5` (Import), `:7-11` (`LayerMetaGroup`), `:18-28` (`LayerToggleEvent`), `:145-152` (`discoverLayers`-Rendering), `:181-230` (`buildToggleEvent`)

**Interfaces:**
- Consumes: `resolveSwatchFromLayersMetaColor` und Type `SwatchType` aus Task 1 (`../lib/resolveLegendSwatch`).
- Produces: `LayerToggleEvent.legendItems: { label: string; type: SwatchType; color: string }[] | null` (neues Feld) — wird von Task 3 (`MapPage.ts`) konsumiert. `swatch` und `legendItems` sind gegenseitig exklusiv (nie beide gesetzt).

**Hinweis zum Testvorgehen:** `Sidebar.ts` hat projektweit keine dedizierten Unit-Tests (reines DOM-Wiring, Projekt-Konvention seit Schritt 1+2: live im Browser verifizieren, siehe Spec „Testing"-Abschnitt). Dieser Task hat deshalb keinen Test-Schritt, nur Typecheck + volle Testsuite als Regressionsschutz.

- [ ] **Step 1: Import erweitern**

`src/components/Sidebar.ts:5`, ersetzen:

```ts
import { resolveLegendSwatch, swatchTypeForLayerType, type LegendSwatch } from '../lib/resolveLegendSwatch';
```

durch:

```ts
import { resolveLegendSwatch, swatchTypeForLayerType, resolveSwatchFromLayersMetaColor, type LegendSwatch, type SwatchType } from '../lib/resolveLegendSwatch';
```

- [ ] **Step 2: `LayerMetaGroup` erweitern**

`src/components/Sidebar.ts:7-11`, ersetzen:

```ts
export interface LayerMetaGroup {
  name: string;
  style_layers: string[];
  template: string;
}
```

durch:

```ts
export interface LayerMetaGroup {
  name: string;
  style_layers: string[];
  template: string;
  type?: string;
  color?: unknown;
  legend_items?: { label: string; color: string }[] | null;
}
```

- [ ] **Step 3: `LayerToggleEvent` um `legendItems` erweitern**

`src/components/Sidebar.ts:18-28`, ersetzen:

```ts
export interface LayerToggleEvent {
  overlayId: string;
  overlayUrl: string;
  layerIds: string[];
  layerType: string;
  checked: boolean;
  legendId: string;
  legendLabel: string;
  swatch: LegendSwatch | null;
  itemEl: HTMLElement;
}
```

durch:

```ts
export interface LayerToggleEvent {
  overlayId: string;
  overlayUrl: string;
  layerIds: string[];
  layerType: string;
  checked: boolean;
  legendId: string;
  legendLabel: string;
  swatch: LegendSwatch | null;
  legendItems: { label: string; type: SwatchType; color: string }[] | null;
  itemEl: HTMLElement;
}
```

- [ ] **Step 4: `data-group-index` beim Rendern des layersMeta-Pfads ergänzen**

`src/components/Sidebar.ts:145-152`, ersetzen:

```ts
    if (meta) {
      loadedLayers.set(id, meta.groups);
      listEl.innerHTML = meta.groups.map((g) => `
        <div class="acc-item" tabindex="0" role="checkbox" aria-checked="false" data-layer-ids='${JSON.stringify(g.style_layers)}' data-layer-type="${g.template}">
          <span class="acc-checkbox"></span>
          <span class="acc-item-label">${g.name}</span>
        </div>
      `).join('');
    } else {
```

durch:

```ts
    if (meta) {
      loadedLayers.set(id, meta.groups);
      listEl.innerHTML = meta.groups.map((g, idx) => `
        <div class="acc-item" tabindex="0" role="checkbox" aria-checked="false" data-layer-ids='${JSON.stringify(g.style_layers)}' data-layer-type="${g.template}" data-group-index="${idx}">
          <span class="acc-checkbox"></span>
          <span class="acc-item-label">${g.name}</span>
        </div>
      `).join('');
    } else {
```

- [ ] **Step 5: `buildToggleEvent()` umbauen**

`src/components/Sidebar.ts:181-230`, den kompletten Funktionskörper ersetzen. Alt:

```ts
  const buildToggleEvent = async (itemEl: HTMLElement, group: HTMLElement, checked: boolean): Promise<LayerToggleEvent> => {
    const overlayId = group.getAttribute('data-id')!;
    const overlayUrl = group.getAttribute('data-url')!;
    const layerIds: string[] = JSON.parse(itemEl.getAttribute('data-layer-ids')!);
    const layerType = itemEl.getAttribute('data-layer-type')!;
    const legendLabel = itemEl.querySelector('.acc-item-label')?.textContent ?? layerType;

    // Der Swatch-TYP wird zunächst aus layerType (layersMeta-Pfad: g.template; Fallback-Pfad:
    // l.type) versucht abzuleiten — funktioniert nur, wenn layerType tatsächlich ein MapLibre-
    // Layer-Typ ist. layers.json nutzt für template aber eigene Kategorie-Bezeichnungen
    // (z.B. "strassen", "gebiete" statt "line"/"fill") — dafür wird unten zusätzlich die echte
    // Layer-Definition aus dem style.json herangezogen (liefert Typ UND Farbe gemeinsam).
    let realLayer: LayerSpecification | undefined;
    const loaded = loadedLayers.get(overlayId);
    if (loaded) {
      for (const entry of loaded) {
        if ('style_layers' in entry) break; // layersMeta-Pfad, keine echte LayerSpecification
        if (entry.id === layerIds[0]) {
          realLayer = entry;
          break;
        }
      }
    }
    if (!realLayer) {
      const styleLayers = await fetchStyleLayersForColor(overlayId, overlayUrl);
      realLayer = styleLayers.find(l => l.id === layerIds[0]);
    }

    let swatch: LegendSwatch | null = null;
    if (realLayer) {
      swatch = resolveLegendSwatch(realLayer);
    } else {
      // Weder echte LayerSpecification noch style.json-Treffer verfügbar (z.B. Fetch-Fehler) —
      // letzter Versuch über layerType, sonst kein Eintrag (nicht legend-fähiger Typ).
      const swatchType = swatchTypeForLayerType(layerType);
      if (swatchType) swatch = { type: swatchType, color: null };
    }

    return {
      overlayId,
      overlayUrl,
      layerIds,
      layerType,
      checked,
      legendId: `${overlayId}:${layerIds.join(',')}`,
      legendLabel,
      swatch,
      itemEl
    };
  };
```

Neu:

```ts
  const buildToggleEvent = async (itemEl: HTMLElement, group: HTMLElement, checked: boolean): Promise<LayerToggleEvent> => {
    const overlayId = group.getAttribute('data-id')!;
    const overlayUrl = group.getAttribute('data-url')!;
    const layerIds: string[] = JSON.parse(itemEl.getAttribute('data-layer-ids')!);
    const layerType = itemEl.getAttribute('data-layer-type')!;
    const legendLabel = itemEl.querySelector('.acc-item-label')?.textContent ?? layerType;

    // layers.json liefert seit 2026-07-12 pro Gruppe direkt type/color (und optional
    // legend_items für Match-Farbskalen) — das wird bevorzugt genutzt. Nachladen des vollen
    // style.json (fetchStyleLayersForColor) bleibt nur Fallback für Gruppen/Overlays ohne
    // color-Feld (siehe docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md).
    let swatch: LegendSwatch | null = null;
    let legendItems: { label: string; type: SwatchType; color: string }[] | null = null;

    const loaded = loadedLayers.get(overlayId);
    const isMetaPath = !!loaded && loaded.length > 0 && 'style_layers' in loaded[0];

    if (isMetaPath) {
      const idx = Number(itemEl.getAttribute('data-group-index'));
      const metaGroup = (loaded as LayerMetaGroup[])[idx];

      if (metaGroup.legend_items && metaGroup.legend_items.length > 0) {
        const itemType = swatchTypeForLayerType(metaGroup.type ?? layerType) ?? 'dot';
        legendItems = metaGroup.legend_items.map(li => ({ label: li.label, type: itemType, color: li.color }));
      } else if (metaGroup.color !== undefined) {
        swatch = resolveSwatchFromLayersMetaColor(metaGroup.type, metaGroup.color);
      }
    }

    if (!isMetaPath || (!legendItems && swatch === null)) {
      // Fallback: kein layersMeta-Pfad ODER Gruppe ohne color-Feld (Alt-/Sonderfall, z.B. ein
      // Overlay ganz ohne layersMeta-Eintrag).
      let realLayer: LayerSpecification | undefined;
      if (loaded && !isMetaPath) {
        realLayer = (loaded as LayerSpecification[]).find(l => l.id === layerIds[0]);
      }
      if (!realLayer) {
        const styleLayers = await fetchStyleLayersForColor(overlayId, overlayUrl);
        realLayer = styleLayers.find(l => l.id === layerIds[0]);
      }
      if (realLayer) {
        swatch = resolveLegendSwatch(realLayer);
      } else {
        const swatchType = swatchTypeForLayerType(layerType);
        if (swatchType) swatch = { type: swatchType, color: null };
      }
    }

    return {
      overlayId,
      overlayUrl,
      layerIds,
      layerType,
      checked,
      legendId: `${overlayId}:${layerIds.join(',')}`,
      legendLabel,
      swatch,
      legendItems,
      itemEl
    };
  };
```

- [ ] **Step 6: Typecheck + volle Testsuite**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TypeScript-Fehler, alle Tests grün (keine Regression in bestehenden Suiten).

- [ ] **Step 7: Committen**

```bash
git add src/components/Sidebar.ts
git commit -m "feat(map-legend): Sidebar.ts bevorzugt layers.json-Farbe, leitet legend_items weiter"
```

---

### Task 3: `MapPage.ts` — Referenzzählung für `legendItems` pro Overlay

**Files:**
- Modify: `src/pages/MapPage.ts:27-28` (Klassenfelder), `:154-175` (`toggleLayer`)

**Interfaces:**
- Consumes: `LayerToggleEvent.legendItems` aus Task 2; `MapLegend.addEntry(entry: AddLegendEntryOptions)` / `MapLegend.removeEntry(id: string)` (bereits vorhanden, unverändert, `src/lib/MapLegend.ts`).
- Produces: nichts, das andere Tasks konsumieren — Endpunkt der Kette.

**Hinweis zum Testvorgehen:** Wie `Sidebar.ts` — kein `MapPage.test.ts` in diesem Projekt (DOM-/Map-Wiring, live verifiziert). Kein Test-Schritt, nur Typecheck + volle Testsuite.

- [ ] **Step 1: Neues Klassenfeld ergänzen**

`src/pages/MapPage.ts:27-28`, ersetzen:

```ts
    private map?: maplibregl.Map;
    private searchPinCoord: [number, number] | null = null;
```

durch:

```ts
    private map?: maplibregl.Map;
    private searchPinCoord: [number, number] | null = null;
    private legendItemsRefCount = new Map<string, number>();
```

- [ ] **Step 2: `toggleLayer()` umbauen**

`src/pages/MapPage.ts:154-175`, ersetzen:

```ts
    private async toggleLayer(event: LayerToggleEvent, m: maplibregl.Map, legend: MapLegend) {
        try {
            if (event.checked) {
                await OverlayLoader.add(m, event.overlayId, event.overlayUrl, { signal: this.signal, layerIds: event.layerIds });
                if (event.swatch) {
                    legend.addEntry({
                        id: event.legendId,
                        label: event.legendLabel,
                        type: event.swatch.type,
                        color: event.swatch.color,
                        onRemove: () => event.itemEl.click()
                    });
                }
            } else {
                OverlayLoader.remove(m, event.overlayId, { layerIds: event.layerIds });
                legend.removeEntry(event.legendId);
            }
            m.triggerRepaint();
        } catch (err) {
            console.error(`[MapPageController] toggleLayer error:`, err);
        }
    }
```

durch:

```ts
    private async toggleLayer(event: LayerToggleEvent, m: maplibregl.Map, legend: MapLegend) {
        try {
            if (event.checked) {
                await OverlayLoader.add(m, event.overlayId, event.overlayUrl, { signal: this.signal, layerIds: event.layerIds });
                if (event.legendItems) {
                    // Mehrere Gruppen desselben Overlays (z.B. die 6 Anfahrtszeit-Ringe) teilen
                    // dieselbe kuratierte Farbskala — nur beim Übergang 0→1 aktiven Gruppen
                    // tatsächlich rendern, sonst Duplikate.
                    const count = (this.legendItemsRefCount.get(event.overlayId) ?? 0) + 1;
                    this.legendItemsRefCount.set(event.overlayId, count);
                    if (count === 1) {
                        event.legendItems.forEach((item, idx) => {
                            legend.addEntry({
                                id: `${event.overlayId}:legend-item:${idx}`,
                                label: item.label,
                                type: item.type,
                                color: item.color,
                            });
                        });
                    }
                } else if (event.swatch) {
                    legend.addEntry({
                        id: event.legendId,
                        label: event.legendLabel,
                        type: event.swatch.type,
                        color: event.swatch.color,
                        onRemove: () => event.itemEl.click()
                    });
                }
            } else {
                OverlayLoader.remove(m, event.overlayId, { layerIds: event.layerIds });
                if (event.legendItems) {
                    const count = Math.max(0, (this.legendItemsRefCount.get(event.overlayId) ?? 1) - 1);
                    this.legendItemsRefCount.set(event.overlayId, count);
                    if (count === 0) {
                        event.legendItems.forEach((_, idx) => legend.removeEntry(`${event.overlayId}:legend-item:${idx}`));
                    }
                } else {
                    legend.removeEntry(event.legendId);
                }
            }
            m.triggerRepaint();
        } catch (err) {
            console.error(`[MapPageController] toggleLayer error:`, err);
        }
    }
```

- [ ] **Step 3: Typecheck + volle Testsuite**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TypeScript-Fehler, alle Tests grün.

- [ ] **Step 4: Committen**

```bash
git add src/pages/MapPage.ts
git commit -m "feat(map-legend): legend_items pro Overlay deduplizieren (Referenzzählung)"
```

---

### Task 4: CHANGELOG, finale Verifikation, Commit

**Files:**
- Modify: `CHANGELOG.md` (neuer `[Unreleased]`-Journal-Block ganz oben)
- Stage & commit: `CHANGELOG.md`

**Interfaces:** keine — reiner Doku-/Verifikations-/Commit-Task, letzter Schritt der Kette.

- [ ] **Step 1: Aktuellen Zeitstempel ermitteln**

Run: `date +"%Y-%m-%d %H:%M"`

Ergebnis für den nächsten Schritt notieren (Format `YYYY-MM-DD HH:MM`).

- [ ] **Step 2: CHANGELOG.md-Eintrag ergänzen**

`CHANGELOG.md`, ganz oben nach Zeile 3 (`Alle wichtigen Änderungen ...`, vor `## [3.9.0] - 2026-07-11`) einfügen (Zeitstempel aus Step 1 einsetzen):

```markdown
## [Unreleased] - 2026-07-12 HH:MM

### Geändert
- **Legenden-Granularität: kuratierte `layers.json`-Metadata konsumiert** (TODO.md → Map-Subsystem:
  Anschlussfeatures) — `/karte` nutzt jetzt die neuen `type`/`color`/`legend_items`-Felder aus
  `https://tiles.oe5ith.at/layers.json` direkt für die Legenden-Swatches
  (`resolveSwatchFromLayersMetaColor()` in `src/lib/resolveLegendSwatch.ts`), statt bei jedem
  Toggle das volle `style.json` nachzuladen. Gruppen mit kuratierten `legend_items` (aktuell nur
  die 6 Anfahrtszeit-Ringe) zeigen ihre Farbskala genau einmal pro Overlay, unabhängig davon, wie
  viele der zugehörigen Gruppen gleichzeitig aktiv sind (Referenzzählung in
  `MapPageController.toggleLayer()`, `src/pages/MapPage.ts`). Spec:
  [docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md](./docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md).
```

- [ ] **Step 3: Finale Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TypeScript-Fehler, alle Tests grün.

- [ ] **Step 4: Committen**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): Legenden-Granularität-Änderung im Unreleased-Journal festhalten"
git status
```

Expected: `git status` zeigt einen sauberen Working Tree (bis auf das unveränderte `oe5ith-ci`-Submodul, das nicht Teil dieser Änderung ist).
