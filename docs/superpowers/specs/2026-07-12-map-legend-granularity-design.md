# Legenden-Granularität — Design (neues `layers.json`-Schema konsumieren)

**Status:** Genehmigt
**Datum:** 2026-07-12

## Kontext

TODO.md → „Map-Subsystem: Anschlussfeatures" → „Legenden-Granularität: neues `layers.json`-Schema
konsumieren". Anschluss an
[docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md](./2026-07-09-map-legend-interactive-design.md)
(Schritt 1+2, bereits live seit v3.9.0).

Ursprüngliches Problem (Live-Test-Feedback 2026-07-09): Die Legende auf `/karte` zeigt einen
Eintrag pro *einzeln getoggeltem Layer/Gruppe* (z.B. „A1", „A10", „A11" für Autobahnen), nicht
einen Eintrag pro *semantischer Kategorie*. Damals zwei Stoßrichtungen benannt, keine entschieden:
(a) Legenden-Logik hier überarbeiten, (b) kuratierte Legenden-Infos direkt in `layers.json`
ergänzen.

Option (b) ist jetzt extern umgesetzt — `https://tiles.oe5ith.at/layers.json` liefert pro Gruppe
zusätzlich:
- `type` — echter MapLibre-Layer-Typ (z.B. `"fill"`), nicht mehr nur die oe5ith-eigene
  `template`-Kategorie (z.B. `"strassen"`, `"gebiete"`).
- `color` — aufgelöste Literal-Farbe oder MapLibre-`match`/`case`-Expression, direkt nutzbar ohne
  Nachladen des vollen `style.json`.
- `opacity` — numerisch (nicht Teil dieser Umsetzung, siehe Out of Scope).
- `legend_items?: { label: string; color: string }[] | null` — kuratierte Mehrfach-Kategorien für
  Gruppen mit `match`-Farbskala. Aktuell nur beim `anfahrtszeit`-Template befüllt (6 Einträge:
  „0-15 min" … „75-90 min"); alle anderen 7 Templates liefern `null`.

Konkreter Fall, der das Dedupe-Problem zeigt: der Anfahrtszeit-Layer (`anfahrtszeit-linz`) hat
6 einzeln togglebare Ringe (`15-0`, `30-15`, `45-30`, `60-45`, `75-60`, `90-75`), aber **alle 6**
tragen denselben `legend_items`-Satz (dieselbe globale Farbskala). Ohne Dedupe würden bei mehreren
gleichzeitig aktiven Ringen die 6 Zeilen mehrfach dupliziert erscheinen (bis zu 36 Zeilen).

Dieses Repo konsumiert die neuen Felder noch nicht:
- `LayerMetaGroup` (`src/components/Sidebar.ts:7-11`) kennt `type`/`color`/`legend_items` nicht.
- `buildToggleEvent()` (`src/components/Sidebar.ts:181-230`) lädt bei fehlender `realLayer`-
  Zuordnung **immer** das volle `style.json` per `fetchStyleLayersForColor` nach — auch für die
  14 kuratierten Overlays, wo das jetzt unnötig ist (Bug: der bestehende Loop bricht beim
  layersMeta-Pfad sofort mit `break` ab, `realLayer` bleibt `undefined`, Fallback greift immer).
- Es gibt keinen Mechanismus, mehrere Legenden-Zeilen aus einer einzigen Gruppe zu erzeugen.

## Entscheidungen aus dem Brainstorming

1. **Kein „×" auf einzelnen `legend_items`-Zeilen.** Nutzer-Feedback: Sichtbarkeit steuert man
   über die Sidebar-Checkbox der Gruppe, ein zusätzlicher Remove-Pfad pro Farbband ist unnötige
   Komplexität. `legend_items`-Zeilen sind rein informativ (keine `onRemove`-Callback).
2. **`layersMeta.color` immer bevorzugen**, wenn eine Gruppe es besitzt. `fetchStyleLayersForColor`
   (volles `style.json` nachladen) bleibt nur Fallback für Gruppen/Overlays **ohne** `color`-Feld
   (Alt-/Sonderfall, z.B. ein zukünftiges Overlay ganz ohne `layersMeta`-Eintrag). Weniger
   Netzwerk-Roundtrips, eine Quelle der Wahrheit.
3. **`legend_items` einmal pro Overlay zeigen, nicht pro Gruppe** (Referenzzählung). Löst das
   Dedupe-Problem direkt an der Wurzel — genau das ursprüngliche Granularitäts-Problem.
4. **`opacity` bewusst nicht konsumiert.** Legenden-Swatches rendern schon seit Schritt 1
   (2026-07-09) immer volldeckend, unabhängig von der tatsächlichen Layer-Opacity auf der Karte —
   das ändert diese Umsetzung nicht mit (kein Bedarf validiert, YAGNI).
5. **`resolveLegendSwatch.ts` bleibt die alleinige Stelle für Swatch-Auflösung** — neue Funktion
   `resolveSwatchFromLayersMetaColor()` ergänzt dort, nutzt intern denselben `extractLiteralColor`,
   den `resolveLegendSwatch()` schon hat (kein Duplikat der match/case-Fallback-Logik).

## Umsetzung

### 1. `src/components/Sidebar.ts` — `LayerMetaGroup` erweitern

```ts
export interface LayerMetaGroup {
  name: string;
  style_layers: string[];
  template: string;
  type?: string;                                    // echter MapLibre-Typ, z.B. "fill"
  color?: unknown;                                   // Literal-Farbe oder match/case-Expression
  legend_items?: { label: string; color: string }[] | null;
}
```

`discoverLayers()`: beim Rendern des layersMeta-Pfads (`meta.groups.map((g, idx) => ...)`) jedem
`.acc-item` zusätzlich `data-group-index="${idx}"` mitgeben — Rückverbindung vom DOM-Element zum
vollen `LayerMetaGroup`-Objekt (bisher nur `template`+`style_layers` verfügbar, kein `color`/
`legend_items`-Zugriff möglich).

### 2. `src/lib/resolveLegendSwatch.ts` — neue Funktion

```ts
export function resolveSwatchFromLayersMetaColor(type: string | undefined, color: unknown): LegendSwatch | null {
  const swatchType = swatchTypeForLayerType(type ?? '');
  if (!swatchType) return null;
  return { type: swatchType, color: extractLiteralColor(color) };
}
```

Reine Funktion, nutzt intern das bereits vorhandene `extractLiteralColor` (aktuell modul-intern,
wird für diese Funktion nicht extra exportiert — bleibt Implementierungsdetail des Moduls).

### 3. `src/components/Sidebar.ts` — `buildToggleEvent()` umbauen

Ersetzt den bisherigen Loop (der beim layersMeta-Pfad sofort `break`t, siehe Kontext-Bug oben):

```ts
let swatch: LegendSwatch | null = null;
let legendItems: { label: string; type: SwatchType; color: string }[] | null = null;

const loaded = loadedLayers.get(overlayId);
const isMetaPath = loaded && loaded.length > 0 && 'style_layers' in loaded[0];

if (isMetaPath) {
  const idx = Number(itemEl.getAttribute('data-group-index'));
  const group = (loaded as LayerMetaGroup[])[idx];

  if (group.legend_items && group.legend_items.length > 0) {
    const itemType = swatchTypeForLayerType(group.type ?? layerType) ?? 'dot';
    legendItems = group.legend_items.map(li => ({ label: li.label, type: itemType, color: li.color }));
  } else if (group.color !== undefined) {
    swatch = resolveSwatchFromLayersMetaColor(group.type, group.color);
  }
}

// Fallback: kein layersMeta-Pfad ODER Gruppe ohne color-Feld (Alt-/Sonderfall)
if (!isMetaPath || (!legendItems && swatch === null)) {
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
```

`LayerToggleEvent` bekommt ein neues Feld:

```ts
export interface LayerToggleEvent {
  // … bestehende Felder unverändert …
  swatch: LegendSwatch | null;
  legendItems: { label: string; type: SwatchType; color: string }[] | null;  // neu
}
```

`swatch` und `legendItems` sind durch die Logik oben gegenseitig exklusiv (nie beide gesetzt).

### 4. `src/pages/MapPage.ts` — `toggleLayer()` um Referenzzählung erweitern

Neues privates Feld: `private legendItemsRefCount = new Map<string, number>();` (Key: `overlayId`).

```ts
private async toggleLayer(event: LayerToggleEvent, m: maplibregl.Map, legend: MapLegend) {
    try {
        if (event.checked) {
            await OverlayLoader.add(m, event.overlayId, event.overlayUrl, { signal: this.signal, layerIds: event.layerIds });
            if (event.legendItems) {
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

## Error Handling / Edge Cases

- Gruppe ohne `color`-Feld (Alt-/Sonderfall, noch nicht kuratiertes Overlay) → Fallback auf
  bisheriges Verhalten (`fetchStyleLayersForColor`), unverändert.
- `resolveSwatchFromLayersMetaColor` liefert `color: null`, wenn `extractLiteralColor` die
  Expression nicht auflösen kann (z.B. unbekanntes Muster) → „?"-Swatch, wie bisher bei
  `resolveLegendSwatch()`.
- `legendItemsRefCount` ist reiner In-Memory-Zustand des `MapPageController` — wird bei jedem
  `mount()` neu instanziiert, kein Cleanup in `destroy()` nötig (kein Leck, da Instanz selbst
  verworfen wird).
- Schnelles mehrfaches Toggeln mehrerer Ringe eines `legend_items`-Overlays → Referenzzählung
  verhindert Duplikate; Zähler kann nicht negativ werden (`Math.max(0, …)`), falls ein `remove`
  ohne vorheriges `add` ankäme (sollte laut Sidebar-Zustandsmaschine nicht vorkommen, ist aber
  defensiv abgesichert).
- `data-group-index` fehlt (sollte nur bei Programmierfehler auftreten, nicht bei normaler
  Nutzung) → praktisch unerreichbar, da das Attribut ausschließlich im selben Render-Zweig
  gesetzt wird, der auch `isMetaPath` wahr werden lässt (structurally gekoppelt, siehe
  `discoverLayers()`/`buildToggleEvent()` in `Sidebar.ts`) — nicht wie ursprünglich hier
  behauptet `Number(null)` → `NaN` (`Number(null)` ist tatsächlich `0`, nur `Number(undefined)`
  ist `NaN`, und `getAttribute()` liefert bei fehlendem Attribut `null`, nie `undefined`).
  Korrigiert nach Review-Fund in der finalen Whole-Branch-Review (2026-07-12).

## Testing

- `resolveLegendSwatch.test.ts` (erweitert): `resolveSwatchFromLayersMetaColor()` — Literal-Farbe
  pro Typ, `match`-Expression → Fallback-Farbe, nicht auflösbare Expression → `color: null`,
  unbekannter/nicht legend-fähiger Typ → `null`.
- `Sidebar.ts`/`MapPage.ts`-Verdrahtung bleibt wie bei Schritt 1+2 ohne dedizierte Unit-Tests
  (Projekt-Konvention: DOM-Wiring wird live verifiziert, nicht in Isolation getestet — siehe
  Testing-Abschnitt der Vorgänger-Spec).
- `npx tsc --noEmit && npm test` muss grün bleiben.
- Live-Verifikation auf `/karte` (durch den Nutzer): Autobahnen/Bezirke/etc. (kein `legend_items`)
  → Legende zeigt weiterhin einen Eintrag pro Gruppe, jetzt ohne den `style.json`-Nachlade-Umweg.
  Anfahrtszeit-Ringe → mehrere Ringe gleichzeitig aktivieren, Legende zeigt die 6-stufige
  Farbskala **genau einmal**; letzten Ring deaktivieren → Farbskala verschwindet wieder.

## Out of Scope

- `opacity`-Feld konsumieren (Entscheidung 4).
- `/nah`, `/routing`, `/tracking` (TODO.md Schritte 3-5) — unverändert eigene, spätere Schritte.
- Generische `MapRegistry`-Legend-Metadata — weiterhin nicht gebaut (Entscheidung 4 der
  Vorgänger-Spec gilt unverändert).
- Legend-Section-Header/Gruppierung in `MapLegend.ts` (z.B. „Anfahrtszeit" als Überschrift über
  den 6 Farbband-Zeilen) — `MapLegend` kennt aktuell nur eine flache Liste; die `legend_items`-
  Labels sind bereits selbsterklärend genug („0-15 min" etc.), Header wäre zusätzlicher Scope ohne
  validierten Bedarf (aktuell nur ein Overlay-Template betroffen).
