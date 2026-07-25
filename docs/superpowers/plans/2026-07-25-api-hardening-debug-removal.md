# API-Hardening: Debug-Entfernung, Endpoint-Umbenennung, Input-Restriktion, Doku-Konsolidierung

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setzt die in [docs/superpowers/specs/2026-07-25-api-hardening-design.md](../specs/2026-07-25-api-hardening-design.md) beschlossene Spec um: entfernt das API-Debug-Playground-Modul, reduziert `api/db.php` auf einen reinen Status-Code ohne Body, benennt zwei verwirrend ähnliche Endpoints klarer, entfernt einen redundanten Endpoint, schränkt bei allen Lese-Endpoints die HTTP-Methode auf GET ein, validiert drei Parameter gegen Allowlist-Muster, und konsolidiert die Endpoint-Dokumentation auf `docs/openapi.yaml` als einzige Quelle.

**Architecture:** Reines Backend-/Doku-Hardening ohne neue Abstraktionen im großen Stil: ein neuer, seiteneffektfreier Helper (`api/http.php`) wird von neun GET-only-Endpoints eingebunden; zwei Dateien werden per `git mv` umbenannt; drei Endpoints bekommen zusätzliche `preg_match`/`is_numeric`-Guards. Frontend-seitig wird nur das Debug-Modul entfernt und drei Fetch-Aufrufstellen auf die neuen Endpoint-Namen umgestellt — `HealthModule.ts` bleibt inhaltlich unverändert (liest Response-Bodies nie).

**Tech Stack:** PHP 8.4 (kein Framework, kein PHPUnit im Repo — Verifikation der PHP-Änderungen läuft über manuelle `curl`-Checks gegen den lokalen PHP-Dev-Server, nicht über automatisierte Tests), TypeScript/Vite/Vitest fürs Frontend.

## Global Constraints

- Kein `git add -A` — Dateien immer explizit stagen (siehe `AGENT_INSTRUCTIONS.md` §4).
- Jede Task endet mit `npx tsc --noEmit && npm test` (falls TS-Dateien geändert wurden) bzw. den in der Task genannten `curl`-Checks + `npm run validate:openapi` (bei PHP-/Doku-Änderungen) — alles muss grün sein, bevor committet wird.
- Umbenennungen von PHP-Dateien immer per `git mv`, nicht `rm` + neue Datei — erhält die Git-Historie.
- Commits: Conventional-Commits-Präfix, deutscher Subject-Text (siehe `CLAUDE.md` → Releases/Versionierung/Git).
- `api/diag.php` bleibt unangetastet — bewusste Vorentscheidung aus dem 2026-07-08-Audit (nginx-Block statt Code-Änderung, siehe `docs/TODO_ARCHIVE.md`), hier nicht revidieren.
- `api/ors.php` bleibt methoden-offen (GET **und** POST) — die ORS-Endpoints für Directions/Matrix/Isochrones brauchen POST mit Body.
- `api/geocoder.php`s `q`-Parameter (Adress-Freitextsuche) bleibt komplett unverändert und offen — nur `lat`/`lon` (Reverse-Geocoding) werden validiert.

---

## File Structure

**Neu:**
- `api/http.php` — ein einziger Helper `require_method(string $method)`, seiteneffektfrei (im Unterschied zu `config.php`, das secrets-Checks mit Exit-on-Failure macht).

**Umbenennen (git mv):**
- `api/stations.php` → `api/nearest-stations.php`
- `api/region_stations.php` → `api/stations-by-region.php`

**Löschen:**
- `src/components/info/DebugModule.ts`
- `src/styles/code-viewer.css`
- `api/test.php` (Duplikat von `ping.php`)
- `docs/API_ENDPOINTS.md` (veraltet, unvollständig — `docs/openapi.yaml` wird alleinige Quelle)

**Ändern:**
- `src/pages/InfoPage.ts` — Debug-Import/Nav-Eintrag/Routing-Zweig raus.
- `src/app.css` — `code-viewer.css`-Import raus.
- `api/db.php` — Response auf reinen Status-Code ohne Body reduziert, `require_method('GET')`.
- `api/ping.php`, `api/nah.php`, `api/stats.php`, `api/adsb.php`, `api/ais.php` — je `require_once 'http.php'; require_method('GET');` ergänzt.
- `api/geocoder.php` — `require_method('GET')` + `lat`/`lon`-Validierung.
- `api/nearest-stations.php` (ex-`stations.php`) — `require_method('GET')` + `profile`-Validierung.
- `api/stations-by-region.php` (ex-`region_stations.php`) — `require_method('GET')`.
- `api/ors.php` — `path`-Parameter gegen Allowlist-Pattern geprüft.
- `src/lib/RoutingService.ts` — zwei Fetch-URLs auf `/api/nearest-stations.php` umgestellt.
- `src/lib/RoutingService.test.ts` — Mock-URL-Check auf `nearest-stations.php` präzisiert.
- `src/components/info/RegionsModule.ts` — Fetch-URL auf `/api/stations-by-region.php` umgestellt.
- `src/components/info/HealthModule.ts` — toter Verweis auf `docs/API_ENDPOINTS.md` entfernt.
- `docs/openapi.yaml` — für alle obigen Änderungen aktualisiert (Umbenennungen, neue `400`/`405`-Responses, `db.php`-Schema vereinfacht, `test.php`-Eintrag gelöscht).
- `CLAUDE.md` — Info-Portal-Modulliste (Debug raus), PHP-API-Beispielliste (`stations.php` → `nearest-stations.php`), OpenAPI-Standards-Zeile (Stale-Fix), neuer kurzer Migrations-Absatz.
- `docs/security/owasp-top10-checklist.md`, `docs/TODO.md`, `docs/TODO_ARCHIVE.md`, `docs/CHANGELOG.md` — Abschluss-Doku.

---

### Task 1: Debug-Modul entfernen

**Files:**
- Delete: `src/components/info/DebugModule.ts`
- Delete: `src/styles/code-viewer.css`
- Modify: `src/pages/InfoPage.ts:7,11-13,40-42,74-75`
- Modify: `src/app.css:19`
- Modify: `CLAUDE.md` (Info-Portal-Zeile)

**Interfaces:**
- Produces: `InfoPageController` unterstützt danach nur noch die Subpaths `nah`, `health`, `regions`, `tracking`, `inventory` (kein `debug` mehr). Kein anderer Task hängt hiervon ab.

- [ ] **Step 1: Debug-Dateien löschen**

```bash
rm src/components/info/DebugModule.ts
rm src/styles/code-viewer.css
```

- [ ] **Step 2: Import- und Docblock-Zeile in `InfoPage.ts` anpassen**

In `src/pages/InfoPage.ts` Zeile 7 (`import { renderDebugModule } from '../components/info/DebugModule';`) löschen. Docblock (aktuell Zeilen 11-13) von

```typescript
/**
 * Info & Debug Page Controller
 * Handles layout, module switching and resource lifecycle.
 */
```

auf

```typescript
/**
 * Info Page Controller
 * Handles layout, module switching and resource lifecycle.
 */
```

ändern.

- [ ] **Step 3: Nav-Link-Eintrag entfernen**

In `src/pages/InfoPage.ts` diesen Block löschen:

```html
            <a href="/info/debug" class="sidebar-nav-item nav-link ${subpath === 'debug' ? 'active' : ''}" data-module="debug">
              <i class="fa-solid fa-terminal nav-icon"></i> API Debug
            </a>
```

- [ ] **Step 4: Routing-Zweig entfernen**

In `src/pages/InfoPage.ts` diesen Block löschen:

```typescript
    } else if (subpath === 'debug') {
      renderDebugModule(contentMount, this.signal);
```

- [ ] **Step 5: CSS-Import entfernen**

In `src/app.css` Zeile 19 (`@import "./styles/code-viewer.css";`) löschen.

- [ ] **Step 6: `CLAUDE.md` — Info-Portal-Modulliste**

Zeile:

```
**Info portal (`/info/*`, `src/pages/InfoPage.ts` + `src/components/info/`):** Modular system-status dashboard. Modules: NAH status, Service Health (live API pings), Regions analysis, Tracking telemetry, Map Inventory, Debug. Subpath selects the active module.
```

ersetzen durch:

```
**Info portal (`/info/*`, `src/pages/InfoPage.ts` + `src/components/info/`):** Modular system-status dashboard. Modules: NAH status, Service Health (live API pings), Regions analysis, Tracking telemetry, Map Inventory. Subpath selects the active module.
```

- [ ] **Step 7: Verifizieren**

```bash
npx tsc --noEmit
npm test
npm run build
```

Erwartung: `tsc` 0 Fehler, alle 249 Tests grün, Build erfolgreich.

- [ ] **Step 8: Commit**

```bash
git add src/pages/InfoPage.ts src/app.css CLAUDE.md docs/superpowers/specs/2026-07-25-api-hardening-design.md
git rm src/components/info/DebugModule.ts src/styles/code-viewer.css
git commit -m "$(cat <<'EOF'
fix(security): API-Debug-Playground entfernt

Reduziert die Auffindbarkeit von Rohdaten-Responses (freie Parameter-Eingabe
gegen beliebige api/*.php-Endpoints) — Folgearbeit aus dem OWASP-Re-Audit
vom 2026-07-25. Spec: docs/superpowers/specs/2026-07-25-api-hardening-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(Die Spec-Datei war noch nicht committet — läuft laut Repo-Konvention mit dem ersten Implementierungs-Commit statt einem eigenen Doku-Commit.)

---

### Task 2: `api/test.php` entfernen (Duplikat von `ping.php`)

**Files:**
- Delete: `api/test.php`
- Modify: `docs/openapi.yaml:334-345` (Eintrag löschen)

**Interfaces:**
- Produces: kein `GET /api/test.php` mehr (404 via nginx/PHP-Dev-Server-Default). `ping.php` bleibt der einzige triviale Health-Check.

- [ ] **Step 1: Datei löschen**

```bash
git rm api/test.php
```

- [ ] **Step 2: `docs/openapi.yaml` — Eintrag löschen**

Den kompletten Block (aktuell Zeilen 334-345) löschen:

```yaml
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
```

- [ ] **Step 3: Verifizieren**

```bash
npm run validate:openapi
```

Erwartung: `✅ OpenAPI-Spec ist valide`.

- [ ] **Step 4: Commit**

```bash
git add docs/openapi.yaml
git commit -m "$(cat <<'EOF'
fix(security): test.php entfernt (Duplikat von ping.php)

Beide echoten denselben Health-Check-Zweck, ping.php liefert das bereits
als korrektes JSON. Folgearbeit aus dem OWASP-Re-Audit vom 2026-07-25.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `api/http.php`-Helper erstellen, angewendet auf `db.php`

**Files:**
- Create: `api/http.php`
- Modify: `api/db.php` (komplett)
- Modify: `docs/openapi.yaml:40-64`

**Interfaces:**
- Produces: `require_method(string $method): void` — bei Methoden-Mismatch `405` + `Allow`-Header + `{"error":"Method not allowed"}`, sonst kein Effekt. `GET /api/db.php` liefert `200` (leerer Body) oder `500` (leerer Body) — kein JSON-Feld mehr. `src/components/info/HealthModule.ts` liest den Body ohnehin nie (nur `response.ok` + eigene Latenzmessung, `HealthModule.ts:89-103`) — kein Frontend-Task nötig.

- [ ] **Step 1: `api/http.php` anlegen**

```php
<?php

/**
 * Erzwingt eine erlaubte HTTP-Methode für read-only Endpoints, sonst 405.
 * Bewusst seiteneffektfrei (im Unterschied zu config.php) — kann auch von
 * Endpoints ohne DB-/ORS-Secret-Bedarf (adsb.php, ais.php, ping.php)
 * eingebunden werden, ohne deren Fail-Closed-Secret-Check zu erben.
 */
function require_method(string $method)
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        http_response_code(405);
        header("Allow: $method");
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }
}
```

- [ ] **Step 2: `api/db.php` neu schreiben**

```php
<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');
header('Content-Type: application/json');

// Nur ein reiner Erreichbarkeits-Check für den Health-Monitor (Info-Portal) — bewusst kein
// Versionsstring/Uptime/Body mehr in der Antwort (OWASP A05 Info-Disclosure-Fund, siehe
// docs/security/owasp-top10-checklist.md). Kein Frontend-Code liest den Body (HealthModule.ts
// wertet nur HTTP-Status + eigene Latenzmessung aus), daher reicht der reine Status-Code.
$db = get_db_conn();
$res = pg_query($db, "SELECT 1");
pg_close($db);

if (!$res) {
    http_response_code(500);
}
```

- [ ] **Step 3: `docs/openapi.yaml`-Schema anpassen**

Den `/db.php`-Block (aktuell Zeilen 40-64) ersetzen durch:

```yaml
  /db.php:
    get:
      summary: Datenbank-Health-Check (reiner Status-Code, kein Body)
      operationId: getDbHealth
      responses:
        "200":
          description: DB-Verbindung erfolgreich (leerer Body)
        "405":
          description: Nicht erlaubte HTTP-Methode (nur GET)
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string, example: "Method not allowed" }
        "500":
          description: DB-Verbindung fehlgeschlagen (leerer Body)
```

- [ ] **Step 4: Lokal verifizieren**

```bash
npm run dev:api &
sleep 2
echo "GET  -> $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/db.php)"
echo "POST -> $(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8081/db.php)"
curl -s http://127.0.0.1:8081/db.php | wc -c
npm run validate:openapi
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill
```

Erwartung: `GET -> 200`, `POST -> 405`, `wc -c` liefert `0` (leerer Body bei Erfolg), OpenAPI-Validierung grün.

- [ ] **Step 5: Commit**

```bash
git add api/http.php api/db.php docs/openapi.yaml
git commit -m "$(cat <<'EOF'
fix(security): db.php liefert nur noch Status-Code, kein Body mehr

Live-Fund beim OWASP-Re-Audit (2026-07-25): api/db.php lieferte den vollen
PostgreSQL-Versionsstring inkl. OS-Build + DB-Uptime ohne Zugriffsschutz.
Kein Frontend-Code liest den Response-Body (HealthModule.ts wertet nur
HTTP-Status aus) — liefert jetzt nur noch 200/500 ohne Body. Neuer,
seiteneffektfreier api/http.php-Helper (require_method()) erzwingt
zusätzlich GET-only.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `http.php` auf `ping.php`, `nah.php`, `stats.php`, `adsb.php`, `ais.php` anwenden

**Files:**
- Modify: `api/ping.php`, `api/nah.php`, `api/stats.php`, `api/adsb.php`, `api/ais.php` (je 1-2 Zeilen ergänzt)
- Modify: `docs/openapi.yaml` (je ein `405`-Eintrag für dieselben 5 Endpoints)

**Interfaces:**
- Consumes: `require_method()` aus `api/http.php` (Task 3).
- Produces: alle 5 Endpoints akzeptieren nur noch `GET` (`405` sonst).

- [ ] **Step 1: `api/ping.php` neu schreiben**

```php
<?php

require_once 'http.php';
require_method('GET');
header('Content-Type: application/json');
echo json_encode(['status' => 'ok', 'time' => time()]);
```

- [ ] **Step 2: `api/nah.php` — Guard einfügen**

Nach Zeile 3 (`require_once 'config.php';`) ergänzen:

```php
require_once 'http.php';
require_method('GET');
```

Kompletter neuer Dateikopf:

```php
<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');
date_default_timezone_set('Europe/Vienna');
header('Content-Type: application/json');
```

- [ ] **Step 3: `api/stats.php` — Guard einfügen**

Nach Zeile 3 (`require_once 'config.php';`) ergänzen:

```php
require_once 'http.php';
require_method('GET');
```

Kompletter neuer Dateikopf:

```php
<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');
date_default_timezone_set('Europe/Vienna');
header('Content-Type: application/json');
```

- [ ] **Step 4: `api/adsb.php` — Guard einfügen**

Kompletter neuer Dateikopf:

```php
<?php

/**
 * ADS-B Data Proxy
 */

require_once 'http.php';
require_method('GET');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
```

(Rest der Datei ab `$url = 'https://adsb.oe5ith.at/data/aircraft.json';` unverändert.)

- [ ] **Step 5: `api/ais.php` — Guard einfügen**

Kompletter neuer Dateikopf:

```php
<?php

/**
 * AIS Data Proxy
 */

require_once 'http.php';
require_method('GET');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
```

(Rest der Datei ab `$url = 'https://ais.oe5ith.at/data/ships.json';` unverändert.)

- [ ] **Step 6: Lokal verifizieren**

```bash
npm run dev:api &
sleep 2
for ep in ping.php nah.php stats.php; do
  echo "GET  $ep -> $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/$ep)"
  echo "POST $ep -> $(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8081/$ep)"
done
echo "POST adsb.php -> $(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8081/adsb.php)"
echo "POST ais.php  -> $(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8081/ais.php)"
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill
```

Erwartung: jede `GET`-Zeile `200`, jede `POST`-Zeile `405` (auch bei `adsb.php`/`ais.php`, wo die Methodenprüfung bereits vor dem externen `curl_init()`-Aufruf greift — der externe Host wird bei `405` gar nicht erst kontaktiert).

- [ ] **Step 7: `docs/openapi.yaml` — `405`-Response ergänzen**

Für jeden der 5 Endpoints (`ping.php`, `nah.php`, `stats.php`, `adsb.php`, `ais.php`) im jeweiligen `get.responses:`-Block dieses Fragment ergänzen (Einrückung analog den bestehenden `"200"`/`"502"`-Blöcken):

```yaml
        "405":
          description: Nicht erlaubte HTTP-Methode (nur GET)
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string, example: "Method not allowed" }
```

- [ ] **Step 8: Verifizieren**

```bash
npm run validate:openapi
```

- [ ] **Step 9: Commit**

```bash
git add api/ping.php api/nah.php api/stats.php api/adsb.php api/ais.php docs/openapi.yaml
git commit -m "$(cat <<'EOF'
fix(security): GET-only-Restriktion für ping/nah/stats/adsb/ais

Nutzt den in der vorigen Task eingeführten api/http.php-Helper. Folgearbeit
aus dem OWASP-Re-Audit vom 2026-07-25.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `api/geocoder.php` — GET-only + `lat`/`lon`-Validierung

**Files:**
- Modify: `api/geocoder.php` (komplett)
- Modify: `docs/openapi.yaml:226-257`

**Interfaces:**
- Consumes: `require_method()` aus `api/http.php` (Task 3).
- Produces: `GET /api/geocoder.php?reverse&lat=X&lon=Y` mit nicht-numerischem `X`/`Y` liefert `[]` (wie der bestehende "kein Parameter"-Fall). `q` (Adress-Freitextsuche) bleibt komplett unverändert und offen.

- [ ] **Step 1: `api/geocoder.php` neu schreiben**

```php
<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');
header('Content-Type: application/json');

// Unterscheidung zwischen Suche (q) und Reverse (lat/lon)
$query = $_GET['q'] ?? '';
$lat = $_GET['lat'] ?? '';
$lon = $_GET['lon'] ?? '';
$reverse = isset($_GET['reverse']);

if ($reverse && !empty($lat) && !empty($lon) && is_numeric($lat) && is_numeric($lon)) {
    // Reverse Geocoding
    $url = NOMINATIM_URL . "/reverse?lat=" . urlencode($lat) . "&lon=" . urlencode($lon) . "&format=json";
} elseif (!empty($query)) {
    // Normale Suche — bewusst unvalidierter Freitext, wird nur an eine feste externe URL
    // weitergereicht (kein SQL-/Code-Kontext), Nominatim macht eigenes Rate-Limiting.
    $url = NOMINATIM_URL . "/search?q=" . urlencode($query) . "&format=json";
} else {
    echo json_encode([]);
    exit;
}

$res = curl_request($url);

http_response_code($res['code']);
echo $res['data'];
```

- [ ] **Step 2: Lokal verifizieren**

```bash
npm run dev:api &
sleep 2
echo "GET  reverse gültig     -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/geocoder.php?reverse&lat=48.2&lon=14.3')"
echo "GET  reverse ungültig   -> $(curl -s 'http://127.0.0.1:8081/geocoder.php?reverse&lat=abc&lon=14.3')"
echo "GET  Freitextsuche      -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/geocoder.php?q=Linz')"
echo "POST                    -> $(curl -s -o /dev/null -w '%{http_code}' -X POST 'http://127.0.0.1:8081/geocoder.php?q=Linz')"
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill
```

Erwartung: erste Zeile echter HTTP-Code (Nominatim-abhängig), zweite Zeile `[]`, dritte Zeile echter HTTP-Code (Freitextsuche unverändert funktionsfähig), vierte Zeile `405`.

- [ ] **Step 3: `docs/openapi.yaml` — `405`-Response ergänzen**

Im bestehenden `/geocoder.php`-Block (`get.responses:`) den `405`-Eintrag aus Task 4 Step 7 ergänzen (identisches Fragment).

- [ ] **Step 4: Verifizieren**

```bash
npm run validate:openapi
```

- [ ] **Step 5: Commit**

```bash
git add api/geocoder.php docs/openapi.yaml
git commit -m "$(cat <<'EOF'
fix(security): geocoder.php validiert lat/lon, GET-only

Nicht-numerische lat/lon-Werte wurden bisher ungeprüft an Nominatim
weitergereicht — fällt jetzt auf den bestehenden Leer-Response-Pfad
zurück. Die Adress-Freitextsuche (q-Parameter) bleibt bewusst
unverändert offen, da sie nur an eine feste externe URL weitergereicht
wird (kein SQL-/Code-Kontext). Folgearbeit aus dem OWASP-Re-Audit vom
2026-07-25.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `stations.php` → `nearest-stations.php` (Rename + GET-only + `profile`-Validierung)

**Files:**
- Rename (git mv): `api/stations.php` → `api/nearest-stations.php`
- Modify: `api/nearest-stations.php` (nach dem Rename)
- Modify: `src/lib/RoutingService.ts:81,110`
- Modify: `src/lib/RoutingService.test.ts:70`
- Modify: `docs/openapi.yaml:106-157`
- Modify: `CLAUDE.md` (PHP-API-Beispielliste)

**Interfaces:**
- Consumes: `require_method()` aus `api/http.php` (Task 3).
- Produces: `GET /api/nearest-stations.php?target=...&profile=...` — `profile` muss `^[a-z0-9-]+$` matchen, sonst `400`. Ersetzt `GET /api/stations.php` vollständig (keine Rückwärtskompatibilität/Alias — internes API, nur von diesem Frontend konsumiert).

- [ ] **Step 1: Datei umbenennen**

```bash
git mv api/stations.php api/nearest-stations.php
```

- [ ] **Step 2: Guard + Validierung einfügen**

`api/nearest-stations.php` komplett neu:

```php
<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');
header('Content-Type: application/json');

$target = $_GET['target'] ?? null;
$type = $_GET['type'] ?? 'sew';
$profile = $_GET['profile'] ?? 'driving-car'; // Neues Profil-Parameter

if (!preg_match('/^[a-z0-9-]+$/', $profile)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid profile']);
    exit;
}

if (!$target) {
    http_response_code(400);
    echo json_encode(['error' => 'Parameter target (lat,lon) fehlt']);
    exit;
}

list($lat, $lon) = explode(',', $target);
$lat = (float)$lat;
$lon = (float)$lon;

// 1. DB Abfrage via Central Config
$db = get_db_conn();
$table = ($type === 'sew') ? 'emergency.rd_stations' : 'emergency.nef_stations';
$filter_col = ($type === 'sew') ? 'has_transport' : 'has_doctor';

$query = "
    SELECT id, name, short_name, organization as org, ST_Y(geom) as lat, ST_X(geom) as lon
    FROM $table
    WHERE $filter_col = true
    ORDER BY geom <-> ST_SetSRID(ST_Point($lon, $lat), 4326)
    LIMIT 20;
";

$res = pg_query($db, $query);
$stations = pg_fetch_all($res) ?: [];
pg_close($db);

if (empty($stations)) {
    echo json_encode([]);
    exit;
}

// 2. ORS Matrix via Central Helper
$locations = [];
foreach ($stations as $s) {
    $locations[] = [(float)$s['lon'], (float)$s['lat']];
}
$locations[] = [$lon, $lat];
$target_index = count($locations) - 1;

$payload = [
    "locations" => $locations,
    "sources" => range(0, count($stations) - 1),
    "destinations" => [$target_index],
    "metrics" => ["duration", "distance"]
];

$matrix_url = ORS_URL . "/matrix/" . urlencode($profile);
$res = curl_request($matrix_url, 'POST', json_encode($payload));

if ($res['code'] !== 200) {
    // Wenn Matrix für ein Profil fehlschlägt (z.B. driving-emergency), geben wir den Fehler weiter
    // oder die aufrufende Seite fängt es ab.
    http_response_code($res['code']);
    echo $res['data'];
    exit;
}

$matrix = json_decode($res['data'], true);

// 3. Ergebnisse kombinieren und sortieren
$results = [];
foreach ($stations as $i => $s) {
    $duration = $matrix['durations'][$i][0];
    $distance = $matrix['distances'][$i][0];

    if ($duration !== null) {
        // Icon-Logik basierend auf Typ und short_name
        $prefix = ($type === 'nef') ? 'nef-' : 'rd-';
        $org_key = strtolower(str_replace([' ', 'Ö', 'Ä', 'Ü'], ['', 'oe', 'ae', 'ue'], $s['short_name'] ?? ''));
        $icon = $prefix . ($org_key ?: 'fallback');

        $results[] = [
            "id" => (int)$s['id'],
            "name" => $s['name'],
            "short_name" => $s['short_name'],
            "org" => $s['org'],
            "lat" => (float)$s['lat'],
            "lon" => (float)$s['lon'],
            "duration" => $duration,
            "distance" => $distance,
            "icon" => $icon
        ];
    }
}

usort($results, function ($a, $b) {
    return $a['duration'] <=> $b['duration'];
});

// Wir geben standardmäßig 20 Ergebnisse zurück, wenn mehr als 5 angefordert werden (für den Sonderfall-Fallback)
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
echo json_encode(array_slice($results, 0, $limit));
```

(Einzige inhaltliche Änderung ggü. der alten `stations.php`: die neuen Zeilen `require_once 'http.php'; require_method('GET');` direkt nach `require_once 'config.php';`, und der neue `preg_match`-Guard direkt nach der `$profile`-Zeile. Rest identisch.)

- [ ] **Step 3: Frontend-Aufrufstellen umstellen**

In `src/lib/RoutingService.ts` Zeile 81:

```typescript
        const top7Base = await fetch(`/api/stations.php?target=${target[0]},${target[1]}&type=${type}&profile=driving-car&limit=7`);
```

zu:

```typescript
        const top7Base = await fetch(`/api/nearest-stations.php?target=${target[0]},${target[1]}&type=${type}&profile=driving-car&limit=7`);
```

Und Zeile 110:

```typescript
      const res = await fetch(`/api/stations.php?target=${target[0]},${target[1]}&type=${type}&profile=${profile}`);
```

zu:

```typescript
      const res = await fetch(`/api/nearest-stations.php?target=${target[0]},${target[1]}&type=${type}&profile=${profile}`);
```

- [ ] **Step 4: Test-Mock aktualisieren**

In `src/lib/RoutingService.test.ts` Zeile 70:

```typescript
      if (typeof url === 'string' && url.includes('stations.php')) {
```

zu:

```typescript
      if (typeof url === 'string' && url.includes('nearest-stations.php')) {
```

(Der alte Substring-Check `'stations.php'` hätte durch `nearest-stations.php` zufällig weiter gematcht — trotzdem explizit korrigieren, um keine unklare Abhängigkeit von einem Substring-Zufallstreffer zu haben.)

- [ ] **Step 5: `CLAUDE.md` — PHP-API-Beispielliste**

Zeile:

```
**PHP API (`api/`):** Read-only proxy/aggregator over the backend DB and external services (ORS routing, geocoder, tile server, ADS-B/AIS). Each endpoint is a standalone `*.php` file (`nah.php`, `stations.php`, `ors.php`, `geocoder.php`, `ping.php`, `adsb.php`, `ais.php`, …).
```

ersetzen durch:

```
**PHP API (`api/`):** Read-only proxy/aggregator over the backend DB and external services (ORS routing, geocoder, tile server, ADS-B/AIS). Each endpoint is a standalone `*.php` file (`nah.php`, `nearest-stations.php`, `ors.php`, `geocoder.php`, `ping.php`, `adsb.php`, `ais.php`, …).
```

- [ ] **Step 6: Lokal verifizieren**

```bash
npm run dev:api &
sleep 2
echo "gültig   driving-car -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/nearest-stations.php?target=48.2,14.3&profile=driving-car')"
echo "ungültig ../matrix/x -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/nearest-stations.php?target=48.2,14.3&profile=../matrix/x')"
echo "alter Pfad 404       -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/stations.php?target=48.2,14.3')"
echo "POST                 -> $(curl -s -o /dev/null -w '%{http_code}' -X POST 'http://127.0.0.1:8081/nearest-stations.php?target=48.2,14.3')"
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill
npx tsc --noEmit
npm test
```

Erwartung: erste Zeile `200`/DB-Fehlercode (nicht `400`), zweite Zeile `400`, dritte Zeile `404` (Datei existiert nicht mehr), vierte Zeile `405`. `tsc` 0 Fehler, alle Tests grün (inkl. dem angepassten `RoutingService.test.ts`).

- [ ] **Step 7: `docs/openapi.yaml` — Eintrag umbenennen + `400`/`405` ergänzen**

Den `/stations.php`-Block (aktuell Zeilen 106-157) ersetzen durch:

```yaml
  /nearest-stations.php:
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
          schema: { type: string, default: driving-car, pattern: "^[a-z0-9-]+$" }
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
          description: "Parameter target fehlt oder profile hat ein ungültiges Format"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string }
        "405":
          description: Nicht erlaubte HTTP-Methode (nur GET)
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string, example: "Method not allowed" }
```

- [ ] **Step 8: Verifizieren**

```bash
npm run validate:openapi
```

- [ ] **Step 9: Commit**

```bash
git add api/nearest-stations.php src/lib/RoutingService.ts src/lib/RoutingService.test.ts docs/openapi.yaml CLAUDE.md
git commit -m "$(cat <<'EOF'
refactor(api): stations.php in nearest-stations.php umbenannt, gehärtet

Name allein war nicht von region_stations.php (jetzt stations-by-region.php,
siehe nächste Task) zu unterscheiden, obwohl beide grundverschiedene
Abfragen sind. Zusätzlich GET-only-Restriktion und profile-Format-Validierung
(landet in einer ORS-Matrix-URL). Folgearbeit aus dem OWASP-Re-Audit vom
2026-07-25.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `region_stations.php` → `stations-by-region.php` (Rename + GET-only)

**Files:**
- Rename (git mv): `api/region_stations.php` → `api/stations-by-region.php`
- Modify: `api/stations-by-region.php` (nach dem Rename)
- Modify: `src/components/info/RegionsModule.ts:169`
- Modify: `docs/openapi.yaml` (Eintrag umbenennen + `405` ergänzen)

**Interfaces:**
- Consumes: `require_method()` aus `api/http.php` (Task 3).
- Produces: `GET /api/stations-by-region.php?state=X` ersetzt `GET /api/region_stations.php` vollständig.

- [ ] **Step 1: Datei umbenennen**

```bash
git mv api/region_stations.php api/stations-by-region.php
```

- [ ] **Step 2: Guard einfügen**

`api/stations-by-region.php` komplett neu:

```php
<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');

header('Content-Type: application/json');

if (!isset($_GET['state'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing state parameter"]);
    exit;
}

$state = $_GET['state'];

$db = get_db_conn();

$query = "
    SELECT id, 'RD' as type, name, short_name, organization as org 
    FROM emergency.rd_stations 
    WHERE state = $1
    UNION ALL
    SELECT id, 'NEF' as type, name, short_name, organization as org 
    FROM emergency.nef_stations 
    WHERE state = $1
    ORDER BY type, org, short_name
";

$result = pg_query_params($db, $query, array($state));

if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed"]);
    pg_close($db);
    exit;
}

$stations = [];
while ($row = pg_fetch_assoc($result)) {
    $stations[] = $row;
}

echo json_encode($stations);

pg_close($db);
```

(Einzige Änderung ggü. dem Original: die zwei neuen Zeilen `require_once 'http.php'; require_method('GET');` nach `require_once 'config.php';`.)

- [ ] **Step 3: Frontend-Aufrufstelle umstellen**

In `src/components/info/RegionsModule.ts` Zeile 169:

```typescript
      const response = await fetch(`/api/region_stations.php?state=${encodeURIComponent(state)}`, { signal });
```

zu:

```typescript
      const response = await fetch(`/api/stations-by-region.php?state=${encodeURIComponent(state)}`, { signal });
```

- [ ] **Step 4: Lokal verifizieren**

```bash
npm run dev:api &
sleep 2
echo "GET  gültig -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/stations-by-region.php?state=OOE')"
echo "POST        -> $(curl -s -o /dev/null -w '%{http_code}' -X POST 'http://127.0.0.1:8081/stations-by-region.php?state=OOE')"
echo "alter Pfad  -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/region_stations.php?state=OOE')"
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill
npx tsc --noEmit
npm test
```

Erwartung: erste Zeile `200`/DB-Fehlercode, zweite Zeile `405`, dritte Zeile `404`. `tsc`/Tests grün.

- [ ] **Step 5: `docs/openapi.yaml` — Eintrag umbenennen + `405` ergänzen**

Den `/region_stations.php`-Block ersetzen durch:

```yaml
  /stations-by-region.php:
    get:
      summary: RD/NEF-Stationen eines Bundeslands
      operationId: getStationsByRegion
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
        "405":
          description: Nicht erlaubte HTTP-Methode (nur GET)
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string, example: "Method not allowed" }
        "500":
          description: "Datenbankfehler"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string }
```

- [ ] **Step 6: Verifizieren**

```bash
npm run validate:openapi
```

- [ ] **Step 7: Commit**

```bash
git add api/stations-by-region.php src/components/info/RegionsModule.ts docs/openapi.yaml
git commit -m "$(cat <<'EOF'
refactor(api): region_stations.php in stations-by-region.php umbenannt

Name allein war nicht von stations.php/nearest-stations.php zu
unterscheiden. Zusätzlich GET-only-Restriktion. Folgearbeit aus dem
OWASP-Re-Audit vom 2026-07-25.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `api/ors.php` — `path`-Parameter auf Allowlist-Pattern beschränken

**Files:**
- Modify: `api/ors.php` (komplett)
- Modify: `docs/openapi.yaml:258-293`

**Interfaces:**
- Produces: `GET/POST /api/ors.php?path=...` — akzeptiert weiterhin `health`, `status`, `directions/{profil}/geojson`, `matrix/{profil}`, `isochrones/{profil}` (die einzigen Pfade, die das Frontend tatsächlich aufruft — `src/lib/RoutingService.ts:13,24,42`, `src/lib/IsochronesService.ts:22`, `api/nearest-stations.php` intern für `matrix/`), lehnt alles andere mit `400` ab. `{profil}` bleibt bewusst offen (`[a-z0-9-]+`), da ORS-Profile dynamisch vom externen ORS-Host konfiguriert werden.

- [ ] **Step 1: `api/ors.php` neu schreiben**

```php
<?php

require_once 'config.php';
header('Content-Type: application/json');

// Wir nutzen einen 'path' Parameter für die Weiterleitung
$path = $_GET['path'] ?? 'health';

// Allowlist statt beliebigem Pfad: ors.php hängt den API-Key an jede Anfrage an (curl_request()
// in config.php), ein unbeschränkter $path würde also erlauben, mit unserem Key beliebige
// ORS-Endpoints anzusprechen. {profil} bleibt bewusst offen ([a-z0-9-]+ statt fester
// Namensliste) — die gültigen ORS-Profile werden dynamisch vom ORS-Host konfiguriert
// (RoutingService.getProfiles() liest sie zur Laufzeit aus /status).
$allowedPathPattern = '#^(health|status|directions/[a-z0-9-]+/geojson|matrix/[a-z0-9-]+|isochrones/[a-z0-9-]+)$#';
if (!preg_match($allowedPathPattern, $path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$url = ORS_URL . "/" . ltrim($path, '/');

$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? file_get_contents('php://input') : null;

$res = curl_request($url, $method, $body);

http_response_code($res['code']);
echo $res['data'];
```

- [ ] **Step 2: Lokal verifizieren**

```bash
npm run dev:api &
sleep 2
echo "gültig  health              -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/ors.php?path=health')"
echo "gültig  status              -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/ors.php?path=status')"
echo "gültig  isochrones/driving-car -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/ors.php?path=isochrones/driving-car')"
echo "ungültig admin/secret        -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/ors.php?path=admin/secret')"
echo "ungültig ../../etc/passwd    -> $(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8081/ors.php?path=../../etc/passwd')"
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill
```

Erwartung: die ersten drei Zeilen liefern den echten HTTP-Code des ORS-Hosts (nicht `400`), die letzten beiden liefern `400`.

- [ ] **Step 3: `docs/openapi.yaml` — bestehenden `/ors.php`-Eintrag anpassen**

Den bestehenden Block (Zeilen 258-293) ersetzen durch:

```yaml
  /ors.php:
    get:
      summary: Proxy zu OpenRouteService (GET, z.B. Health-Check) — Allowlist-Pfade
      operationId: proxyOrsGet
      parameters:
        - name: path
          in: query
          required: false
          schema:
            type: string
            default: health
            enum:
              - health
              - status
          description: >
            Fester Wert (health/status) oder Muster directions/{profil}/geojson,
            matrix/{profil}, isochrones/{profil} — alles andere liefert 400.
            Kein Host-Override möglich (fest an ORS_URL angehängt).
      responses:
        "200":
          description: "ORS-Response (durchgereicht)"
          content:
            application/json:
              schema: { type: object }
        "400":
          description: "path entspricht keinem erlaubten Muster"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string, example: "Invalid path" }
    post:
      summary: Proxy zu OpenRouteService (POST, z.B. Routing/Matrix/Isochrones mit Body) — Allowlist-Pfade
      operationId: proxyOrsPost
      parameters:
        - name: path
          in: query
          required: false
          schema: { type: string, default: health }
          description: "Gleiche Allowlist wie beim GET-Zweig."
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
        "400":
          description: "path entspricht keinem erlaubten Muster"
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string, example: "Invalid path" }
```

- [ ] **Step 4: Verifizieren**

```bash
npm run validate:openapi
```

- [ ] **Step 5: Manueller Live-Rauchtest der drei betroffenen Frontend-Features**

```bash
npm run dev &
sleep 5
```

Im Browser (oder via Playwright, analog zum Vorgehen beim maplibre-gl-6-Upgrade): `/routing` eine Route berechnen, `/isochrones` eine Abfrage auslösen, `/nah` prüfen dass die "nächstgelegene Station"-Matrix-Berechnung (nutzt `nearest-stations.php` → intern `ORS_URL/matrix/...`, nicht über `ors.php`, aber gleiche `ORS_API_KEY`-Kette) weiterhin funktioniert. Alle drei müssen wie vor der Änderung funktionieren — falls einer davon einen anderen `path`-Wert nutzt als die vier oben gelisteten, ist die Allowlist zu eng und muss um genau diesen Wert erweitert werden, bevor committet wird.

```bash
lsof -ti:8000 -sTCP:LISTEN | xargs -r kill
lsof -ti:8081 -sTCP:LISTEN | xargs -r kill
```

- [ ] **Step 6: Commit**

```bash
git add api/ors.php docs/openapi.yaml
git commit -m "$(cat <<'EOF'
fix(security): ors.php path-Parameter auf Allowlist beschränkt

ors.php hängt den ORS-API-Key an jede Anfrage an — ein unbeschränkter path
erlaubte, mit unserem Key beliebige ORS-Endpoints anzusprechen. Beschränkt
jetzt auf die vier tatsächlich vom Frontend genutzten Pfad-Muster (health,
status, directions/{profil}/geojson, matrix/{profil}, isochrones/{profil}),
alles andere liefert 400. {profil} bleibt offen, da ORS-Profile dynamisch
vom externen ORS-Host konfiguriert werden. Folgearbeit aus dem
OWASP-Re-Audit vom 2026-07-25.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Doku-Konsolidierung — `API_ENDPOINTS.md` löschen, `openapi.yaml` als alleinige Quelle

**Files:**
- Delete: `docs/API_ENDPOINTS.md`
- Modify: `src/components/info/HealthModule.ts:19`
- Modify: `CLAUDE.md` (OpenAPI-Standards-Zeile, neuer Migrations-Absatz)

**Interfaces:**
- Konsumiert nichts Neues. Muss **nach** Task 1-8 laufen (referenziert deren Endergebnis).

- [ ] **Step 1: `docs/API_ENDPOINTS.md` löschen**

```bash
git rm docs/API_ENDPOINTS.md
```

- [ ] **Step 2: `HealthModule.ts` — toten Verweis entfernen**

In `src/components/info/HealthModule.ts` Zeile 19:

```html
        <p class="page-subtitle">Live-Monitor der technischen Dienste und APIs. Details in docs/API_ENDPOINTS.md.</p>
```

zu:

```html
        <p class="page-subtitle">Live-Monitor der technischen Dienste und APIs.</p>
```

- [ ] **Step 3: `CLAUDE.md` — OpenAPI-Standards-Zeile korrigieren**

Zeile:

```
| OpenAPI 3.x (vormals Swagger) | https://spec.openapis.org/oas/latest.html | Sollstandard zur formalen Beschreibung der `api/*.php`-Endpoints (Pfade, Query-Parameter, Response-Schemas) | bisher keine OpenAPI-Spec vorhanden — jeder Endpoint ist eine eigenständige PHP-Datei ohne formales Schema; Erstellung als Aufgabe in TODO.md |
```

ersetzen durch:

```
| OpenAPI 3.x (vormals Swagger) | https://spec.openapis.org/oas/latest.html | Sollstandard zur formalen Beschreibung der `api/*.php`-Endpoints (Pfade, Query-Parameter, Response-Schemas) | umgesetzt: `docs/openapi.yaml` deckt alle Endpoints ab, validiert via `npm run validate:openapi`; einzige Quelle für Endpoint-Dokumentation (das frühere, unvollständige `docs/API_ENDPOINTS.md` wurde 2026-07-25 gelöscht) |
```

- [ ] **Step 4: `CLAUDE.md` — Migrations-Absatz ergänzen**

Direkt nach der PHP-API-Architekturzeile (bereits in Task 6 auf `nearest-stations.php` aktualisiert) einen neuen Satz im selben Absatz ergänzen. Zeile aktuell (nach Task 6):

```
**PHP API (`api/`):** Read-only proxy/aggregator over the backend DB and external services (ORS routing, geocoder, tile server, ADS-B/AIS). Each endpoint is a standalone `*.php` file (`nah.php`, `nearest-stations.php`, `ors.php`, `geocoder.php`, `ping.php`, `adsb.php`, `ais.php`, …).
```

ersetzen durch (Migrations-Hinweis als neuer Satz angehängt):

```
**PHP API (`api/`):** Read-only proxy/aggregator over the backend DB and external services (ORS routing, geocoder, tile server, ADS-B/AIS). Each endpoint is a standalone `*.php` file (`nah.php`, `nearest-stations.php`, `ors.php`, `geocoder.php`, `ping.php`, `adsb.php`, `ais.php`, …). Bei einer Verschiebung auf einen neuen Produktivserver: `api/config.php`-Konstanten (`DB_HOST`, `ORS_URL`, `NOMINATIM_URL`) anpassen, ausgehende Verbindungen zu `ORS_URL`/`NOMINATIM_URL` freischalten, Zugriffsberechtigungen für `DB_USER` auf der neuen DB-Instanz sicherstellen.
```

- [ ] **Step 5: Verifizieren**

```bash
npx tsc --noEmit
npm test
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/info/HealthModule.ts CLAUDE.md
git rm docs/API_ENDPOINTS.md
git commit -m "$(cat <<'EOF'
docs(api): API_ENDPOINTS.md gelöscht, openapi.yaml als alleinige Quelle

API_ENDPOINTS.md deckte nur 5 von 12 Endpoints ab und enthielt veraltete
Angaben (u.a. die falsche Behauptung, ors.php brauche keinen API-Key).
docs/openapi.yaml ist bereits vollständig und maschinell validiert —
CLAUDE.md referenziert es jetzt als einzige Quelle. Migrations-Hinweise
nach CLAUDE.md verschoben (Ops-Runbook-Inhalt, kein API-Doku-Inhalt).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Restliche Doku (TODO.md, TODO_ARCHIVE.md, CHANGELOG.md, OWASP-Checkliste) + Gesamtverifikation

**Files:**
- Modify: `docs/security/owasp-top10-checklist.md`
- Modify: `docs/TODO.md`
- Modify: `docs/TODO_ARCHIVE.md`
- Modify: `docs/CHANGELOG.md`

**Interfaces:**
- Konsumiert nichts Neues — reine Doku, fasst Task 1-9 zusammen. Muss als letztes laufen.

- [ ] **Step 1: `docs/security/owasp-top10-checklist.md` — A01-Abschnitt**

Den Absatz, der mit `**Neuer Fund beim Re-Audit (2026-07-25): \`db.php\` — ⚠️ offen.**` beginnt, ersetzen durch:

```markdown
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
```

- [ ] **Step 2: `docs/security/owasp-top10-checklist.md` — A05-Abschnitt**

Status-Zeile:

```markdown
**Status: ⚠️ teilweise (db.php offen, diag.php behoben)**
```

zu:

```markdown
**Status: ⚠️ teilweise (curl-Timeout offen, Rest behoben)**
```

Den Bullet `- \`db.php\` — ⚠️ offen (neuer Fund 2026-07-25), siehe A01 für Details.` zu:

```markdown
- `db.php` — ✅ behoben, siehe A01.
```

Nach dem `test.php`-Bullet einen neuen Bullet ergänzen:

```markdown
- **Method-/Input-Restriktion (2026-07-25):** alle neun verbleibenden reinen Lese-Endpoints
  akzeptieren nur noch `GET` (`api/http.php`, `require_method()`), `ors.php`/`nearest-stations.php`
  validieren `path`/`profile` gegen Allowlist-Muster, `geocoder.php` validiert `lat`/`lon` als
  numerisch (Adress-Freitextsuche bleibt bewusst offen). `curl_request()`-Timeout-Fund bleibt
  separat offen.
```

- [ ] **Step 3: `docs/security/owasp-top10-checklist.md` — Zusammenfassungstabelle + Schluss**

Zeilen:

```markdown
| A01 Broken Access Control | ⚠️ (db.php-Fund offen, diag.php behoben — siehe TODO.md) |
```

zu:

```markdown
| A01 Broken Access Control | ⚠️ (diag.php by design öffentlich behandelt, db.php behoben) |
```

Zeile:

```markdown
| A05 Security Misconfiguration | ⚠️ (db.php + curl-Timeout offen, diag.php behoben, Header ✅ — siehe TODO.md) |
```

zu:

```markdown
| A05 Security Misconfiguration | ⚠️ (curl-Timeout offen, Rest behoben, Header ✅ — siehe TODO.md) |
```

Abschnitt:

```markdown
**Offener Fix-Bedarf (Stand 2026-07-25):**
- `db.php`-Info-Disclosure (A01/A05) — Produktentscheidung nötig (Response kürzen vs. Risiko
  akzeptieren), als TODO.md-Punkt erfasst.
- Fehlender Timeout in `curl_request()` (A05) — mechanischer Fix, als TODO.md-Punkt erfasst.

**Historisch behoben:** `diag.php`-Info-Disclosure (A01/A05), gefunden und gefixt 2026-07-08/09,
siehe `TODO_ARCHIVE.md`.
```

zu:

```markdown
**Offener Fix-Bedarf (Stand 2026-07-25):**
- Fehlender Timeout in `curl_request()` (A05) — mechanischer Fix, als TODO.md-Punkt erfasst.

**Historisch behoben:** `diag.php`-Info-Disclosure (A01/A05), gefunden und gefixt 2026-07-08/09.
`db.php`-Info-Disclosure (A01/A05) samt API-Debug-Modul, Endpoint-Umbenennung und
Method-/Input-Restriktion auf der gesamten `api/*.php`-Fläche, gefunden und gefixt 2026-07-25 —
siehe `TODO_ARCHIVE.md`.
```

- [ ] **Step 4: `docs/TODO.md` — `db.php`-Punkt entfernen**

Den kompletten `db.php`-Eintrag (beginnt mit `- [ ] **\`api/db.php\` exponiert PostgreSQL-Versionsstring...`) aus `## Sonstiges` löschen. Der `curl_request()`-Timeout-Punkt bleibt unverändert stehen.

- [ ] **Step 5: `docs/TODO_ARCHIVE.md` — neuer Eintrag**

Am Anfang der Datei (nach der Kopfzeile, vor dem ersten bestehenden `## YYYY-MM-DD`-Abschnitt) ergänzen:

```markdown
## 2026-07-25 — OWASP-Re-Audit: db.php-Info-Disclosure behoben, API-Fläche generell gehärtet

- [x] **`api/db.php`-Info-Disclosure behoben, Debug-Playground entfernt, API-Endpoints umbenannt
  und generell gehärtet** (2026-07-25) — beim OWASP-Re-Audit gefunden (siehe
  [docs/security/owasp-top10-checklist.md](./security/owasp-top10-checklist.md), Kategorien
  A01/A05): `api/db.php` exponierte live den vollen PostgreSQL-Versionsstring (inkl. OS-Build)
  und die DB-Uptime ohne Zugriffsschutz. Fix: `db.php` liefert jetzt nur noch einen reinen
  Status-Code (200/500) ohne Body — kein Frontend-Code las den Body ohnehin. Auf Nutzer-Wunsch
  im selben Arbeitsblock zusätzlich: komplette `DebugModule.ts` (`/info/debug`,
  API-Request-Playground) entfernt; `test.php` gelöscht (Duplikat von `ping.php`);
  `stations.php`/`region_stations.php` in `nearest-stations.php`/`stations-by-region.php`
  umbenannt (Namen allein waren nicht unterscheidbar); neuer `api/http.php`-Helper erzwingt
  GET-only bei neun Lese-Endpoints (405 sonst); `ors.php` validiert `path` gegen eine Allowlist
  bekannter ORS-Routen (verhindert Missbrauch des ORS-API-Keys für beliebige Pfade),
  `nearest-stations.php` validiert `profile`-Format, `geocoder.php` validiert `lat`/`lon` als
  numerisch (Adress-Freitextsuche bleibt bewusst offen). Doku konsolidiert: `docs/API_ENDPOINTS.md`
  (unvollständig, teils veraltet) gelöscht, `docs/openapi.yaml` (vollständig, maschinell validiert)
  als alleinige Quelle, `CLAUDE.md`s veraltete „keine OpenAPI-Spec vorhanden"-Behauptung korrigiert.
  Spec: [docs/superpowers/specs/2026-07-25-api-hardening-design.md](./superpowers/specs/2026-07-25-api-hardening-design.md).
  Plan: [docs/superpowers/plans/2026-07-25-api-hardening-debug-removal.md](./superpowers/plans/2026-07-25-api-hardening-debug-removal.md).
```

- [ ] **Step 6: `docs/CHANGELOG.md` — neuer Journal-Block**

Ganz oben (vor dem aktuell ersten `## [...]`-Eintrag) ergänzen (Zeitstempel zum Ausführungszeitpunkt mit `date "+%Y-%m-%d %H:%M"` ermitteln):

```markdown
## [Unreleased] - <AKTUELLES DATUM/UHRZEIT>

### Sicherheit
- **API-Hardening (Folgearbeit aus dem OWASP-Re-Audit vom 2026-07-25).** `api/db.php` exponierte
  live den vollen PostgreSQL-Versionsstring + Uptime ohne Zugriffsschutz — liefert jetzt nur noch
  einen reinen Status-Code (200/500) ohne Body. Die `DebugModule.ts`-Seite (`/info/debug`, freies
  API-Request-Playground) wurde komplett entfernt. `stations.php`/`region_stations.php` wurden in
  `nearest-stations.php`/`stations-by-region.php` umbenannt (die alten Namen waren nicht
  unterscheidbar), `test.php` (Duplikat von `ping.php`) entfernt. Neun read-only API-Endpoints
  akzeptieren jetzt nur noch `GET` (405 sonst). `ors.php` validiert den `path`-Parameter gegen
  eine Allowlist bekannter ORS-Routen (verhindert Missbrauch des serverseitigen ORS-API-Keys für
  beliebige Pfade), `nearest-stations.php` validiert das `profile`-Format, `geocoder.php`
  validiert `lat`/`lon` als numerisch (Adress-Freitextsuche bleibt unverändert offen).
- **API-Dokumentation konsolidiert.** `docs/API_ENDPOINTS.md` (unvollständig, teils veraltet)
  gelöscht — `docs/openapi.yaml` (vollständig, maschinell validiert) ist jetzt die alleinige
  Quelle für alle `api/*.php`-Endpoints.
```

- [ ] **Step 7: Gesamtverifikation**

```bash
npx tsc --noEmit
npm test
npm run build
npm run validate:openapi
composer run lint
```

Erwartung: alle fünf Befehle grün/fehlerfrei.

- [ ] **Step 8: Commit**

```bash
git add docs/security/owasp-top10-checklist.md docs/TODO.md docs/TODO_ARCHIVE.md docs/CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs(security): API-Hardening abgeschlossen (Audit-Checkliste, TODO, Changelog)

Schließt die db.php-Info-Disclosure als behoben ab, verschiebt den Punkt
ins TODO_ARCHIVE.md, dokumentiert Endpoint-Umbenennung + Method-/Input-
Restriktion in der OWASP-Checkliste und im CHANGELOG.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Nicht Teil dieses Plans (siehe Spec, Abschnitt „Nicht Teil dieser Spec")

- `curl_request()`-Timeout-Fund (`api/config.php`) — separater, bereits dokumentierter TODO.md-Punkt.
- `api/diag.php` — bewusst unangetastet.
- Rate-Limiting — nicht angefragt.
- Umbenennung der übrigen 9 Endpoints — bewusst verworfen (nur die zwei echten Klarheitsprobleme).
- Längenbegrenzung für `geocoder.php`s `q`-Parameter — bewusst verworfen.
- `region_stations.php`s (jetzt `stations-by-region.php`) `state`-Parameter gegen eine feste Länder-Liste validieren — kein Sicherheits-, nur ein optionaler Robustheitspunkt.
