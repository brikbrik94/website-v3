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

**Am Standard selbst nichts offen** — Issue #1 ist spezifikationsseitig vollständig umgesetzt
(siehe „Erledigt" unten).

### [geodata-updater#96 — layers.py reicht Schema-„version" nicht durch](https://github.com/brikbrik94/geodata-updater/issues/96)

Gemeldet 2026-08-12. **Code-seitig behoben** (Commit `e9a6b59`, `version` pro Style-Eintrag statt
global — sinnvollere Lösung als unser Minimum-Vorschlag für gestaffeltes Rollout). **Laut
Live-Check noch nicht deployed** (`openskimap` hat quellseitig `version: "1.1"`, live weiterhin
`null`).

- [x] `version`-Feld (String) pro Style-Eintrag in der aggregierten `layers_info.json` (Code)
- [ ] Live deployed (geprüft 2026-08-12: noch nicht)

### [geodata-updater#97 — layers.py reicht v1.1.0-Legend-Felder nicht durch](https://github.com/brikbrik94/geodata-updater/issues/97)

Gemeldet 2026-08-12, **hohe Priorität — aktive Regression**: `geodata-openskimap`s Quelldatei ist
bereits korrekt gegen v1.1.0 gebaut, die Aggregation verwirft `legend_scale_id`+`legend_sections`
aber weiterhin, wodurch die Ski-Pisten/Loipen-Legende auf der Live-Seite aktuell **leer** ist
(vorher hatte sie die volle Schwierigkeitsgrad-Skala über `legend_items`).

- [ ] `width` (Number\|null) im Group-Eintrag
- [ ] `dasharray` ([Number,Number]\|null) im Group-Eintrag
- [ ] `outline_color`/`outline_width` im Group-Eintrag
- [ ] `icon` (String\|null) im Group-Eintrag
- [ ] `legend_scale_id` im Group-Eintrag
- [ ] Top-Level `legend_sections`-Block (dedupliziert über alle aggregierten Quellen)

## Blockiert (wartet auf externe Umsetzung)

- **Client-seitige Konsumierung der neuen Felder** in `Sidebar.ts`/`MapLegend.ts`/`MapPage.ts` —
  wartet auf #96 (deployed) + #97 (Felder überhaupt in der Ausgabe). **Wichtig, sobald es
  losgeht:** die Breaking-Change-Regel aus §5.6 beachten — `legend_items` wird `null`, sobald eine
  Gruppe `legend_scale_id` trägt (Werte dann in `legend_sections`); `version` muss numerisch als
  `major.minor` verglichen werden (`>= 1.1`), nicht als String.

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
