# Interaktive Legende — Design (Schritt 1 + Schritt 2: `/karte`)

**Status:** Genehmigt
**Datum:** 2026-07-09

## Kontext

TODO.md → „Map-Subsystem: Anschlussfeatures" (von ROADMAP.md hierher verschoben, 2026-07-09).
`MapLegend` (`src/lib/MapLegend.ts`) existiert bereits als reines Anzeige-Panel (`addEntry`,
`show`/`hide`/`toggle`), wird aber aktuell nur auf `/nah` befüllt — 5 hardcodierte
`legend.addEntry(...)`-Aufrufe in `NahPage.ts`, ohne jede Verbindung zu den tatsächlichen
Layer-IDs. `/karte` und `/routing` instanziieren `MapLegend` nur für den Topbar-Toggle-Button,
befüllen sie nie. Klick-Interaktivität existiert nirgends — Einträge sind reine, nicht-klickbare
`<div>`s.

Machbarkeits-Recherche (2026-07-09) hat ergeben:

- `MapRegistry.registerLayer()` kennt keinerlei Legenden-Semantik (nur rohe MapLibre-
  `LayerSpecification`, kein Label, keine Zuordnung Layer→Legenden-Zeile). Eine generische
  Ableitung direkt aus der Registry ist nicht möglich.
- `/karte` ist der komplexeste Fall: Layer kommen dynamisch aus `layers.json`/Overlay-
  `style.json` (extern, Tile-Server), Sichtbarkeit läuft nicht über
  `map.setLayoutProperty(id, 'visibility', ...)`, sondern über `OverlayLoader.add()`/`.remove()`
  (fügt Layer/Source/Sprite komplett hinzu/entfernt sie), angestoßen von den Accordion-Checkboxen
  in `Sidebar.ts`.
- Farbinfo für die Swatches ist vorhanden, aber nur in der `paint`-Definition der einzelnen
  Style-Layer (nicht in `layers.json`s `LayerMetaGroup` selbst) — u.a. als MapLibre-`match`-
  Expression (`NahMapLayers.ts:209-215`, ein Layer → drei Legenden-Zeilen).
- Existierende MapLibre-Legend-Plugins (`mapboxgl-legend`, `@watergis/maplibre-gl-legend`)
  wurden geprüft und verworfen: beide bringen eigenes UI/CSS mit, das der CI-Pflicht widerspricht
  (CLAUDE.md: alles UI folgt `oe5ith-ci`-Tokens), und würden ein zweites, paralleles
  Legenden-System neben dem bestehenden `MapLegend.ts` schaffen.

## Entscheidungen aus dem Brainstorming

1. **Nur `/karte`, nicht alle vier Kartenseiten auf einmal.** Komplexester Fall zuerst als
   Machbarkeitsnachweis; `/nah`/`/routing`/`/tracking` sind separate TODO-Schritte (3-5), erst
   nachdem dieser Schritt funktioniert.
2. **Legende zeigt nur aktuell aktive Layer** (nicht die volle Liste aller verfügbaren
   Layer-Gruppen). Wächst/schrumpft mit der Sidebar-Accordion-Auswahl. Neue Layer werden weiterhin
   ausschließlich über die Sidebar eingeschaltet — die Legende ist eine Zusammenfassung des
   sichtbaren Zustands, kein zweiter vollständiger Layer-Katalog.
3. **Klick auf einen Legenden-Eintrag blendet ihn aus** (kein Wiedereinschalten von dort, da
   inaktive Layer dort gar nicht erst auftauchen). Das macht die Synchronisation asymmetrisch und
   einfach: Sidebar→Legende (Eintrag hinzufügen/entfernen bei Toggle) und Legende→Sidebar (Klick
   auf „×" löst denselben, bestehenden Toggle-Pfad aus).
4. **Keine generische `MapRegistry`-Legend-Metadata-Abstraktion vorab bauen.** Würde für `/karte`
   keinen Vorteil bringen (der Toggle-Punkt in `MapPageController.toggleLayer()` hat direkten
   Zugriff auf alles Nötige) und wäre Spekulation auf einen noch nicht validierten Bedarf für
   `/nah`/`/routing`. Bei Schritt 3/4 neu bewerten.
5. **Eigener, schlanker Farb-Resolver statt npm-Package** (`@watergis/legend-symbol` geprüft und
   verworfen) — deckt nur die tatsächlich im Repo vorkommenden Muster ab (Literal-Farbe,
   `match`-Expression), kein Risiko durch fremdes Paket für einen kleinen Teilbereich.
6. **Nicht auflösbare Farbe → Eintrag trotzdem zeigen, Swatch als „?"** statt Eintrag
   wegzulassen oder stillschweigend eine neutrale Farbe zu zeigen — macht sichtbar, wo der
   Resolver (bewusst schmal gehalten, Punkt 5) noch nicht greift, damit das gezielt nachgetragen
   werden kann statt unbemerkt zu bleiben.
7. **Legende↔Sidebar-Sync ohne zweite Toggle-Implementierung**: Der „×"-Klick auf einen
   Legenden-Eintrag löst einen echten `.click()` auf das zugehörige `.acc-item`-Element in der
   Sidebar aus — dieselbe bestehende Logik (Checkbox-Visuals, ARIA, `OverlayLoader.remove`,
   Status-Zähler) läuft unverändert, keine Duplikation, keine Drift-Möglichkeit zwischen beiden
   UIs.

## Umsetzung

### 1. Neue Utility `src/lib/resolveLegendSwatch.ts`

```ts
export type SwatchType = 'dot' | 'line' | 'area';

export function resolveLegendSwatch(
  layer: LayerSpecification
): { type: SwatchType; color: string | null } | null
```

- Layer-`type` → Swatch-`type`: `line`→`line`, `fill`/`fill-extrusion`→`area`,
  `circle`/`symbol`→`dot`. Alle anderen (`raster`, `background`, `hillshade`, `heatmap`, …) →
  `null` (kein Legenden-Eintrag, Layer bleibt aber über die Sidebar normal togglebar).
- Farbe aus der passenden `paint`-Property (`line-color`/`fill-color`/`icon-color` bzw.
  `circle-color`):
  - `string` → direkt übernehmen.
  - `['match', input, label1, output1, ..., fallback]` → letzter Array-Eintrag (der
    Fallback-Arm ist laut MapLibre-Style-Spec bei `match` immer verpflichtend und immer der
    letzte Eintrag).
  - alles andere (verschachtelte Expression, `case`, `interpolate`, fehlende Property) →
    `color: null` (Typ bleibt aber bekannt, damit ein „?"-Swatch vom richtigen Typ gerendert
    werden kann) + `console.warn('[resolveLegendSwatch] Farbe nicht auflösbar für Layer', layer.id)`
    für spätere gezielte Erweiterung.

### 2. `src/lib/MapLegend.ts` (erweitert)

- `LegendEntry` (`src/types/common.ts`) bekommt ein optionales `id?: string` und
  `color: string | null` (statt nur `string`) — rückwärtskompatibel zu den bestehenden,
  statischen `/nah`-Einträgen (kein `id`, `color` immer gesetzt).
- `addEntry(entry: LegendEntry & { onRemove?: () => void })`: bei vorhandenem `id` wird der
  erzeugte DOM-Knoten zusätzlich in einer internen `Map<string, HTMLElement>` gemerkt; bei
  `color === null` wird statt eines Farb-Swatches ein `?`-Symbol gerendert (gleiche
  `map-legend-dot`/`-line`/`-area`-Klasse für die Form, aber `background` bleibt leer/neutral,
  Text „?" mittig). Bei vorhandenem `onRemove` wird ein `<button class="btn-ghost btn-sm"
  aria-label="${label} entfernen">×</button>` an den Eintrag angehängt (echtes `<button>` für
  native Tastaturbedienbarkeit).
- Neue Methode `removeEntry(id: string): void` — entfernt DOM-Knoten + internen Map-Eintrag.

### 3. `src/components/Sidebar.ts`

- `LayerToggleCallback` wird von 5 Positionsparametern auf ein Options-Objekt umgestellt (einziger
  Konsument ist `MapPage.ts`, risikoarme Änderung):
  ```ts
  export interface LayerToggleEvent {
    overlayId: string;
    overlayUrl: string;
    layerIds: string[];
    layerType: string;
    checked: boolean;
    legendId: string;               // stabile id = `${overlayId}:${layerIds.join(',')}`
    legendLabel: string;             // aus itemEl.querySelector('.acc-item-label')?.textContent
    swatch: { type: SwatchType; color: string | null } | null;
    itemEl: HTMLElement;             // für den onRemove-Rückweg (Schritt 4)
  }
  export type LayerToggleCallback = (event: LayerToggleEvent) => void;
  ```
- `handleToggleItem` löst `swatch` über `resolveLegendSwatch()` auf Basis der in `loadedLayers`
  bereits vorhandenen Layer-Definition für `layerIds[0]` auf (repräsentativ für die ganze Gruppe —
  passt zum bestehenden Muster, dass eine Gruppe schon jetzt einen einzigen `data-layer-type`
  hat).

### 4. `src/pages/MapPage.ts`

- `toggleLayer()` nimmt jetzt das `LayerToggleEvent`-Objekt entgegen statt einzelner Parameter.
- Bei `checked === true` nach erfolgreichem `OverlayLoader.add`: falls `swatch !== null` →
  `legend.addEntry({ id: legendId, label: legendLabel, type: swatch.type, color: swatch.color,
  onRemove: () => itemEl.click() })`.
- Bei `checked === false`: `legend.removeEntry(legendId)`.
- `legend`-Instanz muss dafür aus dem `initTopbar`-Aufruf heraus auch im `onLayerToggle`-Handler
  erreichbar sein (bereits im gleichen `mount()`-Scope vorhanden, keine neue Durchreichung nötig).

## Error Handling / Edge Cases

- Layer-Typ nicht legend-fähig (raster/background/hillshade/heatmap) → kein Legenden-Eintrag,
  Sidebar-Toggle funktioniert unverändert normal weiter.
- Farbe nicht auflösbar → Eintrag mit „?"-Swatch + `console.warn` (siehe oben), kein Absturz.
- Mehrfaches Ein-/Ausschalten derselben Gruppe (z.B. schnelles Klicken) → `addEntry`/`removeEntry`
  sind idempotent bzgl. `legendId`; ein erneutes `addEntry` mit bereits vorhandener `id` ersetzt
  den bestehenden DOM-Knoten (kein Duplikat).
- Seitenwechsel während offener Legende → unverändert, `MapLegend` wird wie bisher beim
  Layout-Neuaufbau der nächsten Seite verworfen (kein Cleanup-Sonderfall, da rein DOM-basiert,
  kein `AbortSignal`/Listener außerhalb des eigenen Containers).

## Testing

- `resolveLegendSwatch.test.ts` (neu): Literal-Farbe pro Typ (line/fill/circle/symbol), `match`-
  Expression → Fallback-Farbe, nicht auflösbare Expression → `{type, color: null}`, nicht
  legend-fähiger Typ (raster/background) → `null`.
- `MapLegend.test.ts` (erweitert, falls noch nicht vorhanden — sonst neu): `addEntry`/
  `removeEntry` mit `id`, „?"-Rendering bei `color: null`, `onRemove`-Button-Klick löst Callback
  aus, bestehende statische Einträge ohne `id` funktionieren unverändert (Regression `/nah`).
- `npx tsc --noEmit && npm test` muss grün bleiben. Danach Live-Verifikation (Playwright gegen
  laufenden Dev-Server auf `/karte`): Layer über Accordion einschalten → Legenden-Eintrag
  erscheint mit korrekter Farbe/Label; „×" in der Legende klicken → Layer verschwindet von der
  Karte UND Accordion-Checkbox wird sichtbar deaktiviert; Layer mit nicht auflösbarer Farbe (falls
  vorhanden) zeigt „?".

## Out of Scope

- `/nah`, `/routing`, `/tracking` (TODO.md Schritte 3-5) — erst nach erfolgreichem Nachweis hier.
- Generische `MapRegistry`-Legend-Metadata (Entscheidung 4) — erst bei Bedarf für Schritt 3/4.
- Vollständiges Style-Spec-Expression-Parsing (`case`, `interpolate`, Daten-Properties) — bewusst
  nur die aktuell vorkommenden Muster, siehe Entscheidung 5/6.
