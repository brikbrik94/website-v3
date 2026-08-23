# Routing-Endpoints: Konsolidierung + öffentlicher Valhalla-Rollout — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ORS- und Valhalla-Zugriff über die Routing-Endpoints werden auf geteilte
Provider-Client-Funktionen + einen konsolidierten `routing-proxy.php`-Endpoint umgestellt (statt
duplizierter curl-Logik in `ors.php`/`valhalla.php`/`nearest-stations.php`), ORS/Nominatim
wechseln auf lokale VPS-Adressen ohne API-Key, und die öffentlichen Routing-Endpoints bekommen
eine einheitliche nginx-Zugriffsbeschränkung (Rate-Limit + Referer-Check) — Voraussetzung dafür,
dass Valhalla ein dauerhafter, öffentlicher Zweit-Provider auf `map.oe5ith.at` werden kann.

**Architecture:** `ors_call()`/`valhalla_call()` (neu, `api/ors-client.php`/`api/valhalla-client.php`)
sind reine PHP-Funktionen ohne HTTP-Zwischenschritt, identisches Rückgabeformat
(`['code'=>int,'data'=>string]`). `api/routing-proxy.php` (neu, ersetzt `ors.php`+`valhalla.php`)
ist ein Aufrufer davon für Einzel-Requests, `api/nearest-stations.php` ein zweiter für die
Matrixsuche — keine der beiden dupliziert mehr curl-Setup. Frontend bekommt eine einzige
`buildRoutingProxyUrl()`-Hilfsfunktion statt drei unabhängiger URL-Konstanten.

**Tech Stack:** PHP (kein automatisiertes Test-Framework in `api/`, siehe `CLAUDE.md`),
TypeScript (Vite/Vitest), nginx.

**Spec:** `docs/superpowers/specs/2026-08-23-routing-endpoints-public-rollout-design.md`

## Global Constraints

- `ORS_URL`-Default wird `http://127.0.0.1:8082`, `NOMINATIM_URL`-Default wird `http://127.0.0.1:8080`.
- `ORS_API_KEY` entfällt vollständig — Konstante, Fail-Closed-Check, `curl_request()`s
  Auto-Header, `config.local.php.example`.
- `ors_call($path, $method, $body)`/`valhalla_call($path, $method, $body)` geben beide
  `['code' => int, 'data' => string]` zurück — identisches Format, damit Aufrufer beide Provider
  gleich behandeln.
- `routing-proxy.php`s ORS-Allowlist ist 1:1 die bisherige aus `ors.php`:
  `^(health|status|directions/[a-z0-9-]+/geojson|matrix/[a-z0-9-]+|isochrones/[a-z0-9-]+|export/[a-z0-9-]+(/topojson)?)$`.
  Valhalla-Allowlist bleibt `^(route|status)$` — `sources_to_targets` wird **nie** über
  `routing-proxy.php` exponiert, nur in-process von `nearest-stations.php` aufgerufen.
- Bei Nicht-2xx-Antwort eines Providers: **nie** den rohen Upstream-Body an den Client
  durchreichen — generische JSON-Fehlermeldung + `error_log()` mit Detail serverseitig. Gilt für
  `routing-proxy.php` UND `nearest-stations.php`.
- nginx: `limit_req_zone $binary_remote_addr zone=routing_limit:10m rate=10r/s;` (Startwert),
  `limit_req zone=routing_limit burst=20 nodelay;` + `valid_referers none blocked map.oe5ith.at;`
  auf beiden öffentlichen Routing-Locations (`routing-proxy.php`, `nearest-stations.php`).
- Deutsche Kommentare/Copy.
- Nach jedem PHP-Task: `php -l <geänderte-dateien>`. Nach jedem TS-Task:
  `npx tsc --noEmit && npm test`. Live-curl-Verifikation nur dort, wo diese Umgebung tatsächlich
  Netzwerkzugriff hat (bestätigt: Valhalla-Tailscale-IP, lokale Postgres-DB — **nicht**
  bestätigt/nicht erwartet: `127.0.0.1:8082`/`:8080` in dieser Sandbox, das sind reale
  VPS-Adressen, kein ORS/Nominatim läuft hier lokal mit). Live-Verifikation von ORS/Nominatim
  über die neuen Adressen ist Aufgabe des Nutzers auf dem echten Server.

---

## Task 1: `api/config.php` + `api/config.local.php.example` — lokale Endpunkte, `ORS_API_KEY` entfällt

**Files:**
- Modify: `api/config.php`
- Modify: `api/config.local.php.example`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: `ORS_URL`-Default `http://127.0.0.1:8082`, `NOMINATIM_URL`-Default
  `http://127.0.0.1:8080`, `curl_request()` ohne Auto-`X-API-KEY`-Header — wird von Task 2
  (`ors_call()`) und unverändert von `geocoder.php`/`diag.php` genutzt.

- [ ] **Step 1: `config.php` — Endpunkt-Defaults + Secret-Check anpassen**

Ersetze in `api/config.php`:

```php
// Datenbank (PostGIS) — Host/Port/Name/User sind unkritische Defaults, DB_PASS
// und ORS_API_KEY haben bewusst KEINEN Default (Secrets dürfen nicht im Repo
// stehen); sie müssen über config.local.php (gitignored) gesetzt werden.
defined('DB_HOST') || define('DB_HOST', '127.0.0.1');
defined('DB_PORT') || define('DB_PORT', '5432');
defined('DB_NAME') || define('DB_NAME', 'emergency_db');
defined('DB_USER') || define('DB_USER', 'web_api_user');

// Endpunkte
defined('ORS_URL') || define('ORS_URL', 'https://ors.oe5ith.at');
defined('NOMINATIM_URL') || define('NOMINATIM_URL', 'https://geocoder.oe5ith.at');

// Secrets müssen aus config.local.php kommen — kein Fallback-Wert im Repo.
if (!defined('DB_PASS') || !defined('ORS_API_KEY')) {
    http_response_code(500);
    echo json_encode(['error' => 'Server misconfigured: missing config.local.php with required secrets']);
    exit;
}
```

durch:

```php
// Datenbank (PostGIS) — Host/Port/Name/User sind unkritische Defaults, DB_PASS
// hat bewusst KEINEN Default (Secret darf nicht im Repo stehen); muss über
// config.local.php (gitignored) gesetzt werden.
defined('DB_HOST') || define('DB_HOST', '127.0.0.1');
defined('DB_PORT') || define('DB_PORT', '5432');
defined('DB_NAME') || define('DB_NAME', 'emergency_db');
defined('DB_USER') || define('DB_USER', 'web_api_user');

// Endpunkte — ORS/Nominatim laufen lokal auf demselben VPS (siehe
// docs/superpowers/specs/2026-08-23-routing-endpoints-public-rollout-design.md), kein API-Key
// mehr nötig (Voraussetzung: beide sind serverseitig nur an 127.0.0.1 gebunden, nicht 0.0.0.0).
defined('ORS_URL') || define('ORS_URL', 'http://127.0.0.1:8082');
defined('NOMINATIM_URL') || define('NOMINATIM_URL', 'http://127.0.0.1:8080');

// Secrets müssen aus config.local.php kommen — kein Fallback-Wert im Repo.
if (!defined('DB_PASS')) {
    http_response_code(500);
    echo json_encode(['error' => 'Server misconfigured: missing config.local.php with required secrets']);
    exit;
}
```

- [ ] **Step 2: `config.php` — `curl_request()` verliert den Auto-Header**

Ersetze:

```php
    $default_headers = [
        "X-API-KEY: " . ORS_API_KEY,
        "Content-Type: application/json"
    ];
```

durch:

```php
    $default_headers = [
        "Content-Type: application/json"
    ];
```

- [ ] **Step 3: `config.local.php.example` aktualisieren**

Ersetze den kompletten Inhalt von `api/config.local.php.example` mit:

```php
<?php
/**
 * Local Override Configuration for OE5ITH API
 * Copy this file to config.local.php to override production settings.
 */

// Override Database Settings for Local Testing
// define('DB_HOST', '127.0.0.1');
// define('DB_PORT', '5432');
// define('DB_NAME', 'emergency_db_dev');
// define('DB_USER', 'dev_user');
// define('DB_PASS', 'dev_password');

// Override Endpoints (Production-Default zeigt auf lokale VPS-Instanzen, 127.0.0.1:8082/8080 —
// hier überschreiben, falls lokal kein ORS/Nominatim erreichbar ist, z.B. eigene Dev-Instanz)
// define('ORS_URL', 'http://localhost:8080/ors');
// define('NOMINATIM_URL', 'http://localhost:8080/nominatim');
// define('VALHALLA_URL', 'http://100.x.x.x:8002'); // eigene Tailscale-IP, nur für lokale Tests
```

(Entfernt: die alte „Override API Keys for Local Testing"-Sektion mit `ORS_API_KEY`.)

- [ ] **Step 4: Lint**

Run: `php -l api/config.php`
Expected: `No syntax errors detected in api/config.php`

- [ ] **Step 5: Commit**

Plan-Doku reitet mit diesem ersten Code-Commit mit (Repo-Konvention: kein eigener Doku-Commit
fürs Plan-Dokument selbst):

```bash
git add api/config.php api/config.local.php.example docs/superpowers/plans/2026-08-23-routing-endpoints-public-rollout.md
git commit -m "feat(routing): ORS/Nominatim auf lokale VPS-Adressen umgestellt, ORS_API_KEY entfällt"
```

---

## Task 2: `api/ors-client.php` + `api/valhalla-client.php` — geteilte Provider-Funktionen

**Files:**
- Create: `api/ors-client.php`
- Create: `api/valhalla-client.php`

**Interfaces:**
- Consumes: `ORS_URL`/`VALHALLA_URL`-Konstanten, `curl_request()` (alle aus `config.php`, Task 1).
- Produces: `ors_call(string $path, string $method = 'GET', ?string $body = null): array` und
  `valhalla_call(string $path, string $method = 'GET', ?string $body = null): array`, beide
  `['code' => int, 'data' => string]` — werden von Task 3 (`routing-proxy.php`) und Task 4
  (`nearest-stations.php`) konsumiert.

- [ ] **Step 1: `api/ors-client.php` anlegen**

```php
<?php

require_once 'config.php';

/**
 * Ruft einen Pfad gegen ORS_URL auf — reine Funktion, kein eigener HTTP-Endpoint. Nutzt
 * curl_request() aus config.php (ohne Auto-Header, siehe Task 1), da ORS lokal läuft und keine
 * Sonderbehandlung mehr braucht.
 */
function ors_call(string $path, string $method = 'GET', ?string $body = null): array
{
    $url = ORS_URL . '/' . ltrim($path, '/');
    return curl_request($url, $method, $body);
}
```

- [ ] **Step 2: `api/valhalla-client.php` anlegen**

```php
<?php

require_once 'config.php';

/**
 * Ruft einen Pfad gegen VALHALLA_URL auf — reine Funktion, kein eigener HTTP-Endpoint. Eigener,
 * schlanker curl-Aufruf statt curl_request(): Valhalla braucht keinen X-API-KEY-Header.
 */
function valhalla_call(string $path, string $method = 'GET', ?string $body = null): array
{
    if (!defined('VALHALLA_URL')) {
        return ['code' => 500, 'data' => json_encode([
            'error' => 'Server misconfigured: VALHALLA_URL not set in config.local.php'
        ])];
    }

    $url = VALHALLA_URL . '/' . ltrim($path, '/');

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['code' => $http_code ?: 502, 'data' => $response];
}
```

- [ ] **Step 3: Lint**

Run: `php -l api/ors-client.php && php -l api/valhalla-client.php`
Expected: beide `No syntax errors detected`.

- [ ] **Step 4: Direkter Web-Aufruf ist harmlos (Selbsttest, kein automatisierter Test möglich)**

Beide Dateien definieren nur eine Funktion, kein Top-Level-Seiteneffekt — ein direkter Aufruf
über die URL (z.B. `/api/ors-client.php`) liefert eine leere Antwort, kein Fehler, keine
Daten-Preisgabe. Kurz mit `php -f api/ors-client.php` bzw. `php -f api/valhalla-client.php`
bestätigen (kein Output, kein Fehler) — kein nginx-`deny` nötig, analog `api/http.php` heute.

- [ ] **Step 5: Commit**

```bash
git add api/ors-client.php api/valhalla-client.php
git commit -m "feat(routing): geteilte Provider-Client-Funktionen ors_call()/valhalla_call()"
```

---

## Task 3: `api/routing-proxy.php` (neu) — ersetzt `ors.php` + `valhalla.php`

**Files:**
- Create: `api/routing-proxy.php`
- Delete: `api/ors.php`
- Delete: `api/valhalla.php`

**Interfaces:**
- Consumes: `ors_call()`/`valhalla_call()` (Task 2).
- Produces: HTTP-Endpoint `GET/POST /api/routing-proxy.php?provider=ors|valhalla&path=...` — wird
  von Task 7 (Frontend) konsumiert.

- [ ] **Step 1: `api/routing-proxy.php` anlegen**

```php
<?php

require_once 'config.php';
require_once 'ors-client.php';
require_once 'valhalla-client.php';
header('Content-Type: application/json');

$provider = $_GET['provider'] ?? 'ors';
$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? file_get_contents('php://input') : null;

if ($provider === 'ors') {
    $path = $_GET['path'] ?? 'health';
    // {profil} bleibt bewusst offen ([a-z0-9-]+ statt fester Namensliste) — die gültigen
    // ORS-Profile werden dynamisch vom ORS-Host konfiguriert (RoutingService.getProfiles()
    // liest sie zur Laufzeit aus /status).
    $allowedPathPattern = '#^(health|status|directions/[a-z0-9-]+/geojson|matrix/[a-z0-9-]+' .
        '|isochrones/[a-z0-9-]+|export/[a-z0-9-]+(/topojson)?)$#D';
    if (!preg_match($allowedPathPattern, $path)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid path']);
        exit;
    }
    $res = ors_call($path, $method, $body);
} elseif ($provider === 'valhalla') {
    $path = $_GET['path'] ?? 'status';
    // sources_to_targets bewusst NICHT in dieser Allowlist — wird nur in-process von
    // nearest-stations.php aufgerufen, nie über diesen öffentlichen Pfad exponiert.
    if (!preg_match('#^(route|status)$#D', $path)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid path']);
        exit;
    }
    $res = valhalla_call($path, $method, $body);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid provider']);
    exit;
}

if ($res['code'] >= 200 && $res['code'] < 300) {
    http_response_code($res['code']);
    echo $res['data'];
} else {
    // Rohen Upstream-Body nie an den Client durchreichen (Backend-Fingerprinting) — Detail nur
    // ins Server-Log, Client bekommt eine generische Meldung.
    error_log("routing-proxy.php: provider=$provider path=$path upstream_code={$res['code']} body=" .
        substr((string)$res['data'], 0, 500));
    http_response_code($res['code'] ?: 502);
    echo json_encode(['error' => 'Routing-Anfrage fehlgeschlagen']);
}
```

- [ ] **Step 2: `api/ors.php` und `api/valhalla.php` löschen**

```bash
git rm api/ors.php api/valhalla.php
```

- [ ] **Step 3: Lint**

Run: `php -l api/routing-proxy.php`
Expected: `No syntax errors detected in api/routing-proxy.php`

- [ ] **Step 4: Manuelle Verifikation (soweit in dieser Umgebung möglich)**

`VALHALLA_URL` ist in dieser Umgebung real erreichbar (Tailscale, bereits in früheren Runden
bestätigt) — `ORS_URL`/`NOMINATIM_URL` zeigen nach Task 1 auf `127.0.0.1:8082`/`:8080`, die es in
dieser Sandbox nicht gibt (reale VPS-Adressen). Starte den PHP-Dev-Server
(`cd api && php -S 127.0.0.1:8081 router.php`, falls nicht schon aktiv) und prüfe:

```bash
curl "http://127.0.0.1:8081/routing-proxy.php?provider=valhalla&path=status"
curl "http://127.0.0.1:8081/routing-proxy.php?provider=ors&path=health"
curl "http://127.0.0.1:8081/routing-proxy.php?provider=foo&path=x"
```

Erwartet: Valhalla-`status` liefert eine echte JSON-Antwort (200); ORS-`health` liefert einen
Verbindungsfehler (kein lokaler ORS hier) — **das ist erwartet, kein Bug** (`$res['code']` wird
z.B. `0`/`502`, generische Fehlermeldung statt rohem Body, kein PHP-Fatal); `provider=foo`
liefert sauber `400`. Volle ORS-Verifikation ist Aufgabe des Nutzers auf dem echten VPS.

- [ ] **Step 5: Commit**

```bash
git add api/routing-proxy.php
git commit -m "feat(routing): routing-proxy.php ersetzt ors.php + valhalla.php"
```

---

## Task 4: `api/nearest-stations.php` — nutzt die geteilten Client-Funktionen

**Files:**
- Modify: `api/nearest-stations.php`

**Interfaces:**
- Consumes: `ors_call()`/`valhalla_call()` (Task 2).
- Produces: keine Verhaltensänderung nach außen (gleiche Query-Parameter/Response-Struktur wie
  bisher) — nur interne Implementierung + sanitisierte Fehlerantworten.

- [ ] **Step 1: `require_once` für die Client-Dateien ergänzen**

Ersetze in `api/nearest-stations.php`:

```php
<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');
```

durch:

```php
<?php

require_once 'config.php';
require_once 'http.php';
require_once 'ors-client.php';
require_once 'valhalla-client.php';
require_method('GET');
```

- [ ] **Step 2: Matrix-Aufruf-Abschnitt auf die Client-Funktionen umstellen**

Ersetze den kompletten Abschnitt ab `// 2. Matrix-Aufruf` bis (exklusiv) `// 3. Ergebnisse
kombinieren und sortieren`:

```php
// 2. Matrix-Aufruf — Provider-Branch (Stationssuche oben bleibt für beide Provider gemeinsam)
if ($provider === 'valhalla') {
    $sources = [];
    foreach ($stations as $s) {
        $sources[] = ['lat' => (float)$s['lat'], 'lon' => (float)$s['lon']];
    }
    $targets = [['lat' => $lat, 'lon' => $lon]];

    $payload = [
        'sources' => $sources,
        'targets' => $targets,
        'costing' => $profile,
        'units' => 'kilometers',
    ];

    // Eigener, schlanker curl-Aufruf statt curl_request() — die würde automatisch
    // X-API-KEY: ORS_API_KEY anhängen, was für Valhalla falsch wäre (siehe api/valhalla.php).
    $ch = curl_init(VALHALLA_URL . '/sources_to_targets');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        http_response_code($http_code ?: 502);
        echo $response;
        exit;
    }

    $matrix = json_decode($response, true);
} else {
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
}
```

mit:

```php
// 2. Matrix-Aufruf — Provider-Branch (Stationssuche oben bleibt für beide Provider gemeinsam),
// nutzt die geteilten Client-Funktionen aus ors-client.php/valhalla-client.php.
if ($provider === 'valhalla') {
    $sources = [];
    foreach ($stations as $s) {
        $sources[] = ['lat' => (float)$s['lat'], 'lon' => (float)$s['lon']];
    }
    $targets = [['lat' => $lat, 'lon' => $lon]];

    $payload = [
        'sources' => $sources,
        'targets' => $targets,
        'costing' => $profile,
        'units' => 'kilometers',
    ];

    $matrixRes = valhalla_call('sources_to_targets', 'POST', json_encode($payload));
} else {
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

    $matrixRes = ors_call('matrix/' . urlencode($profile), 'POST', json_encode($payload));
}

if ($matrixRes['code'] < 200 || $matrixRes['code'] >= 300) {
    // Rohen Upstream-Body nie an den Client durchreichen — Detail nur ins Server-Log.
    error_log("nearest-stations.php: provider=$provider upstream_code={$matrixRes['code']} body=" .
        substr((string)$matrixRes['data'], 0, 500));
    http_response_code($matrixRes['code'] ?: 502);
    echo json_encode(['error' => 'Matrixsuche fehlgeschlagen']);
    exit;
}

$matrix = json_decode($matrixRes['data'], true);
```

Der Rest der Datei (Ergebnisse kombinieren/sortieren, Icon-Logik, `usort`, `array_slice`) bleibt
unverändert — er kennt nur noch `$matrix`, keine Provider-Unterscheidung mehr nötig.

- [ ] **Step 3: Lint**

Run: `php -l api/nearest-stations.php`
Expected: `No syntax errors detected in api/nearest-stations.php`

- [ ] **Step 4: Live-Verifikation gegen die echte Valhalla-Instanz**

`VALHALLA_URL` ist hier real erreichbar. PHP-Dev-Server läuft bereits (Task 3):

```bash
curl "http://127.0.0.1:8081/nearest-stations.php?target=48.3069,14.2858&type=sew&profile=auto&provider=valhalla"
```

Erwartet: identisches Ergebnis wie vor diesem Refactoring (JSON-Array mit Stationen,
`duration`/`distance` plausibel) — reiner Verhaltens-Erhalt, keine neue Logik. `provider=ors`
kann in dieser Sandbox nicht live getestet werden (kein lokaler ORS) — das ist erwartet.

- [ ] **Step 5: Commit**

```bash
git add api/nearest-stations.php
git commit -m "refactor(routing): nearest-stations.php nutzt ors_call()/valhalla_call() statt eigenem curl-Setup"
```

---

## Task 5: `nginx.conf` — einheitliche Zugriffsbeschränkung für die Routing-Endpoints

**Files:**
- Modify: `nginx.conf`

**Interfaces:** keine — reine Infrastruktur-Konfiguration, kein Code-Interface.

- [ ] **Step 1: `limit_req_zone` am Dateianfang ergänzen**

Füge ganz oben in `nginx.conf` (vor der ersten `server {`-Zeile) ein:

```nginx
# Einheitliche Zugriffsbeschränkung für die öffentlichen Routing-Endpoints (routing-proxy.php,
# nearest-stations.php) — Startwert, nach dem Rollout anhand echter Nutzung nachjustieren. Siehe
# docs/superpowers/specs/2026-08-23-routing-endpoints-public-rollout-design.md.
limit_req_zone $binary_remote_addr zone=routing_limit:10m rate=10r/s;

server {
```

(Ersetzt die bisherige erste Zeile `server {` — die Direktive kommt davor, der Rest der Datei
bleibt an dieser Stelle unverändert.)

- [ ] **Step 2: Alten `valhalla.php`-Block durch die zwei neuen Locations ersetzen**

Ersetze:

```nginx
    # Valhalla-Testproxy in Produktion blockieren — ist bewusst nur für npm run dev gebaut
    # (siehe docs/TODO.md „Valhalla-Connector: vor Live-Deploy"), landet aber ungefragt live,
    # da deploy-website.sh den kompletten api/-Ordner ohne Datei-Allowlist rsynct. Exact-Match
    # hat in nginx Vorrang vor dem generischen ~ \.php$ -Handler oben, unabhängig von der
    # Reihenfolge im File.
    location = /api/valhalla.php {
        deny all;
    }
```

durch:

```nginx
    # Öffentliche Routing-Endpoints (ORS + Valhalla) — einheitliche Zugriffsbeschränkung statt
    # providerspezifischer Einzellösungen. limit_req: Missbrauchsbremse pro Client-IP.
    # valid_referers: verhindert, dass fremde Seiten diese Endpoints einbetten/mitbenutzen und
    # dadurch unsere ORS/Valhalla-Kosten hochtreiben (kein Schutz gegen einen gezielten
    # Angreifer mit curl, der den Header frei setzen kann — dafür ist limit_req da). Exact-Match
    # hat in nginx Vorrang vor dem generischen ~ \.php$ -Handler oben, unabhängig von der
    # Reihenfolge im File — FastCGI-Setup deshalb hier dupliziert (nginx vererbt Direktiven
    # nicht zwischen Sibling-Locations), analog dem bereits bestehenden Stil dieser Datei.
    location = /api/routing-proxy.php {
        limit_req zone=routing_limit burst=20 nodelay;
        valid_referers none blocked map.oe5ith.at;
        if ($invalid_referer) { return 403; }

        root /var/www/map.oe5ith.at;
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location = /api/nearest-stations.php {
        limit_req zone=routing_limit burst=20 nodelay;
        valid_referers none blocked map.oe5ith.at;
        if ($invalid_referer) { return 403; }

        root /var/www/map.oe5ith.at;
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
```

- [ ] **Step 3: `nginx -t` (nur ausführbar auf dem echten Server, hier dokumentieren als
  Nutzer-Schritt)**

Diese Sandbox hat keinen nginx-Prozess/keine echte `/etc/nginx/sites-available/`-Struktur — Lint
(`nginx -t`) und Reload sind laut `CLAUDE.md` → „Nginx configuration" ohnehin ein manueller
Schritt auf dem Produktivserver (Backup, Diff, `nginx -t`, erst dann Reload). Hier nur:
Datei-Syntax visuell gegenprüfen (Klammern balanciert, `location`-Blöcke korrekt geschlossen).

- [ ] **Step 4: Commit**

```bash
git add nginx.conf
git commit -m "feat(routing): einheitliche nginx-Zugriffsbeschränkung (Rate-Limit + Referer) für Routing-Endpoints"
```

---

## Task 6: `src/lib/RoutingProxyUrl.ts` — geteilte URL-Hilfsfunktion (Frontend)

**Files:**
- Create: `src/lib/RoutingProxyUrl.ts`
- Test: `src/lib/RoutingProxyUrl.test.ts`

**Interfaces:**
- Consumes: nichts.
- Produces: `buildRoutingProxyUrl(provider: 'ors' | 'valhalla', path: string): string` — wird von
  Task 7 (`RoutingService.ts`/`IsochronesService.ts`/`ValhallaService.ts`) konsumiert.

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/lib/RoutingProxyUrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildRoutingProxyUrl } from './RoutingProxyUrl';

describe('buildRoutingProxyUrl', () => {
  it('builds an ORS URL with the provider and path query params', () => {
    expect(buildRoutingProxyUrl('ors', 'health')).toBe('/api/routing-proxy.php?provider=ors&path=health');
  });

  it('builds a Valhalla URL with the provider and path query params', () => {
    expect(buildRoutingProxyUrl('valhalla', 'route')).toBe('/api/routing-proxy.php?provider=valhalla&path=route');
  });

  it('passes a nested path segment through unchanged (e.g. directions/{profile}/geojson)', () => {
    expect(buildRoutingProxyUrl('ors', 'directions/driving-car/geojson'))
      .toBe('/api/routing-proxy.php?provider=ors&path=directions/driving-car/geojson');
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/RoutingProxyUrl.test.ts`
Expected: FAIL — Modul `./RoutingProxyUrl` existiert noch nicht.

- [ ] **Step 3: `RoutingProxyUrl.ts` implementieren**

```ts
/**
 * Baut die URL für den generischen Routing-Proxy-Endpoint (`api/routing-proxy.php`), der ORS und
 * Valhalla providerparametrisiert hinter einem gemeinsamen Endpoint zusammenfasst — eine Stelle
 * statt unabhängiger URL-Konstanten in RoutingService.ts/IsochronesService.ts/ValhallaService.ts.
 */
export function buildRoutingProxyUrl(provider: 'ors' | 'valhalla', path: string): string {
  return `/api/routing-proxy.php?provider=${provider}&path=${path}`;
}
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npx tsc --noEmit && npx vitest run src/lib/RoutingProxyUrl.test.ts`
Expected: PASS (alle 3 Fälle).

- [ ] **Step 5: Commit**

```bash
git add src/lib/RoutingProxyUrl.ts src/lib/RoutingProxyUrl.test.ts
git commit -m "feat(routing): buildRoutingProxyUrl()-Hilfsfunktion für den neuen routing-proxy.php"
```

---

## Task 7: `RoutingService.ts`/`IsochronesService.ts`/`ValhallaService.ts` — auf `buildRoutingProxyUrl()` umstellen

**Files:**
- Modify: `src/lib/RoutingService.ts`
- Modify: `src/lib/IsochronesService.ts`
- Modify: `src/lib/ValhallaService.ts`
- Modify: `src/lib/IsochronesService.test.ts`
- Modify: `src/lib/ValhallaService.test.ts`

**Interfaces:**
- Consumes: `buildRoutingProxyUrl()` (Task 6).
- Produces: keine Verhaltensänderung nach außen — reines URL-Konstruktions-Refactoring, alle
  drei Services rufen weiterhin dieselben Backend-Operationen auf, nur über die neue,
  konsolidierte URL.

- [ ] **Step 1: `RoutingService.ts` umstellen**

Entferne die Zeile `const ORS_BASE_URL = '/api/ors.php';` und ergänze den Import:

```ts
import { RouteResult, RoutingStation } from '../types/common';
import { orsCodeToManeuverKind } from './OrsManeuverKind';
import { buildRoutingProxyUrl } from './RoutingProxyUrl';
```

Ersetze die drei Verwendungsstellen:

```ts
      const res = await fetch(`${ORS_BASE_URL}?path=health`, { cache: 'no-store' });
```
→
```ts
      const res = await fetch(buildRoutingProxyUrl('ors', 'health'), { cache: 'no-store' });
```

```ts
      const res = await fetch(`${ORS_BASE_URL}?path=status`, { cache: 'no-store' });
```
→
```ts
      const res = await fetch(buildRoutingProxyUrl('ors', 'status'), { cache: 'no-store' });
```

```ts
    const url = `${ORS_BASE_URL}?path=directions/${profile}/geojson`;
```
→
```ts
    const url = buildRoutingProxyUrl('ors', `directions/${profile}/geojson`);
```

`findNearestStations()` bleibt unverändert (ruft weiterhin direkt `nearest-stations.php` auf,
kein `routing-proxy.php`-Umweg).

- [ ] **Step 2: `IsochronesService.ts` umstellen**

Entferne `const ORS_BASE_URL = '/api/ors.php';`, ergänze:

```ts
import { buildRoutingProxyUrl } from './RoutingProxyUrl';
```

Ersetze:

```ts
    const url = `${ORS_BASE_URL}?path=isochrones/${profile}`;
```
→
```ts
    const url = buildRoutingProxyUrl('ors', `isochrones/${profile}`);
```

- [ ] **Step 3: `ValhallaService.ts` umstellen**

Entferne `const VALHALLA_BASE_URL = '/api/valhalla.php';`, ergänze:

```ts
import { buildRoutingProxyUrl } from './RoutingProxyUrl';
```

Ersetze:

```ts
      const res = await fetch(`${VALHALLA_BASE_URL}?path=status`, { cache: 'no-store' });
```
→
```ts
      const res = await fetch(buildRoutingProxyUrl('valhalla', 'status'), { cache: 'no-store' });
```

```ts
      const res = await fetch(`${VALHALLA_BASE_URL}?path=route`, {
```
→
```ts
      const res = await fetch(buildRoutingProxyUrl('valhalla', 'route'), {
```

- [ ] **Step 4: Tests anpassen**

In `src/lib/IsochronesService.test.ts`, ersetze:

```ts
    expect(capturedUrl).toBe('/api/ors.php?path=isochrones/driving-car');
```
mit:
```ts
    expect(capturedUrl).toBe('/api/routing-proxy.php?provider=ors&path=isochrones/driving-car');
```

In `src/lib/ValhallaService.test.ts`, ersetze:

```ts
    expect(capturedUrl).toBe('/api/valhalla.php?path=route');
```
mit:
```ts
    expect(capturedUrl).toBe('/api/routing-proxy.php?provider=valhalla&path=route');
```

`src/lib/RoutingService.test.ts` braucht keine Änderung — es prüft die ORS-URLs nicht als
exakten String (siehe Global Constraints/Recherche im Plan-Vorlauf), nur Methode/Body/Call-Count.

- [ ] **Step 5: Typecheck + volle Testsuite**

Run: `npx tsc --noEmit && npm test`
Expected: PASS — alle Tests grün, insbesondere die beiden angepassten URL-Assertions.

- [ ] **Step 6: `npm run docs:bausteine`**

`RoutingProxyUrl.ts` (Task 6) landet in `src/lib/` — `CLAUDE.md` schreibt einen Re-Run nach
`src/lib/`-Änderungen vor. Ausführen und den Diff mit committen.

- [ ] **Step 7: Commit**

```bash
git add src/lib/RoutingService.ts src/lib/IsochronesService.ts src/lib/ValhallaService.ts \
  src/lib/IsochronesService.test.ts src/lib/ValhallaService.test.ts docs/architecture/bausteine.md
git commit -m "refactor(routing): RoutingService/IsochronesService/ValhallaService nutzen buildRoutingProxyUrl()"
```

---

## Task 8: Doku — TODO.md abschließen, CHANGELOG-Eintrag

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/CHANGELOG.md`

**Interfaces:** keine — Abschluss-Task, dokumentiert nur.

- [ ] **Step 1: `docs/TODO.md` — „Valhalla-Connector: vor Live-Deploy" als erledigt markieren**

Der bestehende Punkt (inkl. der Checkliste, dem „Update 2026-08-23"-Absatz und der
Deploy-Reihenfolge-Falle) wird durch die Umsetzung dieses Plans gegenstandslos — alle
Kernpunkte sind jetzt umgesetzt: einheitliche Zugriffsbeschränkung (nginx `limit_req` +
Referer-Check, deckt beide Endpoints ab), `VALHALLA_URL` fester Bestandteil der
Produktivkonfiguration, `ORS_API_KEY` als Konzept komplett entfernt statt nur für Valhalla
umgangen. Markiere den Punkt (Checkbox `- [ ]` → `- [x]`, Titel-Ergänzung „— ✅ ERLEDIGT",
Datum 2026-08-23) mit einer kurzen Zusammenfassung analog dem bestehenden Stil der Datei
(siehe andere `✅ ERLEDIGT`-Einträge in derselben Datei als Vorbild) — referenziere
`docs/superpowers/specs/2026-08-23-routing-endpoints-public-rollout-design.md` und
`docs/superpowers/plans/2026-08-23-routing-endpoints-public-rollout.md` statt den alten Text zu
löschen (Historie bleibt nachvollziehbar). Erwähne explizit: Live-Verifikation von ORS/Nominatim
über die neuen lokalen Adressen sowie der finale nginx-Rollout sind Aufgabe des Nutzers auf dem
echten VPS (in dieser Umgebung nicht möglich, siehe Global Constraints).

- [ ] **Step 2: `docs/CHANGELOG.md` — neuer Journal-Block**

Neuer `## [Unreleased] - <Datum> <Uhrzeit>`-Block **oberhalb** des aktuell jüngsten Blocks (nicht
hineinmergen), German, Kategorien „Geändert"/„Sicherheit": Routing-Endpoints konsolidiert
(`ors-client.php`/`valhalla-client.php`/`routing-proxy.php` ersetzen `ors.php`+`valhalla.php`,
`nearest-stations.php` nutzt dieselbe Client-Schicht), ORS/Nominatim auf lokale VPS-Adressen
umgestellt (`ORS_API_KEY` entfällt), nginx-Zugriffsbeschränkung (Rate-Limit + Referer-Check) für
die öffentlichen Routing-Endpoints, Fehlerantworten sanitisiert (kein roher Upstream-Body mehr).
Test-/Typecheck-Zahlen aus dem letzten grünen Lauf nennen.

- [ ] **Step 3: Commit**

```bash
git add docs/TODO.md docs/CHANGELOG.md
git commit -m "docs(routing): Routing-Endpoint-Konsolidierung + Valhalla-Rollout — TODO abgeschlossen, CHANGELOG"
```
