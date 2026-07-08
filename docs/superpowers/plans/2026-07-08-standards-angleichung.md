# Standards-Angleichung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Umsetzung von PSR-12-Tooling, einem hybriden OWASP-Top-10-Audit und einer OpenAPI-Spec
für `api/*.php`, gemäß [docs/superpowers/specs/2026-07-08-standards-angleichung-design.md](../specs/2026-07-08-standards-angleichung-design.md).

**Architecture:**
- PSR-12: Composer + PHP_CodeSniffer als Dev-Tooling, `phpcs.xml`-Ruleset, manuelle Fix-Runde
- OWASP: Hybrid — `scripts/security-audit.sh` (automatisierbare Checks) + `docs/security/owasp-top10-checklist.md` (alle 10 Kategorien, inkl. manueller Bewertung)
- OpenAPI: handschriftliche `docs/openapi.yaml` + `npm run validate:openapi` (Syntax-Check via `@apidevtools/swagger-parser`)

**Tech Stack:** PHP 8.4, Composer, PHP_CodeSniffer (`squizlabs/php_codesniffer`), Bash, OpenAPI 3.x, `@apidevtools/swagger-parser` (npm)

## Global Constraints

- Run `npx tsc --noEmit && npm test` nach jeder Änderung an `package.json`
- PHP-Syntax-Check (`php -l`) nach jeder Änderung an `api/*.php`
- Kein `phpcbf`-Autofix — PSR-12-Verstöße werden einzeln manuell gefixt und reviewed
- `vendor/` kommt ins `.gitignore`, `composer.lock` wird committed
- Secrets bleiben ausschließlich in `api/config.local.php` (gitignored) — siehe bereits erfolgter
  Fix in Commit `87accec`
- CHANGELOG.md wird am Ende mit einem konsolidierten Eintrag aktualisiert (nicht pro Task)
- Deutsche Kommentare/Doku, wie im übrigen Repo

---

## File Structure

**Neu:**
- `composer.json` — Dev-Dependency `squizlabs/php_codesniffer`
- `composer.lock` — committed für reproduzierbare Installation
- `phpcs.xml` — PSR-12-Ruleset, Scope `api/`
- `scripts/security-audit.sh` — automatisierte OWASP-Teilchecks
- `docs/security/owasp-top10-checklist.md` — vollständige OWASP-Top-10-Bewertung
- `docs/openapi.yaml` — OpenAPI-3.x-Spec aller Endpoints

**Modifiziert:**
- `.gitignore` — `vendor/`-Eintrag
- `package.json` — `@apidevtools/swagger-parser` als devDependency, `validate:openapi`-Script
- `api/*.php` — PSR-12-Fixes (Umfang hängt vom Task-1-Report ab, siehe Task 2)
- `TODO.md` — neuer Eintrag für den `diag.php`-Info-Disclosure-Fund
- `CHANGELOG.md` — ein konsolidierter Eintrag am Ende (Task 7)

---

## Task 1: PSR-12 Tooling Setup + Baseline-Report

**Files:**
- Create: `composer.json`
- Create: `phpcs.xml`
- Modify: `.gitignore`
- Create (nicht committed, nur lokal zur Sichtung): `/tmp/phpcs-baseline-report.txt`

**Interfaces:**
- Produces: `composer run lint` — Alias-Command, der `vendor/bin/phpcs` mit `phpcs.xml`-Config ausführt

- [ ] **Step 1: Composer installieren (lokal, kein Repo-Artefakt)**

```bash
which composer || (curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer)
composer --version
```

Expected: Composer-Version wird ausgegeben (z.B. `Composer version 2.x.x`)

- [ ] **Step 2: composer.json erstellen**

Erstelle `composer.json` im Repo-Root:

```json
{
    "name": "oe5ith/website-v3-api",
    "description": "PHP API backend for OE5ITH GeoPortal — dev tooling only",
    "type": "project",
    "require-dev": {
        "squizlabs/php_codesniffer": "^3.9"
    },
    "scripts": {
        "lint": "phpcs",
        "lint-fix": "phpcbf"
    },
    "config": {
        "sort-packages": true
    }
}
```

- [ ] **Step 3: phpcs.xml erstellen**

Erstelle `phpcs.xml` im Repo-Root:

```xml
<?xml version="1.0"?>
<ruleset name="OE5ITH-API">
    <description>PSR-12 Ruleset für api/*.php — OE5ITH GeoPortal Backend</description>

    <rule ref="PSR12"/>

    <file>api</file>

    <exclude-pattern>api/router.log</exclude-pattern>
    <exclude-pattern>api/config.local.php</exclude-pattern>
    <exclude-pattern>api/config.local.php.example</exclude-pattern>

    <arg name="colors"/>
    <arg value="p"/>
</ruleset>
```

- [ ] **Step 4: .gitignore um vendor/ ergänzen**

In `.gitignore`, nach der Zeile `node_modules` (oder in der Nähe anderer Dependency-Verzeichnisse), füge hinzu:

```
vendor
```

- [ ] **Step 5: Composer-Dependencies installieren**

```bash
composer install
```

Expected: `vendor/bin/phpcs` existiert danach.

- [ ] **Step 6: Baseline-Report erzeugen und sichten**

```bash
composer run lint > /tmp/phpcs-baseline-report.txt 2>&1
cat /tmp/phpcs-baseline-report.txt
```

Dieser Report wird NICHT committed — er ist die Grundlage für Task 2 (Fixes). Notiere die Anzahl
der gefundenen Errors/Warnings und die betroffenen Dateien für die Übergabe an Task 2.

- [ ] **Step 7: Verifikation**

```bash
php -l composer.json 2>&1 || true  # composer.json ist kein PHP, dieser Check ist nicht anwendbar — stattdessen:
composer validate
```

Expected: `composer validate` meldet `./composer.json is valid`

- [ ] **Step 8: Commit**

```bash
git add composer.json composer.lock phpcs.xml .gitignore
git commit -m "build(php): PHP_CodeSniffer (PSR-12) als Dev-Tooling eingerichtet"
```

**Wichtig:** `vendor/` NICHT stagen (ist jetzt in `.gitignore`). `composer.lock` WIRD committed
(reproduzierbare Installation für andere Entwickler/Agenten).

---

## Task 2: PSR-12 Fixes

**Files:**
- Modify: `api/*.php` (genauer Umfang abhängig vom Baseline-Report aus Task 1)

**Interfaces:**
- Consumes: `/tmp/phpcs-baseline-report.txt` aus Task 1 (falls nicht mehr vorhanden, `composer run lint` erneut ausführen — Report ist deterministisch reproduzierbar aus dem aktuellen Code-Stand)

- [ ] **Step 1: Report erneut erzeugen (falls nicht mehr vorhanden aus Task 1)**

```bash
composer run lint
```

- [ ] **Step 2: Verstöße einzeln durchgehen und fixen**

Für jede in der Ausgabe gelistete Datei: öffne die Datei, behebe die gemeldeten PSR-12-Verstöße
(typischerweise: fehlende `declare(strict_types=1)` — NICHT hinzufügen falls es im restlichen Code
nicht durchgängig ist, das wäre ein Scope-Creep; Zeileneinrückung; fehlende Leerzeile am Dateiende;
öffnende geschweifte Klammer auf eigener Zeile bei Funktionen/Klassen; `<?php`/`?>`-Tag-Konventionen;
Zeilenlänge). Bei jeder Datei nach dem Fix:

```bash
php -l api/<dateiname>.php
```

Expected: `No syntax errors detected`

- [ ] **Step 3: Nach jeder gefixten Datei erneut phpcs laufen lassen**

```bash
vendor/bin/phpcs api/<dateiname>.php
```

Expected: Keine Findings mehr für diese Datei (oder nur noch bewusst tolerierte, siehe Step 4)

- [ ] **Step 4: Bei nicht-fixbaren/bewusst tolerierten Findings**

Falls ein Finding fachlich nicht sauber fixbar ist (z.B. eine sehr lange SQL-Query-Zeile, die durch
Zeilenumbruch unleserlich würde), dokumentiere die Ausnahme mit einem `phpcs:ignore`-Kommentar
direkt über der betroffenen Zeile:

```php
// phpcs:ignore Generic.Files.LineLength.TooLong -- SQL-Query, Umbruch würde Lesbarkeit verschlechtern
$query = "...";
```

Nutze das nur wenn wirklich nötig, nicht als Bequemlichkeits-Ausweg.

- [ ] **Step 5: Finale Verifikation — voller Lint-Lauf**

```bash
composer run lint
```

Expected: `No errors found` (oder nur noch die in Step 4 bewusst mit `phpcs:ignore` markierten,
die dann als "ignored" statt "error" erscheinen)

- [ ] **Step 6: Vollständiger Syntax-Check aller geänderten Dateien**

```bash
for f in api/*.php; do php -l "$f" || echo "FEHLER in $f"; done
```

Expected: Alle Dateien `No syntax errors detected`, keine "FEHLER"-Zeile

- [ ] **Step 7: Funktionale Verifikation (Dev-Server)**

```bash
cd api && php -S 127.0.0.1:8081 router.php &
sleep 1
curl -s http://127.0.0.1:8081/ping.php
curl -s http://127.0.0.1:8081/nah.php | head -c 200
kill %1
```

Expected: `ping.php` liefert `{"status":"ok","time":...}`, `nah.php` liefert JSON beginnend mit
`{"refresh_at":...` — bestätigt, dass die PSR-12-Fixes keine Laufzeit-Logik verändert haben.

- [ ] **Step 8: Commit**

```bash
git add api/
git commit -m "style(api): PSR-12-Verstöße in api/*.php behoben"
```

---

## Task 3: OWASP Security-Audit-Script

**Files:**
- Create: `scripts/security-audit.sh`

**Interfaces:**
- Produces: ausführbares Bash-Script, Exit-Code 0 (alle automatisierbaren Checks bestanden) oder 1 (mindestens ein Check fehlgeschlagen)

- [ ] **Step 1: Verzeichnis anlegen**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Script erstellen**

Erstelle `scripts/security-audit.sh`:

```bash
#!/usr/bin/env bash
# OWASP-Top-10-Teilaudit: automatisierbare Checks.
# Deckt NICHT alle 10 Kategorien ab — siehe docs/security/owasp-top10-checklist.md
# für die vollständige Bewertung inkl. manueller Kategorien.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

FAILED=0

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
warn() { echo "  ⚠️  $1"; }

echo "=== OWASP Security-Audit (automatisierbare Checks) ==="
echo

# --- Check 1: Keine Secret-Literale außerhalb von config.local.php ---
echo "[1/5] Secret-Pattern-Scan in api/*.php (außer config.local.php*)"
SECRET_HITS=$(grep -rEn "define\s*\(\s*'[A-Z_]*(PASS|SECRET|KEY|TOKEN)[A-Z_]*'\s*,\s*'[A-Za-z0-9+/=_%#-]{12,}'" \
    api/*.php 2>/dev/null | grep -v "api/config.local.php" || true)
if [ -z "$SECRET_HITS" ]; then
    pass "Keine hardcoded Secret-Literale in api/*.php gefunden"
else
    fail "Mögliche Secret-Literale gefunden:"
    echo "$SECRET_HITS" | sed 's/^/      /'
fi
echo

# --- Check 2: config.local.php ist in .gitignore gelistet ---
echo "[2/5] config.local.php in .gitignore?"
if grep -q "config.local.php" .gitignore 2>/dev/null; then
    pass "config.local.php ist in .gitignore gelistet"
else
    fail "config.local.php fehlt in .gitignore"
fi
echo

# --- Check 3: config.local.php ist nicht von git getrackt ---
echo "[3/5] config.local.php nicht getrackt?"
if git ls-files --error-unmatch api/config.local.php >/dev/null 2>&1; then
    fail "api/config.local.php ist von git getrackt (sollte gitignored sein!)"
else
    pass "api/config.local.php ist nicht getrackt"
fi
echo

# --- Check 4: SQL-String-Interpolation-Heuristik (informativ, kein Hard-Fail) ---
echo "[4/5] SQL-String-Interpolation-Heuristik (informativ)"
SQL_INTERP=$(grep -rEn 'pg_query\s*\(\s*\$[a-zA-Z_]+\s*,\s*"[^"]*\$' api/*.php 2>/dev/null || true)
if [ -z "$SQL_INTERP" ]; then
    pass "Keine offensichtliche SQL-String-Interpolation gefunden"
else
    warn "SQL-String-Interpolation gefunden (kann sicher sein, wenn Werte vorher gecastet/aus geschlossenem Set stammen — manuell prüfen):"
    echo "$SQL_INTERP" | sed 's/^/      /'
fi
echo

# --- Check 5: DB_USER referenziert read-only Nutzer ---
echo "[5/5] DB_USER = web_api_user (Read-only-Konvention)?"
if grep -q "define('DB_USER', 'web_api_user')" api/config.php 2>/dev/null; then
    pass "DB_USER ist auf web_api_user (read-only) gesetzt"
else
    fail "DB_USER-Default in api/config.php weicht von web_api_user ab — prüfen"
fi
echo

echo "=== Ergebnis ==="
if [ "$FAILED" -eq 0 ]; then
    echo "Alle automatisierbaren Checks bestanden."
    exit 0
else
    echo "Mindestens ein Check fehlgeschlagen — siehe oben."
    exit 1
fi
```

- [ ] **Step 3: Script ausführbar machen**

```bash
chmod +x scripts/security-audit.sh
```

- [ ] **Step 4: Script testen**

```bash
bash scripts/security-audit.sh
echo "Exit-Code: $?"
```

Expected: Alle 5 Checks zeigen `✅` (Check 4 zeigt ggf. `⚠️` für `stations.php`s bekannten,
als sicher eingestuften Interpolations-Fund — das ist erwartetes, informatives Verhalten, kein
Fehler), Exit-Code `0`.

- [ ] **Step 5: Negativ-Test — Check 1 muss bei künstlich eingefügtem Secret fehlschlagen**

```bash
cp api/config.php /tmp/config.php.bak
echo "define('TEST_SECRET_KEY', 'abcdef1234567890ABCDEF');" >> api/config.php
bash scripts/security-audit.sh
echo "Exit-Code: $? (erwartet: 1)"
cp /tmp/config.php.bak api/config.php
rm /tmp/config.php.bak
```

Expected: Check 1 zeigt `❌`, Exit-Code `1` — bestätigt, dass das Script echte Secret-Additions
erkennen würde. Nach dem Test: `api/config.php` ist wiederhergestellt (per `cp` zurückkopiert).

- [ ] **Step 6: Verifikation, dass api/config.php wiederhergestellt ist**

```bash
git diff api/config.php
```

Expected: Keine Änderungen (leerer Diff) — bestätigt, dass der Negativ-Test sauber rückgängig gemacht wurde.

- [ ] **Step 7: Commit**

```bash
git add scripts/security-audit.sh
git commit -m "feat(security): automatisiertes OWASP-Teilaudit-Script hinzugefügt"
```

---

## Task 4: OWASP Top 10 Checklist-Dokument

**Files:**
- Create: `docs/security/owasp-top10-checklist.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: `scripts/security-audit.sh` (Task 3) für die automatisierbaren Kategorien

- [ ] **Step 1: Verzeichnis anlegen**

```bash
mkdir -p docs/security
```

- [ ] **Step 2: Checklist-Dokument erstellen**

Erstelle `docs/security/owasp-top10-checklist.md` mit folgendem Inhalt (basiert auf Recherche vom
2026-07-08 gegen den aktuellen Code-Stand von `api/*.php`):

```markdown
# OWASP Top 10 (2021) — Self-Check für api/*.php

Letzte manuelle Bewertung: 2026-07-08. Automatisierbare Teile via
[`scripts/security-audit.sh`](../../scripts/security-audit.sh) (`bash scripts/security-audit.sh`).

Legende: ✅ adressiert · ⚠️ teilweise/zu beobachten · ❌ offener Punkt · N/A nicht zutreffend

## A01:2021 — Broken Access Control

**Status: ⚠️ teilweise**

Alle Endpoints sind öffentlich ohne Authentifizierung erreichbar — das ist für die meisten
(read-only Geodaten-Proxies: `nah.php`, `stations.php`, `region_stations.php`, `stats.php`,
`adsb.php`, `ais.php`, `geocoder.php`, `ors.php`) bewusst so gewollt (öffentliches GeoPortal ohne
Login-Konzept).

**Ausnahme:** `diag.php` exponiert PHP-Version, geladene Extensions, DB-Host/Port/Name/User (Passwort
maskiert) und internen ORS-Health-Status ohne jede Zugriffskontrolle — Info-Disclosure, siehe
TODO.md für den Fix-Task. Nicht manuell hier behoben (Scope-Entscheidung 2026-07-08: dokumentieren,
später fixen).

Manuell bewertet — nicht automatisierbar (Access-Control ist eine Design-Entscheidung, kein
Pattern-Match).

## A02:2021 — Cryptographic Failures

**Status: ✅ adressiert**

- DB-Passwort und ORS-API-Key liegen nur in `api/config.local.php` (gitignored), nicht im Repo
  (Fix vom 2026-07-08, Commit `87accec` — vorher waren sie als Fallback-Default in `config.php`
  hardcoded, das war ein `A02`-relevanter Fund).
- Verbindung zur DB läuft lokal (`127.0.0.1`) ohne TLS — akzeptabel, da DB und API auf demselben
  Host laufen (kein Netzwerk-Transit für die Credentials).
- Kein Klartext-Passwort-Handling für Endnutzer (keine Login-/User-Passwort-Funktion im Projekt
  vorhanden — N/A für diesen Teilaspekt).

Teilautomatisiert via `security-audit.sh` Check 1–3 (Secret-Literale, `.gitignore`, Tracking-Status).

## A03:2021 — Injection

**Status: ⚠️ teilweise**

- `region_stations.php` nutzt korrekt `pg_query_params()` (parametrisierte Query) — ✅ Positivbeispiel.
- `stations.php` baut die SQL-Query per String-Interpolation zusammen (`$table`, `$filter_col`,
  `$lon`, `$lat`). Aktuell **nicht injizierbar**, weil `$table`/`$filter_col` nur aus einem
  geschlossenen Ternary-Set stammen (`'sew'`/`'nef'` → feste Tabellennamen) und `$lon`/`$lat` vor
  der Interpolation `(float)`-gecastet werden. Trotzdem ein Risk-Pattern (Style-Empfehlung, kein
  akuter Fund): künftige Änderungen an dieser Datei sollten auf `pg_query_params()` umstellen,
  auch wenn aktuell sicher.
- `nah.php`, `stats.php` nutzen statische Queries ohne User-Input — kein Injection-Vektor.
- `geocoder.php` nutzt `urlencode()` für alle User-Inputs, die in die Nominatim-URL eingebettet
  werden — korrekt für URL-Kontext (kein SQL involviert).

Teilautomatisiert via `security-audit.sh` Check 4 (Heuristik, informativ — kein Hard-Fail wegen
False-Positive-Risiko bei sicheren Interpolationen wie in `stations.php`).

## A04:2021 — Insecure Design

**Status: N/A (manuell bewertet)**

Keine spezifischen Funde. Das Projekt ist ein reiner Lesezugriff-Proxy (kein Schreibzugriff über
die API auf die Datenbank), was die Angriffsfläche für Design-Schwächen strukturell reduziert.

Nicht automatisierbar — Design-Entscheidung, kein Pattern-Match.

## A05:2021 — Security Misconfiguration

**Status: ❌ offener Punkt (diag.php)**

- `diag.php` (siehe A01) ist der Hauptfund dieser Kategorie — Diagnose-Informationen ohne
  Zugriffsschutz öffentlich erreichbar.
- `adsb.php`/`ais.php` setzen `Access-Control-Allow-Origin: *` (Wildcard-CORS) — für diese beiden
  Endpoints akzeptabel, da sie ausschließlich öffentliche, nicht-personenbezogene Live-Tracking-Daten
  (Flugzeuge/Schiffe) ausliefern, kein Auth-Kontext, kein Schreibzugriff.
- `test.php` gibt `PHP_IS_WORKING` aus — trivialer Health-Check, keine sensiblen Daten, aber
  ebenfalls ohne Zugriffsschutz (geringes Risiko, aber Teil desselben Musters wie `diag.php`).

Teilautomatisiert (Secret-Checks via `security-audit.sh`); `diag.php`/`test.php`-Exposition ist
manuell bewertet.

## A06:2021 — Vulnerable and Outdated Components

**Status: ⚠️ teilweise**

Kein `composer.json` mit Production-Dependencies (API nutzt nur PHP-Core-Extensions: `pgsql`,
`curl`, `json` — keine externen PHP-Packages im Produktivcode). Mit diesem Plan wird erstmals
`composer.json` eingeführt, aber nur mit `require-dev` (PHP_CodeSniffer) — kein Produktions-Risiko
durch Third-Party-Code.

Frontend-Dependencies (`package.json`) sind nicht Teil dieses PHP-fokussierten Audits — eigenes
Thema, `npm audit` könnte das separat abdecken (nicht Teil dieses Plans).

Nicht automatisiert in `security-audit.sh` (kein Production-PHP-Dependency-Baum vorhanden, den man
scannen müsste).

## A07:2021 — Identification and Authentication Failures

**Status: N/A**

Keine Authentifizierung/Session-Verwaltung im Projekt vorhanden (öffentliches Read-only-Portal ohne
Login). Kategorie nicht anwendbar.

## A08:2021 — Software and Data Integrity Failures

**Status: N/A (manuell bewertet)**

Kein CI/CD-Pipeline-Autodeploy, kein Auto-Update-Mechanismus, keine Deserialisierung von
untrusted Daten im PHP-Code gefunden (`json_decode` wird nur auf Responses von den eigenen
konfigurierten Upstream-Diensten — ORS, Nominatim — angewendet, nicht auf beliebigen User-Input).

Nicht automatisierbar.

## A09:2021 — Security Logging and Monitoring Failures

**Status: ⚠️ teilweise**

`router.php` loggt jeden Request nach `api/router.log` (Datei wächst unbegrenzt, ist aber in
`.gitignore` via `*.log` ausgeschlossen — kein Repo-Bloat). Kein strukturiertes Error-Logging in
den einzelnen Endpoint-Dateien (Fehler werden direkt als JSON-Response zurückgegeben, nicht
zusätzlich serverseitig geloggt) — für ein kleines Projekt ohne SLA vertretbar, aber bei einem
Sicherheitsvorfall gäbe es kein Audit-Log der fehlgeschlagenen Requests.

Nicht automatisierbar — Logging-Strategie ist eine Design-Entscheidung.

## A10:2021 — Server-Side Request Forgery (SSRF)

**Status: ✅ adressiert**

`ors.php` proxied einen User-kontrollierten `path`-Parameter, aber dieser wird immer an die feste
`ORS_URL`-Basis angehängt (`ORS_URL . "/" . ltrim($path, '/')`) — der User kann damit keinen
anderen Host ansprechen, nur den Pfad innerhalb des konfigurierten ORS-Hosts variieren. Kein
SSRF-Vektor, da der Host nicht user-kontrolliert ist.

`geocoder.php` proxied ausschließlich zu der fest konfigurierten `NOMINATIM_URL` — gleiches Muster,
kein SSRF-Vektor.

Manuell bewertet (Code-Struktur-Analyse, kein automatisierbares Pattern für "Host ist nicht
user-kontrolliert").

## Zusammenfassung

| Kategorie | Status |
|---|---|
| A01 Broken Access Control | ⚠️ (diag.php-Fund, siehe TODO.md) |
| A02 Cryptographic Failures | ✅ |
| A03 Injection | ⚠️ (stationär, kein akuter Fund) |
| A04 Insecure Design | N/A |
| A05 Security Misconfiguration | ❌ (diag.php-Fund, siehe TODO.md) |
| A06 Vulnerable/Outdated Components | ⚠️ (kein Production-PHP-Dependency-Risiko) |
| A07 Identification/Auth Failures | N/A |
| A08 Software/Data Integrity Failures | N/A |
| A09 Security Logging/Monitoring | ⚠️ (kein strukturiertes Error-Logging) |
| A10 SSRF | ✅ |

**Offener Fix-Bedarf:** `diag.php`-Info-Disclosure (A01/A05) — als TODO.md-Punkt erfasst,
nicht Teil dieses Audits (Scope-Entscheidung 2026-07-08).
```

- [ ] **Step 3: TODO.md um diag.php-Fund ergänzen**

Lies `TODO.md`, finde den Abschnitt "Standards-Angleichung" und füge nach dem OWASP-Punkt einen
neuen Punkt hinzu:

```markdown
- [ ] **`diag.php`-Info-Disclosure beheben** — beim OWASP-Top-10-Audit (2026-07-08, siehe
  [docs/security/owasp-top10-checklist.md](./docs/security/owasp-top10-checklist.md), Kategorien
  A01/A05) gefunden: `api/diag.php` ist ohne Zugriffsschutz öffentlich erreichbar und exponiert
  PHP-Version, geladene Extensions, DB-Host/Port/Name/User (Passwort maskiert) sowie den internen
  ORS-Health-Status. Fix-Optionen: Endpoint entfernen (falls nicht mehr gebraucht) oder mit einem
  einfachen Shared-Secret/Header-Check absichern. Bewusst nicht Teil des Standards-Angleichung-Plans
  (2026-07-08) — dort nur dokumentiert, um den Scope nicht zu sprengen.
```

- [ ] **Step 4: Verifikation**

```bash
bash scripts/security-audit.sh
```

Expected: Exit-Code `0` (bestätigt, dass die Checklist-Erstellung keine der automatisierten Checks
kaputt gemacht hat — reine Doku-Task, aber Verifikation schadet nicht)

- [ ] **Step 5: Commit**

```bash
git add docs/security/owasp-top10-checklist.md TODO.md
git commit -m "docs(security): OWASP-Top-10-Checkliste erstellt, diag.php-Fund in TODO.md erfasst"
```

---

## Task 5: OpenAPI-Spec

**Files:**
- Create: `docs/openapi.yaml`

**Interfaces:**
- Consumes: nichts von vorherigen Tasks (unabhängig)
- Produces: `docs/openapi.yaml`, konsumiert von Task 6 (Validierung)

- [ ] **Step 1: Verzeichnis prüfen**

```bash
ls docs/
```

(sollte bereits existieren aus vorherigen Sessions)

- [ ] **Step 2: OpenAPI-Spec erstellen**

Erstelle `docs/openapi.yaml`:

```yaml
openapi: 3.0.3
info:
  title: OE5ITH GeoPortal API
  description: >
    Read-only Proxy/Aggregator-API über die Backend-DB und externe Services
    (ORS Routing, Nominatim Geocoder, ADS-B/AIS Live-Tracking). Kein
    Authentifizierungsmechanismus (öffentliches GeoPortal ohne Login-Konzept).
  version: "1.0.0"
  license:
    name: Proprietary
servers:
  - url: https://map.oe5ith.at/api
    description: Produktion
  - url: http://127.0.0.1:8081
    description: Lokale Entwicklung (npm run dev:api)

paths:
  /ping.php:
    get:
      summary: Health-Check
      operationId: getPing
      responses:
        "200":
          description: API ist erreichbar
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: ok
                  time:
                    type: integer
                    description: Unix-Timestamp
              example:
                status: ok
                time: 1751234567

  /db.php:
    get:
      summary: Datenbank-Health-Check (Version + Latenz)
      operationId: getDbHealth
      responses:
        "200":
          description: DB-Verbindung erfolgreich
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: ok }
                  version: { type: string, description: "PostgreSQL-Versionsstring" }
                  uptime: { type: string, description: "Postmaster-Startzeit" }
                  latency_ms: { type: number }
        "500":
          description: DB-Verbindung fehlgeschlagen
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: error }
                  message: { type: string }

  /nah.php:
    get:
      summary: Alle NAH-Luftrettungsstationen mit berechnetem Aktiv-Status
      operationId: getNahStations
      responses:
        "200":
          description: Liste aller Stationen mit Status
          content:
            application/json:
              schema:
                type: object
                properties:
                  refresh_at:
                    type: string
                    format: date-time
                    nullable: true
                    description: Zeitpunkt des nächsten Status-Wechsels (ISO 8601), falls bekannt
                  stations:
                    type: array
                    items:
                      type: object
                      properties:
                        osm_id: { type: string }
                        name: { type: string }
                        callsign: { type: string }
                        region: { type: string }
                        op_type: { type: string, enum: ["24/7", "daylight", "fixed"] }
                        is_night_ready: { type: boolean }
                        fixed_start: { type: string, nullable: true, example: "07:00" }
                        fixed_end: { type: string, nullable: true, example: "19:00" }
                        lat: { type: number }
                        lon: { type: number }
                        is_active: { type: boolean }
                        in_season: { type: boolean }
                        months_active:
                          type: array
                          items: { type: integer }
                        calculated_start: { type: string, format: date-time, nullable: true }
                        calculated_end: { type: string, format: date-time, nullable: true }

  /stations.php:
    get:
      summary: Nächstgelegene RD/NEF-Stationen zu einem Zielpunkt (mit ORS-Matrix-Fahrzeiten)
      operationId: getNearestStations
      parameters:
        - name: target
          in: query
          required: true
          schema: { type: string }
          description: "Koordinate als 'lat,lon'"
          example: "47.2692,11.4041"
        - name: type
          in: query
          required: false
          schema: { type: string, enum: [sew, nef], default: sew }
        - name: profile
          in: query
          required: false
          schema: { type: string, default: driving-car }
          description: ORS-Routing-Profil (z.B. driving-car, driving-emergency)
        - name: limit
          in: query
          required: false
          schema: { type: integer, default: 5 }
      responses:
        "200":
          description: Nach Fahrzeit sortierte Stationsliste
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: { type: integer }
                    name: { type: string }
                    short_name: { type: string }
                    org: { type: string }
                    lat: { type: number }
                    lon: { type: number }
                    duration: { type: number, description: "Sekunden" }
                    distance: { type: number, description: "Meter" }
                    icon: { type: string }
        "400":
          description: "Parameter target fehlt"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string }

  /region_stations.php:
    get:
      summary: RD/NEF-Stationen eines Bundeslands
      operationId: getRegionStations
      parameters:
        - name: state
          in: query
          required: true
          schema: { type: string }
      responses:
        "200":
          description: Liste der Stationen im Bundesland
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id: { type: integer }
                    type: { type: string, enum: [RD, NEF] }
                    name: { type: string }
                    short_name: { type: string }
                    org: { type: string }
        "400":
          description: "Parameter state fehlt"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string }
        "500":
          description: "Datenbankfehler"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string }

  /stats.php:
    get:
      summary: Aggregierte Statistiken (NAH aktiv/gesamt pro Region, RD/NEF-Anzahl pro Bundesland)
      operationId: getStats
      responses:
        "200":
          description: Statistik-Aggregation
          content:
            application/json:
              schema:
                type: object
                properties:
                  generated_at: { type: string, format: date-time }
                  nah:
                    type: object
                    additionalProperties:
                      type: object
                      properties:
                        total: { type: integer }
                        active: { type: integer }
                  rd:
                    type: object
                    additionalProperties: { type: integer }
                  nef:
                    type: object
                    additionalProperties: { type: integer }

  /geocoder.php:
    get:
      summary: Adress-Suche oder Reverse-Geocoding (Nominatim-Proxy)
      operationId: geocode
      parameters:
        - name: q
          in: query
          required: false
          schema: { type: string }
          description: "Suchbegriff (für Vorwärtssuche)"
        - name: lat
          in: query
          required: false
          schema: { type: string }
        - name: lon
          in: query
          required: false
          schema: { type: string }
        - name: reverse
          in: query
          required: false
          schema: { type: boolean }
          description: "Flag für Reverse-Geocoding (mit lat/lon)"
      responses:
        "200":
          description: "Nominatim-Response (durchgereicht), leeres Array wenn kein Parameter gesetzt"
          content:
            application/json:
              schema:
                type: array
                items: { type: object }

  /ors.php:
    get:
      summary: Proxy zu OpenRouteService (GET, z.B. Health-Check)
      operationId: proxyOrsGet
      parameters:
        - name: path
          in: query
          required: false
          schema: { type: string, default: health }
          description: "Pfad-Suffix, wird an die feste ORS-Basis-URL angehängt (kein Host-Override möglich)"
      responses:
        "200":
          description: "ORS-Response (durchgereicht)"
          content:
            application/json:
              schema: { type: object }
    post:
      summary: Proxy zu OpenRouteService (POST, z.B. Routing/Matrix/Isochrones mit Body)
      operationId: proxyOrsPost
      parameters:
        - name: path
          in: query
          required: false
          schema: { type: string, default: health }
      requestBody:
        required: false
        content:
          application/json:
            schema: { type: object }
      responses:
        "200":
          description: "ORS-Response (durchgereicht)"
          content:
            application/json:
              schema: { type: object }

  /adsb.php:
    get:
      summary: Live ADS-B-Flugzeugdaten (Proxy)
      operationId: getAdsb
      responses:
        "200":
          description: "Aircraft-Daten (durchgereicht von adsb.oe5ith.at)"
          content:
            application/json:
              schema: { type: object }
        "502":
          description: "Upstream nicht erreichbar"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string }
                  code: { type: integer }
                  aircraft: { type: array, items: {} }

  /ais.php:
    get:
      summary: Live AIS-Schiffsdaten (Proxy)
      operationId: getAis
      responses:
        "200":
          description: "Ship-Daten (durchgereicht von ais.oe5ith.at)"
          content:
            application/json:
              schema: { type: object }
        "502":
          description: "Upstream nicht erreichbar"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string }

  /test.php:
    get:
      summary: Trivialer PHP-Interpreter-Check
      operationId: getTest
      x-internal: true
      description: "Interner Diagnose-Endpoint — kein stabiler Vertrag, nicht für Frontend-Konsum gedacht."
      responses:
        "200":
          description: "Plaintext PHP_IS_WORKING"
          content:
            text/plain:
              schema: { type: string, example: "PHP_IS_WORKING" }

  /diag.php:
    get:
      summary: Erweiterter Diagnose-Endpoint (PHP/DB/ORS-Konnektivität)
      operationId: getDiag
      x-internal: true
      description: >
        Interner Diagnose-Endpoint — kein stabiler Vertrag, nicht für Frontend-Konsum gedacht.
        BEKANNTES SECURITY-FINDING (siehe docs/security/owasp-top10-checklist.md, A01/A05): aktuell
        ohne Zugriffsschutz erreichbar, exponiert Infrastruktur-Details. Fix als TODO.md-Punkt erfasst.
      responses:
        "200":
          description: "Plaintext Diagnose-Report"
          content:
            text/plain:
              schema: { type: string }
```

- [ ] **Step 3: YAML-Syntax prüfen (vor Task 6's vollständiger Schema-Validierung)**

```bash
python3 -c "import yaml; yaml.safe_load(open('docs/openapi.yaml'))" && echo "YAML syntaktisch OK"
```

Expected: `YAML syntaktisch OK` (Python als schneller Vorab-Check verfügbar; die eigentliche
OpenAPI-3.x-Schema-Validierung gegen das offizielle Schema erfolgt in Task 6 mit dem dedizierten
Tool `@apidevtools/swagger-parser`)

- [ ] **Step 4: Commit**

```bash
git add docs/openapi.yaml
git commit -m "docs(api): OpenAPI-3.x-Spec für api/*.php erstellt"
```

---

## Task 6: OpenAPI-Validierung (npm-Tooling)

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: `docs/openapi.yaml` (Task 5)
- Produces: `npm run validate:openapi` — Exit 0 bei valider Spec, Exit ≠0 bei Schema-Fehlern

- [ ] **Step 1: swagger-parser installieren**

```bash
npm install --save-dev @apidevtools/swagger-parser
```

- [ ] **Step 2: npm-Script hinzufügen**

In `package.json`, im `"scripts"`-Block, füge nach `"test": "vitest run"` hinzu:

```json
    "validate:openapi": "node -e \"require('@apidevtools/swagger-parser').validate('docs/openapi.yaml').then(() => console.log('✅ OpenAPI-Spec ist valide')).catch(e => { console.error('❌', e.message); process.exit(1); })\""
```

(Achte auf korrektes JSON — Komma nach der vorherigen Zeile, kein Komma nach der letzten Zeile im
`scripts`-Objekt)

- [ ] **Step 3: Validierung ausführen**

```bash
npm run validate:openapi
```

Expected: `✅ OpenAPI-Spec ist valide`

Falls Fehler auftreten: die Fehlermeldung von `swagger-parser` nennt den genauen Pfad/Grund
(z.B. fehlendes `required`-Feld, falscher Typ) — korrigiere `docs/openapi.yaml` entsprechend und
wiederhole Step 3, bis die Validierung grün ist.

- [ ] **Step 4: Type-Check und Tests (Global Constraint bei package.json-Änderung)**

```bash
npx tsc --noEmit && npm test
```

Expected: Alle 112 Tests weiterhin grün, kein Type-Error (neue devDependency hat keinen Einfluss
auf den TypeScript-Code)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: OpenAPI-Validierung via @apidevtools/swagger-parser eingerichtet"
```

---

## Task 7: Finale Verifikation + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: alle Commits aus Task 1–6

- [ ] **Step 1: Alle drei Verifikations-Pfade laufen lassen**

```bash
echo "=== PSR-12 ===" && composer run lint
echo "=== OWASP ===" && bash scripts/security-audit.sh
echo "=== OpenAPI ===" && npm run validate:openapi
echo "=== Standard-Repo-Checks ===" && npx tsc --noEmit && npm test
```

Expected: Alle vier Blöcke laufen fehlerfrei durch (PSR-12: keine Errors; OWASP: Exit 0; OpenAPI:
valide; Standard-Checks: 112 Tests grün, kein Type-Error)

- [ ] **Step 2: CHANGELOG.md aktualisieren**

Füge unter `[Unreleased]` → `### Hinzugefügt` folgenden konsolidierten Eintrag hinzu:

```markdown
- **Standards-Angleichung: PSR-12, OWASP Top 10, OpenAPI** (2026-07-08) — Drei bisher offene
  TODO.md-Punkte umgesetzt: (1) PHP_CodeSniffer mit PSR-12-Ruleset für `api/*.php` eingerichtet
  (`composer run lint`), bestehende Verstöße gefixt; (2) hybrides OWASP-Top-10-Audit — automatisiertes
  Script (`bash scripts/security-audit.sh`) für Secret-/Injection-Heuristik-Checks plus vollständige
  manuelle Bewertung aller 10 Kategorien in `docs/security/owasp-top10-checklist.md`; dabei einen
  Info-Disclosure-Fund in `diag.php` entdeckt und als eigenen TODO.md-Punkt erfasst (nicht in diesem
  Rahmen gefixt); (3) OpenAPI-3.x-Spec für alle 11 API-Endpoints (`docs/openapi.yaml`), validiert via
  `npm run validate:openapi`. Zusätzlich während der Recherche gefunden und sofort behoben: hardcoded
  DB-Passwort/API-Key in `api/config.php` (Commit `87accec`, vor diesem Plan).
```

- [ ] **Step 3: TODO.md — die drei ursprünglichen Standards-Angleichung-Punkte abhaken**

Lies `TODO.md`, Abschnitt "Standards-Angleichung", markiere die drei Punkte (PSR-12, OWASP,
OpenAPI) als `[x]` mit Datum `2026-07-08` und Verweis auf die neuen Dateien
(`phpcs.xml`/`composer.json`, `docs/security/owasp-top10-checklist.md`,
`docs/openapi.yaml`) — der vierte, neu entdeckte `diag.php`-Punkt aus Task 4 bleibt offen (`[ ]`).

- [ ] **Step 4: Finale Verifikation nach Doku-Änderungen**

```bash
npx tsc --noEmit && npm test
```

Expected: Weiterhin grün (Doku-Änderungen haben keinen Code-Einfluss, aber Standard-Verifikation
vor jedem Commit gemäß CLAUDE.md)

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md TODO.md
git commit -m "docs: CHANGELOG und TODO.md für Standards-Angleichung aktualisiert"
```

---

## Self-Review

✅ **Spec coverage:**
- PSR-12 Tooling + Fixes → Task 1–2
- OWASP Hybrid (Script + Checklist) → Task 3–4
- OpenAPI Spec + Validierung → Task 5–6
- `diag.php`-Fund dokumentiert (User-Entscheidung: nur dokumentieren) → Task 4
- CHANGELOG/TODO.md-Abschluss → Task 7

✅ **No placeholders:** Alle Scripts/Configs/Docs sind vollständig ausgeschrieben (phpcs.xml,
security-audit.sh komplett, OWASP-Checkliste mit echten Bewertungen basierend auf Code-Recherche,
OpenAPI-Spec mit allen 11 Endpoints).

✅ **Type consistency:** `scripts/security-audit.sh` (Task 3) wird in Task 4 (Verifikation) und
Task 7 (finale Verifikation) mit demselben Aufruf (`bash scripts/security-audit.sh`) referenziert.
`docs/openapi.yaml` (Task 5) wird in Task 6 mit demselben Pfad validiert.

**Bekannte Abhängigkeit:** Task 2 ist inhaltlich abhängig vom Report aus Task 1 (Umfang der Fixes
unbekannt bis zum Baseline-Lauf) — das ist beabsichtigt (Investigation-then-Fix-Struktur, analog zu
früheren Plänen in diesem Repo).
