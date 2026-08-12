# Geodata-Plugin-Standard — Offene Punkte (Übersicht)

Sammel-Einstieg über die aus `website-v3` gemeldeten Punkte gegen
[`geodata-plugin-standard`](../../geodata-plugin-standard/GEODATA_PLUGIN_STANDARD.md) (den
Architektur-/Layer-Metadaten-Standard der `geodata-updater`-Ökosystem-Repos, die die von diesem
Repo konsumierten Tile-Server-Daten erzeugen). Analog zu `docs/ci/open-items.md`.

**Workflow:** Vollständige Änderungsanfragen gehen als GitHub-Issue direkt ans jeweilige Repo;
diese Datei hält nur einen schlanken Tracking-Eintrag (Issue-Link + Checkliste). Nach jedem
Submodul-Update wird die Checkliste gegen den neuen Stand geprüft.

## Offen

**Aktuell keine offenen Anfragen an den Standard selbst.** Issue #1 ist spezifikationsseitig
vollständig umgesetzt (siehe „Erledigt" unten) — offen ist nur noch die **Umsetzung in website-v3
selbst**, die auf echte Live-Daten wartet (siehe „Blockiert" unten).

## Blockiert (wartet auf externe Umsetzung)

- **Client-seitige Konsumierung der neuen Felder (`width`, `dasharray`, `outline_color`/
  `outline_width`, `type: "icon"`+`icon`, `legend_scale_id`, `legend_sections`) in
  `Sidebar.ts`/`MapLegend.ts`/`MapPage.ts`.** Noch nicht begonnen — macht erst Sinn, sobald echte
  Daten damit ankommen (aktuell testbar nur gegen synthetische Beispiele aus der Standard-Doku,
  nicht gegen den echten Tile-Server). **Wichtig, sobald es losgeht:** die Breaking-Change-Regel
  aus §5.6 beachten — `legend_items` wird `null`, sobald eine Gruppe `legend_scale_id` trägt (Werte
  dann in `legend_sections`); `version` muss numerisch als `major.minor` verglichen werden
  (`>= 1.1`), nicht als String.
- **Live-`layers.json` liefert `v1.1.0` des Schemas noch nicht** — geprüft 2026-08-12: kein
  `version`-Feld, kein `legend_sections`-Block, unverändert gegenüber vorher. Die produzierenden
  Repos (die die tatsächliche `dist/layer-list.json` bauen, laut Standard-README u.a.
  `geodata-osmdb`/`overlays`) müssen erst gegen `v1.1.0` neu gebaut/deployed werden — außerhalb
  der Reichweite dieses Repos.

## Erledigt (archiviert)

### [#1 — Legend-Rendering-Erweiterungen für §5 Layer-Listen-Spezifikation](https://github.com/brikbrik94/geodata-plugin-standard/issues/1)

Gemeldet 2026-08-12, spezifikationsseitig umgesetzt in `geodata-plugin-standard` **v1.1.0**
(2026-08-12, Tag `74dddeb`). Checkliste:

- [x] `width` (Number\|null) — §5.3, Extraktionsregel (`line-width`, höchster Zoom-Stop bei
  `interpolate`)
- [x] `dasharray` ([Number,Number]\|null) — §5.3, nur literales 2-Element-Array
- [x] `outline_color`/`outline_width` (String/Number\|null) — §5.3, erkannt über `-casing`/
  `-outline`-Suffix im Layer-Namen (kein Z-Order-Fallback)
- [x] `type: "icon"` + `icon`-Feld (String\|null) — §5.3, nur wenn Primär-Layer echtes
  `icon-image` hat (reiner Text-Layer bleibt `"symbol"`)
- [x] `legend_scale_id` (String\|null) — §5.5, aus Dataset-Config, inkl. Invariante (identisches
  `legend_scale_label`/`legend_items` bei gleicher ID) und Empfehlung für Build-Warnung bei
  Verletzung
- [x] Top-Level `legend_sections`-Block — §5.6, wie von uns bevorzugt (nicht nur clientseitig
  gruppiert), inkl. sauber spezifizierter Breaking-Change-Regel (`legend_items` → `null` bei
  gesetztem `legend_scale_id`, `version`-Gate `"1.1"`)

**Noch offen (siehe „Blockiert" oben):** Live-Daten-Adoption + website-v3-Client-Code.
