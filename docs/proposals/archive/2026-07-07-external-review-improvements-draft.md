# Draft: AGENT_INSTRUCTIONS.md — Verbesserungen aus externem LLM-Review

Grundlage: zwei externe Review-Dokumente (Gemini) zu `AGENT_INSTRUCTIONS.md` und `CLAUDE.md`,
abgelegt in `docs/proposals/gemini-code-*.md`. Jeder Punkt unten wurde einzeln gegen die
aktuelle Datei und gegen frühere, bereits bewusst getroffene Entscheidungen geprüft — nicht
pauschal übernommen. Abgelehnte Punkte sind mit Begründung dokumentiert, nicht stillschweigend
weggelassen.

## Übernommene Punkte

### 1. Referenz lädt Inhalt nicht automatisch (Quelle: Doc 1, Punkt 1 + Doc 2, „Bootloader")

**Befund:** `AGENT_INSTRUCTIONS.md` wird von Einstiegspunkten nur per Markdown-Verweis
referenziert. Anders als `CLAUDE.md` (von Claude Code automatisch injiziert) wird diese Datei
nicht automatisch geladen — ein Agent muss aktiv angewiesen sein, sie zu lesen. Verifiziert:
in dieser Session wurde die Datei nur gelesen, weil explizit danach gefragt wurde.

**Änderung:** Neuer Absatz nach der bestehenden „Wie diese Datei eingebunden wird"-Passage,
mit einem übernehmbaren Beispieltext für Einstiegspunkte.

### 2. „Known debt"-Hinweise sind keine Scope-Einladung (Quelle: Doc 2, Punkt 1.2, generalisiert)

**Befund:** Repo-spezifisch (dort ging es um eine konkrete Changelog-Zeile), aber das
zugrundeliegende Muster ist generisch: TODO-Kommentare/„bei Gelegenheit nachziehen"-Vermerke im
Code verleiten dazu, sie bei unrelated Tasks als Bonus mitzuerledigen — Mandat 1/2 sagen das
nicht explizit für diesen Fall.

**Änderung:** Ein Satz an Mandat 1 angehängt.

### 3. Archiv-Dateien: Kontext-Hygiene statt Verbot (Quelle: Doc 1, Punkt 5, abgeschwächt)

**Befund:** Das vorgeschlagene harte Leseverbot für `*_ARCHIVE.md` widerspricht dem Zweck dieser
Dateien (Historie soll auffindbar bleiben). Der Kern des Punkts — Token-Bloat durch
prophylaktisches Volladen wachsender Archive — ist aber real.

**Änderung:** Ergänzung in Abschnitt 3 als Hinweis, kein Verbot.

### 4. Merge-Konflikt-Verfahren konkretisieren (Quelle: Doc 1, Punkt 5/Sektion 4)

**Befund:** „Immer durch Zusammenführen lösen" nennt kein Verfahren. Die Ergänzung (Marker
entfernen, chronologisch zusammenführen, dann erst stagen) ist Standard-Git-Mechanik, aber
explizit hilfreich, weil sie in der aktuellen Formulierung fehlt.

**Änderung:** Bestehender Satz in Abschnitt 4 um das Verfahren ergänzt.

### 5. Release-Checkliste: Abbruchpfad bei rotem Schritt 1 (Quelle: Doc 1, Punkt 5)

**Befund:** Echte Lücke — die Checkliste sagt nicht, was bei fehlgeschlagenem Test/Typecheck/Lint
passiert. Ohne explizite Abbruchbedingung besteht das Risiko, dass ein Agent versucht, den
Release trotzdem durchzuziehen.

**Änderung:** Schritt 1 der Release-Checkliste um Abbruchbedingung ergänzt.

### 6. Generische Git-Sicherheitsregel für fremde/vendorte Pfade (Quelle: Doc 2, Punkt 1.1, generalisiert)

**Befund:** Repo-spezifisch ging es um das `oe5ith-ci`-Submodul (aktuell laut `git status` sogar
tatsächlich als geändert markiert — kein Hypothetisches). Das zugrundeliegende Risiko
(versehentliches Mit-Commiten von Submodul-Pointer-/Vendor-Änderungen) ist aber generisch für
jedes Repo mit Submodulen/Vendor-Verzeichnissen, nicht an dieses Projekt gebunden.

**Änderung:** Neue Zeile in Abschnitt 4.

### 7. Widerspruch Mandat 5 vs. Abschnitt 5 auflösen (Quelle: Doc 1, Punkt 6)

**Befund — verifizierter Widerspruch:** Mandat 5 verlangt, fehlende Verifikationsbefehle im
repo-spezifischen Einstiegspunkt nachzutragen und erklärt das explizit zu „Teil der Aufgabe"
(impliziert Direkt-Edit). Abschnitt 5 verlangt für Änderungen „am … repo-spezifischen
Einstiegspunkt" pauschal den Proposal-Zyklus. Beides gleichzeitig ist nicht erfüllbar.

**Änderung:** Abschnitt 5 bekommt einen „Geltungsbereich"-Absatz, der inhaltliche Regeländerungen
(Proposal-Pflicht) von rein technischem Nachtragen bereits andernorts vorgeschriebener Angaben
(direkt erledigen) trennt — mit Tie-Breaker „im Zweifel Proposal-Zyklus", analog zum bestehenden
TODO/Roadmap-Tie-Breaker.

## Abgelehnte Punkte (mit Begründung)

| Punkt | Quelle | Begründung Ablehnung |
|---|---|---|
| Regel 3 zu „bei Unklarheit abbrechen + Git-Rollback" verschärfen | Doc 1, Punkt 2 | Kein echter Widerspruch zu Regel 1 (andere Ebene: Scope-Grenze vs. Fallback-Verfahren). Steht zudem im direkten Widerspruch zu einer bereits bewusst getroffenen Entscheidung (Proposal-Review 2026-07-03, Punkt 1, „Hoch", explizit übernommen) — Rückfrage vor Umsetzung entfällt hier laut eigenem Verfahren nicht, aber inhaltlich keine neue Information gegenüber der Erstdiskussion. |
| Standards-URLs nicht scrapen | Doc 1, Punkt 4 | Spekulatives, in diesem Projekt nicht beobachtetes Risiko. Kein Beleg, dass ein Agent das tatsächlich tut. |
| Ton-Regel (Mandat 6) umformulieren | Doc 1, Punkt 3 | Marginaler Klarheitsgewinn, Vorschlag selbst eher ausschweifender als das Original. Nicht übernommen. |
| Repo-spezifische Datei-Liste im Release-Commit (`version.ts`, `CHANGELOG.md`, …) | Doc 2, Punkt 1.3 | Repo-spezifisch (konkrete Dateinamen), gehört falls gewünscht in `CLAUDE.md`, nicht hierher. Generische Regel „nie `git add -A`" deckt das Prinzip bereits ab. |
| XML-„system_directive"/Emoji-Boot-Banner-Formulierungen | Doc 2, „Bootloader"-Varianten | Stilbruch zum sachlichen Ton der restlichen Datei (vgl. Mandat 6). Punkt 1 oben übernimmt die inhaltliche Absicht (explizite Leseanweisung) in nüchterner Formulierung statt der dramatisierten Varianten. |

## Konkrete Textänderungen

**1. Intro, nach dem bestehenden Absatz „Wie diese Datei eingebunden wird" einfügen:**

```markdown
**Wichtig für den Agenten:** Ein Verweis auf diese Datei lädt ihren Inhalt nicht automatisch in
den Kontext — nur der Einstiegspunkt selbst (z.B. `CLAUDE.md`) wird von manchen Tools automatisch
injiziert, diese Datei i. d. R. nicht. Jeder referenzierende Einstiegspunkt sollte deshalb eine
explizite Leseanweisung enthalten (Beispieltext zum Übernehmen):

> Bevor du nach den hier ergänzten, repo-spezifischen Angaben handelst: lies zuerst
> `AGENT_INSTRUCTIONS.md` vollständig — die dortigen Mandate sind verbindlich und werden hier
> nicht wiederholt.
```

**2. Mandat 1, Satz anhängen:**

```markdown
   Im Code vorgefundene Altlasten-Hinweise („Known debt", TODO-Kommentare, „bei Gelegenheit
   nachziehen") sind keine implizite Einladung, das jetzt mitzuerledigen — Mandat 2 gilt auch
   für sie.
```

**3. Abschnitt 3, am Ende ergänzen:**

```markdown
**Kontext-Hygiene:** `*_ARCHIVE.md`-Dateien sind Historie, kein Nachschlagewerk für die laufende
Aufgabe — nicht prophylaktisch komplett laden, sondern nur gezielt lesen, wenn die Aufgabe
selbst historischen Kontext braucht (z.B. „warum wurde X damals so entschieden").
```

**4. Abschnitt 4, bestehenden Satz ersetzen:**

Alt: „Merge-Konflikte in `CHANGELOG.md` werden **immer durch Zusammenführen beider Blöcke**
gelöst, nie durch Verwerfen einer Seite."

Neu:
```markdown
Merge-Konflikte in `CHANGELOG.md` werden **immer durch Zusammenführen beider Blöcke** gelöst,
nie durch Verwerfen einer Seite: Konfliktmarker (`<<<<<<<`, `=======`, `>>>>>>>`) entfernen,
betroffene Journal-Einträge beider Seiten chronologisch zusammenführen, danach erst stagen.
```

**5. Abschnitt 4, Release-Checkliste Schritt 1 ersetzen:**

Alt: „(1) Tests/Typecheck/Lint grün →"

Neu: „(1) Tests/Typecheck/Lint ausführen — schlägt das fehl: Release abbrechen, Fehler als
`TODO.md`-Eintrag festhalten, nicht durchdrücken →"

**6. Abschnitt 4, neue Zeile ergänzen (vor „Scratch/Hygiene"):**

```markdown
- **Fremde/vendorte Pfade (Submodule, Vendor-Verzeichnisse):** Notizen oder Dateien innerhalb
  eines Pfads, der nicht diesem Repo gehört, dürfen nie versehentlich mit committet werden.
  Explizites Stagen (siehe oben) reicht hier nicht als alleinige Absicherung — vor jedem Commit
  gezielt `git status` auf genau diesen Pfad prüfen, wenn dort geschrieben wurde.
```

**7. Abschnitt 5, nach dem ersten Absatz einfügen:**

```markdown
**Geltungsbereich:** Der Zyklus gilt für inhaltliche Regeländerungen (neue/geänderte Mandate,
Standards, Prozesse) — sowohl hier als auch im repo-spezifischen Einstiegspunkt. Er gilt
**nicht** für rein technisches Nachtragen bereits an anderer Stelle vorgeschriebener Angaben
(z.B. einen laut Mandat 5 fehlenden Verifikationsbefehl ergänzen, einen toten Link korrigieren) —
das direkt erledigen. Im Zweifel (neue Regel oder nur fehlende Angabe?): gilt der Proposal-Zyklus.
```
