# Design: Client-Konsumierung des `legend[]`/`groups[]`-Splits (geodata-plugin-standard §5.3–§5.7, Schema v3.0)

## Kontext

`geodata-plugin-standard` v3.0.0 trennt, was bis `v2.1.0` in `groups[].render`/`groups[].variants[]`
vermischt war, in zwei unabhängige Top-Level-Blöcke: `groups[]` (rein Toggle-/Rendering-Metadaten)
und `legend[]` (Legend-Darstellung, kann Zeilen aus **mehreren** `groups[]`-Einträgen bündeln, z.B.
„Pisten" = Downhill- + Skitour-Gruppe). Details: `geodata-plugin-standard/docs/render-parts-guide.md`.

Live-Daten (`tiles.oe5ith.at/layers.json`, Stand 2026-08-22 05:52) liefern für `openskimap` bereits
valide v3.0-Struktur — verifiziert per Live-Fetch, nicht nur laut Standard-Beispiel. Der
Aggregator (`geodata-updater/scripts/inventory/layers.py`) ist im Git-Submodul-Checkout veraltet
(letzter Commit 2026-08-12, vor v2.0), das tatsächlich laufende Serverskript ist offenbar ohne
Rückfluss ins Repo weiterentwickelt worden — für diese Runde nicht relevant (Konsum, kein Fix),
aber als Diskrepanz notiert.

Der bisherige (uncommittete) Client-Code (`src/lib/renderPartsLegend.ts`,
`Sidebar.ts::buildToggleEvent`, `MapPage.ts::toggleLayer`) konsumiert `groups[].render`/`variants`
(v2.0/2.1) und muss auf `legend[]`/`groups[]` (v3.0) umgestellt werden — kein additiver Schritt,
siehe CHANGELOG `[3.0.0]`.

## Entscheidung

**Kein Dual-Pfad.** Nur v3.0 (`legend[]`) wird konsumiert; der alte `render`/`variants`-Pfad
entfällt ersatzlos (User-Entscheidung 2026-08-22 — kein produktiver v2.1-Konsument existiert
aktuell, kein Regressionsrisiko).

**Voller Recompute statt Inkrementell.** Weil eine `legend[].rows[]`-Zeile Style-Layer aus
mehreren `groups[]`-Einträgen referenzieren kann (Beispiel „Freeride" bei Pisten: referenziert
sowohl die Downhill- als auch die Skitour-Gruppe), lässt sich die v3.0-Legende nicht mehr
1:1 an einen einzelnen Gruppen-Toggle hängen wie zuvor. Stattdessen wird bei **jedem** Toggle
(add/remove, beliebiger Gruppe) der sichtbare `legend[]`-Ausschnitt komplett aus der aktuellen
Menge aktiver Style-Layer-IDs (`OverlayLoader.getActiveLayerIds()`) neu berechnet:
eine Zeile ist sichtbar, sobald **mindestens eine** ihrer `style_layer_ids` gerade aktiv ist
(Union-Semantik — passend zur Standard-Aussage „`legend[]` ist reine Gruppierungs-/
Darstellungshilfe, keine formale Partitions-Garantie"). Das ist bei ~20 Zeilen (aktuell einzige
v3.0-Quelle: `openskimap`) trivial billig und macht Ref-Zählung für diesen Pfad überflüssig — die
sichtbare Menge wird bei jedem Toggle einfach neu bestimmt, nicht inkrementell fortgeschrieben.

**`legend`/`legend_scales` global behandeln**, wie schon bisher `legend_sections`/`legend_items`.
Der Aggregator flacht mehrere Plugin-Quellen in ein gemeinsames Top-Level-`legend[]`/
`legend_scales[]` ab (analog zur bisherigen `legend_sections`-Dedup-Logik). Der Standard
garantiert `style_layer_ids`-Eindeutigkeit nur *innerhalb* einer Plugin-eigenen
`layer-list.json`, nicht global — mit aktuell nur einer v3.0-Quelle (`openskimap`) kein reales
Kollisionsrisiko, aber als bewusste Annahme dokumentiert (`docs/geodata/open-items.md`, falls es
später real relevant wird).

**Versions-Gate vereinfacht:** Da `legend`/`legend_scales` als aggregierte Top-Level-Blöcke keinen
einzelnen anzeigbaren „Owner"-Style mehr haben (mehrere Quellen könnten künftig hineinfließen),
gilt **Präsenz eines nicht-leeren `legend[]`-Arrays** als Gate — der Aggregator befüllt es
konstruktionsbedingt nur aus Quellen, die selbst schon `legend[]` liefern (≙ v3.0-konform). Eine
strikte Re-Prüfung von `layer.version >= 3.0` pro referenzierter Gruppe entfällt (kein natürlicher
Anker mehr, seit eine Zeile mehrere Gruppen/Quellen referenzieren kann).

**Rename `LegendSection` → `LegendScale`** (Typ in `resolveLegendSwatch.ts`), passend zur
Standard-Umbenennung `legend_sections` → `legend_scales` (v3.0, vermeidet Kollision mit dem neuen
`legend`-Block). Inhalt/Form unverändert (`{id, label, items}`).

**Heading-Darstellung: bestehende CI-Klasse `.overlay-section-label` wiederverwenden**, keine neue
lokale CSS-Klasse. Der CI-Grundsatz (`oe5ith-ci/docs/for-coding-agents.md`) verlangt, vor jeder
UI-Änderung bestehende Patterns zu prüfen — `.overlay-section-label`
(`oe5ith-ci/css/sidebar.css:41`) ist bereits exakt dieses Pattern (kleines, großgeschriebenes
Gruppen-Label, aktuell in `Topbar.ts` für „Basemap" verwendet) und passt 1:1 auf den
Standard-„Renderer-Vertrag" für `legend[].heading` (linksbündiger Titel über einem Zeilenblock).
Kein CI-Issue nötig, weil ein passendes Pattern bereits existiert — anders als beim
Chip-Streifen-SVG (`.map-legend-parts-*`, aus der vorigen Runde), das unter die CI-eigene
Ausnahme „projektspezifische Datenvisualisierung/im CI noch nicht generalisiert" fällt und lokal
bleibt.

**Der `render`/`variants`→Chip-Aufbau (SVG, Dasharray-Formel) bleibt unverändert wiederverwendet**
(`MapLegend._buildPartsChip()`, `findDrivingScaleId()`) — nur die Eingabedaten ändern sich
(direkt `legend[].rows[].render` statt aus `variants[]` zusammengebaut), keine Änderung an der
SVG-Zeichenlogik selbst nötig.

## Umsetzung (Kurzfassung, Details im Implementierungsplan)

- **`src/lib/renderPartsLegend.ts`**: `RenderVariant`/`AXIS_LABELS`/`axisLabel()`/
  `resolveRenderPartsRows()`/`findGroupDrivingScaleId()` entfernt. Neu: `LegendRow`,
  `LegendHeading`-Typen (spiegeln `legend[]` 1:1), `buildChipsForRow()` (die alte `buildChips()`-
  Closure, jetzt eigenständig exportiert), `resolveVisibleLegend(headings, activeStyleLayerIds,
  legendScalesById)` — reine Sichtbarkeits-/Chip-Auflösung, kein DOM.
- **`src/components/Sidebar.ts`**: `render`/`variants`-Felder aus `LayerMetaGroup` entfernt, der
  `metaGroup.render`-Zweig in `buildToggleEvent()` entfällt komplett (inkl. `partsRows` aus
  `LayerToggleEvent`). Der v1.1-`legend_scale_id`/`legend_items`-Pfad (andere Overlays, weiterhin
  v1.0/v1.1) bleibt unverändert, nur `LegendSection`→`LegendScale`-Umbenennung durchgereicht.
- **`src/pages/MapPage.ts`**: lädt `layersMeta.legend`/`layersMeta.legend_scales` (statt
  `legend_sections`), baut `legendScalesById` einmalig, ruft nach jedem `toggleLayer()`
  `resolveVisibleLegend()` neu auf und synchronisiert `MapLegend` (vorherige `legend3:*`-Einträge
  entfernen, aktuelle neu hinzufügen inkl. Headings).
- **`src/lib/MapLegend.ts`**: neue Methode `addHeading(id, text)` (`.overlay-section-label`-Div,
  über denselben `_entryNodes`-Mechanismus wie normale Einträge verwaltet — kein neuer Removal-Pfad
  nötig). `addPartsRow()`/`_buildPartsChip()` unverändert.
- **`docs/ROADMAP.md`**: Eintrag „Legenden-Gruppierung/Section-Header" ergänzt um Hinweis, dass
  Headings für den `legend[]`-Pfad jetzt gerendert werden — das allgemeine Problem (Gruppierung
  *beliebiger* Overlays, nicht nur v3.0-Quellen) bleibt offen.

## Verifikation

- Unit-Tests (`renderPartsLegend.test.ts`, `MapLegend.test.ts`) gegen die reale, bereits gefetchte
  Live-Payload (Fixture aus `tiles.oe5ith.at/layers.json`, Stand 2026-08-22 — kein synthetisches
  Standard-Beispiel nötig, da echte v3.0-Daten bereits verfügbar sind).
- Live gegen `/karte` per Playwright: `openskimap` → mehrere Gruppen (Pisten, Loipen, Lifte)
  einzeln und in Kombination toggeln, insbesondere den Multi-Gruppen-Fall „Pisten" (Downhill +
  Skitour) — Zeilen erscheinen/verschwinden korrekt je nach aktiver Gruppe, keine verwaisten
  Einträge, keine Konsolenfehler.
