# Agent Instructions (generic, portable)

Verbindliche, **repo-unabhängige** Arbeitsweise für KI-Coding-Agenten. Diese Datei ist bewusst
so geschrieben, dass sie 1:1 in ein anderes Repo kopiert werden kann — sie enthält keine
Datei-/Komponentennamen, Domänen-Spezifika oder Architekturdetails eines bestimmten Projekts.

**Wie diese Datei eingebunden wird:** Tool-spezifische Einstiegspunkte, die von Coding-Agenten
automatisch geladen werden (`CLAUDE.md` für Claude Code, `GEMINI.md` für Gemini CLI, `AGENTS.md`
als aufkommender generischer Standard, …), sollen die Regeln hier **referenzieren statt
duplizieren** und nur noch das jeweils Repo-Spezifische ergänzen (Architektur, Commands,
Domänen-Standards, konkrete Dateipfade). Wird eine Regel hier geändert, zieht das automatisch
alle referenzierenden Einstiegspunkte nach — es gibt nur eine Quelle der Wahrheit.

**Wichtig für den Agenten:** Ein Verweis auf diese Datei lädt ihren Inhalt nicht automatisch in
den Kontext — nur der Einstiegspunkt selbst (z.B. `CLAUDE.md`) wird von manchen Tools automatisch
injiziert, diese Datei i. d. R. nicht. Jeder referenzierende Einstiegspunkt sollte deshalb eine
explizite Leseanweisung enthalten (Beispieltext zum Übernehmen):

> Bevor du nach den hier ergänzten, repo-spezifischen Angaben handelst: lies zuerst
> `AGENT_INSTRUCTIONS.md` vollständig — die dortigen Mandate sind verbindlich und werden hier
> nicht wiederholt.

## 1. Core Mandates

1. **Keine eigenständige Interpretation:** Aufgaben exakt so ausführen, wie gestellt. Scope nicht
   ungefragt erweitern, nicht ungefragt refactorn. Im Code vorgefundene Altlasten-Hinweise
   („Known debt", TODO-Kommentare, „bei Gelegenheit nachziehen") sind keine implizite Einladung,
   das jetzt mitzuerledigen — Mandat 2 gilt auch für sie.
2. **Out-of-Scope-Funde dokumentieren, nicht fixen:** Werden während einer Aufgabe Bugs oder
   Cleanup-Bedarf außerhalb des Scopes entdeckt, werden diese als `TODO.md`-Eintrag festgehalten
   (mit `Datei:Zeile`), nicht nebenbei mitgefixt.
3. **Bei Unklarheit nachfragen:** Ist eine Anforderung mehrdeutig, nachfragen statt raten. Ist
   Nachfragen nicht möglich (non-interaktiver Lauf, CI, Background-Task): Betrifft die
   Unklarheit eine schwer reversible oder folgenreiche Aktion (Löschen, Force-Push,
   Schema-/Datenmigration, sicherheitsrelevantes Verhalten, Deploy/Publish) → Lauf abbrechen,
   Unklarheit als `TODO.md`-Eintrag festhalten, nicht raten. Andernfalls die minimalinvasivste
   Interpretation wählen und die getroffene Annahme explizit im Ergebnis/Commit dokumentieren.
4. **Erst verstehen, dann ändern:** Vor einem Fix Abhängigkeiten kartieren und den Bug
   reproduzieren; Fixes bekommen Tests.
5. **Erschöpfend verifizieren:** Verifikation vor Abschluss ist Pflicht — die repo-eigenen
   Build-/Test-/Lint-Befehle laufen lassen und das Ergebnis prüfen, nicht nur behaupten. Diese
   Befehle **müssen** im repo-spezifischen Einstiegspunkt dokumentiert sein; fehlen sie dort,
   ist das Nachtragen Teil der Aufgabe.
6. **Professioneller Ton**, klare/strategische Status-Updates.

## 2. Standards-Referenzen (generisch)

Wo Konventionen unten etwas vorschreiben, sind das — wo möglich — keine Ad-hoc-Regeln, sondern
bewusste Anwendungen etablierter, allgemein bekannter Standards. Jede Zeile nennt die Quelle und
wofür sie generisch gilt. Repo-spezifische Anwendung (konkrete Dateien, Abweichungen) gehört in
den referenzierenden Einstiegspunkt (z.B. `CLAUDE.md`), nicht hierher.

| Standard | Quelle | Wofür generisch |
|---|---|---|
| Semantic Versioning 2.0.0 | https://semver.org/ | Versionsnummer eines Projekts (`MAJOR.MINOR.PATCH`) |
| Keep a Changelog 1.1.0 | https://keepachangelog.com/ | Struktur & Kategorien eines `CHANGELOG.md` |
| Conventional Commits 1.0.0 | https://www.conventionalcommits.org/en/v1.0.0/ | Commit-Prefixe (`feat(scope):`, `fix(scope):`, `refactor(scope):`, `test(scope):`, `chore:`) |
| EditorConfig | https://editorconfig.org/ | `.editorconfig` — Einrückung, Zeilenende, Charset, finale Newline je Dateityp |
| Ökosystem-Style-Standard | z.B. PEP 8 (https://peps.python.org/pep-0008/), PSR-12 (https://www.php-fig.org/psr/psr-12/), rustfmt, gofmt, Prettier | Code-Stil: es gilt der etablierte Formatter/Style-Standard der jeweiligen Sprache; Abweichungen sind im repo-spezifischen Einstiegspunkt zu dokumentieren |
| WCAG 2.1/2.2 (Ziel: Stufe AA) | https://www.w3.org/WAI/WCAG22/quickref/ | Ziel-Mindeststandard für UI-Zugänglichkeit |
| ARIA Authoring Practices Guide | https://www.w3.org/WAI/ARIA/apg/ | Pattern-Referenz für interaktive Widgets (Menüs, Modals, Listboxen, Kontextmenüs) |
| OWASP Top 10 | https://owasp.org/www-project-top-ten/ | Begründungsrahmen für Security-Grundregeln (Secrets-Handling, Rechteminimierung, Input-Validierung) |
| The Twelve-Factor App — Faktor III „Config" | https://12factor.net/config | Begründung für „Secrets/Config nie hardcoded/committed, nur in gitignorten lokalen Config-Dateien" |
| BEM (Block Element Modifier) | https://getbem.com/ | CSS-Klassennamen-Konvention (Block__Element--Modifier); konkrete Anwendung kann an ein projekteigenes Design-System-Artefakt delegiert sein — dort nachsehen, siehe repo-spezifischer Einstiegspunkt |

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
Submodul. Hier gilt: BEM als Zeile in die generische Tabelle aufnehmen (siehe oben), aber der
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

## 3. TODO vs. Roadmap

Zwei getrennte Dateipaare unter `docs/` (nicht am Repo-Root — hält den Root aufgeräumt), jedes für
sich lesbar und actionable (Deep-Dive-Docs wie Design-Specs bleiben optionaler Kontext, nie
alleinige Quelle für „was zu tun ist"):

- **`TODO.md` / `TODO_ARCHIVE.md`** — Arbeiten im **aktuellen Scope**: Bugfixes, Cleanup,
  Erweiterungen an bereits bestehendem Code/Features.
- **`ROADMAP.md` / `ROADMAP_ARCHIVE.md`** — **neue** Features/Funktionen, die es im Code noch
  nicht gibt (keine Erweiterung von etwas Bestehendem).

Neue Einträge so schreiben, dass ein anderer Agent ohne weiteren Kontext handeln kann: was/wo
(`Datei:Zeile` falls bekannt) und warum, falls nicht offensichtlich. Erledigte Punkte wandern ins
jeweilige `*_ARCHIVE.md` (nicht löschen — Historie bleibt erhalten). Löst ein umgesetzter
Roadmap-Punkt Folge-Cleanup aus, wird das ein neuer `TODO.md`-Eintrag, nicht am archivierten
Roadmap-Punkt hängend. Ist die Zuordnung strittig (Erweiterung vs. neues Feature), gilt:
**im Zweifel `TODO.md`**.

**Kontext-Hygiene:** `*_ARCHIVE.md`-Dateien sind Historie, kein Nachschlagewerk für die laufende
Aufgabe — nicht prophylaktisch komplett laden, sondern nur gezielt lesen, wenn die Aufgabe
selbst historischen Kontext braucht (z.B. „warum wurde X damals so entschieden").

## 4. Releases, Versionierung & Git

Basis-Standards: SemVer + Keep a Changelog + Conventional Commits (Quellen siehe oben).

- **Eine zentrale Versionskonstante** (z.B. `version.ts`, `package.json`) ist die Single Source of
  Truth für die angezeigte/veröffentlichte Version.
- **`CHANGELOG.md`** bekommt bei jeder Änderung einen Eintrag mit Datum **und Uhrzeit**
  (`## [Unreleased] - YYYY-MM-DD HH:mm`), kategorisiert nach Keep-a-Changelog-Schema. Beim Release
  werden alle Journal-Blöcke seit dem letzten Tag zu einer `## [X.Y.Z] - <Datum>`-Überschrift
  konsolidiert (Uhrzeit entfällt dann). *Datum/Uhrzeit am `[Unreleased]`-Block ist eine bewusste
  Eigenregel — Keep a Changelog kennt nur einen einzelnen, undatierten `[Unreleased]`-Block; das
  Journal-Format macht parallele Änderungen nachvollziehbar.* Merge-Konflikte in `CHANGELOG.md`
  werden **immer durch Zusammenführen beider Blöcke** gelöst, nie durch Verwerfen einer Seite:
  Konfliktmarker (`<<<<<<<`, `=======`, `>>>>>>>`) entfernen, betroffene Journal-Einträge beider
  Seiten chronologisch zusammenführen, danach erst stagen.
- **Existiert zusätzlich ein user-facing Changelog** (z.B. ein In-App-Modal, eine Landingpage-
  Sektion), ist das eine **kuratierte, separat gepflegte** Sicht — nicht aus `CHANGELOG.md`
  generiert. Es muss bei jedem Release **ebenfalls** aktualisiert werden; sonst driftet es
  unbemerkt auseinander.
- **Versions-Bump im Release-Commit selbst**, nicht davor. Kein verpflichtender `-dev`/`-rc`-Suffix
  zwischen Releases (nur für einen expliziten Pre-Release). Die nächste Version deckt **alle**
  unveröffentlichten Commits seit dem letzten Tag ab: **patch** = nur Bugfixes, **minor** =
  mindestens ein neues user-facing Feature seit dem letzten Tag, **major** = Breaking Changes.
- **Release-Trigger:** Die Release-Checkliste (Punkte 2–7 unten) läuft nicht automatisch nach
  jedem abgeschlossenen TODO-/ROADMAP-Punkt. Änderungen sammeln sich wie gehabt als
  `[Unreleased]`-Journal-Blöcke in `CHANGELOG.md`; nach Abschluss eines größeren, in sich
  geschlossenen Arbeitsblocks (z.B. ein kompletter Sammeltask, mehrere thematisch verwandte
  Punkte) schlägt der Agent aktiv ein Release vor, ausgeführt wird es erst nach Bestätigung.
  **Ausnahme:** akute oder sicherheitsrelevante Fixes können weiterhin sofort einzeln released
  werden, wenn sie nicht bis zum nächsten Batch warten sollten.
- **Commits & Tags:** Conventional-Commits-Prefixe; Tags **annotiert**, Format `vX.Y.Z`, auf dem
  Release-Commit. Dateien **immer explizit** stagen, nie `git add -A` — das gilt generell, nicht
  nur bei Releases.
- **Release-Checkliste (generisch):** (1) Tests/Typecheck/Lint ausführen — schlägt das fehl:
  Release abbrechen, Fehler als `TODO.md`-Eintrag festhalten, nicht durchdrücken → (2)
  Versionskonstante bumpen → (3) `CHANGELOG.md` konsolidieren → (4) user-facing Changelog
  nachziehen (falls vorhanden) → (5) Build → (6) Release-Commit + annotierter Tag + Push →
  (7) Deploy.
- **Fremde/vendorte Pfade (Submodule, Vendor-Verzeichnisse):** Notizen oder Dateien innerhalb
  eines Pfads, der nicht diesem Repo gehört, dürfen nie versehentlich mit committet werden.
  Explizites Stagen (siehe oben) reicht hier nicht als alleinige Absicherung — vor jedem Commit
  gezielt `git status` auf genau diesen Pfad prüfen, wenn dort geschrieben wurde.
- **Scratch/Hygiene:** Wegwerfskripte, Probes und Notizen nicht committen — gitignorter
  `scratch/`-Ordner oder `*.local.*`-Namenskonvention statt versehentlich versionierter
  Ad-hoc-Dateien.

## 5. Meta-Dokument-Änderungen (Proposals)

Änderungen an Regel-/Prozessdokumenten selbst (diese Datei, der repo-spezifische Einstiegspunkt,
o.ä.) laufen über einen eigenen Draft-Review-Merge-Zyklus statt direkt im Live-Dokument diskutiert
zu werden — Ziel: Diskussion und Ergebnis bleiben nachvollziehbar, das Live-Dokument bleibt
Endzustand ohne Revisionsrauschen.

**Geltungsbereich:** Der Zyklus gilt für inhaltliche Regeländerungen (neue/geänderte Mandate,
Standards, Prozesse) — sowohl hier als auch im repo-spezifischen Einstiegspunkt. Er gilt
**nicht** für rein technisches Nachtragen bereits an anderer Stelle vorgeschriebener Angaben
(z.B. einen laut Mandat 5 fehlenden Verifikationsbefehl ergänzen, einen toten Link korrigieren) —
das direkt erledigen. Im Zweifel (neue Regel oder nur fehlende Angabe?): gilt der Proposal-Zyklus.

- **Ablage:** `docs/proposals/` (Repo-Root-Ebene, parallel zu evtl. vorhandenen
  Feature-Plan-/Spec-Ordnern — Proposals sind Meta-Dokument-Änderungen, keine Feature-Artefakte).
- **Naming:** `YYYY-MM-DD-<slug>.md` für den Entwurf, `YYYY-MM-DD-<slug>-review.md` für die
  zugehörige Review-Durchsprache (Tabelle: Punkt/Priorität/Status).
- **Harte Grenze:** Nur Punkte, die in der Review-Tabelle explizit besprochen und mit Status
  versehen sind, werden ins Live-Dokument übernommen. Keine stillschweigenden Zusatzänderungen
  beim Merge — sonst entstehen nicht dokumentierte, nicht nachvollziehbare Artefakte im
  Regelwerk.
- **Nach dem Merge:** Entwurf + Review wandern nach `docs/proposals/archive/` (nicht löschen —
  Historie bleibt erhalten), Review-Tabelle wird vorher mit dem finalen Status pro Punkt
  aktualisiert.
