# Review: AGENT_INSTRUCTIONS.md (Draft 1)

Feedback-Punkte zur punktweisen Durchsprache. Status-Spalte wird beim Durchgehen gepflegt.

| # | Punkt | Priorität | Status |
|---|-------|-----------|--------|
| 1 | Nachfragen-Mandat: Fallback für non-interaktive Läufe | Hoch | übernommen (2026-07-03) |
| 2 | Changelog-Uhrzeit als Eigenregel kennzeichnen + Merge-Konflikt-Regel | Hoch | übernommen (2026-07-03) |
| 3 | PSR-12 generalisieren oder verschieben | Mittel | übernommen, Option A (2026-07-03) |
| 4 | Umgang mit Out-of-Scope-Funden definieren | Hoch | übernommen (2026-07-03) |
| 5 | Verifikations-Befehle: Dokumentationspflicht im Einstiegspunkt | Mittel | übernommen (2026-07-03) |
| 6 | Kleinigkeiten: „im Bereich", TODO/Roadmap-Tie-Breaker, `git add -A` | Niedrig | übernommen (2026-07-03) |

Alle Punkte 1:1 wie im Draft-Vorschlag in `AGENT_INSTRUCTIONS.md` übernommen (keine Abweichungen
in der Review-Diskussion). Diese Datei + der Draft sind archiviert, siehe
[../archive/](../archive/).

---

## Was gut ist (beibehalten)

- Strikte Trennung generisch ↔ repo-spezifisch, Einstiegspunkte referenzieren statt duplizieren
  → eine Quelle der Wahrheit.
- Standards-Tabelle mit Quellen + Pflege-Regel („erst prüfen, ob Community-Standard existiert")
  → verhindert Ad-hoc-Regel-Wildwuchs.
- TODO/Roadmap-Trennung mit `*_ARCHIVE.md` (Historie bleibt erhalten).
- Scratch-Hygiene-Regel (gitignorter `scratch/`-Ordner, `*.local.*`).
- Gute Gesamtlänge — kein Overengineering.

---

## Punkt 1 — Nachfragen-Mandat braucht Fallback (Hoch)

**Problem:** Core Mandate 2 („Bei Unklarheit nachfragen") funktioniert nur im interaktiven
Dialog. Agenten laufen zunehmend non-interaktiv (CI, Background-Tasks, Handoffs) — dort
blockiert die Regel oder wird stillschweigend ignoriert.

**Vorschlag:** Ergänzen: *„Ist Nachfragen nicht möglich, die minimalinvasivste Interpretation
wählen und die getroffene Annahme explizit im Ergebnis/Commit dokumentieren."*

## Punkt 2 — Changelog-Regel widerspricht der eigenen Pflege-Klausel (Hoch)

**Problem A:** `## [Unreleased] - YYYY-MM-DD HH:mm` mit Datum/Uhrzeit ist keine
Keep-a-Changelog-Konvention (Standard: ein einzelner `[Unreleased]`-Block ohne Datum).
Legitim als Journal-Ansatz, aber nach Abschnitt 2 der eigenen Datei muss das als **bewusste
Eigenregel** gekennzeichnet werden.

**Problem B:** `CHANGELOG.md` ist bei parallelen Branches/Agenten ein Merge-Konflikt-Magnet.
Es fehlt eine Regel zum Umgang damit.

**Vorschlag:** (a) Eigenregel-Vermerk ergänzen. (b) Konflikt-Regel ergänzen: Konflikte immer
durch Zusammenführen beider Blöcke lösen, nie durch Verwerfen.

## Punkt 3 — PSR-12 wirkt einsam (Mittel)

**Problem:** Nur PHP explizit zu nennen ist inkonsistent — die Tabelle suggeriert, für andere
Sprachen gäbe es keine Vorgabe.

**Vorschlag (Option A):** Zeile generalisieren: „Formatter/Style-Standard des jeweiligen
Ökosystems: PEP 8/Black, rustfmt, gofmt, Prettier, PSR-12, …"

**Vorschlag (Option B):** Zeile rausnehmen und in den repo-spezifischen Einstiegspunkt
verschieben, wo die Sprache bekannt ist.

## Punkt 4 — Out-of-Scope-Funde fehlen als expliziter Fall (Hoch)

**Problem:** Mandat 1 verbietet ungefragtes Refactoring, Abschnitt 3 definiert `TODO.md` —
aber die Verbindung fehlt: Was tut der Agent, wenn er während einer Aufgabe einen Bug oder
Cleanup-Bedarf entdeckt?

**Vorschlag:** Regel ergänzen: Nicht fixen, sondern als `TODO.md`-Eintrag festhalten
(mit `Datei:Zeile`). Verzahnt Mandate und TODO-Abschnitt sauber.

## Punkt 5 — Verifikations-Befehle: Dokumentationspflicht (Mittel)

**Problem:** Mandat 4 verlangt, „die repo-eigenen Build-/Test-/Lint-Befehle" laufen zu lassen —
sagt aber nicht, wo diese stehen. Ohne Vorgabe rät jeder Agent selbst (`npm test`?
`make check`?) und die Regel ist nicht durchsetzbar.

**Vorschlag:** Festschreiben, dass diese Befehle verpflichtend im repo-spezifischen
Einstiegspunkt dokumentiert sein müssen (gleiches Muster wie bei den Standards: hier die
Pflicht, dort die Konkretisierung).

## Punkt 6 — Kleinigkeiten (Niedrig)

1. **„minor = jedes neue user-facing Feature im Bereich"** — unklar, was „im Bereich" heißt;
   vermutlich „seit dem letzten Tag"? Formulierung präzisieren.
2. **TODO vs. Roadmap Tie-Breaker:** Die Abgrenzung „Erweiterung von Bestehendem" vs. „neues
   Feature" ist in der Praxis oft strittig → Regel „im Zweifel `TODO.md`" ergänzen.
3. **`git add -A`:** Das Verbot vom Release-Kontext auf generell heben — die Regel ist immer
   sinnvoll.

---

## Bewusst NICHT aufnehmen

Branch-Strategien, PR-Workflows, CI-Details — zu repo-/team-spezifisch, gehört in den
jeweiligen Einstiegspunkt.
