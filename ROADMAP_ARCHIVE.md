# Roadmap-Archiv

Umgesetzte Punkte aus [ROADMAP.md](./ROADMAP.md), chronologisch nach Release.

## 2026-07-03 — CLAUDE.md-Aufsplittung (AGENT_INSTRUCTIONS.md/GEMINI.md)

### `CLAUDE.md` in portable + repo-spezifische Teile aufgesplittet
- [x] Repo-unabhängige, standardbasierte Regeln (Standards-Referenzen-Auszug, TODO/Roadmap-Split,
  Releases/Versionierung/Git, Core Mandates) in [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md)
  ausgelagert — 1:1 in andere Repos kopierbar, keine website-v3-Dateipfade/-Komponenten darin.
  `CLAUDE.md` verweist jetzt auf diese Datei statt die Regeln zu duplizieren und behält nur noch
  Repo-Spezifisches (Architektur, Commands, Geodaten-Standards, `oe5ith-ci`-Anwendung, konkrete
  Release-Dateipfade).
- [x] `GEMINI.md` (von Gemini CLI zwingend unter diesem Namen geladen) auf einen kurzen Verweis
  auf `AGENT_INSTRUCTIONS.md` + `CLAUDE.md` reduziert, statt eigenständig (und damit
  driftanfällig) zu duplizieren — vorher veraltet (u.a. `api/config.php` statt
  `api/config.local.php`, verpflichtender `-dev`-Suffix, den CLAUDE.md inzwischen gestrichen hat).
