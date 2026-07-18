# Draft: Repo-Root-Aufräumung — TODO/ROADMAP/Archive/AGENT_INSTRUCTIONS.md/CHANGELOG.md nach docs/

## Anlass

`ROADMAP.md` (Sektion „Repo-Pflege & Dokumentation") enthielt den Punkt „Repo-Root-Ordnerstruktur
aufräumen". Auf Nachfrage (2026-07-18), was genau als unübersichtlich empfunden wird: der Nutzer
zeigte die aktuelle GitHub-Root-Ansicht (21 Einträge nebeneinander) und entschied konkret:

- `TODO.md`, `TODO_ARCHIVE.md`, `ROADMAP.md`, `ROADMAP_ARCHIVE.md` → nach `docs/`
- `AGENT_INSTRUCTIONS.md` → nach `docs/`
- `CHANGELOG.md` → nach `docs/`
- `GEMINI.md` → komplett entfernen (Gemini CLI wird für dieses Projekt nicht genutzt, bewusster
  Tradeoff: kein automatisch geladener Projekt-Kontext mehr für dieses Tool)

Nicht Teil dieser Entscheidung: `deploy-website.sh`/`nginx.conf`/`phpcs.xml` bleiben am Root
(ursprünglich als Kandidaten diskutiert, Nutzer hat explizit klargestellt, dass es ihm um die
**Dokumente** geht, nicht um Deploy-/Lint-Tooling).

## Warum die generische Regel in `AGENT_INSTRUCTIONS.md` §3 direkt geändert wird

Erster Entwurf dieses Proposals hatte vorgeschlagen, §3s generische „am Repo-Root"-Empfehlung
unverändert zu lassen und die Abweichung nur repo-spezifisch in `CLAUDE.md` zu dokumentieren
(`AGENT_INSTRUCTIONS.md` ist laut eigener Kopfzeile bewusst 1:1 in andere Repos kopierbar).
Nutzer-Entscheidung (2026-07-18): stattdessen die generische Regel selbst ändern —
`AGENT_INSTRUCTIONS.md` ist bisher erst in 2 Repos übernommen, die docs/-Platzierung ist eine
klare Verbesserung (deutlich aufgeräumterer Repo-Root) und soll deshalb direkt in die generische
Empfehlung einfließen statt als Abweichung mitgeschleppt zu werden.

## Textänderung in `AGENT_INSTRUCTIONS.md` §3

Alt:
```markdown
## 3. TODO vs. Roadmap

Zwei getrennte Dateipaare am Repo-Root, jedes für sich lesbar und actionable (Deep-Dive-Docs wie
Design-Specs bleiben optionaler Kontext, nie alleinige Quelle für „was zu tun ist"):
```

Neu:
```markdown
## 3. TODO vs. Roadmap

Zwei getrennte Dateipaare unter `docs/` (nicht am Repo-Root — hält den Root aufgeräumt), jedes für
sich lesbar und actionable (Deep-Dive-Docs wie Design-Specs bleiben optionaler Kontext, nie
alleinige Quelle für „was zu tun ist"):
```

Rest von §3 (Kriterien TODO vs. Roadmap, Archivierungs-Regel, Kontext-Hygiene-Hinweis)
unverändert — nur die Ortsangabe ändert sich.

## Textänderungen in `CLAUDE.md`

### 1. Alle `AGENT_INSTRUCTIONS.md`-Links auf `docs/AGENT_INSTRUCTIONS.md` umbiegen

5 Vorkommen in `CLAUDE.md` (Kopfzeile-Leseanweisung, Standards-Referenzen, TODO-vs-Roadmap,
Releases-Abschnitt, Working-Style-Abschnitt) — `./AGENT_INSTRUCTIONS.md` → `./docs/AGENT_INSTRUCTIONS.md`
(Anker wie `#3-todo-vs-roadmap` bleiben erhalten).

### 2. Releases-Abschnitt — `CHANGELOG.md`-Ortsangabe korrigieren

Alt:
```markdown
1. **`CHANGELOG.md`** (repo root) — the technical record, Keep-a-Changelog-structured, all 6 official categories in German (...)
```

Neu:
```markdown
1. **`CHANGELOG.md`** (`docs/CHANGELOG.md`, moved from repo root 2026-07-18) — the technical record, Keep-a-Changelog-structured, all 6 official categories in German (...)
```

Zusätzlich: `TODO.md`/`ROADMAP.md`-Linkziele im selben Abschnitt („Folgearbeiten ... in
[TODO.md](./TODO.md) bzw. [ROADMAP.md](./ROADMAP.md)") auf `./docs/TODO.md`/`./docs/ROADMAP.md`
umbiegen (gleiches Muster wie AGENT_INSTRUCTIONS.md-Links).

## Datei-Operationen (git mv / git rm)

```
git mv TODO.md docs/TODO.md
git mv TODO_ARCHIVE.md docs/TODO_ARCHIVE.md
git mv ROADMAP.md docs/ROADMAP.md
git mv ROADMAP_ARCHIVE.md docs/ROADMAP_ARCHIVE.md
git mv AGENT_INSTRUCTIONS.md docs/AGENT_INSTRUCTIONS.md
git mv CHANGELOG.md docs/CHANGELOG.md
git rm GEMINI.md
```

## Interne Pfad-Anpassungen in den ziehenden Dateien

Gegenseitige Verweise zwischen den 6 ziehenden Dateien (z.B. `TODO.md` → `ROADMAP.md`) bleiben
unverändert gültig (`./`-relativ, alle landen als Geschwister in `docs/`). Anzupassen sind nur
Verweise, deren relativer Pfad sich durch den Ortswechsel ändert:

- Jedes `./docs/...`-Ziel (z.B. `./docs/external-blockers.md`, `./docs/superpowers/specs/...`,
  `./docs/ci/...`, `./docs/security/...`, `./docs/proposals/archive/...`) verliert das
  `docs/`-Präfix (wird jetzt zum Geschwister-Pfad `./...`).
- `ROADMAP.md`s bereits vorher **fehlerhafter** Link `../docs/superpowers/specs/2026-07-08-standards-angleichung-design.md`
  (falsches `../`, schon vor diesem Umzug kaputt — ROADMAP.md lag am Root, nicht in einem
  Unterordner) wird im selben Zug korrigiert (`./superpowers/specs/...`).
- `TODO_ARCHIVE.md`s Verweis `./CLAUDE.md#standards-referenzen` (CLAUDE.md bleibt am Root, liegt
  jetzt eine Ebene höher) wird zu `../CLAUDE.md#standards-referenzen`.

Root-Dateien, die auf die ziehenden Dateien verweisen (`CLAUDE.md`, `README.md`), bekommen das
`docs/`-Präfix ergänzt (z.B. `./ROADMAP.md` → `./docs/ROADMAP.md`).

Nicht angepasst werden bewusst reine **Prosa-Erwähnungen** ohne Markdown-Link-Syntax (z.B. „siehe
TODO.md" in `docs/security/owasp-top10-checklist.md` oder `docs/ci/*.md`) — das sind keine
brechenden Links, nur Textverweise, die weiterhin verständlich bleiben.

**Nicht angetastet:** `docs/superpowers/plans/*`, `docs/superpowers/specs/*` und
`docs/proposals/archive/*` — historische, zeitpunktbezogene Dokumente, die frühere Pfade
(`./AGENT_INSTRUCTIONS.md`, `./TODO.md`, …) korrekt so referenzieren, wie sie **zum
Erstellungszeitpunkt** galten. Rückwirkendes Anpassen widerspricht der bereits etablierten Praxis
in diesem Repo (Historie wird nicht umgeschrieben).

## Nicht Teil dieses Proposals

- `deploy-website.sh`, `nginx.conf`, `phpcs.xml` bleiben am Repo-Root — bewusst ausgeklammert
  (Nutzer-Entscheidung 2026-07-18: es geht um Dokumente, nicht Deploy-/Lint-Tooling).
- Keine Änderung an den übrigen generischen Standards-Referenzen oder Core Mandates in
  `AGENT_INSTRUCTIONS.md`.
- Keine rückwirkende Anpassung historischer Dokumente (Specs, Pläne, archivierte Proposals).
