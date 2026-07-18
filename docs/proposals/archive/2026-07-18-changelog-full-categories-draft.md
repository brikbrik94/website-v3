# Draft: CLAUDE.md — vollständiges Keep-a-Changelog-Kategorien-Set dokumentieren

## Anlass

`ROADMAP.md` (Sektion „Repo-Pflege & Dokumentation") enthielt den Punkt „Bestehende Dokumente an
referenzierte Standards angleichen" — konkret die Frage, ob `CHANGELOG.md` die
Keep-a-Changelog-Kategorien `Deprecated`/`Security` (deutsch: „Veraltet"/„Sicherheit") fehlen und
ob sie gebraucht werden.

Bei der Recherche (2026-07-18) gefunden:

- `CLAUDE.md:133` dokumentiert aktuell nur 4 Kategorien: `Behoben` / `Geändert` / `Hinzugefügt` /
  `Entfernt` — das offizielle Keep-a-Changelog-Schema kennt 6: `Added`, `Changed`, `Deprecated`,
  `Removed`, `Fixed`, `Security`.
- In der bisherigen `CHANGELOG.md`-Historie gab es **zwei echte Security-Fixes**
  (hardcoded DB-Passwort/API-Key in `api/config.php`, `diag.php`-Info-Disclosure — beide
  2026-07-08), die mangels eigener Kategorie unter `Hinzugefügt`/`Behoben` einsortiert wurden.
- Für `Deprecated`/„Veraltet" fand sich **kein einziger** historischer Fall (alles bisher
  Entfernte war Cleanup/toter Code, nie eine echte, angekündigte Deprecation-Phase).

Nutzer-Entscheidung (2026-07-18): **strikt** nach Keep-a-Changelog-Vorgabe arbeiten — das
bedeutet, das vollständige, offizielle 6-Kategorien-Set zu dokumentieren (nicht nur die
Kategorien, die bisher schon vorkamen). `Veraltet`/`Sicherheit` werden damit als verfügbare
Kategorien ergänzt, auch wenn `Veraltet` bisher noch nicht gebraucht wurde — Keep a Changelog
selbst schreibt kein "nur benutzte Kategorien dokumentieren" vor, im Gegenteil listet die
Spec alle 6 als gleichrangigen Teil des Formats.

Bereits bestehende, veröffentlichte `CHANGELOG.md`-Einträge werden **nicht** rückwirkend auf
`Sicherheit` umkategorisiert — historische, getaggte Versionen bleiben unverändert; die neue
Kategorie gilt ab jetzt für künftige Einträge.

## Textänderung

Ersetzen in `CLAUDE.md`, Abschnitt „Releases, versioning & git", Punkt 1 (`CHANGELOG.md`):

Alt:
```markdown
1. **`CHANGELOG.md`** (repo root) — the technical record, Keep-a-Changelog-structured, categories in German (`Behoben` / `Geändert` / `Hinzugefügt` / `Entfernt`).
```

Neu:
```markdown
1. **`CHANGELOG.md`** (repo root) — the technical record, Keep-a-Changelog-structured, all 6 official categories in German (`Hinzugefügt` / `Geändert` / `Veraltet` / `Entfernt` / `Behoben` / `Sicherheit` — i.e. Added/Changed/Deprecated/Removed/Fixed/Security), used as needed (not every entry needs every category).
```

## Nicht Teil dieses Proposals

- Keine rückwirkende Umkategorisierung bestehender, bereits veröffentlichter `CHANGELOG.md`-
  Einträge (auch nicht der beiden identifizierten Security-Fixes von 2026-07-08).
- Keine Änderung an der `[Unreleased]`-Journal-Konvention selbst oder an den übrigen
  Release-Checkliste-Schritten.
- Der `release: vX.Y.Z`-Commit-Typ (ebenfalls Teil derselben ROADMAP.md-Aufgabe) ist bereits in
  `CLAUDE.md` als bewusste Abweichung dokumentiert („repo-specific type, not part of the spec")
  — dieser Teilpunkt gilt als bereits erledigt, keine weitere Änderung nötig.
