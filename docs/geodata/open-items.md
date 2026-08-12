# Geodata-Ökosystem — Offene Punkte (Übersicht)

Sammel-Einstieg über die aus `website-v3` gemeldeten Punkte gegen die beiden Geodata-Submodule
[`geodata-plugin-standard`](../../geodata-plugin-standard/GEODATA_PLUGIN_STANDARD.md) (der
Architektur-/Layer-Metadaten-**Standard**) und [`geodata-updater`](../../geodata-updater/README.md)
(die **Pipeline**, die Plugin-Repos orchestriert und zu `tiles.oe5ith.at` aggregiert — siehe
`docs/geodata/bug-reports.md` Punkt 1 für den Unterschied). Analog zu `docs/ci/open-items.md`.

**Workflow:** Vollständige Änderungsanfragen gehen als GitHub-Issue direkt ans jeweilige Repo;
diese Datei hält nur einen schlanken Tracking-Eintrag (Issue-Link + Checkliste). Nach jedem
Submodul-Update wird die Checkliste gegen den neuen Stand geprüft.

## Offen

**Nichts offen an den Submodulen selbst.** Issue #1 (Standard) sowie #96 und #97
(`geodata-updater`) sind vollständig umgesetzt und live verifiziert (siehe „Erledigt" unten).

Einzig offener Punkt ist jetzt die **client-seitige Umsetzung in website-v3** — siehe „Als
Nächstes" unten, kein externer Blocker mehr.

## Als Nächstes (website-v3, kein externer Blocker mehr)

- **Client-seitige Konsumierung der neuen Felder** in `Sidebar.ts`/`MapLegend.ts`/`MapPage.ts` —
  Voraussetzungen (#96 deployed, #97 Felder in der Ausgabe) sind beide erfüllt, live verifiziert
  2026-08-12 19:27. **Wichtig beim Start:** die Breaking-Change-Regel aus §5.6 beachten —
  `legend_items` wird `null`, sobald eine Gruppe `legend_scale_id` trägt (Werte dann in
  `legend_sections`); `version` muss numerisch als `major.minor` verglichen werden (`>= 1.1`),
  nicht als String.

## Erledigt (archiviert)

### [geodata-updater#96 — layers.py reicht Schema-„version" nicht durch](https://github.com/brikbrik94/geodata-updater/issues/96)

Gemeldet 2026-08-12, code-seitig behoben Commit `e9a6b59` (`version` pro Style-Eintrag statt
global — sinnvollere Lösung als unser Minimum-Vorschlag für gestaffeltes Rollout). **Live
verifiziert 2026-08-12 19:27**: `openskimap`-Eintrag in `tiles.oe5ith.at/layers.json` hat jetzt
`version: "1.1"`. Issue geschlossen.

- [x] `version`-Feld (String) pro Style-Eintrag in der aggregierten `layers_info.json` (Code)
- [x] Live deployed (verifiziert 2026-08-12 19:27)

### [geodata-updater#97 — layers.py reicht v1.1.0-Legend-Felder nicht durch](https://github.com/brikbrik94/geodata-updater/issues/97)

Gemeldet 2026-08-12 als aktive Regression (Ski-Pisten/Loipen-Legende war live leer), code-seitig
behoben Commit `72349a0`. **Live verifiziert 2026-08-12 19:27**: `openskimap`-Gruppen haben jetzt
`legend_scale_id: "ski-difficulty-v1"` (Runs), `width`/`outline_width` (Lifte/Runs), und der
Top-Level-`legend_sections`-Block ist vorhanden (8 Items „Schwierigkeitsgrade", deckt sich exakt
mit `geodata-openskimap/dist/layer-list.json`). Issue geschlossen.

- [x] `width` (Number\|null) im Group-Eintrag (Code + live)
- [x] `dasharray` ([Number,Number]\|null) im Group-Eintrag (Code)
- [x] `outline_color`/`outline_width` im Group-Eintrag (Code + live)
- [x] `icon` (String\|null) im Group-Eintrag (Code)
- [x] `legend_scale_id` im Group-Eintrag (Code + live)
- [x] Top-Level `legend_sections`-Block, dedupliziert über alle aggregierten Quellen (Code + live)
- [x] Live deployed (verifiziert 2026-08-12 19:27)

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
