# Draft: CI-Bug-/Feature-Meldedateien nach `docs/ci/` statt ins Submodul-Arbeitsverzeichnis

## Anlass

`CLAUDE.md` schreibt aktuell vor, dass beim Arbeiten in website-v3 gefundene Bugs/Feature-Wünsche
im geteilten Design-System als eigene Datei **im Arbeitsverzeichnis des `oe5ith-ci`-Submoduls**
dokumentiert werden (`oe5ith-ci/ci-bug-reports.md`, `oe5ith-ci/ci-*-request.md`), dort bewusst
unversioniert (nicht committed im Submodul, nicht als Submodul-Pointer-Änderung im Hauptrepo
gestaged).

Der Nutzer hat diese Konvention am 2026-07-18 explizit für änderungsbedürftig erklärt: Diese
Dateien sollen stattdessen in diesem Repo unter `docs/` liegen. Begründung (aus der Rücksprache):
Der Submodul-Arbeitsbaum ist kein geeigneter Ort für dauerhaft relevante, website-v3-eigene
Dokumentation — unversioniert bedeutet, dass die Dateien nirgends im Git-Verlauf auftauchen und
bei einem frischen Checkout/Klon des Submoduls verloren wären. Ein bereits bestehender
Präzedenzfall stützt die neue Richtung: `docs/ci-handoff-2026-06-20-map-bg-wgs84.md` existiert
schon heute als flache Datei in *diesem* Repo für einen analogen Zweck (Auftrag Richtung
CI-Submodul).

Zur konkreten Ablageform befragt (flach in `docs/` vs. eigener Unterordner `docs/ci/`) hat der
Nutzer **`docs/ci/`** gewählt — inklusive Verschieben der bestehenden
`docs/ci-handoff-2026-06-20-map-bg-wgs84.md` in diesen Ordner, damit alle CI-Meldungen/Handoffs
an einem Ort gebündelt sind statt verstreut im `docs/`-Root.

## Neue Struktur

```
docs/ci/
  bug-reports.md                          (vormals oe5ith-ci/ci-bug-reports.md)
  open-items.md                           (vormals oe5ith-ci/ci-open-items.md)
  routing-disclosure-request.md           (vormals oe5ith-ci/ci-routing-disclosure-request.md)
  handoff-2026-06-20-map-bg-wgs84.md      (vormals docs/ci-handoff-2026-06-20-map-bg-wgs84.md)
```

Dateinamen verlieren das `ci-`-Präfix, da der Ordnername selbst das schon ausdrückt. Neue
Handoff-Dateien folgen weiterhin dem Muster `handoff-YYYY-MM-DD-<slug>.md`, neue Bug-Funde bleiben
in der gesammelten `bug-reports.md`, neue Feature-Wünsche bekommen wie bisher je eine eigene
`<slug>-request.md`.

Diese Dateien sind ab sofort **normale, committete Dateien in website-v3** (kein Sonderstatus
mehr wie im Submodul) — sie unterliegen keiner Sonderregel bezüglich Staging/Committing.

## Textänderung in `CLAUDE.md`

Ersetzen im Abschnitt „Project conventions", Punkt „Never fix bugs inside `oe5ith-ci`…":

Alt:
```markdown
- **Never fix bugs inside `oe5ith-ci` from this repo.** The submodule is maintained externally with its own review/checks process. If a bug in the shared design system (tokens, components) is found while working here, document it — don't fix it — in `oe5ith-ci/ci-bug-reports.md` (context, root cause, reproduction, the fix already validated locally in website-v3 if any, impact on other OE5ITH portals), analogous to the existing `oe5ith-ci/ci-*-request.md` files used for feature requests. These files live uncommitted in the submodule's working tree (not committed in the submodule, not staged as a submodule-pointer change in this repo) — reference them from `TODO.md` with a short pointer, not a full description.
```

Neu:
```markdown
- **Never fix bugs inside `oe5ith-ci` from this repo.** The submodule is maintained externally with its own review/checks process. If a bug in the shared design system (tokens, components) is found while working here, document it — don't fix it — in `docs/ci/bug-reports.md` (context, root cause, reproduction, the fix already validated locally in website-v3 if any, impact on other OE5ITH portals), analogous to `docs/ci/*-request.md` files used for feature requests and `docs/ci/handoff-*.md` files used for ready-to-implement handoffs. These files are committed normally in this repo (unlike the previous convention of leaving them uncommitted in the submodule's working tree) — reference them from `TODO.md` with a short pointer, not a full description.
```

## Migrations-Schritte (nach Merge dieses Proposals)

1. `docs/ci/` anlegen.
2. `git mv docs/ci-handoff-2026-06-20-map-bg-wgs84.md docs/ci/handoff-2026-06-20-map-bg-wgs84.md`.
3. Inhalte von `oe5ith-ci/ci-bug-reports.md`, `oe5ith-ci/ci-open-items.md`,
   `oe5ith-ci/ci-routing-disclosure-request.md` nach `docs/ci/bug-reports.md`,
   `docs/ci/open-items.md`, `docs/ci/routing-disclosure-request.md` übertragen (als neue,
   committete Dateien in website-v3) und die 3 Originaldateien im Submodul-Arbeitsverzeichnis
   löschen (sie waren dort ohnehin nur unversionierte Arbeitskopien).
4. In den übertragenen Dateien den einleitenden Hinweis „liegt absichtlich unversioniert im
   Arbeitsverzeichnis des Submoduls" auf den neuen Ort/Status anpassen.
5. `CLAUDE.md` gemäß Textänderung oben aktualisieren.
6. Referenzen in `TODO.md`/`ROADMAP.md`, die auf `oe5ith-ci/ci-*` verweisen, auf die neuen Pfade
   umbiegen (falls vorhanden).

## Nicht Teil dieses Proposals

- Keine Änderung an der Grundregel „nie im Submodul selbst fixen" — nur der Ablageort der
  *Meldedokumente* ändert sich.
- Keine Änderung an `oe5ith-ci/CLAUDE.md` oder sonstigen Dateien innerhalb des Submoduls selbst.
- Keine sonstige Umstrukturierung von `docs/` über den neuen `docs/ci/`-Unterordner hinaus.
