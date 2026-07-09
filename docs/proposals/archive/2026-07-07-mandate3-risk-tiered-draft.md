# Draft: AGENT_INSTRUCTIONS.md Mandat 3 — Risikoabstufung statt Alles-oder-Nichts

## Nochmalige Prüfung (Anlass: Nachfrage des Nutzers zum bereits abgelehnten Punkt)

Der ursprüngliche externe Vorschlag ("bei jeder Unklarheit im non-interaktiven Lauf hart
abbrechen + Git-Rollback") wurde abgelehnt, weil ein pauschaler Abbruch bei *jeder* Unklarheit
CI-/Background-Agenten praktisch unbrauchbar macht — die meisten Unklarheiten in echten Aufgaben
sind trivial und folgenlos (z.B. Formulierungsdetails), ein Abbruch dafür wäre teurer als der
Nutzen.

Die zugrunde liegende Sorge ist aber real und wird durch nochmaliges Nachfragen nicht kleiner:
„minimalinvasivste Interpretation" ist für ein LLM kein präziser Maßstab — beim Raten kann es
danebenliegen, und bei einer **folgenreichen** Aktion (löschen, force-pushen, Daten migrieren,
sicherheitsrelevantes Verhalten ändern, deployen/publizieren) ist ein falscher Rate-Treffer nicht
mehr durch „Annahme dokumentiert" heilbar — der Schaden ist bereits passiert, bevor ein Mensch das
Commit-Log liest.

**Auflösung:** Nicht Alles-oder-Nichts, sondern nach Reversibilität/Blast-Radius der *von der
Unklarheit betroffenen Aktion* unterscheiden — nicht nach genereller "Unklarheit gibt es immer":

- Betrifft die Unklarheit eine **schwer reversible oder folgenreiche Aktion**: harter Abbruch,
  kein Raten, `TODO.md`-Eintrag statt Commit.
- Betrifft die Unklarheit etwas **Reversibles/Lokales** (die übergroße Mehrheit echter Aufgaben):
  bleibt bei minimalinvasiv + dokumentierte Annahme — sonst ist jeder non-interaktive Lauf bei der
  ersten kleinen Unschärfe tot.

Das ist keine Rücknahme der Entscheidung vom 2026-07-03 (minimalinvasiv + dokumentieren bleibt
der Normalfall), sondern eine Verschärfung für genau die Fälle, in denen Raten tatsächlich
gefährlich ist — womit der eigentliche Kern der externen Kritik sachlich zutrifft und jetzt
sauber eingearbeitet wird, statt ihn erneut pauschal zurückzuweisen.

## Textänderung

Alt (Mandat 3):
```markdown
3. **Bei Unklarheit nachfragen:** Ist eine Anforderung mehrdeutig, nachfragen statt raten. Ist
   Nachfragen nicht möglich (non-interaktiver Lauf, CI, Background-Task), die minimalinvasivste
   Interpretation wählen und die getroffene Annahme explizit im Ergebnis/Commit dokumentieren.
```

Neu:
```markdown
3. **Bei Unklarheit nachfragen:** Ist eine Anforderung mehrdeutig, nachfragen statt raten. Ist
   Nachfragen nicht möglich (non-interaktiver Lauf, CI, Background-Task): Betrifft die
   Unklarheit eine schwer reversible oder folgenreiche Aktion (Löschen, Force-Push,
   Schema-/Datenmigration, sicherheitsrelevantes Verhalten, Deploy/Publish) → Lauf abbrechen,
   Unklarheit als `TODO.md`-Eintrag festhalten, nicht raten. Andernfalls die minimalinvasivste
   Interpretation wählen und die getroffene Annahme explizit im Ergebnis/Commit dokumentieren.
```
