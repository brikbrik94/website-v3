# Design: SEW/NEF-Matrixsuche für Valhalla

**Status:** entworfen, freigegeben durch Nutzer (2026-08-22) — Implementierung offen (Teilprojekt
3 von 3 der Valhalla-ORS-Paritätsarbeit, nach Status-Anzeige und Turn-by-Turn-Parität).

## Kontext

Die SEW/NEF-„Nächste-Station"-Suche (`/routing`, Modus SEW/NEF) läuft heute ausschließlich über
ORS: `api/nearest-stations.php` (PostGIS-KNN-Vorauswahl der 20 nächsten Stationen + ORS-
`/matrix/{profile}`-Aufruf) — `RoutingSidebar.ts` blendet den Provider-Umschalter in diesen beiden
Modi bewusst aus und erzwingt `provider: 'ors'` an zwei Stellen (`updateModeUI()` und dem
Start-Button-Klick-Handler), siehe Design-Spec des ursprünglichen Valhalla-Connectors
(`docs/superpowers/specs/2026-08-19-valhalla-routing-connector-design.md`). Dieses Teilprojekt
schließt diese letzte Parität-Lücke.

**Nicht Teil dieses Tasks:** Security-Review/Produktiv-Deploy des Valhalla-Proxys — bleibt wie
bisher rein für `npm run dev` gedacht, `nginx.conf`s `deny all;` auf `/api/valhalla.php` bleibt
unverändert. `docs/TODO.md` („Valhalla-Connector: vor Live-Deploy") wurde bereits um den
gewachsenen Scope (jetzt auch Matrix-Traffic, nicht nur Turn-by-Turn) ergänzt — diese Arbeit macht
die künftige Security-Review nicht dringlicher (weiterhin blockiert), aber ihren Umfang größer.

## Live-Verifikation von `/sources_to_targets`

Vor dem Design gegen die echte, erreichbare Valhalla-Instanz getestet (`VALHALLA_URL` aus
`config.local.php`, `http://100.64.0.2:8092`), statt sich auf Dokumentation allein zu verlassen:

```bash
curl http://100.64.0.2:8092/sources_to_targets --data '{
  "sources": [{"lat":48.3069,"lon":14.2858},{"lat":48.2900,"lon":14.3000}],
  "targets": [{"lat":48.2082,"lon":14.2103}],
  "costing": "auto"
}'
```

Antwort (gekürzt):
```json
{"sources_to_targets":[[{"from_index":0,"to_index":0,"time":1046,"distance":15.151,...}],[{"from_index":1,"to_index":0,"time":906,"distance":12.922,...}]],...}
```

- `sources_to_targets[i][0]` liefert das Paar (Quelle `i` → einziges Ziel) — `time` in Sekunden,
  `distance` in **Kilometern** (Default-Unit, muss ×1000 auf Meter umgerechnet werden — ORS'
  Matrix-`distances` liefert bereits Meter, `nearest-stations.php` übernimmt das aktuell 1:1 ohne
  Umrechnung).
- `costing: "emergency"` wurde ebenfalls live getestet (3 Quellen) und lieferte plausible
  Ergebnisse ohne Auffälligkeiten — anders als bei ORS (siehe `RoutingService.ts`s bestehender
  Zwei-Pass-Workaround für `driving-emergency`, weil ORS' Matrix für dieses Profil unzuverlässig
  ist) scheint Valhallas `/sources_to_targets` mit `emergency`-Costing direkt zu funktionieren.
  **Nur eine kleine Stichprobe (3 statt 20 Quellen), keine Belastungsgarantie** — wird bei der
  echten Implementierung nochmal an einem realistischeren Fall (20 Stationen) geprüft, nicht
  blind als erwiesen übernommen. Falls sich doch Unzuverlässigkeit zeigt, wäre ein zu ORS
  analoger Zwei-Pass-Fallback nachzuziehen — vorerst aber nicht eingeplant (YAGNI, bis ein
  konkretes Problem auftritt).

## Architektur-Entscheidung: `nearest-stations.php` um Provider-Branch erweitern

**Verworfen:** ein komplett separater neuer Endpoint (z.B. `nearest-stations-valhalla.php`) —
würde die PostGIS-KNN-Vorauswahl-Logik duplizieren, obwohl sie für beide Provider identisch ist.

**Gewählt:** `api/nearest-stations.php` bekommt einen neuen optionalen Query-Parameter
`provider` (Default `ors`, sonst `valhalla`, validiert gegen eine feste Allowlist analog zum
bestehenden `profile`-Regex-Check). Die PostGIS-KNN-Stationssuche (Schritt 1, unverändert) bleibt
eine gemeinsame Codebasis für beide Provider — nur der Matrix-Aufruf selbst (Schritt 2) verzweigt:

- **ORS (unverändert):** `curl_request()` (geteilter Helper aus `config.php`, hängt automatisch
  `X-API-KEY: ORS_API_KEY` an) gegen `ORS_URL/matrix/{profile}`.
- **Valhalla (neu):** **kein** `curl_request()` — der Helper würde automatisch den ORS-API-Key-
  Header anhängen, was für Valhalla falsch ist (identisches Problem, das `api/valhalla.php` schon
  mit einem eigenen schlanken curl-Aufruf löst — dasselbe Muster hier wiederverwenden, nicht den
  geteilten Helper um einen Header-Unterdrückungs-Parameter erweitern). Eigener minimaler
  curl-Aufruf gegen `VALHALLA_URL/sources_to_targets` mit `sources`/`targets`/`costing`.
- **Fehlt `VALHALLA_URL`** (z.B. in Produktion, wo es aktuell nicht gesetzt ist): sauberer 500
  **nur** für den Valhalla-Zweig (analog zum bestehenden Guard in `valhalla.php`) — der ORS-Pfad
  bleibt davon komplett unberührt, unabhängig davon ob `VALHALLA_URL` gesetzt ist.

Ergebnis-Zusammenführung (Schritt 3: Duration/Distance den Stationen zuordnen, sortieren, Top-N)
bleibt für beide Provider dieselbe Logik — nur die Extraktion der Duration/Distance aus der
jeweiligen Response-Struktur unterscheidet sich (ORS: `matrix['durations'][$i][0]`/
`matrix['distances'][$i][0]`; Valhalla: `sources_to_targets[$i][0]['time']`/
`sources_to_targets[$i][0]['distance'] * 1000`).

## Frontend-Änderungen

- **`RoutingService.findNearestStations()`**: neuer optionaler `provider`-Parameter (Default
  `'ors'`), als Query-Parameter durchgereicht an `nearest-stations.php`. Der bestehende
  `driving-emergency`-Zwei-Pass-Sonderfall bleibt ausschließlich ORS-spezifisch (nur aktiv, wenn
  `provider === 'ors'` — siehe „Live-Verifikation" oben, kein Beleg, dass Valhalla dasselbe
  Problem hat).
- **`RoutingSidebar.ts`**: die beiden Stellen, die den Provider bei SEW/NEF-Modus hart auf `'ors'`
  erzwingen, entfernen:
  1. `updateModeUI()` — der Block, der bei Moduswechsel zu SEW/NEF `routeProvider.value = 'ors'`
     setzt (nur wenn Valhalla gewählt war, siehe bestehender Kommentar zur Regression vom
     2026-08-19-Review) — entfällt, Provider bleibt erhalten.
  2. Der `btnStart`-Klick-Handler — `const provider = mode === 'ab' ? routeProvider.value : 'ors'`
     wird zu `const provider = routeProvider.value;` (Provider gilt jetzt für alle drei Modi
     gleich).
  3. `fieldProvider.classList.add('hidden')` bei SEW/NEF entfällt ebenfalls — Provider-Select
     bleibt in allen drei Modi sichtbar.
- **Profil-Liste:** keine Änderung — Valhalla zeigt in SEW/NEF weiterhin dieselbe
  `VALHALLA_PROFILES`-Liste (`auto`/`emergency`/`bicycle`/`pedestrian`) wie im A→B-Modus, analog
  zum bestehenden ORS-Verhalten (auch dort keine modus-abhängige Profilfilterung heute).

## Testing-Strategie

- `api/`-PHP hat in diesem Repo keine automatisierten Tests (siehe `CLAUDE.md`) — Verifikation
  über `npx tsc --noEmit && npm test` für die TS-Seite plus manuellen/curl-Test des PHP-Endpoints
  gegen die echte Valhalla-Instanz (wie oben in „Live-Verifikation" vorgeführt).
- `RoutingService.test.ts`: neuer Test für `findNearestStations(..., provider: 'valhalla')` —
  URL-Parameter korrekt gesetzt, kein Zwei-Pass-Fallback-Pfad ausgelöst.
- `RoutingSidebar.test.ts`: falls vorhanden, Tests zur Modus-/Provider-Interaktion anpassen (kein
  erzwungenes Zurücksetzen auf ORS bei SEW/NEF mehr) — bestehende Tests zur ursprünglichen
  Regression (2026-08-19) auf das neue Verhalten prüfen, nicht einfach löschen.
- Live-Check (Playwright oder manuell): SEW/NEF-Modus, Provider Valhalla wählen, echte
  Zielkoordinate eingeben, Stationsliste mit plausiblen Zeiten/Distanzen prüfen — inkl. `emergency`-
  Costing, um die Live-Verifikations-Annahme oben an einer echten 20-Stationen-Anfrage zu
  bestätigen oder zu widerlegen.
