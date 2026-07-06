# NAH DOM-Marker → Symbol-Layer Migration (U5)

Datum: 2026-07-06. Kontext: [docs/superpowers/plans/2026-06-30-map-subsystem-cleanup.md](../plans/2026-06-30-map-subsystem-cleanup.md),
Punkt U5 — letzte verbleibende Karten-Funktion, die noch `maplibregl.Marker`-DOM-Elemente
statt eines MapLibre-Symbol-Layers verwendet (Tracking, Coords, Routing nutzen alle schon
Symbol-Layer). Behebt außerdem den in der Code-Review dokumentierten Regelverstoß gegen
`oe5ith-ci/docs/for-coding-agents.md` (Inline-`style="color:…"` in `NahMapLayers.ts:78,102`).

## Ist-Zustand

`NahMapLayers.renderMarkers()` erzeugt pro Station ein `maplibregl.Marker` mit einem
per `innerHTML` gesetzten FontAwesome-Helicopter-Icon (`style="color: …"` für die
Status-Farbe) und einem `.setPopup()` mit ebenfalls per Inline-`style` eingefärbtem
Status-Text. `NahPageController` hält die erzeugten Marker in `stationMarkers[]` und
entfernt/erneuert sie bei jedem Datenupdate. DOM-Marker überleben Basemap-Wechsel "zufällig"
dadurch, dass sie technisch außerhalb des MapLibre-Style-Layers liegen — nicht durch
absichtliche Persistenz-Logik.

## Ziel

Migration auf einen MapLibre-Symbol-Layer (`nah-stations`), analog zu den bereits
bestehenden Pin-/Line-Layern in derselben Datei (`nah-target-pin`, `nah-lines`) und zum
Klick-Popup-Muster in `TrackingMapLayers`. Popup-Inhalt bleibt fachlich identisch; die
Inline-Style-Verstöße werden behoben.

**Explizit nicht Teil dieser Migration:** Betreiber-spezifische Icons (siehe unten,
Roadmap-Verweis) und die Vereinheitlichung der Hover-Cursor-Logik (das ist U6).

## Icon-Erzeugung

Im Sprite-Set `oe5ith-markers` existiert kein einfärbbares (SDF) Helikopter-Icon — nur
9 nicht-SDF Betreiber-Logos (`nah-adac-luftrettung`, `nah-oeamtc-flugrettung`, …) und ein paar
generische SDF-Symbole ohne Helikopter-Form (`ci-symbol-location`, `ci-pin`, …).

Statt eine neue Sprite-Asset extern anzufragen (neue Blockade wie beim offenen
Sprite-404-Bug), wird das bestehende `fa-helicopter`-Glyph zur Laufzeit einmalig auf einen
Off-Screen-Canvas gerendert und als Alpha-Maske via `map.addImage('nah-heli-icon', imageData,
{ sdf: true })` registriert — idempotent per `map.hasImage()`-Guard. Das passiert in
`NahMapLayers.initLayers()`, die schon heute bei jedem `onRestore` (Basemap-Wechsel) läuft
(siehe `NahPage.ts:53`) — dadurch ist kein zusätzlicher Restore-Pfad nötig, das Icon ist nach
jedem Style-Reload automatisch wieder vorhanden.

## Daten- & Layer-Struktur

Neue Source+Layer `nah-stations` / `nah-stations-layer`, angelegt (leer) in `initLayers()`
nach demselben Muster wie `nah-target-pin`:

```ts
const layerDef = {
  id: 'nah-stations-layer',
  type: 'symbol',
  source: 'nah-stations',
  layout: {
    'icon-image': 'nah-heli-icon',
    'icon-size': 0.5,
    'icon-allow-overlap': true,
  },
  paint: {
    'icon-color': [
      'match', ['get', 'status'],
      'active', MAP_COLORS.success,
      'inactive', MAP_COLORS.danger,
      'offseason', MAP_COLORS.muted,
      MAP_COLORS.success
    ]
  }
};
```

Neue Methode `NahMapLayers.setStations(map, stations)` ersetzt `renderMarkers()`:

1. Berechnet pro Station `status: 'active' | 'inactive' | 'offseason'` (gleiche Bedingung
   wie heute in `renderMarkers`: `!in_season` → `offseason`, sonst `!is_active` → `inactive`,
   sonst `active`).
2. Baut eine GeoJSON-`FeatureCollection` (ein Feature pro Station, alle `NahStation`-Felder
   als `properties`, zusätzlich `status`).
3. `source.setData(...)` + `MapRegistry.registerSource('nah-stations', { type: 'geojson', data })`
   — exakt das Muster, das `updateFlightPaths()` für `nah-lines` schon nutzt. Die Registry
   reappliziert die zuletzt gesetzten Daten automatisch bei Basemap-Wechsel; kein neuer
   Restore-Code nötig.

`NahPageController`: `stationMarkers: maplibregl.Marker[]`-Feld entfällt. Der
`NahDataService`-Callback ruft `NahMapLayers.setStations(this.map, stations)` statt
`renderMarkers(...)`; `destroy()` verliert das `stationMarkers.forEach(m => m.remove())`
(Aufräumen übernimmt wie bei den anderen Layern `MapRegistry.clear()` beim Seitenwechsel).

## Klick-Interaktion & Popup

`NahPageController.handleMapClick` unterscheidet heute "Klick auf Marker" (DOM-Check
`.closest('.maplibregl-marker')`, öffnet Browser-eigenes Popup) von "Klick auf freie Fläche"
(löst `performCalculation` aus). Symbol-Layer haben kein DOM-Element, daher wird die
Unterscheidung wie in `TrackingMapLayers.handleMapClick` per
`map.queryRenderedFeatures(e.point, { layers: ['nah-stations-layer'] })` getroffen:

- **Treffer:** Popup an der Stations-Koordinate (`feature.geometry.coordinates`, nicht
  `e.lngLat`, für exakte Positionierung) öffnen; `performCalculation` **nicht** auslösen.
- **Kein Treffer:** wie bisher — `performCalculation(map, sidebarResults, lng, lat)`.

Der Popup-Inhalt (Titel, Status, bedingte Betriebszeiten-Zeile je `op_type`, Saison-Info)
wird unverändert aus der heutigen `renderMarkers`-Logik in eine private Funktion
`buildStationPopupHtml(station)` in `NahMapLayers` übernommen und beim Klick aufgerufen
(kein Umweg über `PopupManager` — dessen generisches Feldlisten-Schema passt nicht zur
bedingten Formatierungslogik, und NAH bliebe der einzige Nutzer eines "Custom-Render"-Escape-Hatches;
lohnt sich aktuell nicht als Abstraktion).

**CI-Fix:** Die zweite Inline-Style-Verletzung (`<td style="color: ${color}">` für den
Status-Text) wird durch die bestehenden CI-Badge-Klassen ersetzt, die exakt auf die drei
heutigen Status-Farben passen: `badge-green` (Einsatzbereit), `badge-red` (Außer Dienst),
`badge-gray` (Außer Saison). Der Info-Gehalt (Text + Farbcodierung) bleibt exakt gleich —
kein CI-Bug-Report/Erweiterungswunsch nötig, da ein passendes Pattern schon existiert.

## Hover-Cursor

`nah-stations-layer` bekommt lokal (in `NahMapLayers`, nach dem Muster von
`TrackingMapLayers`) `mouseenter`/`mouseleave`-Handler, die `map.getCanvas().style.cursor`
auf `pointer` setzen. Bewusst **keine** Extraktion in eine gemeinsame Helper-Funktion an
dieser Stelle — das ist Gegenstand von U6, das dann alle drei Instanzen (Tracking, Routing,
NAH) zusammenführt.

## Out of Scope / Roadmap-Verweis

Betreiber-spezifische Icons (`nah-adac-luftrettung`, `nah-oeamtc-flugrettung`, …) sind im
Sprite-Set bereits vorhanden, aber nicht-SDF (nicht einfärbbar) und aktuell keiner Station
zuordenbar (`NahStation` hat kein `operator`-Feld, nur `name`/`callsign`). Wird als
separater Punkt in `ROADMAP.md` festgehalten: neues Feature, braucht eine
API-/DB-Erweiterung (`operator`-Feld) und eine zweite Darstellungslösung für den Status
(da die Betreiber-Icons nicht einfärbbar sind, z.B. ein zusätzlicher Status-Dot-Layer).

## Testing

- Bestehende Tests für `NahMapLayers`/`NahPageController` (falls vorhanden) auf die neue
  API (`setStations` statt `renderMarkers`) anpassen.
- Neuer Test: `status`-Berechnung (active/inactive/offseason) für die drei Fallkombinationen
  aus `is_active`/`in_season`.
- Neuer Test: Klick-Dispatch — Treffer auf `nah-stations-layer` löst Popup aus und **nicht**
  `performCalculation`; kein Treffer löst `performCalculation` aus.
- Manuelle Browser-Verifikation (siehe bestehende Checkliste im Cleanup-Plan): Stationen
  sichtbar mit korrekter Status-Farbe, Popup-Inhalt bei Klick identisch zu heute, Icon +
  Popup überleben Basemap-Wechsel, Hover zeigt Pointer-Cursor.
