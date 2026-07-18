# Review: Repo-Root-Aufräumung — TODO/ROADMAP/Archive/AGENT_INSTRUCTIONS.md/CHANGELOG.md nach docs/

| # | Punkt | Priorität | Status |
|---|-------|-----------|--------|
| 1 | `AGENT_INSTRUCTIONS.md` §3: generische Regel direkt geändert (`docs/` statt „am Repo-Root") — bewusst keine repo-spezifische Abweichungs-Notiz, sondern echte Änderung der generischen Empfehlung (erst 2 Repos übernommen, klare Verbesserung) | Mittel | übernommen (2026-07-18) |
| 2 | `TODO.md`/`TODO_ARCHIVE.md`/`ROADMAP.md`/`ROADMAP_ARCHIVE.md`/`AGENT_INSTRUCTIONS.md`/`CHANGELOG.md` per `git mv` nach `docs/` | Mittel | übernommen (2026-07-18) |
| 3 | `GEMINI.md` per `git rm` entfernt (Gemini CLI nicht genutzt, kein Ersatz) | Niedrig | übernommen (2026-07-18) |
| 4 | `CLAUDE.md`: alle `AGENT_INSTRUCTIONS.md`-Links auf `docs/AGENT_INSTRUCTIONS.md` umgebogen (Anker erhalten) | Mittel | übernommen (2026-07-18) |
| 5 | `CLAUDE.md`: `CHANGELOG.md`-Ortsangabe im Releases-Abschnitt korrigiert, `TODO.md`/`ROADMAP.md`-Linkziele auf `docs/` umgebogen | Mittel | übernommen (2026-07-18) |
| 6 | Interne Querverweise der 6 ziehenden Dateien angepasst (`docs/`-Präfix entfernt wo nötig, `../CLAUDE.md` wo nötig), inkl. Fix des vorbestehenden kaputten `../docs/...`-Links in `ROADMAP.md` | Mittel | übernommen (2026-07-18) |
| 7 | `README.md`: Links auf die 6 ziehenden Dateien bekommen `docs/`-Präfix | Niedrig | übernommen (2026-07-18) |
| 8 | Keine Änderung an historischen Dokumenten (Specs/Pläne/archivierte Proposals) — referenzieren bewusst weiterhin die zum jeweiligen Erstellungszeitpunkt gültigen Pfade | — | kein Punkt (Bestätigung, keine Änderung) |
| 9 | `deploy-website.sh`/`nginx.conf`/`phpcs.xml` bleiben am Root | — | kein Punkt (explizit ausgeklammert) |

Kontext/Herleitung: [2026-07-18-docs-root-cleanup-draft.md](2026-07-18-docs-root-cleanup-draft.md).

Nutzer-Entscheidungen während der Rücksprache (2026-07-18):
- Auslöser: GitHub-Root-Ansicht mit 21 Einträgen als unübersichtlich empfunden — konkret die
  Dokumente (nicht Deploy-/Lint-Tooling) sollen gruppiert werden.
- `TODO.md`/`ROADMAP.md`+Archive, `AGENT_INSTRUCTIONS.md`, `CHANGELOG.md` → `docs/`.
- `GEMINI.md` komplett entfernen statt nur zu verschieben (Gemini CLI wird nicht genutzt).
- `deploy-website.sh`/`nginx.conf`/`phpcs.xml` explizit ausgeklammert.
- **Kurskorrektur gegenüber Erstentwurf:** die generische „am Repo-Root"-Regel in
  `AGENT_INSTRUCTIONS.md` §3 wird direkt geändert statt nur als repo-spezifische Abweichung in
  `CLAUDE.md` dokumentiert — Begründung: `AGENT_INSTRUCTIONS.md` ist bisher erst in 2 Repos
  übernommen, `docs/`-Platzierung ist eine klare Verbesserung, soll deshalb direkt in die
  generische Empfehlung einfließen.
