# Design: Client-Konsumierung von `render`/`variants` (geodata-plugin-standard §5.3, Schema v2.0/v2.1)

## Kontext

`ski-runs-downhill`/`-nordic` (Pisten/Loipen) konnten in der Legende nicht mit dem echten
Kartenstil dargestellt werden, weil `outline_color` bei den alten Flachfeldern (`type`/`color`)
`null` war — die Casing-Farbe variiert pro Schwierigkeitsgrad, was der Standard damals nicht
ausdrücken konnte ([geodata-plugin-standard#2](https://github.com/brikbrik94/geodata-plugin-standard/issues/2),
siehe `docs/geodata/open-items.md`). Der Standard hat das inzwischen (v2.0→v2.1) durch ein
grundlegend neues Modell gelöst: `render: Array<Part>` (ein Part pro echtem MapLibre-Style-Layer,
`kind: fill/line/outline/icon/text/circle`, Farbe entweder fix oder `{mode:"scale", scale_id}`)
plus optional `variants: Array<{axis, label, render}>` für filter-basierte, sich gegenseitig
ausschließende Formen (z.B. Pisten-„Buckelpiste" vs. „Piste (Backcountry)"). Referenz:
`geodata-plugin-standard/docs/render-parts-guide.md`.

Der Guide-Algorithmus für Consumer sagt: pro Part mit `color.mode:"scale"` einmal pro
`legend_sections`-Item zeichnen. Wortwörtlich angewendet (verifiziert gegen die Live-Daten von
`tiles.oe5ith.at/layers.json` gegen `openskimap`, Stand 2026-08-16) explodiert das in der
Zeilenzahl: Pisten allein kommt auf 32 Zeilen (4 `render[]`-Parts + 3 `grooming`-Varianten × 8
Farben), alle 12 `openskimap`-Gruppen zusammen auf 85.

## Entscheidung

**Layout ist eine Consumer-Entscheidung, keine Schema-Vorgabe** (der Guide erlaubt explizit,
eine Skala „beliebig oft und an beliebigen Stellen" zu rendern). Gewählt: **eine Legenden-Zeile
pro Form-Variante statt pro Skalen-Item** — Farbabwandlungen laufen als Streifen aus kleinen
SVG-Chips innerhalb dieser einen Zeile, statt eine volle Zeile pro Farbe zu erzeugen. Für
`openskimap` (Stand 2026-08-16) ergibt das 18 statt 85 Zeilen (Pisten 4 statt 32, Lifte 4 statt
14 usw.).

Der Weg dorthin: mehrere Artifact-Iterationen gegen die echten Live-Daten (nicht Text-
Brainstorming) — Rohdaten-Katalog → wortwörtliche Voll-Expansion (zeigt das 85-Zeilen-Problem
konkret) → Nutzer-Vorgabe „Farbabwandlungen einer Zeile nebeneinander, Skala separat darunter"
→ CSS-Näherung (Divs mit `background`-Gradient) → echtes SVG mit den realen `width`/`radius`/
`dasharray`-Werten, weil die CSS-Näherung nicht wie auf der echten Karte aussah und speziell
gestrichelt/gepunktet nicht unterscheidbar war.

**Zwei zusätzliche Konsequenzen dieser Entscheidung:**

1. **`dasharray`-Semantik korrigiert.** MapLibre gibt `line-dasharray`-Werte in Vielfachen der
   Linienbreite an, nicht in Pixeln — reale Pixel-Länge = `dasharray`-Wert × `width`. Die erste
   CSS-Fassung nutzte einen erfundenen Pixel-Faktor und konnte dadurch z.B. Piste-„Backcountry"
   (`dasharray:[3,6]`) nicht von „Buckelpiste" (`dasharray:[1,3]`) unterscheiden. Die SVG-Fassung
   (`MapLegend._buildPartsChip()`) verwendet die korrekte Formel.
2. **Skalen-Block wiederverwendet bestehende Infrastruktur.** Statt eine neue „Skalen-Karte"-UI
   zu bauen, wird für die Skala, die eine Gruppe antreibt (`findGroupDrivingScaleId()`), der
   bereits bestehende `legendItems`/`legendGroupKey`-Ref-Zähl-Mechanismus (aus dem
   `legend_scale_id`-v1.1-Pfad) wiederverwendet — kein neuer Code in `MapPage.ts` nötig, keine
   neue Ref-Zähl-Logik zu pflegen.

## Umsetzung

- **`src/lib/renderPartsLegend.ts`** (neu, pure Funktionen, testbar ohne DOM):
  `resolveRenderPartsRows(render, variants, groupName, legendSectionsById)` baut die Kompakt-
  Zeilen; `findDrivingScaleId()`/`findGroupDrivingScaleId()` bestimmen die antreibende Skala.
  Bei >1 `axis` unter den Varianten (z.B. Lifte: `status`+`access`) wird das deutsche
  Achsen-Label vorangestellt (`AXIS_LABELS`-Tabelle, lokal, erweiterbar).
- **`MapLegend.addPartsRow()`** (neu): baut pro `chips[]`-Eintrag ein `<svg>`
  (`.map-legend-parts-chip`) mit den realen `width`/`radius`/`stroke_width`-Werten. Panel-Maße
  bewusst klein gehalten (34×16px pro Chip) — die Legende ist ein fixes 300px-Panel
  (`--sidebar-width`), keine breite Artifact-Standalone-Seite; ein 6er-Streifen muss ohne
  Umbruch hineinpassen. `.map-legend-parts-*` ist lokal in `src/app.css` ergänzt (nicht in
  `oe5ith-ci`), analog dem bestehenden `.map-legend-unknown`/`.map-legend-remove`-Muster
  (`oe5ith-ci/docs/for-coding-agents.md` erlaubt lokale Styles für „Inhalte, die im CI noch
  nicht generalisiert sind").
- **`Sidebar.ts`** (`buildToggleEvent()`): neuer Zweig, gated auf `metaGroup.render` UND
  `isLegendSchemaAtLeast(styleVersion, 2, 0)` — läuft VOR dem alten `legend_scale_id`/
  `legend_items`-Pfad, nicht daneben. Setzt `partsRows` (neu) UND ggf. `legendItems`/
  `legendGroupKey` (wiederverwendet). Guard für den style.json-Fallback-Pfad um `!partsRows`
  erweitert, damit render-parts-Gruppen ohne Skala (z.B. Rodelbahnen, nur `render[]`, kein
  `variants[]`) nicht zusätzlich einen unnötigen Fallback-Swatch nachladen.
- **`MapPage.ts`** (`toggleLayer()`): einfaches Add/Remove der `partsRows`-Einträge (IDs an
  `legendId` gehängt) — kein Ref-Zählen nötig, diese Zeilen sind gruppen-eigen, nicht über
  Overlays hinweg geteilt (anders als der Skalen-Block, der weiterhin über `legendGroupKey`
  ref-gezählt wird).

## Verifikation

- Unit-Tests: `renderPartsLegend.test.ts` (Zeilen-/Achsen-Logik), `MapLegend.test.ts`
  (SVG-Struktur, Dasharray-Formel, Panel-Größenlimit, Entfernbarkeit über `removeEntry`).
- Live gegen `/karte` per Playwright verifiziert (2026-08-16): `openskimap` → Pisten + Lifte
  aktiviert, korrekte Zeilen-/Chip-Anzahl, sichtbar unterscheidbare Dash-Muster, Legende bleibt
  innerhalb der 300px-Panel-Breite, sauberes Add/Remove (0 verwaiste Einträge nach Abschalten),
  keine Konsolenfehler.

## Bewusst nicht Teil dieser Runde

- Farb-Deduplizierung innerhalb einer Skala (z.B. `ski-lift-status-v1` hatte vor der jüngsten
  Server-Reduktion mehrere Labels mit identischer Farbe) — Live-Daten haben das Problem
  inzwischen serverseitig selbst gelöst (`ski-difficulty-v1` von 8 auf 5 Einträge reduziert,
  `ski-lift-status-v1` als Skala komplett durch fixe Pro-Variante-Farben ersetzt); kein
  client-seitiger Bedarf mehr.
- Eine eigene visuelle „Skalen-Karte" mit Kartenstil-Swatches statt generischem Punkt — die
  wiederverwendeten `legendItems`-Zeilen zeigen weiterhin den generischen Punkt/Typ aus dem
  bestehenden `legend_scale_id`-Pfad, nicht den vollen Kartenstil. Eigener Punkt bei Bedarf.

---

**Update 2026-08-22:** Der hier beschriebene `render`/`variants`-Konsum (Schema v2.0/2.1) wurde
durch das `legend[]`-Top-Level-Modell (Schema v3.0) ersetzt, nicht erweitert — siehe
`docs/superpowers/specs/2026-08-22-legend-v3-groups-legend-split-design.md`.
