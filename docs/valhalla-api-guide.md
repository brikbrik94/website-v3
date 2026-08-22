# Valhalla Routing-API — Übersicht für Konsumenten

## Basis-URL

```
http://100.64.0.2:8092
```

Erreichbar nur innerhalb des Tailnets. Alle Endpunkte werden per `POST` mit JSON-Body angesprochen.

## Endpunkte

| Endpunkt | Zweck |
|---|---|
| `/route` | Turn-by-Turn-Route zwischen zwei oder mehr Punkten |
| `/optimized_route` | Route zwischen mehreren Punkten mit optimierter Reihenfolge (TSP) |
| `/sources_to_targets` | Zeit-/Distanz-Matrix zwischen mehreren Start- und Zielpunkten |
| `/isochrone` | Erreichbarkeitsgebiet als Polygon (nach Zeit oder Distanz) |
| `/trace_route` | Route aus einer Reihe von GPS-Punkten rekonstruieren (Map-Matching) |
| `/trace_attributes` | Straßen-/Kanteninformationen entlang einer GPS-Spur |
| `/locate` | Metadaten zu Straßen/Kreuzungen in der Nähe eines Punktes |
| `/height` | Höhenprofil an Punkten oder entlang einer Route |
| `/status` | Health-Check, liefert Version und verfügbare Endpunkte |

## Costing-Profile

Bei `/route` (und den meisten anderen Endpunkten) wird das Fortbewegungsmittel über das Feld `"costing"` festgelegt:

| Profil | Für |
|---|---|
| `auto` | PKW |
| `emergency` | Einsatzfahrzeuge — wie `auto`, darf aber zusätzlich Wege nutzen, die explizit für Einsatzfahrzeuge freigegeben sind, auch wenn diese für normalen Verkehr gesperrt sind |
| `truck` | LKW |
| `bus` | Bus |
| `taxi` | Taxi |
| `motorcycle` | Motorrad |
| `motor_scooter` | Motorroller |
| `bicycle` | Fahrrad |
| `pedestrian` | Fußgänger |
| `bikeshare` | Kombination Fahrrad + Fußgänger (z. B. für Bikesharing-Anwendungen) |
| `multimodal` / `transit` | Öffentlicher Verkehr — **derzeit nicht nutzbar**, da keine Fahrplandaten (GTFS) eingebunden sind |

## Beschränkungen

### `/route` und `/optimized_route`

Maximale Anzahl Wegpunkte und maximale Gesamtdistanz hängen vom Costing-Profil ab:

| Profil | Max. Wegpunkte | Max. Distanz |
|---|---|---|
| `auto`, `emergency`, `taxi`, `truck` | 20 | 5.000 km |
| `bus` | 50 | 5.000 km |
| `pedestrian` | 50 | 250 km |
| `bicycle`, `motorcycle`, `motor_scooter`, `bikeshare` | 50 | 500 km |
| `multimodal` / `transit` | 50 | 500 km (derzeit ohnehin nicht nutzbar) |

Zusätzlich: max. 2 alternative Routen pro Anfrage, max. 50 Ausschlusspunkte (`exclude_locations`).

### `/sources_to_targets` (Matrix)

Begrenzung gilt für die Anzahl der Source×Target-Kombinationen (nicht nur Punkte einzeln), sowie für die Distanz jedes einzelnen Paars:

| Profil | Max. Source×Target-Paare | Max. Distanz pro Paar |
|---|---|---|
| `auto`, `emergency`, `taxi`, `truck`, `bus` | 2.500 | 400 km |
| `pedestrian`, `bicycle`, `motorcycle`, `motor_scooter`, `bikeshare` | 2.500 | 200 km |
| `multimodal` / `transit` | **nicht verfügbar** (0) | — |

Beispiel: 10 Quellen × 10 Ziele = 100 Paare — passt bei jedem verfügbaren Profil locker unter das Limit.

### `/isochrone`

- Nur **1 Startpunkt** pro Anfrage
- Max. **4 Konturen** gleichzeitig
- Max. **120 Minuten** (Zeit-Modus) bzw. **200 km** (Distanz-Modus)

### `/trace_route` und `/trace_attributes`

- Max. Trace-Länge: **200 km**
- Max. **16.000 GPS-Punkte** pro Trace
- GPS-Genauigkeit schlechter als **100 m** wird ignoriert
- Max. Suchradius je Punkt: **100 m**
- Max. **3 alternative Routen**

### `/height`

- Max. **750.000 Punkte** im übergebenen Shape

### `/locate`

- Max. Suchradius: **200 m**

## Beispiel

```bash
curl http://100.64.0.2:8092/route \
  --data '{"locations":[{"lat":48.1971606,"lon":16.389663},{"lat":48.19630,"lon":16.38975}],"costing":"emergency"}'
```
