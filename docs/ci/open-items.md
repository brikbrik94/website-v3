# CI — Offene Punkte (Übersicht)

Sammel-Einstieg über die aus `website-v3` gemeldeten Punkte im `oe5ith-ci`-Design-System.
Vollständig abgeschlossene Anfragen/Handoffs (Detaildatei + dieser Eintrag) wandern nach
`archive/`, sobald nichts mehr website-v3-seitig daran offen ist — analog zu
`TODO_ARCHIVE.md`/`ROADMAP_ARCHIVE.md`. `bug-reports.md` bleibt dagegen dauerhaft hier (auch wenn
gerade alle Einträge behoben sind) — es ist die fortlaufende Sammeldatei für künftige Funde, kein
einzelner, abschließbarer Punkt.

**Workflow-Änderung (2026-08-12):** Neue Anfragen gehen als vollständiges **GitHub-Issue** direkt
an `brikbrik94/oe5ith-ci` (siehe `CLAUDE.md` → Project conventions); hier landet nur noch ein
schlanker Tracking-Eintrag (Issue-Link + Checkliste), analog `docs/geodata/open-items.md`. Die
bestehenden `archive/*-request.md`/`archive/handoff-*.md`-Dateien unten sind älter als diese
Umstellung (lokale Volltext-Anfragen, kein Issue) und bleiben unverändert als Historie stehen.

## Offen

- **`.topbar-search-btn` hat unzureichenden Farbkontrast (~2,06:1 statt min. 3:1)** — gemeldet
  2026-08-11 (Performance-Baseline-Audit). Detaildatei: `bug-reports.md` (Punkt 3).

## Erledigt (archiviert)

Detaildateien liegen in `archive/`, keine website-v3-seitige Restarbeit mehr offen:

- **Neue `MapLegend`-Swatch-Varianten: Linienbreite/-strichelung, Linie-mit-Casing,
  Fläche-mit-Rand** — gemeldet 2026-08-12, deckte die aus der `legend_scale_id`/`legend_sections`/
  `icon`-Runde bewusst zurückgestellten `width`/`dasharray`/`outline_color`/`outline_width`-Felder
  aus `layers.json` ab (`geodata-plugin-standard` v1.1.0). Issue:
  [oe5ith-ci#1](https://github.com/brikbrik94/oe5ith-ci/issues/1) — umgesetzt und geschlossen in
  `oe5ith-ci` v1.25.0 + Doku-Nachbesserung `0092387` (neuer Typ `type: 'line-cased'`,
  `width`/`dasharray` bei `type: 'line'`, `outline_color`/`outline_width` bei `type: 'area'`).
  **website-v3-seitig konsumiert** (2026-08-12,
  `docs/superpowers/plans/2026-08-12-legend-line-cased-outline-fields.md`): Entscheidungsbaum in
  `resolveSwatchFromLayersMetaColor()`, `MapLegend.addEntry()` 1:1 nach der `oe5ith-ci`-Referenz
  portiert, End-to-End per Playwright-Netzwerk-Mock verifiziert. Details:
  `docs/ROADMAP.md` → „Karten-Legende: weitere Optimierung".

- **Modal-Backdrop wird von der Topbar überdeckt (Stacking-Context)** — behoben in `oe5ith-ci`
  v1.18.1 (2026-07-06, Commit `558f531`). Detaildatei: `bug-reports.md` (Punkt 1, dort weiterhin
  mit vollständigem Root-Cause/Repro dokumentiert, siehe Hinweis oben zu `bug-reports.md`).
- **Disclosure-Komponente (einzelnes aufklappbares Panel)** — umgesetzt in `oe5ith-ci` v1.19.0
  (2026-07-06). Detaildatei: `archive/routing-disclosure-request.md`.
- **Split-View (Master-Detail-Layout)** — war bereits vor `v1.18.0` umgesetzt, Request-Datei war
  nur ein nicht aufgeräumter Rest (nie nach website-v3 migriert, im Submodul-Arbeitsverzeichnis
  bereits vor der docs/ci/-Umstellung entfernt).
- **`.badge` erzwingt `white-space: nowrap`** — behoben in `oe5ith-ci` v1.21.0 (2026-07-18,
  Commit `cf8b22e`), neues Modifier `.badge-wrap`. Detaildatei: `bug-reports.md` (Punkt 2).
- **Icon-Swatch für `MapLegend` (`.map-legend-icon`)** — umgesetzt in `oe5ith-ci` v1.21.0
  (2026-07-18, Commit `52cf75e`). Detaildatei: `archive/legend-icon-swatch-request.md`.
- **Karten-Hintergrund-Token + WGS84-Zeilenklassen** (`--map-bg`, `.coord-row-wgs`/`.coord-vals`)
  — umgesetzt in `oe5ith-ci` v1.21.0 (2026-07-18). Detaildatei:
  `archive/handoff-2026-06-20-map-bg-wgs84.md`.

---

Submodul-Pointer-Historie: `dca22e5` (v1.18.0) → `c92fb77` (2026-07-06) → `v1.21.0`/`bb4e415`
(2026-07-18) → `0092387` (v1.25.0 + Doku-Fix, 2026-08-12). Details siehe `TODO_ARCHIVE.md`.

Diese Übersicht (und die Detaildateien) lagen bis 2026-07-18 unversioniert im Arbeitsverzeichnis
des `oe5ith-ci`-Submoduls und wurden dann nach `docs/ci/` in website-v3 übertragen (siehe
`docs/proposals/archive/2026-07-18-ci-docs-into-repo-draft.md`) — ab jetzt normale, committete
Dateien in diesem Repo.
