# Valhalla-Routing-Connector (Testumgebung) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auf der Routing-Seite (`/routing`, Modus A → B) einen Provider-Umschalter ORS/Valhalla ergänzen, der eine A→B-Route über eine selbst gehostete Valhalla-Instanz (Tailscale-IP, nur lokaler Dev-Server) berechnet und identisch zur ORS-Route auf der Karte darstellt.

**Architecture:** Neuer, eigenständiger PHP-Proxy (`api/valhalla.php`, eigener curl-Call statt der ORS-Auth-behafteten `curl_request()`-Hilfsfunktion) + neuer TS-Service (`src/lib/ValhallaService.ts`) + neuer Interpreter (`src/lib/ValhallaRouteInterpreter.ts`), der Valhallas Rohantwort in dieselbe `RouteResult`-GeoJSON-Struktur übersetzt, die `RoutingService`/ORS heute liefert. Dadurch bleiben `RoutingMapLayers`, `updateRoutingSummary` und die gesamte Kartendarstellung unangetastet — nur `RoutingSidebar.ts` (Provider-Dropdown) und `RoutingSidebarAdapter.ts` (Verzweigung) werden erweitert.

**Tech Stack:** TypeScript/Vite (Frontend), PHP (Proxy), Vitest (Tests), `@mapbox/polyline` (neue npm-Dependency, Polyline6-Decoding).

**Spec:** [docs/superpowers/specs/2026-08-19-valhalla-routing-connector-design.md](../specs/2026-08-19-valhalla-routing-connector-design.md)

## Global Constraints

- `RouteResult`-Struktur ist der einzige Integrationspunkt — Valhalla-Ergebnisse MÜSSEN exakt dieselbe Form haben wie ORS (`features[0].geometry`, `features[0].properties.summary.{distance,duration}`), `extras`/`segments` bleiben `undefined`.
- Distanz-Einheit im `RouteResult` ist immer **Meter** (Valhalla liefert km bei `units: 'kilometers'` → `* 1000`), Dauer immer **Sekunden** (Valhalla liefert bereits Sekunden, keine Umrechnung).
- `VALHALLA_URL` hat **keinen Produktions-Default** — nur über `api/config.local.php` (gitignored) setzbar. Ist sie nicht gesetzt, antwortet `valhalla.php` mit HTTP 500.
- `api/valhalla.php` nutzt **keine** geteilte `curl_request()`-Funktion aus `api/config.php` (die hängt automatisch `X-API-KEY: ORS_API_KEY` an) — eigener, minimaler curl-Call, eigenes Laden von `config.local.php`. `api/config.php`/`api/ors.php` bleiben in dieser Aufgabe komplett unangetastet.
- Kein Eintrag in `nginx.conf` oder `deploy-website.sh` — der Proxy ist ausschließlich für `npm run dev` gedacht.
- Turn-by-Turn, SEW/NEF-Matrix und dynamische Profil-/Status-Abfrage für Valhalla sind **out of scope** (siehe Spec) — Valhalla-Profile sind eine hartkodierte Liste (`auto`, `bicycle`, `pedestrian`).
- Deutsche UI-Copy (Labels, Fehlermeldungen), passend zum bestehenden Code in den betroffenen Dateien.
- Verifikation vor Abschluss jeder Aufgabe mit TS-Code: `npx tsc --noEmit && npm test`.

---

## Task 1: `ValhallaRouteInterpreter` — Wire-Format → `RouteResult`

**Files:**
- Modify: `package.json` (neue Dependency)
- Create: `src/lib/ValhallaRouteInterpreter.ts`
- Test: `src/lib/ValhallaRouteInterpreter.test.ts`

**Interfaces:**
- Produces: `export interface ValhallaTrip { legs: { shape: string }[]; summary: { time: number; length: number } }` und `export function toRouteResult(trip: ValhallaTrip): RouteResult` (aus `src/types/common.ts`: `RouteResult`) — wird in Task 3 von `ValhallaService.ts` importiert.

- [ ] **Step 1: `@mapbox/polyline` als Dependency ergänzen**

```bash
npm install @mapbox/polyline@^1.2.1
npm install --save-dev @types/mapbox__polyline@^1.0.5
```

Prüfen: `package.json` hat danach `"@mapbox/polyline": "^1.2.1"` unter `dependencies` und `"@types/mapbox__polyline": "^1.0.5"` unter `devDependencies`.

- [ ] **Step 2: Fehlschlagenden Test schreiben**

Neue Datei `src/lib/ValhallaRouteInterpreter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as polyline from '@mapbox/polyline';
import { toRouteResult } from './ValhallaRouteInterpreter';

describe('ValhallaRouteInterpreter.toRouteResult', () => {
  it('decodes a single-leg shape into LineString coordinates in [lon, lat] order', () => {
    const points: [number, number][] = [[48.1, 14.1], [48.15, 14.15], [48.2, 14.2]]; // [lat, lon]
    const shape = polyline.encode(points, 6);

    const result = toRouteResult({
      legs: [{ shape }],
      summary: { time: 300, length: 12.5 },
    });

    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry.type).toBe('LineString');
    const coords = result.features[0].geometry.coordinates;
    expect(coords).toHaveLength(3);
    expect(coords[0][0]).toBeCloseTo(14.1, 5);
    expect(coords[0][1]).toBeCloseTo(48.1, 5);
    expect(coords[2][0]).toBeCloseTo(14.2, 5);
    expect(coords[2][1]).toBeCloseTo(48.2, 5);
  });

  it('converts summary.length (km) to meters and keeps summary.time (seconds) unchanged', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    const result = toRouteResult({ legs: [{ shape }], summary: { time: 300, length: 12.5 } });
    expect(result.features[0].properties.summary.distance).toBeCloseTo(12500, 1);
    expect(result.features[0].properties.summary.duration).toBe(300);
  });

  it('leaves extras and segments undefined (no turn-by-turn support yet)', () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    const result = toRouteResult({ legs: [{ shape }], summary: { time: 1, length: 1 } });
    expect(result.features[0].properties.extras).toBeUndefined();
    expect(result.features[0].properties.segments).toBeUndefined();
  });

  it('concatenates coordinates across multiple legs into one continuous LineString', () => {
    const shapeA = polyline.encode([[48.1, 14.1], [48.15, 14.15]], 6);
    const shapeB = polyline.encode([[48.15, 14.15], [48.2, 14.2]], 6);
    const result = toRouteResult({
      legs: [{ shape: shapeA }, { shape: shapeB }],
      summary: { time: 600, length: 25 },
    });
    expect(result.features[0].geometry.coordinates).toHaveLength(4);
  });
});
```

- [ ] **Step 3: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/ValhallaRouteInterpreter.test.ts`
Expected: FAIL — `Cannot find module './ValhallaRouteInterpreter'` (Datei existiert noch nicht).

- [ ] **Step 4: Interpreter implementieren**

Neue Datei `src/lib/ValhallaRouteInterpreter.ts`:

```ts
import * as polyline from '@mapbox/polyline';
import { Position } from 'geojson';
import { RouteResult } from '../types/common';

export interface ValhallaLeg {
  shape: string;
}

export interface ValhallaTripSummary {
  time: number;
  length: number;
}

export interface ValhallaTrip {
  legs: ValhallaLeg[];
  summary: ValhallaTripSummary;
}

/**
 * Übersetzt Valhallas `/route`-Antwort (komprimiertes Polyline6-`shape` pro Leg,
 * `summary.length` in km) in dieselbe `RouteResult`-Struktur, die ORS liefert
 * (Meter/Sekunden) — damit RoutingMapLayers/updateRoutingSummary unverändert bleiben.
 */
export function toRouteResult(trip: ValhallaTrip): RouteResult {
  const coordinates: Position[] = trip.legs.flatMap((leg) =>
    polyline.decode(leg.shape, 6).map(([lat, lon]) => [lon, lat] as Position)
  );

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: {
          summary: {
            distance: trip.summary.length * 1000,
            duration: trip.summary.time,
          },
        },
      },
    ],
    metadata: {},
  };
}
```

- [ ] **Step 5: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/lib/ValhallaRouteInterpreter.test.ts`
Expected: PASS (4 Tests grün)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 7: Commit (bündelt Spec + Plan mit dem ersten Code-Commit, kein separater Doku-Commit — bestätigte Repo-Präferenz)**

```bash
git add package.json package-lock.json src/lib/ValhallaRouteInterpreter.ts src/lib/ValhallaRouteInterpreter.test.ts docs/superpowers/specs/2026-08-19-valhalla-routing-connector-design.md docs/superpowers/plans/2026-08-19-valhalla-routing-connector.md
git commit -m "feat(routing): Valhalla-Response-Interpreter (Polyline6 → RouteResult) ergänzt"
```

---

## Task 2: PHP-Proxy `api/valhalla.php`

**Files:**
- Create: `api/valhalla.php`
- Modify: `api/config.local.php.example`

**Interfaces:**
- Produces: `GET/POST /api/valhalla.php?path=route|status` — reicht Body/Response 1:1 durch, analog `api/ors.php`. Wird in Task 3 von `ValhallaService.ts` unter `/api/valhalla.php?path=route` aufgerufen.

Kein automatisierter Test — das Repo hat keine PHP-Test-Infrastruktur (`ors.php`/`nearest-stations.php` haben ebenfalls keine). Verifikation über `php -l` (Syntax) und optional manuellen `curl` gegen die eigene Valhalla-Instanz.

- [ ] **Step 1: `api/valhalla.php` schreiben**

```php
<?php

header('Content-Type: application/json');

// Allowlist: 'route' (Kernfunktion), 'status' (Health-Check, für spätere Nutzung
// vorgesehen). Kein API-Key/Auth nötig — Valhalla läuft selbst gehostet ohne ORS-Secret.
$path = $_GET['path'] ?? 'status';
if (!preg_match('#^(route|status)$#D', $path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

// Eigenes, minimales Laden von config.local.php statt require_once 'config.php' —
// vermeidet den dortigen Fail-Closed-Check auf DB_PASS/ORS_API_KEY, die für einen
// reinen Valhalla-Testproxy irrelevant sind.
$local_config_file = __DIR__ . '/config.local.php';
if (file_exists($local_config_file)) {
    require_once $local_config_file;
}

if (!defined('VALHALLA_URL')) {
    http_response_code(500);
    echo json_encode(['error' => 'Server misconfigured: VALHALLA_URL not set in config.local.php']);
    exit;
}

$url = VALHALLA_URL . '/' . $path;

$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? file_get_contents('php://input') : null;

// Eigener, schlanker curl-Aufruf statt curl_request() aus config.php — die würde
// automatisch X-API-KEY: ORS_API_KEY anhängen, was für Valhalla falsch wäre.
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

http_response_code($http_code ?: 502);
echo $response;
```

- [ ] **Step 2: Syntax prüfen**

Run: `php -l api/valhalla.php`
Expected: `No syntax errors detected in api/valhalla.php`

- [ ] **Step 3: `config.local.php.example` um Valhalla-Zeile ergänzen**

In `api/config.local.php.example`, im Abschnitt „Override Endpoints" ergänzen:

```php
// Override Endpoints
// define('ORS_URL', 'http://localhost:8080/ors');
// define('NOMINATIM_URL', 'http://localhost:8080/nominatim');
// define('VALHALLA_URL', 'http://100.x.x.x:8002'); // eigene Tailscale-IP, nur für lokale Tests
```

- [ ] **Step 4: Manuelle Verifikation (durch den Nutzer, da echte Tailscale-Instanz nötig)**

In `api/config.local.php` (lokal, nicht committen) `VALHALLA_URL` auf die echte Tailscale-IP setzen, `npm run dev` starten, dann:

```bash
curl -X POST 'http://100.64.0.1:8000/api/valhalla.php?path=route' \
  -H 'Content-Type: application/json' \
  -d '{"locations":[{"lat":48.1,"lon":14.1},{"lat":48.2,"lon":14.2}],"costing":"auto","units":"kilometers"}'
```

Expected: JSON mit `trip.legs[0].shape` und `trip.summary.{time,length}` (oder ein aussagekräftiger Fehler der Valhalla-Instanz selbst, falls z.B. die Koordinaten außerhalb des geladenen Kartenausschnitts liegen — das ist dann kein Proxy-Fehler).

- [ ] **Step 5: Commit**

```bash
git add api/valhalla.php api/config.local.php.example
git commit -m "feat(routing): PHP-Proxy für lokale Valhalla-Testinstanz ergänzt"
```

---

## Task 3: `ValhallaService` — Netzwerk-Layer

**Files:**
- Create: `src/lib/ValhallaService.ts`
- Test: `src/lib/ValhallaService.test.ts`

**Interfaces:**
- Consumes: `toRouteResult(trip: ValhallaTrip): RouteResult` aus `./ValhallaRouteInterpreter` (Task 1).
- Produces: `export const ValhallaService = { calculateRoute(start: [number,number], target: [number,number], costing: string): Promise<RouteResult | null>, checkHealth(): Promise<boolean> }` — wird in Task 5 von `RoutingSidebarAdapter.ts` importiert.

- [ ] **Step 1: Fehlschlagenden Test schreiben**

Neue Datei `src/lib/ValhallaService.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as polyline from '@mapbox/polyline';
import { ValhallaService } from './ValhallaService';

describe('ValhallaService.calculateRoute', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts locations/costing/units to the valhalla proxy and returns the interpreted RouteResult', async () => {
    const shape = polyline.encode([[48.1, 14.1], [48.2, 14.2]], 6);
    let capturedUrl = '';
    let capturedBody: any = null;
    vi.stubGlobal('fetch', vi.fn((url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          trip: { legs: [{ shape }], summary: { time: 300, length: 12.5 } },
        }),
      });
    }));

    const result = await ValhallaService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'bicycle');

    expect(capturedUrl).toBe('/api/valhalla.php?path=route');
    expect(capturedBody.costing).toBe('bicycle');
    expect(capturedBody.units).toBe('kilometers');
    expect(capturedBody.locations).toEqual([{ lat: 48.1, lon: 14.1 }, { lat: 48.2, lon: 14.2 }]);
    expect(result?.type).toBe('FeatureCollection');
    expect(result?.features[0].properties.summary.duration).toBe(300);
    expect(result?.features[0].properties.summary.distance).toBeCloseTo(12500, 1);
  });

  it('returns null when the proxy responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
    const result = await ValhallaService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'auto');
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network error'))));
    const result = await ValhallaService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'auto');
    expect(result).toBeNull();
  });

  it('returns null when the response has no trip field', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })));
    const result = await ValhallaService.calculateRoute([48.1, 14.1], [48.2, 14.2], 'auto');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/ValhallaService.test.ts`
Expected: FAIL — `Cannot find module './ValhallaService'`

- [ ] **Step 3: Service implementieren**

Neue Datei `src/lib/ValhallaService.ts`:

```ts
import { RouteResult } from '../types/common';
import { toRouteResult, ValhallaTrip } from './ValhallaRouteInterpreter';

const VALHALLA_BASE_URL = '/api/valhalla.php';

/**
 * Abstraktionsschicht über den `/api/valhalla.php`-Proxy zur selbst gehosteten
 * Valhalla-Testinstanz — analog RoutingService, aber bewusst reduziert auf reine
 * A→B-Routenberechnung (kein Turn-by-Turn, keine Matrix-Suche, siehe Design-Spec).
 */
export const ValhallaService = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${VALHALLA_BASE_URL}?path=status`, { cache: 'no-store' });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async calculateRoute(
    start: [number, number],
    target: [number, number],
    costing: string
  ): Promise<RouteResult | null> {
    try {
      const res = await fetch(`${VALHALLA_BASE_URL}?path=route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [
            { lat: start[0], lon: start[1] },
            { lat: target[0], lon: target[1] },
          ],
          costing,
          units: 'kilometers',
        }),
      });

      if (!res.ok) throw new Error('Valhalla-Routing fehlgeschlagen');
      const data = await res.json();
      if (!data.trip) throw new Error('Valhalla-Response ohne trip');
      return toRouteResult(data.trip as ValhallaTrip);
    } catch (e) {
      console.error('Valhalla-Routing Fehler:', e);
      return null;
    }
  },
};
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/lib/ValhallaService.test.ts`
Expected: PASS (4 Tests grün)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/lib/ValhallaService.ts src/lib/ValhallaService.test.ts
git commit -m "feat(routing): ValhallaService (Netzwerk-Layer für den Valhalla-Proxy) ergänzt"
```

---

## Task 4: Provider-Dropdown in `RoutingSidebar.ts`

**Files:**
- Modify: `src/components/RoutingSidebar.ts:16-21` (Interface), `:96-105` (Profil-Select-HTML), `:107-115` (Modus-Block-HTML), `:160-182` (`updateModeUI`), `:219-237` (Submit-Handler)

**Interfaces:**
- Produces: `RoutingParams.provider: 'ors' | 'valhalla'` — wird in Task 5 von `RoutingSidebarAdapter.ts` gelesen.

Kein neuer automatisierter Test in dieser Aufgabe — `initRoutingSidebar`s gerendertes HTML wird im bestehenden `RoutingSidebar.test.ts` nirgends getestet (nur `updateRoutingSummary`/`renderStationResults`, die reines DOM-Update ohne Neu-Rendern sind); das Provider-Verhalten selbst wird in Task 5 über `RoutingSidebarAdapter.test.ts` abgedeckt (dort wird `onRouteStart` mit `provider` aufgerufen). Die visuelle Sichtbarkeit/das Umschalten wird manuell im Browser verifiziert (bestehende Repo-Einschränkung: kein Playwright für Komponentenrendering).

- [ ] **Step 1: `RoutingParams`-Interface um `provider` erweitern**

In `src/components/RoutingSidebar.ts:16-21`, ersetze:

```ts
export interface RoutingParams {
  start?: [number, number];
  target: [number, number];
  profile: string;
  mode: 'ab' | 'sew' | 'nef';
}
```

durch:

```ts
export interface RoutingParams {
  start?: [number, number];
  target: [number, number];
  profile: string;
  mode: 'ab' | 'sew' | 'nef';
  provider: 'ors' | 'valhalla';
}
```

- [ ] **Step 2: Konstante für die Valhalla-Costing-Liste ergänzen**

Direkt unter den bestehenden Badge-Konstanten (`src/components/RoutingSidebar.ts:14`, nach `const STEP_COUNT_BADGE: BadgeClass = 'badge-gray';`), ergänze:

```ts
const VALHALLA_PROFILES = ['auto', 'bicycle', 'pedestrian'];
```

- [ ] **Step 3: Provider-Select-HTML vor dem Profil-Select einfügen**

In `src/components/RoutingSidebar.ts`, direkt vor dem Kommentar `<!-- Profil Auswahl -->` (Zeile 96), füge ein:

```html
        <!-- Provider Auswahl (nur bei Modus A → B relevant, siehe updateModeUI) -->
        <div class="form-field" style="margin-bottom:7px" id="field-provider">
          <label class="form-label" for="route-provider">Anbieter</label>
          <select class="form-select" id="route-provider">
            <option value="ors">ORS</option>
            <option value="valhalla">Valhalla (Test)</option>
          </select>
        </div>

```

- [ ] **Step 4: Provider-abhängiges Umschalten der Profil-Optionen**

Nach der Deklaration von `const inputTarget = ...` (`src/components/RoutingSidebar.ts:166`), vor `const updateModeUI = ...` (Zeile 170), füge ein:

```ts
  const routeProvider = document.getElementById('route-provider') as HTMLSelectElement;
  const routeProfile = document.getElementById('route-profile') as HTMLSelectElement;

  const updateProfileOptions = (provider: string) => {
    if (provider === 'valhalla') {
      routeProfile.innerHTML = VALHALLA_PROFILES.map(p => `<option value="${p}">${p}</option>`).join('');
      routeProfile.disabled = false;
    } else {
      routeProfile.innerHTML = profiles.length > 0
        ? profiles.map(p => `<option value="${p}">${p}</option>`).join('')
        : '<option>Dienst offline</option>';
      routeProfile.disabled = !isOnline;
    }
  };

  routeProvider.addEventListener('change', () => updateProfileOptions(routeProvider.value), { signal });
```

- [ ] **Step 5: `updateModeUI` — Provider-Feld nur bei A→B zeigen, bei SEW/NEF auf ORS zurücksetzen**

In `src/components/RoutingSidebar.ts:170-182`, ersetze:

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

durch:

```ts
  const fieldProvider = document.getElementById('field-provider')!;

  const updateModeUI = (mode: string) => {
    if (mode === 'ab') {
      fieldStart.classList.remove('hidden');
      fieldProvider.classList.remove('hidden');
      labelTarget.textContent = 'Ziel';
    } else {
      fieldStart.classList.add('hidden');
      fieldProvider.classList.add('hidden');
      labelTarget.textContent = 'Einsatzort (Ziel)';
      // SEW/NEF unterstützen nur ORS (Matrix-Suche) — Provider-Auswahl zurücksetzen.
      routeProvider.value = 'ors';
      updateProfileOptions('ors');
    }
    // Bei Modus-Wechsel alles leeren
    document.getElementById('routing-status')!.classList.add('hidden');
    document.getElementById('routing-details')!.classList.add('hidden');
    document.getElementById('routing-results')!.classList.add('hidden');
  };
```

- [ ] **Step 6: Submit-Handler — `provider` an `onRouteStart` übergeben**

In `src/components/RoutingSidebar.ts:219-237`, ersetze:

```ts
  if (isOnline) {
    btnStart.addEventListener('click', async () => {
      const mode = routeMode.querySelector('.segmented-btn.active')?.getAttribute('data-mode') as 'ab' | 'sew' | 'nef';
      const target = getCoordsFromInput(inputTarget);
      const profile = (document.getElementById('route-profile') as HTMLSelectElement).value;

      if (mode === 'ab') {
        const start = getCoordsFromInput(inputStart);
        if (start && target) {
          onRouteStart({ start, target, profile, mode });
        } else { alert('Bitte Start und Ziel eingeben.'); }
      } else {
        if (target) {
          renderRoutingLoading('Suche Standorte...');
          onRouteStart({ target, profile, mode });
        } else { alert('Bitte Einsatzort (Ziel) eingeben.'); }
      }
    });
  }
```

durch:

```ts
  if (isOnline) {
    btnStart.addEventListener('click', async () => {
      const mode = routeMode.querySelector('.segmented-btn.active')?.getAttribute('data-mode') as 'ab' | 'sew' | 'nef';
      const target = getCoordsFromInput(inputTarget);
      const profile = (document.getElementById('route-profile') as HTMLSelectElement).value;
      const provider = mode === 'ab'
        ? (routeProvider.value as 'ors' | 'valhalla')
        : 'ors'; // SEW/NEF unterstützen nur ORS

      if (mode === 'ab') {
        const start = getCoordsFromInput(inputStart);
        if (start && target) {
          onRouteStart({ start, target, profile, mode, provider });
        } else { alert('Bitte Start und Ziel eingeben.'); }
      } else {
        if (target) {
          renderRoutingLoading('Suche Standorte...');
          onRouteStart({ target, profile, mode, provider });
        } else { alert('Bitte Einsatzort (Ziel) eingeben.'); }
      }
    });
  }
```

- [ ] **Step 7: Typecheck + bestehende Tests**

Run: `npx tsc --noEmit && npm test`
Expected: keine Fehler, alle bisherigen Tests weiterhin grün (Task 5 fügt die neuen Provider-spezifischen Tests hinzu).

**Bekannte, akzeptierte Einschränkung:** Ist die ORS-Instanz offline (`isOnline === false`), bleibt laut bestehendem Code das gesamte Formular (inkl. Start-Button) disabled — das betrifft dann auch den Valhalla-Test, unabhängig vom gewählten Provider. Das ist bestehendes Verhalten und wird in dieser Aufgabe bewusst nicht geändert (siehe Out-of-Scope in der Spec — reine Testumgebung, ORS läuft im normalen Dev-Alltag ohnehin).

- [ ] **Step 8: Commit**

```bash
git add src/components/RoutingSidebar.ts
git commit -m "feat(routing): Provider-Dropdown (ORS/Valhalla) in der Routing-Sidebar ergänzt"
```

---

## Task 5: `RoutingSidebarAdapter` — Provider-Verzweigung

**Files:**
- Modify: `src/features/routing/RoutingSidebarAdapter.ts:1-50`
- Test: `src/features/routing/RoutingSidebarAdapter.test.ts`

**Interfaces:**
- Consumes: `ValhallaService.calculateRoute(start, target, costing): Promise<RouteResult | null>` (Task 3), `RoutingParams.provider` (Task 4).

- [ ] **Step 1: Fehlschlagenden Test schreiben**

In `src/features/routing/RoutingSidebarAdapter.test.ts`, Import-Zeile 4 ergänzen (`import { RoutingService } from '../../lib/RoutingService';` bleibt, direkt danach):

```ts
import { ValhallaService } from '../../lib/ValhallaService';
```

Am Ende der Datei, innerhalb von `describe('RoutingSidebarAdapter A→B route details', ...)` (nach dem letzten bestehenden `it(...)`-Block, vor der schließenden `});` der `describe`), neuen Test ergänzen:

```ts
  it('routes through ValhallaService when provider is valhalla and skips ORS entirely', async () => {
    const dataService = new RoutingDataService();
    const map = { fitBounds: vi.fn() } as any;
    const adapter = new RoutingSidebarAdapter(dataService, map, new AbortController().signal);
    adapter.init({} as any);

    const routeResult = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { summary: { distance: 5000, duration: 600 } },
        geometry: { type: 'LineString', coordinates: [[14.1, 48.1], [14.2, 48.2]] },
      }],
    };
    const orsSpy = vi.spyOn(RoutingService, 'calculateRoute');
    const valhallaSpy = vi.spyOn(ValhallaService, 'calculateRoute').mockResolvedValue(routeResult as any);

    expect(capturedOnRouteStart).not.toBeNull();
    await capturedOnRouteStart!({
      mode: 'ab',
      start: [48.1, 14.1],
      target: [48.2, 14.2],
      profile: 'bicycle',
      provider: 'valhalla',
    });

    expect(valhallaSpy).toHaveBeenCalledWith([48.1, 14.1], [48.2, 14.2], 'bicycle');
    expect(orsSpy).not.toHaveBeenCalled();

    const details = elements['routing-details'];
    expect(details.innerHTML).toContain('5.00 km');

    orsSpy.mockRestore();
    valhallaSpy.mockRestore();
  });
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/features/routing/RoutingSidebarAdapter.test.ts`
Expected: FAIL — entweder `Cannot find module '../../lib/ValhallaService'` oder der neue Test schlägt fehl, weil `params.provider` noch ignoriert wird und `RoutingService.calculateRoute` statt `ValhallaService.calculateRoute` aufgerufen wird.

- [ ] **Step 3: Adapter-Verzweigung implementieren**

In `src/features/routing/RoutingSidebarAdapter.ts`, Import-Block (Zeile 1-4) ergänzen — nach `import { RoutingService } from '../../lib/RoutingService';`:

```ts
import { ValhallaService } from '../../lib/ValhallaService';
```

Dann `src/features/routing/RoutingSidebarAdapter.ts:32-45`, ersetze:

```ts
        if (params.mode === 'ab' && params.start) {
          await this.setCoord('start', params.start[0], params.start[1]);
          
          // Nur driving-car hat im ORS-Graph die way_type/tollways/roadaccessrestrictions
          // Encoded-Values geladen; extra_info für driving-emergency liefert 500 (Fehlercode 2018).
          const extraInfo = params.profile === 'driving-car'
            ? ['waytype', 'tollways', 'roadaccessrestrictions']
            : undefined;
          const route = await RoutingService.calculateRoute(
            params.start,
            params.target,
            params.profile,
            extraInfo
          );
          if (this.abortSignal.aborted) return;
```

durch:

```ts
        if (params.mode === 'ab' && params.start) {
          await this.setCoord('start', params.start[0], params.start[1]);
          
          // Nur driving-car hat im ORS-Graph die way_type/tollways/roadaccessrestrictions
          // Encoded-Values geladen; extra_info für driving-emergency liefert 500 (Fehlercode 2018).
          const extraInfo = params.profile === 'driving-car'
            ? ['waytype', 'tollways', 'roadaccessrestrictions']
            : undefined;
          const route = params.provider === 'valhalla'
            ? await ValhallaService.calculateRoute(params.start, params.target, params.profile)
            : await RoutingService.calculateRoute(params.start, params.target, params.profile, extraInfo);
          if (this.abortSignal.aborted) return;
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/features/routing/RoutingSidebarAdapter.test.ts`
Expected: PASS (alle Tests der Datei grün, inkl. dem neuen)

- [ ] **Step 5: Vollständige Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: keine TS-Fehler, alle Tests grün.

- [ ] **Step 6: Commit**

```bash
git add src/features/routing/RoutingSidebarAdapter.ts src/features/routing/RoutingSidebarAdapter.test.ts
git commit -m "feat(routing): RoutingSidebarAdapter verzweigt A→B-Berechnung nach Provider (ORS/Valhalla)"
```

---

## Task 6: Doku-Abschluss (CHANGELOG, TODO, Bausteine-Inventar)

**Files:**
- Modify: `docs/CHANGELOG.md`
- Modify: `docs/TODO.md`
- Modify: `docs/architecture/bausteine.md` (generiert)

- [ ] **Step 1: `npm run docs:bausteine` laufen lassen**

Run: `npm run docs:bausteine`
Expected: `docs/architecture/bausteine.md` wird aktualisiert, neue Einträge für `ValhallaService.ts` und `ValhallaRouteInterpreter.ts` erscheinen (analog `RoutingService.ts`/`IsochronesService.ts`).

- [ ] **Step 2: CHANGELOG-Eintrag ergänzen**

Am Anfang von `docs/CHANGELOG.md`, vor dem bestehenden `## [Unreleased] - 2026-08-16 19:10`-Block, neuen Journal-Block einfügen (Datum/Uhrzeit beim tatsächlichen Commit-Zeitpunkt anpassen):

```markdown
## [Unreleased] - 2026-08-19 HH:mm

### Hinzugefügt
- **Valhalla-Routing-Connector (Testumgebung, `/routing`, Modus A→B)** — neuer Provider-Dropdown
  (ORS/Valhalla) neben dem Profil-Select. Bei Auswahl „Valhalla" wird die Route über einen neuen,
  eigenständigen PHP-Proxy (`api/valhalla.php`) gegen eine selbst gehostete Valhalla-Instanz
  (Tailscale-IP, nur `api/config.local.php`, kein Produktions-Default) berechnet. Neu
  `src/lib/ValhallaRouteInterpreter.ts` übersetzt Valhallas komprimiertes Polyline6-`shape` +
  `summary.{length,time}` in dieselbe `RouteResult`-Struktur, die ORS liefert — `RoutingMapLayers`/
  `updateRoutingSummary` bleiben dadurch unverändert. Bewusst nur A→B, kein Turn-by-Turn, keine
  SEW/NEF-Matrix-Suche, kein Deploy-Pfad (Proxy läuft nur unter `npm run dev`, nicht auf
  `map.oe5ith.at`) — reine Testumgebung, siehe
  `docs/superpowers/specs/2026-08-19-valhalla-routing-connector-design.md`.
```

- [ ] **Step 3: TODO.md-Eintrag für die zurückgestellte Security-Review ergänzen**

In `docs/TODO.md`, passenden Abschnitt ergänzen (neue Sektion `## Valhalla-Connector: vor Live-Deploy` oder bestehende Struktur des Dokuments beachten):

```markdown
## Valhalla-Connector: vor Live-Deploy

Der Valhalla-Proxy (`api/valhalla.php`) ist bewusst nur für `npm run dev` gebaut (siehe
`docs/superpowers/specs/2026-08-19-valhalla-routing-connector-design.md`, Abschnitt „Config &
Security"). Bevor ein Deploy auf `map.oe5ith.at` in Frage kommt, muss durchdacht werden:

- [ ] Authentifizierung/Rate-Limiting auf `api/valhalla.php` (aktuell: offener Proxy, sobald
      `VALHALLA_URL` gesetzt ist)
- [ ] Eintrag in `nginx.conf`/`deploy-website.sh` (aktuell: bewusst nicht enthalten)
- [ ] Ob `VALHALLA_URL` weiterhin eine private Tailscale-IP bleibt oder ein öffentlich
      erreichbarer Endpoint nötig wird — falls Tailscale: sicherstellen, dass der Produktivserver
      selbst im Tailnet hängt
```

- [ ] **Step 4: Finale Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: keine Fehler, alle Tests grün.

- [ ] **Step 5: Commit**

```bash
git add docs/CHANGELOG.md docs/TODO.md docs/architecture/bausteine.md
git commit -m "docs: Valhalla-Routing-Connector in CHANGELOG/TODO/Bausteine-Inventar erfasst"
```
