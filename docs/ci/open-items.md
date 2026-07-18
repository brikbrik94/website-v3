# CI — Offene Punkte (Übersicht)

Sammel-Einstieg über die aus `website-v3` gemeldeten Punkte im `oe5ith-ci`-Design-System.
**Alle 5 bisher gemeldeten Punkte sind erledigt**, siehe unten. Details je Punkt weiterhin in
der jeweiligen Detaildatei.

## Erledigt

### 1. Modal-Backdrop wird von der Topbar überdeckt (Stacking-Context)
- **Detaildatei:** `bug-reports.md` (Punkt 1)
- **Status:** ✅ Behoben in `oe5ith-ci` v1.18.1 (2026-07-06, Commit `558f531`) —
  `.modal-backdrop` nutzt jetzt `z-index: var(--z-modal)`, wie vorgeschlagen.

### 2. Disclosure-Komponente (einzelnes aufklappbares Panel)
- **Detaildatei:** `routing-disclosure-request.md`
- **Status:** ✅ Umgesetzt in `oe5ith-ci` v1.19.0 (2026-07-06) — `css/disclosure.css`,
  `components/disclosure.html`, `docs/sidebar.md`-Abschnitt vorhanden.
- **website-v3-seitig noch offen:** Integration in `RoutingSidebar.ts` (Turn-by-Turn-Anzeige,
  siehe `TODO.md`) — reine Konsumenten-Arbeit, keine CI-Anfrage mehr.

### 3. Split-View (Master-Detail-Layout)
- **Detaildatei:** war `ci-split-view-request.md` (nicht migriert — im Submodul-Arbeitsverzeichnis
  bereits vor dieser Umstellung entfernt).
- **Status:** ✅ War bereits vor `v1.18.0` umgesetzt (`css/split.css`, u.a. Commit `1a0ebdf`) —
  die Request-Datei war nur ein nicht aufgeräumter, im Submodul selbst aber längst committeter
  Rest der ursprünglichen Anfrage. Kein offener Punkt mehr.

### 4. `.badge` erzwingt `white-space: nowrap`, kein interner Umbruch bei langen Texten
- **Detaildatei:** `bug-reports.md` (Punkt 2)
- **Status:** ✅ Behoben in `oe5ith-ci` v1.21.0 (2026-07-18, Commit `cf8b22e`) — neues Modifier
  `.badge-wrap`. In website-v3 konsumiert (`RoutingSidebar.ts`, lokaler Override entfernt).

### 5. Icon-Swatch für `MapLegend` (`.map-legend-icon`)
- **Detaildatei:** `legend-icon-swatch-request.md`
- **Status:** ✅ Umgesetzt in `oe5ith-ci` v1.21.0 (2026-07-18, Commit `52cf75e`) — neuer
  Eintragstyp `icon`. In website-v3 konsumiert (`NahPage.ts`-Status-Legende zeigt jetzt
  Helikopter-Icons statt Farbpunkten, Farbe weiterhin aus der echten Layer-Definition abgeleitet).

---

Submodul-Pointer in website-v3 am 2026-07-06 von `dca22e5` (v1.18.0) auf `c92fb77` aktualisiert
(neuester `origin/main`-Commit; `v1.19.0` ist einen Commit dahinter, keine passende Release-Tag
für `c92fb77` vorhanden). Details siehe `TODO_ARCHIVE.md`.

Submodul-Pointer in website-v3 am 2026-07-18 auf `v1.21.0` (Commit `bb4e415`) aktualisiert —
enthält Punkte 4 und 5 oben sowie die bereits lokal vorhandenen `--map-bg`/`.coord-row-wgs`-
Ergänzungen aus `handoff-2026-06-20-map-bg-wgs84.md` (dort seitdem als erledigt vermerkt).

Diese Übersicht (und die Detaildateien) lagen bis 2026-07-18 unversioniert im Arbeitsverzeichnis
des `oe5ith-ci`-Submoduls und wurden dann nach `docs/ci/` in website-v3 übertragen (siehe
`docs/proposals/archive/2026-07-18-ci-docs-into-repo-draft.md`) — ab jetzt normale, committete
Dateien in diesem Repo.
