# SEW/NEF-Matrixsuche für Valhalla — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die SEW/NEF-„Nächste-Station"-Matrixsuche (`/routing`, Modus SEW/NEF) unterstützt neben
ORS jetzt auch Valhalla als Provider — letzte verbleibende Parität-Lücke der Valhalla-ORS-
Integration (nach Status-Anzeige und Turn-by-Turn).

**Architecture:** `api/nearest-stations.php` bekommt einen neuen `provider`-Query-Parameter
(Default `ors`). Die PostGIS-KNN-Stationssuche (Schritt 1) bleibt für beide Provider identisch —
nur der Matrix-Aufruf (Schritt 2: ORS `curl_request()` gegen `/matrix/{profile}` vs. eigener
schlanker curl-Call gegen Valhallas `/sources_to_targets`) und die Antwort-Extraktion (Schritt 3)
verzweigen. Frontend: `RoutingService.findNearestStations()` bekommt den `provider`-Parameter
durchgereicht, `RoutingSidebar.ts` verliert die drei Stellen, die Valhalla in SEW/NEF hart auf
ORS zurücksetzen. Zusätzlich (Fund beim Planen, nicht explizit in der Spec benannt, aber
notwendig für echte Parität): `RoutingSidebarAdapter.ts`s `fetchRouteIfNeeded()` — zeichnet die
Route zu einer einzelnen, per Augen-Icon aktivierten Station auf der Karte — ruft bisher
IMMER `RoutingService.calculateRoute` (ORS) auf, unabhängig vom gewählten Provider. Ohne Fix
würde die Matrix (Dauer/Distanz in der Ergebnisliste) von Valhalla kommen, die auf der Karte
gezeichnete Linie aber weiterhin von ORS — sichtbar inkonsistent. Wird hier mitgefixt, analog zum
bereits bestehenden A→B-Branch (`params.provider === 'valhalla' ? ValhallaService... :
RoutingService...`).

**Tech Stack:** TypeScript (Vite/Vitest), PHP (kein automatisiertes Test-Framework in `api/`, siehe
`CLAUDE.md`).

**Spec:** `docs/superpowers/specs/2026-08-22-valhalla-sew-nef-matrix-design.md`

## Global Constraints

- `VALHALLA_URL` kommt ausschließlich aus `api/config.local.php` (gitignored) — kein
  Produktions-Default, analog `api/valhalla.php`. Fehlt sie, antwortet der Valhalla-Zweig mit
  HTTP 500, der ORS-Zweig bleibt davon unberührt.
- Kein `curl_request()`-Helper für den Valhalla-Matrix-Call — der hängt automatisch
  `X-API-KEY: ORS_API_KEY` an, was für Valhalla falsch wäre. Eigener minimaler curl-Aufruf,
  analog dem bereits bestehenden Muster in `api/valhalla.php`.
- Valhalla `sources_to_targets` liefert `distance` in Kilometern (× 1000 auf Meter umrechnen);
  ORS' Matrix liefert `distances` bereits in Metern — keine Umrechnung dort.
- Der bestehende `driving-emergency`-Zwei-Pass-Fallback in `RoutingService.findNearestStations()`
  bleibt ausschließlich für `provider === 'ors'` aktiv.
- Deutsche Kommentare/Copy.
- Nach jedem Task: `npx tsc --noEmit && npm test` muss grün sein (für TS-Tasks); PHP-Tasks werden
  per `php -l` gelintet und — wo in dieser Umgebung möglich — live gegen die echte
  Valhalla/Postgres-Instanz verifiziert (`VALHALLA_URL`/DB in `api/config.local.php` sind hier
  erreichbar, siehe Task 1).

---

## Task 1: `api/nearest-stations.php` — Provider-Branch für den Matrix-Aufruf

**Files:**
- Modify: `api/nearest-stations.php`

**Interfaces:**
- Consumes: nichts Neues (nutzt bestehende `get_db_conn()`/`curl_request()`/`ORS_URL` aus
  `config.php`, die von `nearest-stations.php` bereits per `require_once 'config.php';` geladen
  werden — das lädt auch `config.local.php` und damit `VALHALLA_URL`, falls gesetzt).
- Produces: neuer Query-Parameter `provider` (`ors` Default, `valhalla`) für Task 2
  (`RoutingService.findNearestStations()`).

- [ ] **Step 1: `provider`-Parameter lesen + validieren**

In `api/nearest-stations.php`, direkt nach der bestehenden `$profile`-Validierung (nach der
`if (!preg_match('/^[a-z0-9-]+$/', $profile)) { ... }`-Zeile), einfügen:

```php
$provider = $_GET['provider'] ?? 'ors';

if (!in_array($provider, ['ors', 'valhalla'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid provider']);
    exit;
}
```

- [ ] **Step 2: Schritt 2 (Matrix-Aufruf) in einen Provider-Branch aufteilen**

Ersetze den kompletten bisherigen Abschnitt `// 2. ORS Matrix via Central Helper` bis
(exklusiv) `// 3. Ergebnisse kombinieren und sortieren` mit:

```php
// 2. Matrix-Aufruf — Provider-Branch (Stationssuche oben bleibt für beide Provider gemeinsam)
if ($provider === 'valhalla') {
    if (!defined('VALHALLA_URL')) {
        http_response_code(500);
        echo json_encode(['error' => 'Server misconfigured: VALHALLA_URL not set in config.local.php']);
        exit;
    }

    $sources = [];
    foreach ($stations as $s) {
        $sources[] = ['lat' => (float)$s['lat'], 'lon' => (float)$s['lon']];
    }
    $targets = [['lat' => $lat, 'lon' => $lon]];

    $payload = [
        'sources' => $sources,
        'targets' => $targets,
        'costing' => $profile,
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

- [ ] **Step 3: Schritt 3 (Ergebnis-Extraktion) providerabhängig machen**

Im bestehenden `foreach ($stations as $i => $s) { ... }`-Block, ersetze die beiden Zeilen

```php
    $duration = $matrix['durations'][$i][0];
    $distance = $matrix['distances'][$i][0];
```

mit:

```php
    if ($provider === 'valhalla') {
        $duration = $matrix['sources_to_targets'][$i][0]['time'] ?? null;
        $distance = isset($matrix['sources_to_targets'][$i][0]['distance'])
            ? $matrix['sources_to_targets'][$i][0]['distance'] * 1000
            : null;
    } else {
        $duration = $matrix['durations'][$i][0];
        $distance = $matrix['distances'][$i][0];
    }
```

Der Rest der Datei (Icon-Logik, `$results[]`-Aufbau, `usort`, `array_slice`) bleibt unverändert —
er arbeitet nur noch mit `$duration`/`$distance`, kennt den Provider nicht mehr.

- [ ] **Step 4: Lint**

Run: `php -l api/nearest-stations.php`
Expected: `No syntax errors detected in api/nearest-stations.php`

- [ ] **Step 5: Live-Verifikation gegen die echte Valhalla-Instanz**

`VALHALLA_URL` ist in dieser Umgebung gesetzt (`api/config.local.php`) und unter
`http://100.64.0.2:8092` erreichbar (per `curl .../status` bereits bestätigt), ebenso die lokale
Postgres-DB (`127.0.0.1:5432`) — Live-Test ist hier tatsächlich möglich, nicht nur simuliert.

Starte den PHP-Dev-Server (`cd api && php -S 127.0.0.1:8081 router.php`, falls nicht schon über
`npm run dev` aktiv) und prüfe:

```bash
curl "http://127.0.0.1:8081/nearest-stations.php?target=48.3069,14.2858&type=sew&profile=auto&provider=valhalla"
```

Erwartet: JSON-Array mit Stationen, `duration` (Sekunden, plausibel im Bereich von ORS-Werten)
und `distance` (Meter — **nicht** Kilometer, also z.B. `~15150`, nicht `15.15`). Danach zur
Kontrolle denselben Request mit `&provider=ors` (bzw. ganz ohne `provider`) gegenprüfen, dass der
bestehende ORS-Pfad unverändert funktioniert.

- [ ] **Step 6: Commit**

```bash
git add api/nearest-stations.php
git commit -m "feat(routing): Valhalla-Matrix-Provider in nearest-stations.php ergänzt"
```

---

## Task 2: `RoutingService.findNearestStations()` — `provider`-Parameter

**Files:**
- Modify: `src/lib/RoutingService.ts`
- Test: `src/lib/RoutingService.test.ts`

**Interfaces:**
- Consumes: `api/nearest-stations.php?...&provider=<ors|valhalla>` (Task 1).
- Produces: `RoutingService.findNearestStations(target, type, profile?, provider?):
  Promise<RoutingStation[]>` — neuer optionaler 4. Parameter `provider: 'ors' | 'valhalla' =
  'ors'`, wird von Task 4 (`RoutingSidebarAdapter.ts`) verwendet.

- [ ] **Step 1: Fehlschlagenden Test schreiben — Provider wird als Query-Parameter durchgereicht**

In `src/lib/RoutingService.test.ts`, im bestehenden
`describe('RoutingService.findNearestStations (driving-emergency / Sondersignal)', ...)`-Block
(oder danach als eigener `describe`), ergänze:

```ts
describe('RoutingService.findNearestStations (provider)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('passes the provider through as a query parameter to nearest-stations.php', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    vi.stubGlobal('fetch', fetchMock);

    await RoutingService.findNearestStations([48.3, 14.2], 'sew', 'auto', 'valhalla');

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('provider=valhalla'));
  });

  it('does not run the driving-emergency two-pass fallback when provider is valhalla', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    vi.stubGlobal('fetch', fetchMock);
    const calculateRouteSpy = vi.spyOn(RoutingService, 'calculateRoute');

    await RoutingService.findNearestStations([48.3, 14.2], 'sew', 'driving-emergency', 'valhalla');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calculateRouteSpy).not.toHaveBeenCalled();

    calculateRouteSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/RoutingService.test.ts`
Expected: FAIL — `findNearestStations` akzeptiert noch keinen 4. Parameter, die URL enthält kein
`provider=valhalla`.

- [ ] **Step 3: `findNearestStations()` implementieren**

In `src/lib/RoutingService.ts`, ersetze die Signatur und den Body von `findNearestStations`:

```ts
  async findNearestStations(
    target: [number, number],
    type: 'sew' | 'nef',
    profile: string = 'driving-car',
    provider: 'ors' | 'valhalla' = 'ors'
  ): Promise<RoutingStation[]> {
    try {
      // SONDERFALL: driving-emergency (nur ORS — Valhallas Matrix scheint laut Live-Test
      // zuverlässig, siehe Design-Spec; kein Beleg für dasselbe Problem)
      // Matrix-Abfrage für driving-emergency ist unzuverlässig.
      // 1. Suche 7 schnellste Stationen mit driving-car.
      // 2. Berechne für diese 7 die echte Route mit driving-emergency.
      // 3. Gib die 5 besten zurück.
      if (profile === 'driving-emergency' && provider === 'ors') {
        const top7Base = await fetch(`/api/nearest-stations.php?target=${target[0]},${target[1]}&type=${type}&profile=driving-car&limit=7`);
        const stations7 = await top7Base.json();

        const detailedResults = await Promise.all(stations7.map(async (s: RoutingStation) => {
          const route = await this.calculateRoute([s.lat, s.lon], target, 'driving-emergency');
          if (route && route.features && route.features.length > 0) {
            const summary = route.features[0].properties.summary;
            return {
              ...s,
              duration: summary.duration,
              distance: summary.distance,
              // Vollständige FeatureCollection speichern – so wie calculateRoute sie liefert
              // und wie RoutingMapLayers.updateRoutesLayer sie erwartet (route.features[0].geometry).
              route: route
            };
          }
          return null;
        }));

        // Filtere Fehler raus und sortiere nach der echten Emergency-Dauer
        const final5 = detailedResults
          .filter(r => r !== null)
          .sort((a, b) => a.duration - b.duration)
          .slice(0, 5);

        return final5;
      }

      // Normalfall: Direkte Matrix-Abfrage mit dem gewählten Profil/Provider
      const res = await fetch(`/api/nearest-stations.php?target=${target[0]},${target[1]}&type=${type}&profile=${profile}&provider=${provider}`);
      if (!res.ok) throw new Error('Stations-API nicht erreichbar');
      return await res.json();
    } catch (e) {
      console.error('Stations-Suche Fehler:', e);
      return [];
    }
  }
```

- [ ] **Step 4: Tests + Typecheck ausführen**

Run: `npx tsc --noEmit && npx vitest run src/lib/RoutingService.test.ts`
Expected: PASS (alle Tests in der Datei, inkl. der beiden neuen).

- [ ] **Step 5: Commit**

```bash
git add src/lib/RoutingService.ts src/lib/RoutingService.test.ts
git commit -m "feat(routing): findNearestStations() um provider-Parameter erweitert"
```

---

## Task 3: `RoutingSidebar.ts` — Provider-Umschalter bleibt in SEW/NEF aktiv

**Files:**
- Modify: `src/components/RoutingSidebar.ts`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: `RoutingParams.provider` gilt ab jetzt für alle drei Modi (`ab`/`sew`/`nef`), nicht
  nur `ab` — wird von Task 4 (`RoutingSidebarAdapter.ts`) konsumiert.

- [ ] **Step 1: `fieldProvider`-Sichtbarkeitssteuerung entfernen**

In `src/components/RoutingSidebar.ts`, entferne die Zeile

```ts
  const fieldProvider = document.getElementById('field-provider')!;
```

und ersetze die `updateModeUI`-Funktion:

```ts
  const updateModeUI = (mode: string) => {
    if (mode === 'ab') {
      fieldStart.classList.remove('hidden');
      fieldProvider.classList.remove('hidden');
      labelTarget.textContent = 'Ziel';
    } else {
      fieldStart.classList.add('hidden');
      fieldProvider.classList.add('hidden');
      labelTarget.textContent = 'Einsatzort (Ziel)';
      // SEW/NEF unterstützen nur ORS (Matrix-Suche). Nur zurücksetzen, wenn Valhalla gewählt war —
      // sonst geht ein bereits gewähltes ORS-Profil (z.B. driving-emergency) beim Moduswechsel
      // verloren (Regression, gefunden im finalen Whole-Branch-Review 2026-08-19).
      if (routeProvider.value !== 'ors') {
        routeProvider.value = 'ors';
        handleProviderChange('ors');
      }
    }
    // Bei Modus-Wechsel alles leeren
    document.getElementById('routing-status')!.classList.add('hidden');
    document.getElementById('routing-details')!.classList.add('hidden');
    document.getElementById('routing-results')!.classList.add('hidden');
  };
```

durch:

```ts
  const updateModeUI = (mode: string) => {
    if (mode === 'ab') {
      fieldStart.classList.remove('hidden');
      labelTarget.textContent = 'Ziel';
    } else {
      fieldStart.classList.add('hidden');
      labelTarget.textContent = 'Einsatzort (Ziel)';
    }
    // Bei Modus-Wechsel alles leeren
    document.getElementById('routing-status')!.classList.add('hidden');
    document.getElementById('routing-details')!.classList.add('hidden');
    document.getElementById('routing-results')!.classList.add('hidden');
  };
```

(Provider-Select bleibt jetzt in allen drei Modi sichtbar — das `id="field-provider"`-Element
trägt im Template ohnehin keine `hidden`-Klasse, siehe `initRoutingSidebar`-Template weiter oben
in derselben Datei.)

- [ ] **Step 2: Provider im Start-Button-Handler nicht mehr auf SEW/NEF hart auf ORS setzen**

Ersetze im `btnStart.addEventListener('click', ...)`-Handler:

```ts
    const provider = mode === 'ab'
      ? (routeProvider.value as 'ors' | 'valhalla')
      : 'ors'; // SEW/NEF unterstützen nur ORS
```

durch:

```ts
    const provider = routeProvider.value as 'ors' | 'valhalla';
```

- [ ] **Step 3: Typecheck + volle Testsuite**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. `noUnusedLocals` darf hier nicht meckern — `fieldProvider` ist komplett entfernt,
nicht nur unbenutzt liegen gelassen. Kein `RoutingSidebar.test.ts`-Update nötig: die
`updateModeUI`/`btnStart`-Closure-Logik in `initRoutingSidebar` ist bereits heute nicht per
Unit-Test abgedeckt (geprüft — keine bestehenden Tests zur SEW/NEF-Provider-Regression von
2026-08-19 gefunden), es gibt also nichts anzupassen.

- [ ] **Step 4: Commit**

```bash
git add src/components/RoutingSidebar.ts
git commit -m "feat(routing): Provider-Umschalter bleibt in SEW/NEF-Modus aktiv"
```

---

## Task 4: `RoutingSidebarAdapter.ts` — Provider bei SEW/NEF durchreichen (Matrixsuche + Einzelrouten)

**Files:**
- Modify: `src/features/routing/RoutingSidebarAdapter.ts`
- Test: `src/features/routing/RoutingSidebarAdapter.test.ts`

**Interfaces:**
- Consumes: `RoutingService.findNearestStations(target, type, profile, provider)` (Task 2),
  `ValhallaService.calculateRoute(start, target, costing): Promise<RouteResult | null>` (bereits
  vorhanden, unverändert).
- Produces: nichts Neues für andere Tasks — Endpunkt der Kette.

- [ ] **Step 1: Fehlschlagenden Test schreiben — Einzelroute zu einer SEW/NEF-Station nutzt den
  gewählten Provider**

In `src/features/routing/RoutingSidebarAdapter.test.ts`, ergänze `renderStationResults` zum
bestehenden Import aus `'../../components/RoutingSidebar'` (Zeile 6):

```ts
import { updateRoutingSummary, renderRoutingError, renderStationResults } from '../../components/RoutingSidebar';
```

Füge am Ende der Datei (nach dem letzten bestehenden `it(...)`-Block, innerhalb desselben
`describe('RoutingSidebarAdapter A→B route details', ...)`  — trotz des Blocknamens der
passende Ort, da er bereits `capturedOnRouteStart`/`elements`-Setup aus dem umgebenden
`beforeEach` mitnutzt) folgenden Test ein:

```ts
  it('draws the SEW/NEF station route via ValhallaService when provider is valhalla, and passes provider to findNearestStations', async () => {
    const dataService = new RoutingDataService();
    const map = { fitBounds: vi.fn() } as any;
    const adapter = new RoutingSidebarAdapter(dataService, map, new AbortController().signal);
    adapter.init({} as any);

    const stations = [
      { id: 1, name: 'Stützpunkt A', org: 'SEW', lat: 48.1, lon: 14.1, duration: 300, distance: 5000 },
    ];
    const findNearestStationsSpy = vi.spyOn(RoutingService, 'findNearestStations').mockResolvedValue(stations as any);

    const routeResult = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { summary: { distance: 5000, duration: 300 } },
        geometry: { type: 'LineString', coordinates: [[14.1, 48.1], [14.2, 48.2]] },
      }],
    };
    const orsSpy = vi.spyOn(RoutingService, 'calculateRoute');
    const valhallaSpy = vi.spyOn(ValhallaService, 'calculateRoute').mockResolvedValue(routeResult as any);

    expect(capturedOnRouteStart).not.toBeNull();
    await capturedOnRouteStart!({
      mode: 'sew',
      target: [48.2, 14.2],
      profile: 'auto',
      provider: 'valhalla',
    });

    expect(findNearestStationsSpy).toHaveBeenCalledWith([48.2, 14.2], 'sew', 'auto', 'valhalla');

    // Zweiter Callback-Parameter von renderStationResults(stations, onToggle, onHighlight) —
    // simuliert den Klick auf eine Station in der Ergebnisliste.
    const onHighlight = vi.mocked(renderStationResults).mock.calls.at(-1)![2];
    await onHighlight(stations[0] as any);

    expect(valhallaSpy).toHaveBeenCalledWith([48.1, 14.1], [48.2, 14.2], 'auto');
    expect(orsSpy).not.toHaveBeenCalled();

    findNearestStationsSpy.mockRestore();
    orsSpy.mockRestore();
    valhallaSpy.mockRestore();
  });
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/features/routing/RoutingSidebarAdapter.test.ts`
Expected: FAIL — `findNearestStationsSpy` wird noch ohne den 4. Parameter aufgerufen, und
`fetchRouteIfNeeded` ruft für die Einzelroute noch `RoutingService.calculateRoute` (ORS) statt
`ValhallaService.calculateRoute` auf (`orsSpy` wurde aufgerufen).

- [ ] **Step 3: `RoutingSidebarAdapter.ts` anpassen**

Ersetze in `src/features/routing/RoutingSidebarAdapter.ts` den `findNearestStations`-Aufruf:

```ts
          const results: RoutingStation[] = await RoutingService.findNearestStations(params.target, params.mode as 'sew' | 'nef', params.profile);
```

durch:

```ts
          const results: RoutingStation[] = await RoutingService.findNearestStations(params.target, params.mode as 'sew' | 'nef', params.profile, params.provider);
```

Und ersetze die `fetchRouteIfNeeded`-Funktion:

```ts
          const fetchRouteIfNeeded = async (station: RoutingStation) => {
            if (!this.dataService.getStationRoutes().get(station.id)) {
              const route = await RoutingService.calculateRoute([station.lat, station.lon], params.target, params.profile);
              if (this.abortSignal.aborted) return;
              if (route && route.features && route.features.length > 0) {
                this.dataService.setStationRoute(station.id, route);
              }
            }
          };
```

durch:

```ts
          const fetchRouteIfNeeded = async (station: RoutingStation) => {
            if (!this.dataService.getStationRoutes().get(station.id)) {
              const route = params.provider === 'valhalla'
                ? await ValhallaService.calculateRoute([station.lat, station.lon], params.target, params.profile)
                : await RoutingService.calculateRoute([station.lat, station.lon], params.target, params.profile);
              if (this.abortSignal.aborted) return;
              if (route && route.features && route.features.length > 0) {
                this.dataService.setStationRoute(station.id, route);
              }
            }
          };
```

(`ValhallaService` ist in dieser Datei bereits importiert, siehe Zeile 5 — keine neue Import-Zeile
nötig.)

- [ ] **Step 4: Tests + Typecheck ausführen**

Run: `npx tsc --noEmit && npm test`
Expected: PASS — alle bestehenden Tests weiterhin grün, plus der neue Test aus Step 1.

- [ ] **Step 5: `npm run docs:bausteine` (falls `src/lib/`-Dateien in dieser Runde geändert wurden)**

In diesem Task wird keine Datei unter `src/lib/` verändert (nur `src/features/routing/`) — dieser
Schritt entfällt hier. Nur zur Erinnerung für Reviewer: **nicht** vergessen, falls ein späterer
Task doch `src/lib/*.ts` anfasst.

- [ ] **Step 6: Commit**

```bash
git add src/features/routing/RoutingSidebarAdapter.ts src/features/routing/RoutingSidebarAdapter.test.ts
git commit -m "fix(routing): SEW/NEF-Einzelroute nutzt bei Valhalla-Provider ValhallaService statt ORS"
```

---

## Task 5: Manuelle Live-Verifikation im Browser + Doku nachziehen

**Files:**
- Modify: `docs/TODO.md` (Scope-Hinweis beim bestehenden „Valhalla-Connector: vor Live-Deploy"-
  Punkt aktualisieren)
- Modify: `docs/CHANGELOG.md` (neuer Journal-Block)

**Interfaces:** keine — Abschluss-Task, dokumentiert nur.

- [ ] **Step 1: Live-Test im Browser (durch den Nutzer, kein Playwright in dieser Umgebung)**

`npm run dev` starten, `/routing` öffnen, Modus SEW und NEF durchspielen mit Provider „Valhalla":
Stationsliste erscheint mit plausiblen Dauer-/Distanzwerten, Augen-Icon zeichnet die Route auf der
Karte (Linie sollte jetzt von Valhalla stammen — erkennbar z.B. an leicht abweichender
Linienführung/-länge gegenüber ORS bei derselben Station). `emergency`-Costing gezielt gegen eine
realistischere Anzahl Stationen prüfen (Spec-Vorbehalt: „nur an 3 Quellen getestet, nicht als
erwiesen übernommen").

- [ ] **Step 2: `docs/TODO.md` — Scope-Hinweis beim Valhalla-Deploy-Punkt aktualisieren**

Der bestehende Punkt „**Valhalla-Connector: vor Live-Deploy**" erwähnt bereits den gewachsenen
Scope (Turn-by-Turn + potenziell `sources_to_targets`). Ergänze am Ende des Absatzes (nach dem
letzten Aufzählungspunkt zu `VALHALLA_URL`/Tailscale) einen Hinweis, dass die Matrix-Suche
(`sources_to_targets`) jetzt implementiert ist (nicht mehr nur „potenziell"), die
Security-Review vor Deploy also endgültig auch den `nearest-stations.php`-Matrix-Traffic
mit-abdecken muss, nicht nur `api/valhalla.php`.

- [ ] **Step 3: `docs/CHANGELOG.md` — neuer Journal-Block**

Neuer `## [Unreleased] - <Datum> <Uhrzeit>`-Block **oberhalb** des aktuell jüngsten Blocks
(nicht hineinmergen, siehe bestehende Konvention in dieser Datei), German, Kategorie
„Hinzugefügt": SEW/NEF-Matrixsuche unterstützt jetzt Valhalla als Provider —
`api/nearest-stations.php` (`provider`-Parameter), `RoutingService.findNearestStations()`,
`RoutingSidebar.ts` (Provider-Umschalter bleibt in SEW/NEF sichtbar),
`RoutingSidebarAdapter.ts` (Einzelroute pro Station nutzt bei Valhalla-Provider
`ValhallaService` statt ORS). Test-/Typecheck-Zahlen aus dem letzten grünen Lauf nennen.

- [ ] **Step 4: Commit**

```bash
git add docs/TODO.md docs/CHANGELOG.md
git commit -m "docs(routing): SEW/NEF-Matrixsuche für Valhalla — Scope-Update TODO/CHANGELOG"
```
