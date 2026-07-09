# Review: AGENT_INSTRUCTIONS.md — Verbesserungen aus externem LLM-Review

| # | Punkt | Priorität | Status |
|---|-------|-----------|--------|
| 1 | Explizite Leseanweisung für referenzierende Einstiegspunkte | Hoch | übernommen (2026-07-07) |
| 2 | „Known debt"-Hinweise sind keine Scope-Einladung (Mandat 1) | Mittel | übernommen (2026-07-07) |
| 3 | Archiv-Dateien: Kontext-Hygiene-Hinweis statt Verbot | Niedrig | übernommen (2026-07-07) |
| 4 | Merge-Konflikt-Verfahren konkretisieren | Mittel | übernommen (2026-07-07) |
| 5 | Release-Checkliste: Abbruchpfad bei rotem Schritt 1 | Hoch | übernommen (2026-07-07) |
| 6 | Generische Git-Sicherheitsregel für fremde/vendorte Pfade | Mittel | übernommen (2026-07-07) |
| 7 | Widerspruch Mandat 5 vs. Abschnitt 5 (Proposal-Geltungsbereich) auflösen | Hoch | übernommen (2026-07-07) |

**Abgelehnt (nicht zur Abstimmung, nur zur Transparenz):** Regel-3-Verschärfung (Abbruch+Rollback,
widerspricht Entscheidung vom 2026-07-03), URL-Scraping-Verbot (spekulativ), Ton-Regel-Umformulierung
(marginal), repo-spezifische Datei-Liste im Release-Commit (gehört in `CLAUDE.md`),
XML/Emoji-Boot-Banner (Stilbruch).

Details siehe [2026-07-07-external-review-improvements-draft.md](2026-07-07-external-review-improvements-draft.md).

**Nachtrag (2026-07-09):** Die Entscheidung „übernommen" oben stammt vom 2026-07-07, der
eigentliche Merge der Textänderungen ins Live-Dokument (`AGENT_INSTRUCTIONS.md`) ist aber erst
am 2026-07-09 passiert — zwischen Review und technischem Merge wurde die Datei offenbar nie
tatsächlich editiert/committet. Bei künftigen Proposal-Merges Schritt „Live-Dokument editieren"
nicht mit „Review-Tabelle aktualisieren" verwechseln — beides ist nötig.
