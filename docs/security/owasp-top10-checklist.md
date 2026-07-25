# OWASP Top 10 (2021) — Self-Check für api/*.php

Letzte manuelle Bewertung: 2026-07-25 (Re-Audit der ausgelieferten Seite, initiale Fassung
2026-07-08). Automatisierbare Teile via
[`scripts/security-audit.sh`](../../scripts/security-audit.sh) (`bash scripts/security-audit.sh`).

Legende: ✅ adressiert · ⚠️ teilweise/zu beobachten · ❌ offener Punkt · N/A nicht zutreffend

## A01:2021 — Broken Access Control

**Status: ⚠️ teilweise**

Alle Endpoints sind öffentlich ohne Authentifizierung erreichbar — das ist für die meisten
(read-only Geodaten-Proxies: `nah.php`, `stations.php`, `region_stations.php`, `stats.php`,
`adsb.php`, `ais.php`, `geocoder.php`, `ors.php`) bewusst so gewollt (öffentliches GeoPortal ohne
Login-Konzept).

**`diag.php` — ✅ behoben (2026-07-08/09):** exponierte PHP-Version, geladene Extensions,
DB-Host/Port/Name/User (Passwort maskiert) und internen ORS-Health-Status ohne Zugriffskontrolle.
Fix: `location = /api/diag.php { deny all; }` in `nginx.conf` (nur Produktions-Server-Block), live
verifiziert (`https://map.oe5ith.at/api/diag.php` → 403). Siehe `TODO_ARCHIVE.md`.

**`db.php` — ✅ behoben (2026-07-25, selber Tag wie der Fund).** War analog zu `diag.php`, aber
nicht durch dessen nginx-Regel erfasst und live öffentlich erreichbar: exponierte die exakte
PostgreSQL-Versionszeile (inkl. OS-Build) und den DB-Uptime-Zeitstempel. Kein Frontend-Code las
den Response-Body — liefert jetzt nur noch einen reinen Status-Code (200/500) ohne Body. Zusätzlich
im selben Arbeitsblock: `DebugModule.ts` (`/info/debug`, API-Request-Playground) komplett entfernt,
`test.php` gelöscht (Duplikat von `ping.php`), `stations.php`/`region_stations.php` in
`nearest-stations.php`/`stations-by-region.php` umbenannt (Namen allein waren nicht
unterscheidbar), alle neun verbleibenden Lese-Endpoints akzeptieren nur noch GET (405 sonst,
`api/http.php`), `ors.php`/`nearest-stations.php`/`geocoder.php` validieren `path`/`profile`/
`lat`+`lon` gegen Allowlist-Muster. Details: Plan
[docs/superpowers/plans/2026-07-25-api-hardening-debug-removal.md](../superpowers/plans/2026-07-25-api-hardening-debug-removal.md).

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

Manuell identifiziert; `security-audit.sh` Check 4 erfasst direkte String-Interpolation in `pg_query()`-Aufrufen (Heuristik), nicht aber variable-gestützte Query-Zusammenbau wie in `stations.php`.

## A04:2021 — Insecure Design

**Status: N/A (manuell bewertet)**

Keine spezifischen Funde. Das Projekt ist ein reiner Lesezugriff-Proxy (kein Schreibzugriff über
die API auf die Datenbank), was die Angriffsfläche für Design-Schwächen strukturell reduziert.

Nicht automatisierbar — Design-Entscheidung, kein Pattern-Match.

## A05:2021 — Security Misconfiguration

**Status: ⚠️ teilweise (curl-Timeout offen, Rest behoben)**

- `diag.php` — ✅ behoben, siehe A01.
- `db.php` — ✅ behoben, siehe A01.
- `adsb.php`/`ais.php` setzen `Access-Control-Allow-Origin: *` (Wildcard-CORS) — für diese beiden
  Endpoints akzeptabel, da sie ausschließlich öffentliche, nicht-personenbezogene Live-Tracking-Daten
  (Flugzeuge/Schiffe) ausliefern, kein Auth-Kontext, kein Schreibzugriff.
- `test.php` gibt `PHP_IS_WORKING` aus — trivialer Health-Check, keine sensiblen Daten, aber
  ebenfalls ohne Zugriffsschutz (geringes Risiko, aber Teil desselben Musters wie `diag.php`/`db.php`).
- **Method-/Input-Restriktion (2026-07-25):** alle neun verbleibenden reinen Lese-Endpoints
  akzeptieren nur noch `GET` (`api/http.php`, `require_method()`), `ors.php`/`nearest-stations.php`
  validieren `path`/`profile` gegen Allowlist-Muster, `geocoder.php` validiert `lat`/`lon` als
  numerisch (Adress-Freitextsuche bleibt bewusst offen). `curl_request()`-Timeout-Fund bleibt
  separat offen.
- **Neuer Fund (2026-07-25):** `curl_request()` (`api/config.php`, gemeinsam genutzt von `ors.php`
  und `geocoder.php`) setzt kein `CURLOPT_TIMEOUT`/`CURLOPT_CONNECTTIMEOUT` — im Unterschied zu
  `adsb.php`/`ais.php`, die beide 5s Timeout setzen. Ein hängender/langsamer Upstream (ORS oder
  Nominatim) kann einen PHP-FPM-Worker unbegrenzt blockieren (Resource-Exhaustion unter Last).
  Geringes Risiko bei aktuellem Traffic-Volumen, aber inkonsistent zum bereits etablierten Pattern
  in dieser Codebase. Siehe TODO.md.
- Live-Check der ausgelieferten HTTP-Security-Header (2026-07-25): `X-Frame-Options`,
  `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` und eine
  auf die tatsächliche externe Call-Surface dieser App zugeschnittene `Content-Security-Policy`
  sind gesetzt (`nginx.conf`, nicht aus dem generischen CI-Snippet). HTTP→HTTPS-Redirect (301)
  funktioniert. ✅

Teilautomatisiert (Secret-Checks via `security-audit.sh`); `diag.php`/`db.php`/`test.php`-Exposition
und der Timeout-Fund sind manuell bewertet.

## A06:2021 — Vulnerable and Outdated Components

**Status: ✅ adressiert**

Kein `composer.json` mit Production-Dependencies (API nutzt nur PHP-Core-Extensions: `pgsql`,
`curl`, `json` — keine externen PHP-Packages im Produktivcode). `composer.json` enthält nur
`require-dev` (PHP_CodeSniffer) — kein Produktions-Risiko durch Third-Party-Code. `composer audit`
(2026-07-25): 0 Advisories.

Frontend-Dependencies (`package.json`) beim Re-Audit 2026-07-25 mit einbezogen: `npm audit` →
0 Schwachstellen (nach den concurrently-9→10-/maplibre-gl-5→6-Upgrades vom selben Tag).

Nicht automatisiert in `security-audit.sh` (kein Production-PHP-Dependency-Baum vorhanden, den man
scannen müsste) — `npm audit`/`composer audit` sind eigene, etablierte Tools dafür.

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
kein SSRF-Vektor. Re-geprüft 2026-07-25 (Isochronen-Feature nutzt denselben `ors.php`-Proxy, kein
neuer Endpoint, keine neue Angriffsfläche).

Manuell bewertet (Code-Struktur-Analyse, kein automatisierbares Pattern für "Host ist nicht
user-kontrolliert").

## Zusammenfassung

| Kategorie | Status |
|---|---|
| A01 Broken Access Control | ⚠️ (diag.php per nginx-Block gefixt, db.php gefixt, Rest bewusst öffentlich) |
| A02 Cryptographic Failures | ✅ |
| A03 Injection | ⚠️ (stationär, kein akuter Fund) |
| A04 Insecure Design | N/A |
| A05 Security Misconfiguration | ⚠️ (curl-Timeout offen, Rest behoben, Header ✅ — siehe TODO.md) |
| A06 Vulnerable/Outdated Components | ✅ (npm audit + composer audit: 0 Funde) |
| A07 Identification/Auth Failures | N/A |
| A08 Software/Data Integrity Failures | N/A |
| A09 Security Logging/Monitoring | ⚠️ (kein strukturiertes Error-Logging) |
| A10 SSRF | ✅ |

**Offener Fix-Bedarf (Stand 2026-07-25):**
- Fehlender Timeout in `curl_request()` (A05) — mechanischer Fix, als TODO.md-Punkt erfasst.

**Historisch behoben:** `diag.php`-Info-Disclosure (A01/A05), gefunden und gefixt 2026-07-08/09.
`db.php`-Info-Disclosure (A01/A05) samt API-Debug-Modul, Endpoint-Umbenennung und
Method-/Input-Restriktion auf der gesamten `api/*.php`-Fläche, gefunden und gefixt 2026-07-25 —
siehe `TODO_ARCHIVE.md`.
