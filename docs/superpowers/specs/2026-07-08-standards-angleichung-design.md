# Standards-Angleichung: PSR-12, OWASP Top 10, OpenAPI — Design

**Kontext:** [TODO.md](../../../TODO.md) → Abschnitt "Standards-Angleichung" listet drei offene
Punkte, die in [CLAUDE.md](../../../CLAUDE.md#standards-referenzen) referenziert, aber bisher nicht
umgesetzt/geprüft sind: PSR-12 für `api/*.php`, OWASP Top 10 Self-Check, OpenAPI-Spec für die
API-Endpoints. Der User möchte alle drei Punkte in einem Aufschwung angehen und **automatisierbar/
wiederholbar** machen statt nur als einmaligen manuellen Report.

**Vorab-Fund (bereits behoben, außerhalb dieses Plans):** Bei der Recherche wurde entdeckt, dass
`api/config.php` (getrackt) hardcoded echte Secrets (`DB_PASS`, `ORS_API_KEY`) als Fallback-Defaults
enthielt — behoben in Commit `87accec` (Secrets kommen jetzt zwingend aus `config.local.php`,
fail-closed mit HTTP 500 wenn nicht gesetzt). Repo ist privat, keine Rotation der Credentials
gewünscht (User-Entscheidung).

**Weitere Recherche-Funde (fließen in die Umsetzung ein):**
- `stations.php` baut SQL mit `$table`/`$filter_col` (aus Ternary von `$type`, also aus geschlossenem
  Set) und `$lon`/`$lat` (vor Interpolation `(float)`-gecastet) per String-Interpolation zusammen.
  Aktuell **nicht injizierbar** (kein direkter User-String im Query), aber der Stil (rohe
  Interpolation statt `pg_query_params`) ist ein Risk-Pattern — wird im OWASP-Audit als
  „Defense-in-Depth"-Empfehlung dokumentiert, nicht als akute Lücke.
- `region_stations.php` nutzt bereits korrekt `pg_query_params` (Positivbeispiel).
- `.gitignore` hat noch kein `vendor/`-Pattern — wird für Composer ergänzt.

## 1. PSR-12 Tooling

**Setup:**
- Composer wird lokal installiert (System-Tool, kein Repo-Artefakt)
- `composer.json` (neu, Repo-Root) — `squizlabs/php_codesniffer` als einzige `require-dev`
- `phpcs.xml` (Repo-Root) — Ruleset `PSR12`, `<file>api</file>` als Scope, `router.log` und
  `config.local.php*` explizit ausgeschlossen (`<exclude-pattern>`)
- `composer.lock` wird committed; `vendor/` kommt neu ins `.gitignore`
- Ausführung: `composer install` (einmalig) → `composer run lint` (Alias für `vendor/bin/phpcs`)

**Vorgehen bei Funden:**
- `composer run lint` läuft, Report wird gesichtet
- Verstöße werden **einzeln manuell durchgesehen und gezielt gefixt** (kein `phpcbf`-Blind-Autofix
  — Begründung: API-Endpoints enthalten Business-Logik, Auto-Fixer könnten Whitespace-Änderungen
  mit unbeabsichtigten Nebenwirkungen einführen, auch wenn das bei PSR-12 selten ist)
- Jeder Fix-Batch wird mit `php -l` (Syntax-Check) und einem manuellen Diff-Review verifiziert
  (kein automatisierter PHP-Test-Runner im Projekt vorhanden — Verifikation ist Syntax-Check +
  Review, nicht Test-Suite)

## 2. OWASP Top 10 — Hybrid-Ansatz

**`scripts/security-audit.sh`** (neu) — automatisierte Checks, exit 0/1:
1. Grep nach Secret-Pattern-Kandidaten in `api/*.php` (String-Literale, die wie Passwörter/API-Keys
   aussehen — z.B. lange alphanumerische Strings nach `define(` außerhalb von `config.local.php`)
2. Prüft, dass `config.local.php` im `.gitignore` gelistet ist
3. Prüft, dass `config.local.php` selbst **nicht** von `git ls-files` als getrackt gemeldet wird
4. Grep nach SQL-String-Interpolation-Mustern (`pg_query($db, "..." . $var` oder `"...{$var}..."`
   in SQL-Kontext) als Injection-Hinweis-Heuristik — informativ, kein Hard-Fail (False-Positives
   möglich, siehe `stations.php`-Fund oben)
5. Prüft, dass `DB_USER` im Code als `web_api_user` referenziert wird (Read-only-Konvention)

**`docs/security/owasp-top10-checklist.md`** (neu) — alle 10 OWASP-2021-Kategorien, pro Kategorie:
- Status (✅ adressiert / ⚠️ teilweise / ❌ offen — bzw. „N/A" wo nicht zutreffend)
- Kurze Begründung mit Verweis auf konkrete Datei/Zeile wo relevant
- Datum der letzten manuellen Bewertung
- Bei automatisierbaren Kategorien (A02 Cryptographic Failures teilweise, A03 Injection teilweise):
  Verweis auf `security-audit.sh`-Check
- Bei nicht automatisierbaren Kategorien (A01 Broken Access Control, A04 Insecure Design, A08
  Software/Data Integrity Failures, A09 Logging/Monitoring, A10 SSRF): reines manuelles Urteil

**Ausführung:** Kein CI vorhanden — Script wird manuell bei Bedarf mit `bash scripts/security-audit.sh`
laufen gelassen, ist aber wiederholbar/scriptbar für eine spätere CI-Anbindung.

## 3. OpenAPI-Spec

**`docs/openapi.yaml`** (neu) — OpenAPI 3.x, handschriftlich aus Ist-Code dokumentiert:
- Alle 11 Endpoints außer `router.php` (kein echter Endpoint, sondern Dev-Server-Routing-Helper) und
  `config.php`/`config.local.php*` (keine Endpoints)
- `test.php` und `diag.php` werden als `x-internal: true` markiert (Debug/Diagnose, nicht für
  Frontend-Konsum gedacht) statt komplett wegzulassen — Transparenz über deren Existenz
- Pro Endpoint: Pfad, Methode(n), Query-Parameter (mit required/optional), Response-Schema
  (Success + Error-Fälle wo im Code ersichtlich, z.B. 400/500 mit `{"error": "..."}`)

**Validierung:** `@apidevtools/swagger-parser` als npm devDependency, `npm run validate:openapi`
(neues package.json-Script) prüft nur **Syntax-Gültigkeit** der YAML gegen das OpenAPI-3.x-Schema —
kein Live-Abgleich gegen den tatsächlichen Code (das wäre ein separates, größeres Vorhaben, z.B.
Contract-Testing — bewusst außerhalb dieses Scopes, ggf. als eigener ROADMAP-Punkt).

## Out of Scope (bewusst nicht Teil dieses Plans)

- Rotation der DB/API-Credentials (User-Entscheidung, Repo ist privat)
- CI-Pipeline-Integration der neuen Scripts (es gibt noch keine CI in diesem Projekt)
- Automatischer Abgleich OpenAPI-Spec ↔ tatsächlicher Code (Contract-Testing)
- `phpcbf`-Autofix (manuelles Review stattdessen)
- Vollständiges Security-Scanning-Tool (z.B. dedizierter PHP-Security-Linter) — Hybrid-Script reicht
  für den aktuellen Umfang (13 kleine PHP-Dateien)

## Testing / Verifikation

- PSR-12: `composer run lint` muss nach Fixes clean durchlaufen; `php -l` auf jeder geänderten Datei
- OWASP-Script: manueller Testlauf gegen den aktuellen Code-Stand, muss die bereits behobene
  Secret-Lücke (falls künstlich wieder eingefügt) erkennen — als Ad-hoc-Verifikation, kein
  formaler Test (Bash-Script, kein Unit-Test-Framework dafür vorhanden)
- OpenAPI: `npm run validate:openapi` muss grün sein; zusätzlich `npx tsc --noEmit && npm test`
  (Standard-Repo-Verifikation) nach jeder Änderung an `package.json`
