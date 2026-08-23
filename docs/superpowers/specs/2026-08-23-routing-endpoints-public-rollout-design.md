# Routing-Endpoints: Konsolidierung + öffentlicher Valhalla-Rollout — Design

**Status:** entworfen, freigegeben durch Nutzer (2026-08-23) — Implementierung offen.
**Herkunft:** direkter Nutzerwunsch, entstanden aus dem offenen `docs/TODO.md`-Punkt
„Valhalla-Connector: vor Live-Deploy" sowie einem beim SEW/NEF-Matrix-Task (2026-08-23) live
gefundenen Duplikations-Problem (siehe Kontext).

## Kontext

Zwei zusammengehörige Anliegen, in einer Design-Runde entschieden:

1. **Valhalla soll ein dauerhafter, öffentlicher Zweit-Provider neben ORS werden** — nicht mehr
   nur Testaufbau (`docs/superpowers/specs/2026-08-19-valhalla-routing-connector-design.md`),
   sondern echte Alternative auf `map.oe5ith.at`, für alle Besucher nutzbar.
2. **Die Routing-PHP-Endpoints sollen saubere, nicht vermischte Zuständigkeiten bekommen.**
   Konkreter Auslöser: `api/valhalla.php` und `api/nearest-stations.php`s
   `provider=valhalla`-Zweig implementieren unabhängig voneinander denselben „schlanker
   curl-Call statt `curl_request()`"-Mechanismus gegen Valhalla (nahezu wortgleicher
   Kommentar in beiden Dateien). Dasselbe Muster existiert strukturell auch auf ORS-Seite
   (`api/ors.php` vs. `nearest-stations.php`s ORS-Zweig, der `curl_request()` direkt aufruft,
   nie über `ors.php`). Zwei unabhängig gepflegte Kopien derselben Logik sind das Gegenteil von
   „wir pflegen keine unterschiedlichen Versionen" (Nutzer-Zitat).

Scope bewusst auf die **Routing-Endpoints** begrenzt (`api/ors.php`, `api/valhalla.php`,
`api/nearest-stations.php`) — kein Durchgang über alle `api/*.php`-Dateien. Eine Ausnahme ergibt
sich zwangsläufig aus Punkt 3 unten (Config/Secrets betrifft auch `geocoder.php`s Laufzeitverhalten,
aber nicht dessen Endpoint-Struktur).

**Zusätzlicher Fund während der Design-Runde:** ORS läuft bereits lokal auf demselben VPS wie
diese Website (`127.0.0.1:8082`), ebenso Nominatim (`127.0.0.1:8080`) — beide aktuell nur über
öffentliche Subdomains (`ors.oe5ith.at`, `geocoder.oe5ith.at`) mit einem gemeinsamen
`ORS_API_KEY`-Header abgesichert. Live verifiziert (Key aus `config.local.php` verwendet, nie
ausgegeben): `geocoder.oe5ith.at` liefert `403` ohne den Header, `200` mit — `ORS_API_KEY` ist
also kein ORS-spezifisches Secret, sondern ein gemeinsames Gateway-Secret vor mehreren
Subdomains. Die ursprüngliche Portabilitäts-Absicht (Website soll auf einen anderen Server
umziehen können, ORS/Nominatim bleiben unabhängig erreichbar) ist laut Nutzer aktuell keine
Priorität mehr — die engere Kopplung an den lokalen VPS wird bewusst in Kauf genommen.

**Nebenbefund (nicht Teil dieses Designs):** `https://ors.oe5ith.at` liefert beim Testen ein
TLS-Zertifikat für `adsb.oe5ith.at` (Hostname-Mismatch) — das ist `ors.oe5ith.at`s eigene,
separate Vhost-Konfiguration, außerhalb dieses Repos (`nginx.conf` hier deckt nur
`map.oe5ith.at` ab). Nutzer sieht sich das separat an.

## Ziel & Scope

**In Scope:**
- Geteilte Provider-Client-Funktionen für ORS/Valhalla, ein konsolidierter genereller
  Proxy-Endpoint für Einzel-Requests (Route/Status/etc.), `nearest-stations.php` nutzt dieselbe
  Client-Schicht für seine Matrix-Calls.
- `ORS_URL`/`NOMINATIM_URL` auf lokale VPS-Adressen umgestellt, `ORS_API_KEY` entfällt.
- Einheitliche Zugriffsbeschränkung (Rate-Limiting + Referer-Check) auf nginx-Ebene für die
  öffentlichen Routing-Endpoints.
- Fehlerantworten an den Client sanitisiert (kein roher Upstream-Body mehr).
- `VALHALLA_URL` wird fester Bestandteil der Produktivkonfiguration (bisher nur lokal/Dev).

**Out of Scope:**
- Alle anderen `api/*.php`-Dateien (`nah.php`, `adsb.php`, `ais.php`, `stations.php`, …) —
  eigene, spätere Runde falls gewünscht.
- `geocoder.php`s eigene Endpoint-Struktur/Logik — bleibt unverändert, ändert nur sein
  Laufzeitverhalten als Folge der Config-Änderung (kein API-Key-Header mehr).
- ORS/Nominatim-seitige Serverkonfiguration (Bind-Adresse, systemd/Docker-Setup) — liegt
  außerhalb dieses Repos, wird als **Voraussetzung** dokumentiert, nicht hier umgesetzt.
- SSRF-Härtung von `ORS_URL`/`VALHALLA_URL`/`NOMINATIM_URL` — alle drei sind Admin-konfigurierte
  Konstanten aus einer nicht-committeten lokalen Datei, kein User-Input (unverändert seit dem
  ursprünglichen Valhalla-Connector-Design).
- `deploy-website.sh` — keine Änderung nötig (siehe „Migration" unten, der bisherige
  Sonderfall für `valhalla.php` entfällt strukturell).

## Architektur-Überblick

```
Vorher:
  RoutingService.ts    → GET/POST /api/ors.php?path=...      → curl_request() → ORS_URL (öffentlich, +API-Key)
  IsochronesService.ts → GET /api/ors.php?path=isochrones/... → curl_request() → ORS_URL
  ValhallaService.ts   → GET/POST /api/valhalla.php?path=...  → eigener curl-Call → VALHALLA_URL (Tailscale)
  nearest-stations.php → eigener curl_request()-Call → ORS_URL/matrix/{profile}       (Kopie 1: ORS)
                        → eigener curl-Call          → VALHALLA_URL/sources_to_targets (Kopie 2: Valhalla)

Nachher:
  RoutingService.ts    → /api/routing-proxy.php?provider=ors&path=...      ─┐
  IsochronesService.ts → /api/routing-proxy.php?provider=ors&path=...      ─┼─→ routing-proxy.php ─┬→ ors_call()      → ORS_URL (lokal, kein Key)
  ValhallaService.ts   → /api/routing-proxy.php?provider=valhalla&path=... ─┘                       └→ valhalla_call() → VALHALLA_URL (Tailscale)
                                                                                                              ↑
  nearest-stations.php ──────────────────────────────────────────────────────────────────────────── ruft dieselben
                        (PostGIS-KNN, dann Matrix-Call in-process, kein zweiter HTTP-Hop)              Funktionen direkt
```

Kernentscheidung: `ors_call()`/`valhalla_call()` sind reine PHP-Funktionen (kein HTTP-Zwischenschritt) —
jede `api/*.php`-Datei, die einen Provider braucht, ruft sie direkt in-process auf.
`routing-proxy.php` ist nur *ein* Aufrufer davon (der generische Einzel-Request-Proxy),
`nearest-stations.php` ein zweiter (die Matrixsuche). Keine der beiden Dateien dupliziert mehr
curl-Setup.

## Neue/geänderte Backend-Dateien

- **Neu: `api/ors-client.php`** — reine Funktionsdatei (analog `api/http.php`), eine Funktion:
  ```php
  function ors_call(string $path, string $method = 'GET', ?string $body = null): array {
      $url = ORS_URL . '/' . ltrim($path, '/');
      return curl_request($url, $method, $body);
  }
  ```
  Nutzt weiterhin `curl_request()` aus `config.php` (jetzt ohne Auto-Header, siehe unten) — kein
  eigenes curl-Setup nötig, da ORS keine Sonderbehandlung mehr braucht.

- **Neu: `api/valhalla-client.php`** — eine Funktion:
  ```php
  function valhalla_call(string $path, string $method = 'GET', ?string $body = null): array {
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
          if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
      }
      $response = curl_exec($ch);
      $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);
      return ['code' => $http_code ?: 502, 'data' => $response];
  }
  ```
  Eigener curl-Call bleibt nötig (kein `X-API-KEY`-Header, den `curl_request()` anhängen würde) —
  identisches Rückgabeformat (`['code'=>..., 'data'=>...]`) wie `curl_request()`, damit Aufrufer
  beide Provider gleich behandeln können. Beide Client-Dateien sind reine Funktionsdefinitionen
  ohne Seiteneffekt bei direktem Web-Aufruf — kein nginx-`deny` nötig, analog `api/http.php` heute.

- **Neu, ersetzt `api/ors.php` + `api/valhalla.php`: `api/routing-proxy.php`**
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
      error_log("routing-proxy.php: provider=$provider path=$path upstream_code={$res['code']} body=" . substr((string)$res['data'], 0, 500));
      http_response_code($res['code'] ?: 502);
      echo json_encode(['error' => 'Routing-Anfrage fehlgeschlagen']);
  }
  ```
  ORS-Allowlist 1:1 aus dem bisherigen `ors.php` übernommen (inkl. `matrix/{profile}` — wird zwar
  aktuell von keinem Frontend-Aufruf über diesen Weg genutzt, `nearest-stations.php` ruft
  `ors_call()` direkt in-process auf, aber Parität zum bisherigen Verhalten von `ors.php`
  beibehalten). `sources_to_targets` bewusst **nicht** in Valhallas Allowlist hier — wird nur
  in-process von `nearest-stations.php` gebraucht, nie über diesen öffentlichen Pfad.

- **Geändert: `api/nearest-stations.php`** — der Matrix-Call-Abschnitt (Provider-Branch aus der
  SEW/NEF-Runde, 2026-08-23) ruft statt eigenem curl-Setup:
  ```php
  // ORS-Zweig:
  $res = ors_call('matrix/' . urlencode($profile), 'POST', json_encode($payload));
  // Valhalla-Zweig:
  $res = valhalla_call('sources_to_targets', 'POST', json_encode($payload));
  ```
  Fehlerbehandlung (Nicht-2xx) bekommt dieselbe Sanitisierung wie `routing-proxy.php` (generische
  Meldung statt rohem Upstream-Body, Detail ins Server-Log). Rest der Datei (PostGIS-KNN,
  Ergebnis-Merge, Icon-Logik) unverändert.

- **Entfällt:** `api/ors.php`, `api/valhalla.php`.

## Config & Secrets (`api/config.php`, `config.local.php`, `.example`)

- `ORS_URL`-Default: `https://ors.oe5ith.at` → `http://127.0.0.1:8082`.
- Neuer Default `NOMINATIM_URL`: `https://geocoder.oe5ith.at` → `http://127.0.0.1:8080`.
- `ORS_API_KEY` entfällt vollständig: Konstante, der Fail-Closed-Check in `config.php`
  (`if (!defined('DB_PASS') || !defined('ORS_API_KEY'))` → nur noch `DB_PASS`), Beispielzeile in
  `config.local.php.example`.
- `curl_request()` in `config.php` verliert den automatischen `X-API-KEY`-Header:
  ```php
  // vorher:
  $default_headers = ["X-API-KEY: " . ORS_API_KEY, "Content-Type: application/json"];
  // nachher:
  $default_headers = ["Content-Type: application/json"];
  ```
  Wird von `ors_call()` (neu), `geocoder.php` und `diag.php` genutzt — alle drei verhalten sich
  danach identisch bis auf den fehlenden Header (kein Code-Change in `geocoder.php`/`diag.php`
  nötig, nur Laufzeitverhalten ändert sich, siehe „Out of Scope" oben).

**Voraussetzung (außerhalb dieses Repos, vor dem Rollout zu prüfen):** ORS und Nominatim müssen
auf dem VPS an `127.0.0.1` gebunden sein, nicht `0.0.0.0` — sonst wären die Ports trotz
„lokaler" URL weiterhin von außen erreichbar, und der Wegfall von `ORS_API_KEY` wäre eine echte
Lücke statt einer Vereinfachung. Dieses Repo kann das nicht erzwingen, nur dokumentieren.

## nginx — Einheitliche Zugriffsbeschränkung (`nginx.conf`)

- Neue `limit_req_zone`-Direktive am Dateianfang (außerhalb der `server{}`-Blöcke — landet im
  umschließenden `http{}`-Kontext der echten nginx.conf, wie von der Direktive verlangt):
  ```nginx
  limit_req_zone $binary_remote_addr zone=routing_limit:10m rate=10r/s;
  ```
  Startwert `10r/s` mit `burst=20 nodelay` (s.u.) — großzügig genug für normale
  Karten-Interaktion (mehrere Requests kurz hintereinander beim Route-Ziehen), deckelt aber
  skriptgesteuerten Missbrauch (max. 600/min pro IP). **Ausdrücklich ein Startwert** — nach dem
  Rollout anhand echter Nutzung nachjustieren, kein final validierter Wert.
- Zwei neue `location`-Blöcke (ersetzen den bisherigen `location = /api/valhalla.php { deny all; }`-Block):
  ```nginx
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
  FastCGI-Setup bewusst dupliziert statt eines neuen Include-Files — nginx vererbt Direktiven
  nicht zwischen Sibling-Locations, ein exakter Match ersetzt den generischen `~ \.php$`-Handler
  vollständig. Passt zum bestehenden Stil dieser Datei (die zwei `server{}`-Blöcke duplizieren
  ihr FastCGI-Setup bereits genauso). Kein neuer Snippet unter `/etc/nginx/snippets/` — das wäre
  geteilte, seiten-übergreifende Infrastruktur, hier nicht angebracht (siehe CLAUDE.md-Warnung
  zu `snippets/`).
- **Was der Referer-Check tatsächlich bringt und was nicht:** Browser-durchgesetzter Schutz
  gegen fremde Seiten, die diese Endpoints einbetten/mitbenutzen (Cross-Origin-Hotlinking, treibt
  sonst unbemerkt die eigenen ORS/Valhalla-Kosten hoch) — **kein** Schutz gegen einen gezielten
  Angreifer mit `curl`/Skript, der den Header frei setzen kann. Die eigentliche Missbrauchsbremse
  ist `limit_req`. `none`/`blocked` bewusst erlaubt (Browser mit Datenschutz-Einstellungen
  schicken teils keinen Referer) — sonst würden legitime Nutzer geblockt, nicht nur Missbrauch.

## Fehlerbehandlung

`routing-proxy.php` und `nearest-stations.php`: bei Nicht-2xx-Antwort vom Provider **kein**
`echo $res['data']` (roher Upstream-Body) mehr an den Client — stattdessen generische
JSON-Fehlermeldung, Original-Detail nur per `error_log()` serverseitig. Verhindert
Backend-Fingerprinting (Versionsstrings, interne Fehlercodes/Stacktraces) nach außen. Der
HTTP-Status-Code selbst (z.B. 400/500/502) bleibt erhalten — nur der Body wird generisch, das
Frontend wertet ohnehin nur `res.ok`/Status aus, nie den Fehlertext im Detail.

## Frontend-Änderungen

- **Neu: `src/lib/RoutingProxyUrl.ts`** — eine Funktion, ersetzt die bisher in
  `RoutingService.ts` **und** `IsochronesService.ts` unabhängig definierte
  `ORS_BASE_URL = '/api/ors.php'`-Konstante sowie `ValhallaService.ts`s
  `VALHALLA_BASE_URL = '/api/valhalla.php'`:
  ```ts
  export function buildRoutingProxyUrl(provider: 'ors' | 'valhalla', path: string): string {
    return `/api/routing-proxy.php?provider=${provider}&path=${path}`;
  }
  ```
  Analog zum Backend-Muster: eine Stelle statt drei unabhängiger URL-Bausteine.
- `src/lib/RoutingService.ts`: `fetch(\`${ORS_BASE_URL}?path=health\`)` →
  `fetch(buildRoutingProxyUrl('ors', 'health'))` (analog `status`, `directions/{profile}/geojson`).
  `findNearestStations()` bleibt unverändert (ruft weiterhin direkt `nearest-stations.php` auf,
  kein `routing-proxy.php`-Umweg — andere Zuständigkeit, siehe Architektur-Überblick).
- `src/lib/IsochronesService.ts`: analog, `isochrones/{profile}` über `buildRoutingProxyUrl('ors', ...)`.
- `src/lib/ValhallaService.ts`: `status`/`route` über `buildRoutingProxyUrl('valhalla', ...)`.
- Zugehörige `.test.ts`-Dateien (`RoutingService.test.ts`, `IsochronesService.test.ts`,
  `ValhallaService.test.ts`) — URL-Assertions auf die neue Struktur anpassen.

## Migration / Rollout-Reihenfolge

Kritisch, weil ein Zwischenzustand die **produktive** Website brechen kann:
`curl_request()` verliert den `X-API-KEY`-Header **im selben Deploy**, in dem `ORS_URL`/
`NOMINATIM_URL` noch auf die alten öffentlichen Subdomains zeigen könnten (falls
`config.local.php` auf dem Server nicht synchron mitgezogen wird) — die externen Gateways
verlangen den Key aber weiterhin (live verifiziert, siehe Kontext). Reihenfolge:

1. **Voraussetzung prüfen** (auf dem VPS, außerhalb dieses Repos): ORS/Nominatim tatsächlich nur
   auf `127.0.0.1` gebunden, nicht `0.0.0.0`.
2. Code-Änderungen hier im Repo umsetzen + lokal verifizieren (`npx tsc --noEmit && npm test`,
   `php -l` für alle geänderten/neuen PHP-Dateien).
3. `nginx.conf` nach dem dokumentierten Workflow (`CLAUDE.md` → „Nginx configuration") ausrollen:
   Backup, Diff, `nginx -t`, erst dann reload.
4. **`config.local.php` auf dem Server UND der Code-Deploy (`./deploy-website.sh`) gehören eng
   zusammen** — `ORS_URL`/`NOMINATIM_URL` auf die lokalen Adressen umstellen, `ORS_API_KEY`
   entfernen, `VALHALLA_URL` auf die Tailscale-IP setzen, möglichst im selben Wartungsfenster wie
   der Code-Deploy, nicht Tage getrennt.
5. Nach dem Deploy: `api/diag.php` (oder manuelles curl) gegen `routing-proxy.php` mit beiden
   Providern sowie `nearest-stations.php` mit beiden Providern verifizieren; danach echten
   Live-Test auf `map.oe5ith.at` selbst (nicht nur curl) — auch um zu prüfen, dass
   `limit_req`/Referer-Check normale Nutzung nicht versehentlich blockieren.
6. `deploy-website.sh` selbst braucht **keine** Änderung — der bisherige Sonderfall („landet
   ungefragt live") betraf ausschließlich `api/valhalla.php` als Datei; die existiert nach diesem
   Umbau nicht mehr, `routing-proxy.php` ist von Anfang an als öffentlicher, geschützter Endpoint
   gedacht.
7. `docs/TODO.md`s „Valhalla-Connector: vor Live-Deploy"-Punkt wandert nach erfolgreicher
   Umsetzung + Live-Verifikation ins `TODO_ARCHIVE.md`.

## Tests

- `api/`-PHP hat keine automatisierten Tests (Repo-Konvention) — Verifikation über `php -l` +
  manuelle/curl-Tests gegen die echten lokalen ORS/Nominatim/Valhalla-Instanzen (analog zum
  Vorgehen in der SEW/NEF-Matrix-Runde, 2026-08-23) — dort, wo diese Umgebung tatsächlich
  Netzwerkzugriff hat.
- `RoutingService.test.ts`, `IsochronesService.test.ts`, `ValhallaService.test.ts`: bestehende
  URL-Assertions auf `buildRoutingProxyUrl()` umstellen, keine neuen Testfälle nötig (reines
  URL-Refactoring, keine Verhaltensänderung im Frontend).
- Neuer `RoutingProxyUrl.test.ts`: 2-3 Fälle (ors/valhalla, verschiedene `path`-Werte).
- nginx `limit_req`/Referer-Check: nicht automatisiert testbar in diesem Repo — manuelle
  Verifikation nach dem Deploy (siehe „Migration" Schritt 5).

## Offene Punkte

- `limit_req`-Rate (`10r/s`, `burst=20`) ist ein Startwert, keine validierte Zahl — nach dem
  Rollout anhand echter Zugriffszahlen (z.B. über `docs/performance/`-Tooling oder schlicht
  nginx-Access-Logs) nachschärfen.
- Ob ORS/Nominatim tatsächlich auf `127.0.0.1` gebunden sind, ist eine Annahme dieses Designs,
  keine hier verifizierte Tatsache — Voraussetzung, vor dem Rollout vom Nutzer zu bestätigen.
