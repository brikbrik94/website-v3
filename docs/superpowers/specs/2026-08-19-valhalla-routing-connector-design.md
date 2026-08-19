# Valhalla-Routing-Connector (Testumgebung) — Design

**Status:** entworfen, freigegeben durch Nutzer (2026-08-19) — Implementierung offen.
**Herkunft:** direkter Nutzerwunsch (kein vorheriger TODO/ROADMAP-Eintrag). Ziel ist **nicht**
eine produktionsreife Zweit-Routing-Engine, sondern ein Testaufbau, um die eigene Valhalla-Instanz
(erreichbar über eine Tailscale-IP) anzubinden und zu sehen, wie die Daten auf der Webseite
ankommen — bevor entschieden wird, ob sich der Aufwand für mehr lohnt.

## Ziel & Scope

Auf der bestehenden Routing-Seite (`/routing`) wird im Modus **A → B** ein zusätzlicher
**Provider-Umschalter** (ORS | Valhalla) ergänzt. Bei Auswahl „Valhalla" wird die Route über die
selbst gehostete Valhalla-Instanz statt über ORS berechnet und identisch auf der Karte dargestellt
(Linie + Distanz/Dauer-Zusammenfassung).

**Bewusst out of scope für diese Iteration** (kann bei Bedarf als eigener Folge-Task entstehen):

- Turn-by-Turn-Anweisungen für Valhalla (andere Maneuver-Struktur als ORS-Steps)
- SEW-/NEF-Modus (Nächste-Station-Matrix) für Valhalla — bleibt ausschließlich ORS
- Dynamisch von Valhalla geladene Profile/Status-Anzeige (`RoutingService.getProfiles()`-Äquivalent)
- Deploy auf den Live-Server / produktionsreife Absicherung des Proxys (siehe Abschnitt „Security
  — bewusst zurückgestellt")

## Architektur-Überblick

```
RoutingSidebar (Provider-Select: ORS | Valhalla)
        │
        ▼
RoutingSidebarAdapter  ──(provider === 'valhalla')──▶  ValhallaService.calculateRoute()
        │                                                       │
        │ (provider === 'ors', unverändert)                     ▼
        ▼                                              POST /api/valhalla.php?path=route
RoutingService.calculateRoute()                                 │
        │                                                       ▼
        │                                              api/valhalla.php (eigener,
        │                                              schlanker curl-Call, KEIN
        │                                              curl_request()-Helper aus config.php)
        │                                                       │
        │                                                       ▼
        │                                              VALHALLA_URL (Tailscale-IP,
        │                                              nur in config.local.php)
        │                                                       │
        │                                                       ▼
        │                                              Valhalla-JSON (trip.legs[].shape,
        │                                              trip.summary.{length,time})
        │                                                       │
        │                                                       ▼
        │                                              ValhallaRouteInterpreter.toRouteResult()
        │                                              (polyline.decode via @mapbox/polyline,
        │                                              km→m, s unverändert)
        │                                                       │
        └───────────────────────────┬───────────────────────────┘
                                     ▼
                         RouteResult (gleiche Struktur wie ORS-GeoJSON)
                                     ▼
              RoutingMapLayers.updateSingleRoute() + updateRoutingSummary()  (unverändert)
```

Kernentscheidung: **Ein gemeinsamer `RouteResult`-Endpunkt.** Der Valhalla-Zweig produziert exakt
dieselbe `RouteResult`-Struktur, die ORS heute liefert (`features[0].geometry` +
`features[0].properties.summary.{distance,duration}`, `extras`/`segments` bleiben `undefined`).
Dadurch bleiben `RoutingMapLayers`, `updateRoutingSummary` und die Kartendarstellung komplett
unangetastet — die Turn-by-Turn-Anzeige (`RoutingDetailsFormatter`) verhält sich bei fehlenden
`segments` bereits heute wie „keine Steps", kein neuer Code dafür nötig.

## Neue Dateien

- `api/valhalla.php` — neuer Proxy, analog `ors.php` im Aufbau (Pfad-Allowlist), aber **eigener,
  minimaler curl-Aufruf statt der geteilten `curl_request()`-Hilfsfunktion** aus `config.php`.
  Grund: `curl_request()` hängt automatisch `X-API-KEY: ORS_API_KEY` an jede Anfrage — das wäre
  bei Valhalla falsch (andere Instanz, keine ORS-Auth nötig) und würde das ORS-Secret unnötig an
  einen zweiten Host schicken. `ors.php`/`config.php` bleiben dadurch komplett unverändert.
  - Allowlist: `route` (Kernfunktion), `status` (für einen künftigen Health-Check, schon mit
    vorgesehen auch wenn `checkHealth()` in dieser Iteration ggf. noch nicht verdrahtet wird).
  - Body wird 1:1 durchgereicht (POST), Response 1:1 zurückgegeben (Content-Type `application/json`).
- `src/lib/ValhallaService.ts` — Analog `RoutingService.ts`, reduziert auf das Nötige:
  - `calculateRoute(start: [number,number], target: [number,number], costing: string): Promise<RouteResult | null>`
  - `checkHealth(): Promise<boolean>` (optional in dieser Iteration nutzbar, gleiches Muster wie
    ORS — kostet keinen Mehraufwand, da `status`-Pfad ohnehin in der Allowlist steht)
- `src/lib/ValhallaRouteInterpreter.ts` (+ `.test.ts`) — der „Interpreter": eine Funktion
  `toRouteResult(trip: ValhallaTrip): RouteResult`, die
  - `trip.legs[].shape` über `polyline.decode(shape, 6)` zu `[lat,lon][]` dekodiert und zu
    GeoJSON-Koordinaten `[lon,lat]` umkehrt (mehrere Legs werden zu einer durchgehenden
    Koordinatenliste verkettet — bei einer einzelnen A→B-Anfrage ohne Zwischenstopps liefert
    Valhalla ohnehin nur ein Leg),
  - `trip.summary.length` (angefragt in `units: 'kilometers'`) `* 1000` → `summary.distance`
    (Meter, wie ORS es liefert),
  - `trip.summary.time` (Sekunden) unverändert → `summary.duration`,
  - `extras`/`segments` explizit `undefined` lässt.
  - Eigene, fokussierte Datei (ein Zweck: Wire-Format → internes Modell), keine Vermischung mit
    `ValhallaService.ts` (Netzwerk) oder dem Sidebar-Adapter (UI).

**Neue npm-Dependency:** `@mapbox/polyline` (MIT, sehr klein) — Standard-Bibliothek zum Decodieren
von Google-Encoded-Polylines inkl. der von Valhalla verwendeten Präzision 6.

## Config & Security (bewusst zurückgestellt)

- Neue Konstante `VALHALLA_URL` — **kein Produktions-Default** in `api/config.php` (anders als
  `ORS_URL`/`NOMINATIM_URL`), ausschließlich über `api/config.local.php` (gitignored) setzbar,
  z.B. `define('VALHALLA_URL', 'http://100.x.x.x:8002');` (Tailscale-IP der eigenen Instanz).
  `config.local.php.example` bekommt eine auskommentierte Beispielzeile dazu.
- Ist `VALHALLA_URL` nicht definiert, antwortet `valhalla.php` mit HTTP 500 — das macht den
  Endpoint auf einem Server ohne lokale Konfiguration bereits harmlos, ohne dass hierfür schon
  eine echte Zugriffskontrolle gebaut werden muss.
- **Explizit nicht Teil dieser Iteration** (laut Nutzervorgabe: erst durchdenken, bevor auf den
  Live-Server deployt wird):
  - Keine Authentifizierung/Rate-Limiting auf `valhalla.php`.
  - Kein Eintrag in `nginx.conf` / `deploy-website.sh` — der Proxy ist nur für den lokalen
    Vite-Dev-Server (`npm run dev`) gedacht, nicht für `map.oe5ith.at`.
  - Kein SSRF-Check auf `VALHALLA_URL` (Zielhost kommt ausschließlich aus einer lokalen,
    nicht-committeten Config-Datei, kein User-Input).
  - → Diese Punkte werden als `TODO.md`-Eintrag festgehalten, sobald über einen Deploy überhaupt
    nachgedacht wird — nicht vorher lösen (YAGNI für eine reine Testumgebung).

## UI-Änderungen (`src/components/RoutingSidebar.ts`)

- Neues `<select id="route-provider">` (Optionen: „ORS", „Valhalla"), platziert oberhalb des
  bestehenden Profil-Selects, **nur im Modus A → B sichtbar** (bei SEW/NEF ausgeblendet, siehe
  Scope oben — `updateModeUI()` bekommt dafür einen zusätzlichen Hide/Show-Zweig).
- Wechselt der Provider auf „Valhalla", tauscht das Profil-Select von den dynamisch geladenen
  ORS-Profilen auf eine **hartkodierte** kleine Costing-Liste: `auto`, `bicycle`, `pedestrian`.
  Kein eigener Profile-Fetch für Valhalla in dieser Iteration.
- Service-Status-Panel bleibt unverändert (ORS-only) — kein zweiter Status-Dot für Valhalla.
- `RoutingParams` (Interface in `RoutingSidebar.ts`) bekommt ein neues Feld `provider: 'ors' |
  'valhalla'`, Default `'ors'`.

## Datenfluss im Adapter (`RoutingSidebarAdapter.ts`)

Im bestehenden `mode === 'ab'`-Zweig wird vor dem `RoutingService.calculateRoute(...)`-Aufruf nach
`params.provider` verzweigt:

```ts
const route = params.provider === 'valhalla'
  ? await ValhallaService.calculateRoute(params.start, params.target, params.profile)
  : await RoutingService.calculateRoute(params.start, params.target, params.profile, extraInfo);
```

Der restliche Code danach (`updateRoutingSummary`, `RoutingMapLayers.updateSingleRoute`,
`fitBounds`) bleibt exakt gleich — er kennt `RouteResult`, nicht die Herkunft.

## Fehlerbehandlung

Gleiches Muster wie bestehend: `ValhallaService.calculateRoute` fängt Netzwerk-/Parsing-Fehler ab
und gibt `null` zurück; der Adapter zeigt in diesem Fall `renderRoutingError('Route konnte nicht
berechnet werden.')` — kein neuer Error-Pfad, keine Sonderbehandlung für „Valhalla nicht
erreichbar" vs. „ORS nicht erreichbar".

## Tests (TDD)

- `ValhallaRouteInterpreter.test.ts` — Kern der Verifikation: ein Beispiel-Valhalla-Response
  (reales JSON von der eigenen Instanz gezogen, als Fixture) → korrekte Koordinaten (Anzahl,
  Lon/Lat-Reihenfolge, Start-/Endpunkt), korrekte `summary.distance`-Umrechnung (km → m),
  `summary.duration` unverändert, `extras`/`segments` sind `undefined`. Mehrere Legs werden korrekt
  zu einer Koordinatenliste verkettet.
- `ValhallaService.test.ts` — analog `RoutingService.test.ts` (Fetch gemockt): korrekter
  Request-Body (`locations`, `costing`, `units: 'kilometers'`), `null` bei HTTP-Fehler/Exception.
- `RoutingSidebarAdapter.test.ts` — Erweiterung um einen Fall „provider: 'valhalla'" ruft
  `ValhallaService.calculateRoute` statt `RoutingService.calculateRoute` auf.
- Kein Playwright/Browser verfügbar (bekannte Repo-Einschränkung) — die eigentliche
  Live-Verifikation gegen die echte Tailscale-Valhalla-Instanz ist explizit manueller Test durch
  den Nutzer (das ist der Zweck der Aufgabe: sehen, ob/wie die Daten ankommen).
- Verifikation vor Abschluss: `npx tsc --noEmit && npm test`. Zusätzlich `npm run docs:bausteine`
  ausführen und den Diff committen — `ValhallaService.ts`/`ValhallaRouteInterpreter.ts` landen in
  `src/lib/`, CLAUDE.md schreibt einen Re-Run nach `src/lib/`-Änderungen vor (gleiches Muster wie
  die bereits gelisteten `RoutingService.ts`/`IsochronesService.ts`).

## Out of Scope (bewusst nicht Teil dieser Iteration)

- Turn-by-Turn/Maneuvers für Valhalla
- SEW-/NEF-Matrix-Suche für Valhalla
- Dynamische Profile/Status-Anzeige für Valhalla
- Deploy-Fähigkeit (nginx/`deploy-website.sh`) und jegliche Zugriffskontrolle auf `valhalla.php` —
  wird bei Bedarf als eigener `TODO.md`-Eintrag „Security-Review Valhalla-Proxy vor Deploy"
  festgehalten, sobald ein Deploy tatsächlich ansteht
- Vergleichs-/Overlay-Darstellung (beide Routen gleichzeitig auf der Karte) — Provider ist ein
  Umschalter, keine Zwei-Routen-Ansicht
