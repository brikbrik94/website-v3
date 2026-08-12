# Legend width/dasharray/outline-Felder: Client-Konsumierung (`line-cased`)

## Kontext

`oe5ith-ci` v1.25.0 (+ Doku-Nachbesserung `0092387`, siehe `docs/ci/open-items.md`) liefert die
`MapLegend`-Swatch-Erweiterungen, die bei der `legend_scale_id`/`legend_sections`-Runde
(`docs/superpowers/plans/2026-08-12-legend-v1.1-fields.md`) bewusst zurückgestellt wurden:
`width`/`dasharray` bei `type: 'line'`, `outline_color`/`outline_width` bei `type: 'area'`, und
ein neuer Typ `type: 'line-cased'` für Casing-Linien (Innen-/Außenfarbe, z.B. Skilifte). Schließt
[oe5ith-ci#1](https://github.com/brikbrik94/oe5ith-ci/issues/1). Dieser Spec deckt die
website-v3-seitige Konsumierung dieser Felder aus `layers.json` ab.

**Scope:** Betrifft nur den **Einzel-Swatch-Pfad** (`resolveSwatchFromLayersMetaColor`/
`computeSwatchDedupKey`). `legend_items`/`legend_scale_id`-Zeilen sind laut
`geodata-plugin-standard` `{label, color}` — kein Pro-Item-`width`/`outline`-Konzept — und bleiben
unverändert.

## Live-Daten-Befund (2026-08-12)

Aktuell hat kein Overlay eine `width`/`dasharray`/`outline_*`-Kombination, die tatsächlich über
den Einzel-Swatch-Pfad gerendert wird — alle 3 Gruppen mit gesetzten Feldern (`ski-lifts`,
`ski-runs-downhill`, `ski-runs-nordic`) haben zusätzlich `legend_items`/`legend_scale_id`
gesetzt, was in `resolveLegendItemsForGroup()` Priorität vor dem Swatch-Pfad hat. Wie beim
`icon`-Fallback der letzten Runde: End-to-End-Verifikation erfolgt daher per
Playwright-Netzwerk-Mock, nicht gegen echte Live-Daten.

Zwei reale Datenlücken, die die Fallback-Regel unten motivieren:
- `ski-lifts`: `type: 'line'`, `color: null` (Status-`match`-Expression, siehe unten),
  `width: 3.0`, `outline_color: "hsl(0, 0%, 100%)"`, `outline_width: 5.0`.
- `ski-runs-downhill`/`-nordic`: `type: 'fill'`, `outline_width: 5.0`, `outline_color: null`
  (unvollständiges Paar).

**Warum `color: null` bei `ski-lifts` — und wann das den Swatch-Pfad überhaupt erreicht:**
Laut `geodata-plugin-standard` §5.3 ist `color` `null`, sobald die Paint-Property eine Expression
statt eines Literals ist — bei `ski-lifts` eine `match`-Expression über den Lift-Status. §5.4
garantiert, dass ein Property-getriebenes `match`/`interpolate` zusätzlich `legend_items` befüllt
— genau das ist bei `ski-lifts` der Fall, der Swatch-Pfad wird also aktuell nie erreicht. Ein
`color: null` **ohne** `legend_items` ist trotzdem ein realer, nur aktuell nicht auftretender
Fall: eine **Zoom-basierte** `interpolate`-Expression liefert laut §5.3 ebenfalls `color: null`,
fällt aber nicht unter §5.4s Property-getriebene Kategorisierung — bekäme also kein
`legend_items`. Die Fallback-Regel unten muss diesen Fall korrekt behandeln, auch ohne aktuellen
Live-Beleg.

## 1. Entscheidungsbaum (`resolveSwatchFromLayersMetaColor`)

```
type === 'line':
  resolvedColor = extractLiteralColor(color)
  wenn outline_color && outline_width && resolvedColor !== null && width != null:
    → { type: 'line-cased', color: resolvedColor, width, outline_color, outline_width }
    (dasharray nicht anwendbar bei line-cased laut oe5ith-ci-API — wird nicht übergeben)
  sonst:
    → { type: 'line', color: resolvedColor, width?, dasharray? }
    (outline_* wird verworfen, sobald nicht alle 4 line-cased-Pflichtfelder auflösbar sind —
    keine erfundenen Farben, kein "❓"-Zwang, einfach ein normaler line-Swatch mit dem, was
    auflösbar ist)

type === 'fill' | 'fill-extrusion':
  resolvedColor = extractLiteralColor(color)
  wenn outline_color && outline_width (beide gesetzt):
    → { type: 'area', color: resolvedColor, outline_color, outline_width }
  sonst:
    → { type: 'area', color: resolvedColor }
    (ein einzelnes outline_width oder outline_color — wie live bei ski-runs-downhill/-nordic —
    wird verworfen statt partiell übergeben; vermeidet oe5ith-ci's addEntry()-Fehler "'area'
    benötigt outline_color UND outline_width zusammen")

type === 'circle' | 'symbol' | 'icon': unverändert — kein width/dasharray/outline-Konzept für
  dot/icon in der oe5ith-ci-API.
```

`computeSwatchDedupKey()` erweitert den bestehenden Schlüssel (`overlayId:template:type:color`)
um `width`/`dasharray`/`outline_color`/`outline_width` — nach demselben Prinzip wie der
bestehende Schlüssel: zwei visuell unterschiedliche Gruppen dürfen nicht fälschlich zu einer
Legenden-Zeile zusammenfallen, auch wenn sie sonst overlayId/template/type/color teilen.

## 2. Typen

`src/types/common.ts`:

```ts
export interface LegendEntry {
    id?: string;
    type: 'dot' | 'line' | 'area' | 'icon' | 'line-cased';
    color: string | null;
    label: string;
    icon?: string;
    opacity?: number;
    width?: number;                // type:'line' (Höhe, geclampt 1-6px) | type:'line-cased' (Pflicht, Innenbreite)
    dasharray?: [number, number];  // type:'line' — [Strich, Lücke]
    outline_color?: string;        // type:'area' (mit outline_width) | type:'line-cased' (Pflicht)
    outline_width?: number;        // type:'area' (geclampt 1-3px) | type:'line-cased' (Pflicht, geclampt 2-8px)
}
```

`src/lib/resolveLegendSwatch.ts`: `LegendSwatch`/`SwatchType` erweitern um dieselben 4 Felder
plus `'line-cased'` im `SwatchType`-Union.

`src/components/Sidebar.ts`: `LayerMetaGroup` erweitert um
`width?: number | null; dasharray?: [number, number] | null; outline_color?: string | null;
outline_width?: number | null;` (bewusst letzte Runde weggelassen, mangels Konsument — jetzt
vorhanden).

## 3. `MapLegend.ts` — Rendering (1:1 nach `oe5ith-ci`-Referenzimplementierung portiert)

`addEntry()` gewinnt, exakt nach `oe5ith-ci/components/modal.html`s Referenz (gleiche
Clamp-Bereiche, gleiche Dasharray-Skalierung auf einen 8px-Zyklus, gleiche Validierungsfehler —
für den `line-cased`-Zweig unbedingt derselbe Vertrag für jeden Aufrufer, nicht nur den
`layers.json`-Pfad, da `NahPage.ts`/`RoutingPage.ts` bereits von Hand `LegendEntry`-Objekte
bauen; die `dasharray`-Längenprüfung und die `area`-Outline-Paar-Prüfung greifen dagegen nur,
wenn `entry.color !== null` ist — ein Aufrufer, der `color: null` zusammen mit einem
unvollständigen Outline-Paar übergibt, fällt stattdessen unvalidiert in den bestehenden
„Farbe nicht auflösbar"-Fallback):

- **`line-cased`-Zweig**: Wrapper (`.map-legend-line-cased`) mit zwei gestapelten Balken
  (`.map-legend-line-cased-outline`, `.map-legend-line-cased-inner`), Outline zuerst im DOM.
  Wirft, wenn eines der 4 Pflichtfelder fehlt (Verteidigung in der Tiefe — der Resolver
  garantiert gültige Kombinationen, aber `MapLegend.ts` bleibt für von Hand konstruierte
  Aufrufer korrekt).
- **`line`** gewinnt optionales `width` (→ `style.height`, geclampt 1-6px) und `dasharray`
  (→ `repeating-linear-gradient`-Hintergrund, proportional auf 8px-Zyklus skaliert) — wirft, wenn
  `dasharray` nicht genau 2 Werte hat.
- **`area`** gewinnt optionales `outline_color`/`outline_width` (→ `style.border`, geclampt
  1-3px) — wirft, wenn nur eines der beiden gesetzt ist (tritt in der Praxis nie auf, da der
  Resolver nur beide-oder-keines übergibt, aber deckt sich mit dem `oe5ith-ci`-Vertrag).

Die bestehende `entry.type === 'icon' && entry.icon` / `entry.color === null`-Reihenfolge aus der
letzten Runde bleibt unverändert — dieser Abschnitt ergänzt nur neue Zweige daneben.

## 4. `Sidebar.ts`/`MapPage.ts`-Wiring

`resolveSwatchFromLayersMetaColor()`s Signatur erweitert sich um die 4 neuen, optionalen
Parameter. `buildToggleEvent()` in `Sidebar.ts` übergibt `metaGroup.width`,
`metaGroup.dasharray`, `metaGroup.outline_color`, `metaGroup.outline_width` an der einen
Call-Site, die bereits `swatch` aus `metaGroup.color`/`metaGroup.type` auflöst — keine weitere
Änderung nötig, `swatch` fließt unverändert als `LegendSwatch`-Objekt durch
`LayerToggleEvent.swatch` → `MapPage.ts`s `addEntry()`-Aufrufe.

`MapPage.ts`s zwei `addEntry()`-Aufrufe, die `event.swatch` spreaden (derselbe `dedupKey`-Zweig
und der reine Swatch-Fallback-Zweig, an denen letzte Runde bereits `icon` ergänzt wurde), ergänzen
`width: event.swatch.width, dasharray: event.swatch.dasharray, outline_color:
event.swatch.outline_color, outline_width: event.swatch.outline_width` neben den bestehenden
`type`/`color`/`icon`.

## 5. Tests

- `resolveLegendSwatch.test.ts`: `resolveSwatchFromLayersMetaColor()` — plain line mit nur
  `width`; plain line mit nur `dasharray`; volles line-cased (alle 4 Felder); line-cased-Fallback
  bei nicht auflösbarem `color` (ski-lifts-Fall); line-cased-Fallback bei fehlendem `width`; area
  mit beiden outline-Feldern; area mit nur `outline_width` (verworfen, kein Fehler); area mit nur
  `outline_color` (verworfen, kein Fehler). `computeSwatchDedupKey()` — zwei sonst identische
  Swatches, die sich nur in `width`/`dasharray`/`outline_color`/`outline_width` unterscheiden,
  bekommen unterschiedliche Schlüssel.
- `MapLegend.test.ts`: neue `line-cased`-DOM-Struktur (zwei gestapelte Balken, korrekte
  Klassen/geclampte Höhen); `line` mit `width` (geclampte Höhe) und `dasharray`
  (Hintergrund-Gradient vorhanden); `area` mit Outline (Border-Style vorhanden); die 3
  Validierungs-Wurf-Fälle (falsche `dasharray`-Länge, unvollständiges area-outline-Paar,
  fehlendes line-cased-Pflichtfeld).
- Live-Verifikation: da aktuell keine Gruppe den Einzel-Swatch-Pfad ohne vorherigen
  `legend_items`/`legend_scale_id`-Abzweig erreicht (siehe Live-Daten-Befund oben), erneut per
  Playwright-Netzwerk-Mock (gleiche Technik wie beim `icon`-Fallback der letzten Runde) — ein
  synthetisches `line-cased`-Beispiel, ein `dasharray`-Beispiel, ein `area`-mit-Outline-Beispiel.

## Nicht Teil dieses Specs

- `legend_items`/`legend_scale_id`-Zeilen bleiben `{label, color}`-only — kein Pro-Item-`width`/
  `outline`, da der Standard das nicht vorsieht.
- Legenden-Gruppierung/Section-Header — separater, weiterhin unvalidierter ROADMAP-Punkt.
