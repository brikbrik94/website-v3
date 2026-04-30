# Schnittstellenbeschreibung: Nächste Stützpunkte (SEW/NEF)

Diese Schnittstelle dient zur Ermittlung der schnellstmöglich erreichbaren Stützpunkte für einen gegebenen Einsatzort.

**SEW:** Sanitätseinsatzwagen  
**NEF:** Notarzteinsatzfahrzeug

---

## Endpunkt
`GET /api/stations`

## Parameter
| Parameter | Typ | Beschreibung | Beispiel |
|---|---|---|---|
| `target` | `string` | Koordinaten des Einsatzortes (Ziel) als `lat,lon` | `48.3064,14.2858` |
| `type` | `enum` | Typ der Wachen: `sew` oder `nef` | `sew` |

## Funktionsweise (Backend-Logik)
1. **Räumliche Abfrage:** PostgreSQL/PostGIS ermittelt die 20 nächstgelegenen Stützpunkte basierend auf der Luftlinie (`ST_Distance`) zum `target`.
   - Für `type=sew`: Filter auf `has_transport = 'yes'`.
   - Für `type=nef`: Filter auf `has_doctor = 'yes'`.
2. **Matrix-Berechnung:** Die 20 Standorte werden als Startpunkte an die **ORS Matrix API** gesendet, mit dem `target` als einzigem Zielort.
3. **Sortierung:** Das Backend sortiert die Ergebnisse nach der echten Fahrzeit (`duration`).
4. **Resultat:** Die Top 5 Standorte werden inklusive Metadaten (Name, Org, Koordinaten) und Fahrzeit zurückgegeben.

## Antwort (JSON)
```json
[
  {
    "id": 123,
    "name": "RK Ortsstelle Linz",
    "org": "ÖRK",
    "lat": 48.301,
    "lon": 14.292,
    "distance": 1200,
    "duration": 180
  },
  ...
]
```

## Fehler-Codes
- `400 Bad Request`: Fehlende oder ungültige Parameter.
- `503 Service Unavailable`: ORS API nicht erreichbar.
