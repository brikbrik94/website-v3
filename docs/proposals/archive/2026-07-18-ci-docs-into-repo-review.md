# Review: CI-Bug-/Feature-Meldedateien nach `docs/ci/` statt ins Submodul-Arbeitsverzeichnis

| # | Punkt | Priorität | Status |
|---|-------|-----------|--------|
| 1 | `CLAUDE.md`-Konvention ändern: CI-Bug-/Feature-/Handoff-Meldedateien liegen künftig committed unter `docs/ci/` in website-v3 statt unversioniert im Arbeitsverzeichnis des `oe5ith-ci`-Submoduls | Mittel | übernommen (2026-07-18) |
| 2 | Neuer Unterordner `docs/ci/`, bestehende `docs/ci-handoff-2026-06-20-map-bg-wgs84.md` zieht mit um (`handoff-2026-06-20-map-bg-wgs84.md`) | Mittel | übernommen (2026-07-18) |
| 3 | Dateinamen verlieren `ci-`-Präfix innerhalb des Ordners (`bug-reports.md`, `open-items.md`, `routing-disclosure-request.md`) | Niedrig | übernommen (2026-07-18) |
| 4 | Die 3 aktuellen Dateien im `oe5ith-ci`-Arbeitsverzeichnis werden nach `docs/ci/` übertragen und dort gelöscht (keine Duplizierung) | Mittel | übernommen (2026-07-18) |

Kontext/Herleitung: [2026-07-18-ci-docs-into-repo-draft.md](2026-07-18-ci-docs-into-repo-draft.md).

Nutzer-Entscheidungen während der Rücksprache (2026-07-18):
- Auslöser: Unversioniert im Submodul-Arbeitsverzeichnis bedeutet, die Dateien tauchen nirgends
  im Git-Verlauf auf und wären bei frischem Checkout/Klon verloren — für dauerhaft relevante
  website-v3-Doku ungeeignet.
- Ablageform `docs/ci/` (eigener Unterordner) statt flach in `docs/` gewählt — explizit inklusive
  Mitziehen der bestehenden `ci-handoff-*`-Datei, damit alle CI-Meldungen/Handoffs gebündelt sind.
- Grundregel „nie im Submodul selbst fixen" bleibt unverändert — nur der Ablageort der
  Meldedokumente ändert sich.
