# Draft: AGENT_INSTRUCTIONS.md Abschnitt 2 — Einordnung von Standards präzisieren

## Problem

Abschnitt 2 sagt, ein neuer Standard gehört „hier (falls generisch) oder im
repo-spezifischen Einstiegspunkt (falls domänen-/repo-gebunden)" — aber „generisch" vs.
„domänen-/repo-gebunden" ist kein Test, den ein Agent ohne Rückfrage anwenden kann. Der
Praxisfall, an dem das aufgefallen ist: BEM (Block Element Modifier) ist ein generischer,
allgemein bekannter CSS-Namenskonventions-Standard — genau wie PSR-12 ein generischer
PHP-Style-Standard ist. PSR-12 taucht (als Beispiel unter „Ökosystem-Style-Standard") in der
generischen Tabelle hier auf; BEM taucht **nicht** hier auf, sondern nur in der
repo-spezifischen `CLAUDE.md`-Tabelle, mit dem Zusatz „primär Sache von `oe5ith-ci`" (einem
Submodul, das die kanonische Namenskonvention für Komponenten definiert). Ob das eine bewusste,
richtige Entscheidung war oder nur zufällig so gelandet ist, war ohne explizite Regel nicht
mehr nachvollziehbar.

Der eigentliche Unterschied ist nicht „ist der Standard an sich generisch", sondern: **wo liegt
die kanonische Quelle für seine konkrete Anwendung in diesem Projekt.** Bei PSR-12 ist das der
Standard selbst (kein zusätzliches Projekt-Artefakt nötig, um ihn anzuwenden). Bei BEM in diesem
Repo ist die kanonische Anwendungsreferenz ein repo-spezifisches Artefakt (das `oe5ith-ci`-Submodul)
— der Standard selbst ist generisch, aber ohne dieses Artefakt zu lesen, kann ein Agent ihn hier
nicht korrekt anwenden. Diese Unterscheidung fehlt aktuell komplett.

Zusätzlich ist „Pflege" nur ein Fließtext-Satz — keine Schritt-für-Schritt-Prüfung, die ein
Agent tatsächlich abarbeiten kann.

## Vorschlag

Abschnitt 2 um einen Unterabschnitt **„Einordnung: hier oder repo-spezifisch?"** ergänzen, mit
einem konkreten 2-Fragen-Test statt der bisherigen Formulierung, plus die zwei Fälle aus diesem
Repo als durchgerechnete Beispiele (PSR-12 = klarer generischer Fall, BEM/`oe5ith-ci` = der
Fall, der zur Klärung geführt hat). Die „Pflege"-Passage wird zu einer nummerierten Prüfliste.

### Neuer Text für Abschnitt 2 (Ersetzt den bisherigen Pflege-Absatz, Tabelle bleibt wie sie ist)

```markdown
**Einordnung: hier oder repo-spezifisch?** Zwei Fragen entscheiden, nicht Bauchgefühl:

1. **Ist der Standard selbst allgemein bekannt und sprach-/ökosystemweit gültig** (nicht an
   dieses eine Projekt gebunden)? Wenn nein → repo-spezifisch, fertig.
2. **Reicht der Standard allein aus, um ihn korrekt anzuwenden — oder ist dafür ein
   projekteigenes Artefakt nötig** (ein Submodul, eine Token-Datei, ein Schema, das erst die
   konkrete Ausprägung festlegt)? Wenn ein solches Artefakt nötig ist → der Standard *kann*
   trotzdem als generische Zeile hier stehen (er bleibt ja allgemein bekannt), **muss aber** im
   repo-spezifischen Einstiegspunkt auf das Artefakt verweisen, das die kanonische Anwendung
   definiert — nie eine eigene, parallele Anwendungsregel erfinden.

**Beispiel A — PSR-12 (klarer generischer Fall):** Standard ist bekannt und für sich
anwendbar → generische Zeile hier reicht, repo-spezifisch nur noch Umsetzungsstand/Abweichung
vermerken (siehe `CLAUDE.md`-Beispiel).

**Beispiel B — BEM (Standard braucht projekteigenes Artefakt):** BEM als Namenskonvention ist
generisch bekannt, aber die *konkrete* Klassen-Benennung in einem Multi-Repo-Setup mit
gemeinsamem Design-System wird nicht von BEM selbst festgelegt, sondern vom Design-System-
Submodul. Hier gilt: BEM als Zeile in die generische Tabelle aufnehmen (siehe unten), aber der
repo-spezifische Einstiegspunkt muss explizit auf das Submodul als kanonische Quelle verweisen
— nicht auf BEM alleine.

**Pflege (Prüfliste vor Eintragung eines neuen Standards):**

1. Existiert ein etablierter Community-Standard für diesen Fall? Wenn nein → als bewusste
   Eigenregel im repo-spezifischen Einstiegspunkt vermerken, hier nichts eintragen.
2. Wenn ja: Test oben anwenden (Frage 1) → generisch oder repo-spezifisch?
3. Bei „generisch, aber mit projekteigenem Anwendungsartefakt" (Test Frage 2): Zeile hier
   eintragen **und** im repo-spezifischen Einstiegspunkt einen Verweis auf das Artefakt
   ergänzen — beides, nicht nur eines von beiden.
4. Quelle (URL) und „Wofür generisch" so knapp wie möglich, keine repo-spezifischen Details in
   dieser Datei.
```

### Ergänzung generische Tabelle (Zeile hinzufügen, Beispiel B umsetzen)

```markdown
| BEM (Block Element Modifier) | https://getbem.com/ | CSS-Klassennamen-Konvention (Block__Element--Modifier); konkrete Anwendung kann an ein projekteigenes Design-System-Artefakt delegiert sein — dort nachsehen, siehe repo-spezifischer Einstiegspunkt |
```

## Betroffene Datei

Nur `AGENT_INSTRUCTIONS.md`, Abschnitt 2. Kein repo-spezifischer Folgeschritt nötig — der
BEM-Verweis in `CLAUDE.md` ("primär Sache von `oe5ith-ci`") passt bereits zum neuen Muster
(„Zeile hier + Verweis auf Artefakt dort") und muss nicht geändert werden.
