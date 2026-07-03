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

## 1. Core Mandates

1. **Keine eigenständige Interpretation:** Aufgaben exakt so ausführen, wie gestellt. Scope nicht
   ungefragt erweitern, nicht ungefragt refactorn.
2. **Out-of-Scope-Funde dokumentieren, nicht fixen:** Werden während einer Aufgabe Bugs oder
   Cleanup-Bedarf außerhalb des Scopes entdeckt, werden diese als `TODO.md`-Eintrag festgehalten
   (mit `Datei:Zeile`), nicht nebenbei mitgefixt.
3. **Bei Unklarheit nachfragen:** Ist eine Anforderung mehrdeutig, nachfragen statt raten. Ist
   Nachfragen nicht möglich (non-interaktiver Lauf, CI, Background-Task), die minimalinvasivste
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

**Pflege:** Vor Einführung einer neuen Sprache/eines neuen Formats/Tools prüfen, ob ein
etablierter Community-Standard existiert. Wenn ja: hier (falls generisch) oder im
repo-spezifischen Einstiegspunkt (falls domänen-/repo-gebunden) mit Quelle eintragen, statt eine
eigene Ad-hoc-Regel zu erfinden. Wenn nein: explizit vermerken, dass es bewusste Eigenregel ist.

## 3. TODO vs. Roadmap

Zwei getrennte Dateipaare am Repo-Root, jedes für sich lesbar und actionable (Deep-Dive-Docs wie
Design-Specs bleiben optionaler Kontext, nie alleinige Quelle für „was zu tun ist"):

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
  werden **immer durch Zusammenführen beider Blöcke** gelöst, nie durch Verwerfen einer Seite.
- **Existiert zusätzlich ein user-facing Changelog** (z.B. ein In-App-Modal, eine Landingpage-
  Sektion), ist das eine **kuratierte, separat gepflegte** Sicht — nicht aus `CHANGELOG.md`
  generiert. Es muss bei jedem Release **ebenfalls** aktualisiert werden; sonst driftet es
  unbemerkt auseinander.
- **Versions-Bump im Release-Commit selbst**, nicht davor. Kein verpflichtender `-dev`/`-rc`-Suffix
  zwischen Releases (nur für einen expliziten Pre-Release). Die nächste Version deckt **alle**
  unveröffentlichten Commits seit dem letzten Tag ab: **patch** = nur Bugfixes, **minor** =
  mindestens ein neues user-facing Feature seit dem letzten Tag, **major** = Breaking Changes.
- **Commits & Tags:** Conventional-Commits-Prefixe; Tags **annotiert**, Format `vX.Y.Z`, auf dem
  Release-Commit. Dateien **immer explizit** stagen, nie `git add -A` — das gilt generell, nicht
  nur bei Releases.
- **Release-Checkliste (generisch):** (1) Tests/Typecheck/Lint grün → (2) Versionskonstante bumpen
  → (3) `CHANGELOG.md` konsolidieren → (4) user-facing Changelog nachziehen (falls vorhanden) →
  (5) Build → (6) Release-Commit + annotierter Tag + Push → (7) Deploy.
- **Scratch/Hygiene:** Wegwerfskripte, Probes und Notizen nicht committen — gitignorter
  `scratch/`-Ordner oder `*.local.*`-Namenskonvention statt versehentlich versionierter
  Ad-hoc-Dateien.
