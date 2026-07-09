# Interaktive Legende (Schritt 1+2: Infrastruktur + `/karte`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `MapLegend` auf `/karte` mit den aktuell aktiven Overlay-Layern befüllen, Einträge per „×" wieder ausblendbar machen (synchron mit den Sidebar-Accordion-Checkboxen), Farb-Swatch möglichst aus der echten Layer-`paint`-Definition ableiten.

**Architecture:** Neue reine Utility-Funktion `resolveLegendSwatch()` löst MapLibre-Paint-Expressions zu Farbe+Typ auf. `MapLegend` bekommt id-basierte `addEntry`/`removeEntry` + optionalen „×"-Button. `Sidebar.ts`s Toggle-Callback wird auf ein Event-Objekt umgestellt, das Legend-relevante Infos (Label, Swatch, DOM-Element) mitliefert. `MapPage.ts` verdrahtet `OverlayLoader.add/remove` mit `legend.addEntry/removeEntry`; der „×"-Klick löst einen echten `.click()` auf das zugehörige Accordion-Item aus (keine zweite Toggle-Implementierung).

**Tech Stack:** TypeScript (strict), Vite, Vitest, MapLibre GL JS, `oe5ith-ci`-Tokens/Klassen (`.toast-close`, `.map-legend-*`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md` — jede Aufgabe unten setzt eine dortige Entscheidung um.
- **Kein `any`/`as any`** — Discriminated-Union-Narrowing statt Cast (siehe `resolveLegendSwatch`).
- **Keine hardcodierten Farben/Z-Index/Layoutwerte in TS** — nur CI-Tokens (`var(--muted)`) bzw. bestehende `MAP_COLORS`-Getter.
- **Kein `style="..."` in dynamisch erzeugtem DOM/HTML** außer laufzeitberechneter Werte (hier: keine — alle neuen Styles gehören in CSS-Klassen).
- **Bestehende CI-Klasse wiederverwenden statt neu erfinden:** `.toast-close` (`oe5ith-ci/css/toast.css`) für den Entfernen-Button — exakt das passende, bereits vorhandene Muster für einen kompakten Dismiss-Button.
- **Testbarkeit-Realität dieses Repos:** Es gibt keine jsdom/happy-dom-Umgebung (siehe TODO.md → „DOM-Testumgebung einrichten"). `resolveLegendSwatch.ts` ist eine reine Funktion und bekommt echte Vitest-Unit-Tests (Task 1). `MapLegend.ts`/`Sidebar.ts`/`MapPage.ts` fassen echtes DOM an und werden — wie alle vergleichbaren Dateien in diesem Repo (`NahMapLayers.ts`, `RoutingSidebar.ts` u.a., siehe CHANGELOG-Historie) — nicht mit Fake-DOM-Unit-Tests, sondern per `npx tsc --noEmit` (Typkorrektheit) + `npm test` (keine Regression an den 112 bestehenden Tests) + abschließender Playwright-Live-Verifikation (Task 4) abgesichert. Das ist keine Abkürzung, sondern deckt sich mit der bisherigen Praxis in diesem Repo.
- Verifikationsbefehle: `npx tsc --noEmit && npm test` (siehe CLAUDE.md → Commands).
- Dateien **immer explizit** stagen, nie `git add -A`.

---

## Task 1: `resolveLegendSwatch` — Paint-Expression → Farbe/Typ

**Files:**
- Create: `src/lib/resolveLegendSwatch.ts`
- Test: `src/lib/resolveLegendSwatch.test.ts`

**Interfaces:**
- Produces: `export type SwatchType = 'dot' | 'line' | 'area';`, `export interface LegendSwatch { type: SwatchType; color: string | null; }`, `export function resolveLegendSwatch(layer: LayerSpecification): LegendSwatch | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/resolveLegendSwatch.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { LayerSpecification } from 'maplibre-gl';
import { resolveLegendSwatch } from './resolveLegendSwatch';

describe('resolveLegendSwatch', () => {
  it('resolves a literal line-color as type line', () => {
    const layer = { id: 'l1', type: 'line', source: 's', paint: { 'line-color': '#ff0000' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'line', color: '#ff0000' });
  });

  it('resolves a literal fill-color as type area', () => {
    const layer = { id: 'l2', type: 'fill', source: 's', paint: { 'fill-color': '#00ff00' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'area', color: '#00ff00' });
  });

  it('resolves a literal fill-extrusion-color as type area', () => {
    const layer = { id: 'l2b', type: 'fill-extrusion', source: 's', paint: { 'fill-extrusion-color': '#123456' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'area', color: '#123456' });
  });

  it('resolves a literal circle-color as type dot', () => {
    const layer = { id: 'l3', type: 'circle', source: 's', paint: { 'circle-color': '#0000ff' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'dot', color: '#0000ff' });
  });

  it('resolves a literal icon-color (symbol) as type dot', () => {
    const layer = { id: 'l4', type: 'symbol', source: 's', paint: { 'icon-color': '#abcdef' } } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'dot', color: '#abcdef' });
  });

  it('extracts the fallback arm of a match expression', () => {
    const layer = {
      id: 'l5', type: 'symbol', source: 's',
      paint: { 'icon-color': ['match', ['get', 'status'], 'active', '#22c55e', 'inactive', '#ef4444', '#888888'] }
    } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'dot', color: '#888888' });
  });

  it('returns color: null and warns for an unresolvable expression', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layer = {
      id: 'l6', type: 'line', source: 's',
      paint: { 'line-color': ['interpolate', ['linear'], ['zoom'], 0, '#000000', 10, '#ffffff'] }
    } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'line', color: null });
    expect(warnSpy).toHaveBeenCalledWith('[resolveLegendSwatch] Farbe nicht auflösbar für Layer', 'l6');
    warnSpy.mockRestore();
  });

  it('returns color: null when paint is missing entirely', () => {
    const layer = { id: 'l7', type: 'line', source: 's' } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toEqual({ type: 'line', color: null });
  });

  it('returns null for a non-legend-able layer type (raster)', () => {
    const layer = { id: 'l8', type: 'raster', source: 's' } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toBeNull();
  });

  it('returns null for a non-legend-able layer type (background)', () => {
    const layer = { id: 'l9', type: 'background' } as LayerSpecification;
    expect(resolveLegendSwatch(layer)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/resolveLegendSwatch.test.ts`
Expected: FAIL — `Cannot find module './resolveLegendSwatch'` (Datei existiert noch nicht).

- [ ] **Step 3: Write the implementation**

Create `src/lib/resolveLegendSwatch.ts`:

```ts
import type { LayerSpecification } from 'maplibre-gl';

export type SwatchType = 'dot' | 'line' | 'area';

export interface LegendSwatch {
  type: SwatchType;
  color: string | null;
}

/**
 * Löst die Legenden-Swatch-Farbe eines MapLibre-Layers auf — deckt nur die im Projekt
 * tatsächlich vorkommenden Muster ab (Literal-Farbe, `match`-Expression-Fallback), keine
 * vollständige Style-Spec-Expression-Engine (siehe docs/superpowers/specs/2026-07-09-
 * map-legend-interactive-design.md, Entscheidung 5).
 */
export function resolveLegendSwatch(layer: LayerSpecification): LegendSwatch | null {
  let type: SwatchType;
  let raw: unknown;

  switch (layer.type) {
    case 'line':
      type = 'line';
      raw = layer.paint?.['line-color'];
      break;
    case 'fill':
      type = 'area';
      raw = layer.paint?.['fill-color'];
      break;
    case 'fill-extrusion':
      type = 'area';
      raw = layer.paint?.['fill-extrusion-color'];
      break;
    case 'circle':
      type = 'dot';
      raw = layer.paint?.['circle-color'];
      break;
    case 'symbol':
      type = 'dot';
      raw = layer.paint?.['icon-color'];
      break;
    default:
      return null;
  }

  if (typeof raw === 'string') {
    return { type, color: raw };
  }

  // Fallback-Arm einer match-Expression ist laut MapLibre-Style-Spec verpflichtend und immer
  // der letzte Array-Eintrag: ['match', input, label1, output1, ..., fallback].
  if (Array.isArray(raw) && raw[0] === 'match') {
    const fallback = raw[raw.length - 1];
    if (typeof fallback === 'string') {
      return { type, color: fallback };
    }
  }

  console.warn('[resolveLegendSwatch] Farbe nicht auflösbar für Layer', layer.id);
  return { type, color: null };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/resolveLegendSwatch.test.ts`
Expected: PASS — 10 tests grün.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/lib/resolveLegendSwatch.ts src/lib/resolveLegendSwatch.test.ts
git commit -m "feat(map): resolveLegendSwatch — Paint-Expression zu Legenden-Farbe/Typ auflösen"
```

---

## Task 2: `LegendEntry`-Typ + `MapLegend.ts` — entfernbare, klickbare Einträge

**Files:**
- Modify: `src/types/common.ts:19-23`
- Modify: `src/lib/MapLegend.ts`
- Modify: `src/app.css` (neue lokale Utility-Klassen)

**Interfaces:**
- Consumes: nichts Neues aus Task 1 (nur der `LegendSwatch`-Typ als Referenz für die Form von `color`/`type`, kein Import nötig — `MapLegend` bleibt von `resolveLegendSwatch` unabhängig).
- Produces: `LegendEntry.id?: string`, `LegendEntry.color: string | null`, `MapLegend.addEntry(entry: LegendEntry & { onRemove?: () => void }): void`, `MapLegend.removeEntry(id: string): void`

- [ ] **Step 1: `LegendEntry`-Typ erweitern**

In `src/types/common.ts`, Zeilen 19-23 ersetzen:

```ts
export interface LegendEntry {
    id?: string;
    type: 'dot' | 'line' | 'area';
    color: string | null;
    label: string;
}
```

- [ ] **Step 2: `MapLegend.ts` komplett ersetzen**

Ersetze den Inhalt von `src/lib/MapLegend.ts`:

```ts
import { LegendEntry } from '../types/common';

export interface AddLegendEntryOptions extends LegendEntry {
  onRemove?: () => void;
}

export class MapLegend {
  private _el: HTMLElement;
  private _titleEl: HTMLElement;
  private _entriesEl: HTMLElement;
  private _entryNodes = new Map<string, HTMLElement>();

  constructor(selectorOrEl: string | HTMLElement) {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) throw new Error(`MapLegend: Element not found: ${selectorOrEl}`);
    this._el = el as HTMLElement;
    this._titleEl = this._el.querySelector('.map-legend-title') as HTMLElement;
    this._entriesEl = this._el.querySelector('.map-legend-entries') as HTMLElement;
    if (!this._titleEl || !this._entriesEl) {
      throw new Error('MapLegend: Required child elements (.map-legend-title, .map-legend-entries) missing');
    }
  }

  setTitle(text: string): void {
    this._titleEl.textContent = text;
    if (text) {
      this._titleEl.classList.remove('hidden');
    } else {
      this._titleEl.classList.add('hidden');
    }
  }

  addEntry(entry: AddLegendEntryOptions): void {
    // Erneutes addEntry mit bereits vorhandener id ersetzt den bestehenden Eintrag (idempotent).
    if (entry.id && this._entryNodes.has(entry.id)) {
      this.removeEntry(entry.id);
    }

    const div = document.createElement('div');
    div.className = 'map-legend-entry';

    const typeClass = { dot: 'map-legend-dot', line: 'map-legend-line', area: 'map-legend-area' }[entry.type];

    if (entry.color === null) {
      const unknown = document.createElement('i');
      unknown.className = 'fa-solid fa-circle-question map-legend-unknown';
      unknown.title = 'Farbe nicht auflösbar';
      div.appendChild(unknown);
    } else {
      const marker = document.createElement('div');
      marker.className = typeClass;
      marker.style.background = entry.color;
      div.appendChild(marker);
    }

    const label = document.createElement('span');
    label.className = 'map-legend-label';
    label.textContent = entry.label;
    div.appendChild(label);

    if (entry.onRemove) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'toast-close map-legend-remove';
      removeBtn.setAttribute('aria-label', `${entry.label} entfernen`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', entry.onRemove);
      div.appendChild(removeBtn);
    }

    this._entriesEl.appendChild(div);
    if (entry.id) this._entryNodes.set(entry.id, div);
  }

  removeEntry(id: string): void {
    const node = this._entryNodes.get(id);
    if (node) {
      node.remove();
      this._entryNodes.delete(id);
    }
  }

  clearEntries(): void {
    this._entriesEl.innerHTML = '';
    this._entryNodes.clear();
  }

  show(): void { this._el.classList.remove('hidden'); }
  hide(): void { this._el.classList.add('hidden'); }
  toggle(): void { this._el.classList.toggle('hidden'); }
  isVisible(): boolean { return !this._el.classList.contains('hidden'); }

  destroy(): void {
    this._el.remove();
  }
}
```

- [ ] **Step 3: Lokale CSS-Utilities ergänzen**

In `src/app.css`, im Abschnitt „APP-SPECIFIC UTILITIES" ergänzen:

```css
.map-legend-remove {
  margin-left: auto;
}

.map-legend-unknown {
  width: 10px;
  text-align: center;
  color: var(--muted);
  flex-shrink: 0;
}
```

Begründung (für den Reviewer, nicht in den Code schreiben): `.toast-close` (Entfernen-Button-Optik)
kommt unverändert aus `oe5ith-ci/css/toast.css` — nur die Positionierung (`margin-left:auto`,
rein layoutbezogen, keine Farbe/kein Token nötig) ist neu und lokal, da dieser exakte
Verwendungskontext (Dismiss-Button in einer Legenden-Zeile) im CI noch nicht vorgesehen ist.

- [ ] **Step 4: Typecheck + bestehende Tests**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TS-Fehler, 112/112 Tests weiterhin grün (keine Regression — `NahPage.ts`s bestehende
`legend.addEntry({type,color,label})`-Aufrufe ohne `id`/`onRemove` bleiben gültig, da beide
optional sind).

- [ ] **Step 5: Commit**

```bash
git add src/types/common.ts src/lib/MapLegend.ts src/app.css
git commit -m "feat(map): MapLegend um entfernbare, klickbare Einträge erweitern"
```

---

## Task 3: `Sidebar.ts` + `MapPage.ts` — Toggle-Callback liefert Legend-Infos, `/karte` verdrahtet

**Files:**
- Modify: `src/components/Sidebar.ts`
- Modify: `src/pages/MapPage.ts`

**Interfaces:**
- Consumes: `resolveLegendSwatch(layer: LayerSpecification): LegendSwatch | null` aus Task 1 (`../lib/resolveLegendSwatch`), `MapLegend.addEntry`/`removeEntry` aus Task 2
- Produces: `export interface LayerToggleEvent { overlayId: string; overlayUrl: string; layerIds: string[]; layerType: string; checked: boolean; legendId: string; legendLabel: string; swatch: LegendSwatch | null; itemEl: HTMLElement; }`, `export type LayerToggleCallback = (event: LayerToggleEvent) => void;` (ersetzt die bisherige 5-Positionsparameter-Signatur — einziger Konsument ist `MapPage.ts`, unten im selben Task)

**Hinweis:** `Sidebar.ts`s Callback-Signatur und ihr einziger Konsument (`MapPage.ts`) gehören in
einen Task, nicht zwei — sonst kompiliert der Zwischenstand nach nur einer der beiden Dateien
nicht (kein eigenständig testbares Ergebnis).

- [ ] **Step 1: Import + Typ ergänzen**

In `src/components/Sidebar.ts`, Zeile 4 (`import type { LayerSpecification } from 'maplibre-gl';`)
ergänzen um:

```ts
import { resolveLegendSwatch, type LegendSwatch } from '../lib/resolveLegendSwatch';
```

Zeilen 17-23 (`LayerToggleCallback`) ersetzen durch:

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

export type LayerToggleCallback = (event: LayerToggleEvent) => void;
```

- [ ] **Step 2: `buildToggleEvent`-Helfer ergänzen**

Direkt vor `const updateGroupStatus = ...` (aktuell Zeile 153) einfügen:

```ts
  const buildToggleEvent = (itemEl: HTMLElement, group: HTMLElement, checked: boolean): LayerToggleEvent => {
    const overlayId = group.getAttribute('data-id')!;
    const overlayUrl = group.getAttribute('data-url')!;
    const layerIds: string[] = JSON.parse(itemEl.getAttribute('data-layer-ids')!);
    const layerType = itemEl.getAttribute('data-layer-type')!;
    const legendLabel = itemEl.querySelector('.acc-item-label')?.textContent ?? layerType;

    // Swatch-Auflösung geht nur, wenn für dieses Overlay echte LayerSpecifications (mit paint)
    // im Fallback-Pfad (kein layersMeta-Eintrag) geladen wurden. Der layersMeta-Pfad liefert nur
    // LayerMetaGroup (Name+style_layers+template, kein paint) — dort bleibt swatch bewusst null
    // (Legende zeigt "?", siehe docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md,
    // Entscheidung 6). Externe layers.json um Farbinfo zu erweitern ist außerhalb dieses Repos.
    // for...of statt .find(): loadedLayers ist LayerMetaGroup[] | LayerSpecification[] (Union
    // zweier Array-Typen) — TS narrowt einen 'in'-Check pro Element im for...of sauber, ohne
    // dass ein Cast auf den ganzen Array-Typ nötig wird.
    let swatch: LegendSwatch | null = null;
    const loaded = loadedLayers.get(overlayId);
    if (loaded) {
      for (const entry of loaded) {
        if ('style_layers' in entry) break; // layersMeta-Pfad, keine echten LayerSpecifications
        if (entry.id === layerIds[0]) {
          swatch = resolveLegendSwatch(entry);
          break;
        }
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
      itemEl
    };
  };
```

- [ ] **Step 3: Die drei bestehenden `onLayerToggle`-Aufrufe umstellen**

In `handleToggleItem` (aktuell Zeilen 208-222), den Body ersetzen durch:

```ts
  const handleToggleItem = (itemEl: HTMLElement) => {
    if (itemEl.classList.contains('loading-state')) return;

    const group = itemEl.closest('.acc-group') as HTMLElement;
    const isChecked = itemEl.classList.toggle('checked');
    itemEl.setAttribute('aria-checked', isChecked ? 'true' : 'false');

    onLayerToggle(buildToggleEvent(itemEl, group, isChecked));
    updateGroupStatus(group);
  };
```

Im `btnAllOn`-Handler (aktuell Zeilen 253-265 im `container.addEventListener('click', ...)`-Block),
die `forEach`-Schleife ersetzen durch:

```ts
      group.querySelectorAll('.acc-item:not(.checked):not(.loading-state)').forEach(el => {
        const itemEl = el as HTMLElement;
        itemEl.classList.add('checked');
        itemEl.setAttribute('aria-checked', 'true');
        onLayerToggle(buildToggleEvent(itemEl, group, true));
      });
```

Im `btnAllOff`-Handler (aktuell Zeilen 284-298), analog:

```ts
      group.querySelectorAll('.acc-item.checked').forEach(el => {
        const itemEl = el as HTMLElement;
        itemEl.classList.remove('checked');
        itemEl.setAttribute('aria-checked', 'false');
        onLayerToggle(buildToggleEvent(itemEl, group, false));
      });
```

- [ ] **Step 4: `MapPage.ts` — Import ergänzen**

Zeile 5 (`import { initSidebar } from '../components/Sidebar';`) ersetzen durch:

```ts
import { initSidebar, type LayerToggleEvent } from '../components/Sidebar';
```

- [ ] **Step 5: `initSidebar`-Aufruf anpassen**

Den `onLayerToggle`-Callback (aktuell Zeilen 67-78) ersetzen durch:

```ts
            initSidebar(mounts.sidebar, overlays,
                async (event) => {
                    if (this.map) {
                        await this.toggleLayer(event, this.map, legend);
                    }
                },
                undefined,
                undefined,
                layersMeta.layers,
                (selection) => this._handleSearchSelect(selection),
                this.signal
            );
```

- [ ] **Step 6: `toggleLayer` umschreiben**

Die bestehende `toggleLayer`-Methode (aktuell Zeilen 114-125) ersetzen durch:

```ts
    /**
     * Schaltet einzelne Layer oder Gruppen ein/aus über den gemeinsamen OverlayLoader und hält
     * die Legende synchron (nur aktive Layer werden dort gelistet, siehe
     * docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md).
     */
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

- [ ] **Step 7: Typecheck + bestehende Tests**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TS-Fehler, 112/112 Tests grün.

- [ ] **Step 8: Commit**

```bash
git add src/components/Sidebar.ts src/pages/MapPage.ts
git commit -m "feat(map): /karte-Legende zeigt aktive Layer, synchron mit Sidebar-Accordion"
```

---

## Task 4: Live-Verifikation + Dokumentation

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `TODO.md`

- [ ] **Step 1: Dev-Server starten**

Run: `npm run dev`

- [ ] **Step 2: Playwright-Verifikation gegen `/karte`**

Gegen den laufenden Dev-Server (Browser-Navigation zu `/karte`):

1. Sidebar öffnen, eine Overlay-Gruppe aufklappen, einen Layer per Checkbox einschalten →
   erwartet: Layer erscheint auf der Karte UND ein passender Eintrag erscheint in der Legende
   (Panel unten rechts, ggf. über den Legende-Toggle-Button in der Topbar sichtbar machen).
2. Prüfen, ob der neue Eintrag eine Farbe zeigt (Layer aus dem Fallback-Style-Parsing-Pfad,
   ohne `layersMeta`-Eintrag) oder ein „?" (Layer aus dem `layersMeta`-Pfad — beides ist
   erwartetes Verhalten, siehe Task 3 Step 2 Kommentar).
3. In der Legende auf den „×"-Button des Eintrags klicken → erwartet: Layer verschwindet von der
   Karte, Legenden-Eintrag verschwindet, UND die zugehörige Accordion-Checkbox in der Sidebar
   zeigt sichtbar den ausgeschalteten Zustand (nicht mehr `.checked`).
4. Denselben Layer erneut über die Sidebar einschalten → Legenden-Eintrag erscheint erneut.
5. „Alle an"/„Alle aus" auf einer Gruppe mit mehreren Layern klicken → alle betroffenen
   Legenden-Einträge erscheinen/verschwinden passend.
6. Browser-Konsole auf Fehler prüfen (nicht nur die erwarteten `console.warn`-Ausgaben von
   `resolveLegendSwatch` bei nicht auflösbaren Farben).

- [ ] **Step 3: Finale Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: 0 Fehler, 112+ Tests grün (112 bestehende + 10 neue aus Task 1 = 122).

- [ ] **Step 4: TODO.md aktualisieren**

In `TODO.md`, „Schritt 1: MapLegend interaktiv + Registry-Metadata" und „Schritt 2: Anwendung auf
`/karte`" als erledigt markieren (`- [x]`, kurze Zusammenfassung analog zu den bereits
abgeschlossenen ROADMAP-Punkten: was umgesetzt wurde, Verifikationsergebnis, Hinweis auf
`docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md`). Schritt 3-5 bleiben offen.

- [ ] **Step 5: CHANGELOG.md ergänzen**

Neuer `## [Unreleased] - 2026-07-09 HH:mm`-Journal-Block (Uhrzeit zum Zeitpunkt der Ausführung),
Kategorie „Hinzugefügt": interaktive `/karte`-Legende, kurze Zusammenfassung (Farb-Resolver,
Sync-Mechanismus, „?"-Fallback), Verweis auf den Spec-Doc.

- [ ] **Step 6: Commit**

```bash
git add TODO.md CHANGELOG.md
git commit -m "docs: Legende Schritt 1+2 abgeschlossen, TODO/CHANGELOG nachgezogen"
```

---

## Self-Review

**Spec-Abdeckung:** Entscheidung 1 (nur `/karte`) → alle Tasks scopen auf `/karte`. Entscheidung 2
(nur aktive Layer) → Task 3 Step 6 fügt Einträge nur bei `checked=true` hinzu. Entscheidung 3
(Klick = ausblenden) → `onRemove`. Entscheidung 4 (keine `MapRegistry`-Abstraktion) → nirgends
angefasst. Entscheidung 5 (eigener Resolver) → Task 1. Entscheidung 6 („?"-Fallback) → Task 2
Step 2 + Task 3 Step 2 Kommentar. Entscheidung 7 (Sync via `.click()`) → Task 3 Step 6 `onRemove`.

**Platzhalter-Scan:** Keine TBD/TODO-Marker in den Steps, aller Code ist vollständig.

**Typkonsistenz geprüft:** `LegendSwatch`/`SwatchType` (Task 1) → identisch in `Sidebar.ts`
(`buildToggleEvent`) und `MapPage.ts` (`event.swatch.type`/`event.swatch.color`) innerhalb von
Task 3 verwendet. `LayerToggleEvent` (Task 3, `Sidebar.ts`) → identisch als Parametertyp in
`toggleLayer()` (Task 3, `MapPage.ts`) — beide im selben Task, kein Zwischenstand mit
Typ-Mismatch. `AddLegendEntryOptions`/`LegendEntry.id` (Task 2) → in Task 3
`legend.addEntry({id: event.legendId, ...})` konsistent genutzt. **Korrektur beim Self-Review:**
ursprünglich waren `Sidebar.ts` (Callback-Signatur ändern) und `MapPage.ts` (einziger Konsument)
zwei getrennte Tasks — zusammengelegt zu Task 3, da der Zwischenstand nach nur der ersten Datei
nicht kompiliert hätte (kein eigenständig testbares Ergebnis, siehe Task-Right-Sizing-Regel).
