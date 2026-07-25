# API-Hardening: Debug-Entfernung, Endpoint-Umbenennung, Input-Restriktion, Doku-Konsolidierung

**Kontext:** Folgearbeit aus dem OWASP-Re-Audit vom 2026-07-25
([docs/security/owasp-top10-checklist.md](../../security/owasp-top10-checklist.md)). Der
ursprüngliche Fund war Info-Disclosure in `api/db.php` (voller PostgreSQL-Versionsstring +
Uptime, öffentlich ohne Zugriffsschutz). Beim Besprechen der Lösung kamen drei weitere Themen
dazu, die im selben Aufwasch mitgelöst werden: das API-Debug-Playground-Modul soll ganz weg,
alle `api/*.php`-Endpoints sollen generell einschränken was sie an Requests akzeptieren, und
solange wir eh jeden Endpoint anfassen, klären wir auch Benennung und Dokumentation.

## Entscheidung 1: Debug-Modul komplett entfernen

`src/components/info/DebugModule.ts` (Route `/info/debug`, freies API-Request-Playground mit
Endpoint-Auswahl + beliebigen Parametern) wird gelöscht. Reduziert die Auffindbarkeit von
Rohdaten-Responses generell, unabhängig von den einzelnen Endpoint-Fixes.

**Betroffen:** `src/components/info/DebugModule.ts` (löschen), `src/styles/code-viewer.css`
(löschen, wird ausschließlich von `DebugModule.ts` genutzt), `src/pages/InfoPage.ts`
(Import/Nav-Eintrag/Routing-Zweig raus), `src/app.css` (Import raus), `CLAUDE.md`
(Info-Portal-Modulliste).

## Entscheidung 2: `db.php` — nur noch Status-Code, kein Body

**Befund:** Nach Entscheidung 1 (Debug-Modul weg) liest **kein** Frontend-Code mehr den
Response-Body von `db.php` — `HealthModule.ts` wertet ausschließlich `response.ok` (HTTP-Status)
und eine eigene, clientseitig gemessene Latenz aus (`src/components/info/HealthModule.ts:89-103`),
nie den Body-Inhalt.

**Entscheidung:** `db.php` liefert nur noch `200` (DB erreichbar) oder `500` (nicht erreichbar),
**kein** JSON-Body mehr. Intern weiterhin ein `SELECT 1` gegen die DB, um echte Erreichbarkeit zu
prüfen (nicht nur "Datei liefert HTTP 200") — nur die Ausgabe des Ergebnisses entfällt.

**Name bleibt `db.php`** (kein Rename) — Funktion (DB-Erreichbarkeit) ist am Namen bereits klar
genug.

## Entscheidung 3: Zwei Endpoints umbenennen, einen entfernen

Beim Durchgehen aller 12 Endpoint-Namen zwei echte Klarheitsprobleme gefunden:

- **`stations.php` → `nearest-stations.php`**: liefert die nächstgelegenen RD/NEF-Stationen zu
  einem Zielpunkt inkl. ORS-Fahrzeiten (Parameter `target`, `type`, `profile`, `limit`).
- **`region_stations.php` → `stations-by-region.php`**: liefert alle RD/NEF-Stationen eines
  Bundeslands (Parameter `state`). Die beiden alten Namen (`stations.php` vs. `region_stations.php`)
  sind am Namen allein nicht unterscheidbar, obwohl sie grundverschiedene Abfragen sind.
- **`test.php` → gelöscht**: echot nur `PHP_IS_WORKING`, faktisches Duplikat von `ping.php`
  (liefert `{"status":"ok","time":...}` — dieselbe Funktion, nur mit echtem JSON statt Rohtext).

Alle anderen neun Endpoints (`ping`, `db`, `nah`, `stats`, `geocoder`, `ors`, `adsb`, `ais`,
`diag`) bleiben unverändert benannt — bereits selbsterklärend genug, kein Renaming-Bedarf.

**Betroffene Frontend-Aufrufstellen (müssen mit umbenannt werden):**
- `src/lib/RoutingService.ts:81` und `:110` (`/api/stations.php` → `/api/nearest-stations.php`)
- `src/lib/RoutingService.test.ts` (Mock-URL-Assertions)
- `src/components/info/RegionsModule.ts:169` (`/api/region_stations.php` →
  `/api/stations-by-region.php`)
- `src/components/info/HealthModule.ts` und `docs/API_ENDPOINTS.md` referenzieren `test.php`
  nicht — kein weiterer Fundort für dessen Entfernung nötig, außer der Datei selbst und dem
  `docs/openapi.yaml`-Eintrag.

## Entscheidung 4: Methoden-Restriktion (GET-only für read-only Endpoints)

Neuer, seiteneffektfreier Helper `api/http.php` (`require_method(string $method)`) — bei
Methoden-Mismatch `405` + `Allow`-Header, sonst kein Effekt. Angewendet auf alle rein lesenden
Endpoints: `ping.php`, `db.php`, `nah.php`, `stats.php`, `stations-by-region.php`,
`nearest-stations.php`, `geocoder.php`, `adsb.php`, `ais.php` (9 Stück, `test.php` entfällt durch
Entscheidung 3).

**Bewusst ausgenommen:**
- `ors.php` — braucht POST für Directions/Matrix/Isochrones mit Body.
- `diag.php` — bestehende Altentscheidung aus dem 2026-07-08-Audit (nginx-Block statt
  Code-Änderung, siehe `docs/TODO_ARCHIVE.md`), hier nicht revidieren.

Eigene Datei statt Integration in `config.php`, weil `config.php`s Secret-Check
(`DB_PASS`/`ORS_API_KEY` erforderlich, sonst `500` + `exit`) sonst auch von `adsb.php`/`ais.php`/
`ping.php` mitgeerbt würde, obwohl diese keine DB-/ORS-Secrets brauchen.

## Entscheidung 5: Input-Validierung auf drei Endpoints

- **`ors.php`**: `path`-Parameter gegen Allowlist-Pattern
  (`^(health|status|directions/[a-z0-9-]+/geojson|matrix/[a-z0-9-]+|isochrones/[a-z0-9-]+)$`),
  sonst `400`. Grund: `ors.php` hängt den `ORS_API_KEY` an jede Anfrage — ein unbeschränkter
  `path` erlaubt, mit unserem Key beliebige ORS-Endpoints anzusprechen. `{profil}` bleibt bewusst
  ein offenes Segment (`[a-z0-9-]+`) statt fester Namensliste, da gültige ORS-Profile dynamisch
  vom extern betriebenen ORS-Host konfiguriert werden (`RoutingService.getProfiles()` liest sie
  zur Laufzeit aus `/status`).
- **`nearest-stations.php`** (ex-`stations.php`): `profile`-Parameter landet ebenfalls in einer
  ORS-Matrix-URL (`ORS_URL/matrix/{profile}`) — Format auf `^[a-z0-9-]+$` beschränkt, sonst `400`.
- **`geocoder.php`**: nur `lat`/`lon` (Reverse-Geocoding-Zweig) werden mit `is_numeric()` geprüft.
  Der `q`-Parameter (Adress-Freitextsuche) bleibt **komplett unverändert und offen** — er wird
  nur an eine feste externe URL (Nominatim) weitergereicht, kein SQL-/Code-Kontext, also kein
  Injection-Risiko durch offenen Freitext. Keine zusätzliche Längenbegrenzung (Nominatim macht
  eigenes Rate-Limiting/Validierung serverseitig).

**Bewusst nicht validiert** (Scope-Entscheidung, kein Sicherheitsrisiko): `region`/`state`-Parameter
bei `stations-by-region.php` — bereits als Bind-Parameter (`pg_query_params`) injection-sicher,
ein ungültiger Wert liefert nur eine leere Liste. Reiner Robustheits-, kein Sicherheitspunkt.

## Entscheidung 6: Doku-Konsolidierung auf `docs/openapi.yaml`

`docs/API_ENDPOINTS.md` (nur 5 von 12 Endpoints dokumentiert, teils veraltet — z.B. die falsche
Behauptung, `ors.php`s Health-Check brauche keinen API-Key, obwohl `curl_request()` in
`config.php` ihn bei jeder Anfrage mitschickt) wird **gelöscht**. `docs/openapi.yaml` (bereits
vollständig für alle 12 Endpoints, maschinell validiert via `npm run validate:openapi`, und
bereits der in `CLAUDE.md` referenzierte Soll-Standard für diesen Zweck) wird die alleinige
Quelle — für die beiden Umbenennungen und `test.php`s Entfernung aktualisiert, plus die neuen
`400`/`405`-Responses aus den Entscheidungen 4/5.

Der „Migration auf Produktiv-Server"-Absatz aus `API_ENDPOINTS.md` ist kein Endpoint-Doku-Inhalt,
sondern ein Ops-Runbook-Punkt — wandert als eigener kurzer Abschnitt nach `CLAUDE.md`.

`src/components/info/HealthModule.ts`s Subtitle („Details in docs/API_ENDPOINTS.md.") verweist
auf die gelöschte Datei — Verweis wird entfernt (kein Ersatzverweis auf `openapi.yaml`, da diese
Datei ohnehin nicht öffentlich ausgeliefert wird und für Endnutzer der `/info/health`-Seite kein
sinnvoller Link ist).

**Zusätzlicher Fund (Nebenbei-Fix):** `CLAUDE.md`s Standards-Referenzen-Tabelle behauptet noch
„bisher keine OpenAPI-Spec vorhanden" — das ist bereits seit dem 2026-07-08-Audit falsch
(`docs/openapi.yaml` existiert, siehe `docs/TODO_ARCHIVE.md`). Wird mit korrigiert, analog zur
bereits in der letzten Runde korrigierten falschen CSP-Behauptung.

## Nicht Teil dieser Spec

- **`curl_request()`-Timeout-Fund** (`api/config.php`) — bleibt separater, bereits dokumentierter
  TODO.md-Punkt, kein thematischer Zusammenhang.
- **`diag.php`** — bewusst unangetastet (siehe Entscheidung 4).
- **Rate-Limiting** — nicht angefragt, kein Teil dieser Spec.
- **Umbenennung der übrigen 9 Endpoints** für ein durchgängiges Namensschema — bewusst
  verworfen, nur die zwei echten Klarheitsprobleme werden gelöst.
- **Längenbegrenzung für `geocoder.php`s `q`-Parameter** — bewusst verworfen, siehe
  Entscheidung 5.
