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

- **Verwaiste Tags `v2.1.0`/`v2.2.0` zeigen auf ältere Commits als das echte `v2.0.0`** —
  gemeldet 2026-08-27 als
  [oe5ith-ci#5](https://github.com/brikbrik94/oe5ith-ci/issues/5). Reste eines im Mai 2026
  verworfenen ersten v2.x-Versuchs (`06b3621`/`fc23c7a`, damals `v2.1.0`/`v2.2.0` getaggt, am
  03.06.2026 auf `v1.8.0`/`v1.9.0` zurückgestuft — alte Tags nicht gelöscht); kollidiert jetzt mit
  dem echten, durchgezogenen `v2.0.0` (23.08.2026, 16×24-Icon-Redesign). Per Semver-Sortierung
  sehen `v2.1.0`/`v2.2.0` neuer aus, sind aber Vorfahren von `v2.0.0`. Kein website-v3-seitiges
  Problem (wir sind über den Commit-Pointer, nicht über Tags, ohnehin auf dem korrekten
  `origin/main`-Tip) — nur zur Vermeidung falscher "veraltet"-Warnungen bei künftigen
  Versionschecks gemeldet.
  - [ ] `v2.1.0`/`v2.2.0`-Tags in `oe5ith-ci` gelöscht (Vorschlag im Issue: `git push --delete
    origin v2.1.0 v2.2.0`)

## Erledigt (archiviert)

- **`MapLegend`: breiteres Panel für render/variants-Chip-Streifen-Zeilen
  (`.map-legend-parts-row`) gewünscht** — gemeldet 2026-08-22 als
  [oe5ith-ci#4](https://github.com/brikbrik94/oe5ith-ci/issues/4), umgesetzt in `oe5ith-ci`
  v1.27.0 (neuer Token `--legend-width-wide: 340px` + Modifier `.map-legend--wide`,
  `css/modal.css`). **website-v3-seitig konsumiert** (2026-08-27): Token/Modifier in
  `src/styles/common.css`/`src/styles/modal.css` nachgezogen (lokale CSS-Kopien der
  `oe5ith-ci`-Dateien, siehe Kopfkommentar dort — waren zuvor nicht synchronisiert, das war der
  eigentliche Grund, warum der Token bislang wirkungslos blieb); `MapLegend.addPartsRow()`
  schaltet `.map-legend--wide` scharf, solange mindestens eine Parts-Row aktiv ist
  (`removeEntry()`/`clearEntries()` nehmen es wieder zurück). Lokaler `.map-legend-parts-strip`-
  Workaround bleibt (Chip-Streifen soll weiterhin selbst umbrechen), `max-width` proportional von
  116px auf 148px angehoben. Live gegen `/karte` (Pisten-Overlay, Playwright) verifiziert. 397
  Tests grün, 0 TypeScript-Fehler.

- **`ci-maneuver-uturn-left.svg` (v1.26.0) war byte-identisch zu `ci-maneuver-uturn.svg`** —
  gemeldet 2026-08-22 als [oe5ith-ci#3](https://github.com/brikbrik94/oe5ith-ci/issues/3), behoben
  in `oe5ith-ci` v2.0.0 (2026-08-23): `uturn-left` hat jetzt einen eigenständigen, von `uturn`
  unterscheidbaren Pfad. **website-v3-seitig konsumiert** (2026-08-23): der bisherige lokale
  Workaround (eigenständige `'uturn-left'`-Pfaddaten in `src/lib/ManeuverIcons.ts`, siehe
  Kommentar dort) entfällt — alle 30 Icons wurden im selben Zug auf die neue oe5ith-ci-v2.0.0-
  Vorlage (16×24-`viewBox`, siehe nächster Punkt) resynchronisiert, `uturn-left` eingeschlossen.

- **16 neue Maneuver-Icons für Valhalla-Turn-by-Turn-Parität** — gemeldet 2026-08-22, umgesetzt
  und geschlossen in `oe5ith-ci` v1.26.0 (14 → 30 Icons, neues optionales `valhallaType`-Feld in
  `icons.json`, `orsCode` jetzt optional, neue Kontext-Pfad-Stilkonvention für Ramp/Exit/
  Stay-straight/Becomes/Fähre). Issue: [oe5ith-ci#2](https://github.com/brikbrik94/oe5ith-ci/issues/2).
  **website-v3-seitig konsumiert** (2026-08-22): `src/lib/ManeuverIcons.ts` auf den offiziellen
  Stand synchronisiert (15 von 16 neuen Icons waren bereits wortgleich zum lokalen Entwurf; eine
  Ausnahme, siehe den neuen Punkt oben unter „Offen"). Details/Herleitung:
  `docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md`.

- **Turn-by-Turn-Icons: `viewBox` 16×16 → 16×24 (Breaking), neue `.maneuver-item`-Komponente** —
  `oe5ith-ci` v2.0.0 (2026-08-23): alle 30 Icons in `assets/maneuver-icons/` auf `viewBox="0 0 16
  24"` umgezeichnet (`icons.json`s `grid` jetzt `[16, 24]`), neue Zeilen-Komponente `.maneuver-item`
  (+ `.maneuver-item-icon`/`-text`/`-meta`, `css/disclosure.css`) ersetzt `.disclosure-item` für
  Turn-by-Turn-Listen. Migration-Guide: `oe5ith-ci/docs/migration-v2.md`. **website-v3-seitig
  konsumiert** (2026-08-23): `src/lib/ManeuverIcons.ts` (alle 30 Pfaddaten + `viewBox`/Klasse),
  `src/components/RoutingSidebar.ts` (Zeilen-Markup auf `.maneuver-item*` umgestellt),
  `src/styles/disclosure.css` (`.maneuver-item*`-Block mirror-gesynct). 387 Tests grün, 0
  TypeScript-Fehler.

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
(2026-07-18) → `0092387` (v1.25.0 + Doku-Fix, 2026-08-12) → `8e4ac64` (v2.0.0, 2026-08-23). Details
siehe `TODO_ARCHIVE.md`.

Diese Übersicht (und die Detaildateien) lagen bis 2026-07-18 unversioniert im Arbeitsverzeichnis
des `oe5ith-ci`-Submoduls und wurden dann nach `docs/ci/` in website-v3 übertragen (siehe
`docs/proposals/archive/2026-07-18-ci-docs-into-repo-draft.md`) — ab jetzt normale, committete
Dateien in diesem Repo.
