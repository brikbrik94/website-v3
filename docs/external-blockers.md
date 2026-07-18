# Externe Blocker

Bekannte Probleme, die **außerhalb dieses Repos** liegen (Server-Infrastruktur, keine
Repo-Code-Änderung möglich) und deshalb nicht in `TODO.md`/`ROADMAP.md` geführt werden — die
Standard-Kriterien dort ("was kann ein Agent im Repo umsetzen") greifen hier nicht. Diese Datei
ist reine Dokumentation zur Nachvollziehbarkeit, kein aktiver Arbeits-Tracker.

## Tile-Server (`tiles.oe5ith.at`) — fehlende Sprite-Assets

Nicht Teil dieses Repos (dessen `nginx.conf` deckt ausschließlich `map.oe5ith.at` ab); Zugriff
auf den Tile-Server liegt außerhalb der Reichweite eines Coding-Agenten in diesem Arbeitsverzeichnis.

- **Basemap „At Plus"** — liefert 404 für sein eigenes (natives, nicht von `MapCore.loadSprites`
  verwaltetes) Sprite: `https://tiles.oe5ith.at/assets/sprites/basemaps/sprite.json`. MapLibre
  loggt beim Laden dieses Basemaps einen `AJAXError (404)`. Zu prüfen serverseitig
  (Tile-Server-Assets) oder im Style-JSON, nicht im Repo-Code. Entdeckt bei der U3-Live-Verifikation
  (2026-07-03). Erneut gegengetestet (2026-07-09): weiterhin 404.
- **Overlay „Wanderwege" (`hiking`)** — referenziert in seinem Style-JSON ein Sprite
  (`sprite: "https://tiles.oe5ith.at/assets/sprites/overlays/sprite"`), das serverseitig nicht
  existiert — `sprite.json`/`sprite.png` liefern 404. Analog zum „At Plus"-Sprite-404 oben, aber
  anderer Pfad (`overlays/` statt `basemaps/`). `MapCore.loadSprites`-Aufrufpfad selbst
  unverändert/korrekt (gegen `master` verglichen). Entdeckt bei der Browser-Verifikation von
  U7+U1b (`/coords` Wanderwege-Toggle, 2026-07-06). Erneut gegengetestet (2026-07-09): weiterhin
  404.

**Fix erfordert:** Zugriff auf den Tile-Server (`tiles.oe5ith.at`), um die fehlenden
`sprite.json`/`sprite.png`-Assets unter `assets/sprites/basemaps/` bzw. `assets/sprites/overlays/`
zu ergänzen, oder die referenzierenden Style-JSONs so anzupassen, dass sie auf existierende
Sprites zeigen.

## Tile-Server (`tiles.oe5ith.at`) — Gemeinden/Bezirke ohne Fill-Layer

Im Zuge des Klick-Popup-Features auf `/karte` (2026-07-10) festgestellt: Die Overlays
„Gemeinden" und „Bezirke" rendern ihre Umrisse nur als `line`-Layer (`gemeinden-*-outline`,
`bezirke-outline`), ohne begleitenden `fill`-Layer. Klick-Popups (`GenericFeaturePopup.ts`) und
Legenden-Swatches funktionieren deshalb nur exakt auf der dünnen Umrisslinie oder auf dem
Namens-Label, nicht irgendwo innerhalb der Gemeinde-/Bezirks-Fläche.

Recherche im echten Style-JSON zeigt: Die zugrunde liegenden Vektor-Kacheldaten (PMTiles) haben
tatsächlich Polygon-Geometrie (`"filter": ["match", ["geometry-type"], ["Polygon","MultiPolygon"], true, false]`
auf dem `line`-Layer) — der Style-Autor hat sich nur entschieden, sie ausschließlich als
Umriss zu rendern, nicht zusätzlich als (ggf. unsichtbaren) `fill`. Root Cause liegt also im
Style-JSON, nicht im Repo-Code — ein zusätzlicher `fill`-Layer (z.B. mit `fill-opacity: 0`, rein
fürs Hit-Testing über `queryRenderedFeatures`) würde das Problem lösen.

**Nutzer-Entscheidung (2026-07-10):** wird direkt an den Style-JSONs auf dem Tile-Server behoben,
kein Workaround im Repo-Code (z.B. automatische Layer-Type-Erkennung + synthetischer
unsichtbarer Fill-Layer in `OverlayLoader.ts`) geplant.

**Fix erfordert:** Zugriff auf den Tile-Server, um den betroffenen Style-JSONs
(`overlays/styles/gemeinden/style.json`, `overlays/styles/bezirke/style.json`, ggf. weitere
Umriss-only-Overlays) einen `fill`-Layer pro Gemeinde/Bezirk zu ergänzen. Sobald vorhanden, greift
das bestehende Klick-Handling in `MapPage.ts` automatisch — keine Repo-Code-Änderung nötig
(`OverlayLoader.add()` übernimmt bereits alle Layer aus `style_layers`, `queryRenderedFeatures`
fragt bereits generisch alle aktiven Layer ab).

## ORS-Instanz (`ors.oe5ith.at`) — Isochronen auf 1 Range pro Anfrage limitiert

Bei der Live-Verifikation der neuen Isochronen-Seite (`/isochrones`, 2026-07-18) festgestellt:
jede Anfrage mit mehr als einem Ring-Wert (z.B. Standard-Vorbelegung „5 10 15") schlägt mit
`HTTP 400` fehl. Root Cause per direktem `curl` gegen `api/ors.php?path=isochrones/driving-car`
verifiziert (nicht geraten) — mit 1 Range liefert die Anfrage ein valides GeoJSON, mit 2+ Ranges
exakt derselbe Fehler:

```json
{"error":{"code":3012,"message":"Parameter 'interval' is out of range: Resulting number of 2 isochrones exceeds maximum value of 1."}}
```

Die self-hosted ORS-Instanz ist server-seitig auf `maximum_intervals: 1` für Isochronen
konfiguriert. Das Request-Format von `IsochronesService.calculateIsochrones()`
(`src/lib/IsochronesService.ts`) selbst ist korrekt — der 1-Range-Fall beweist das. Kein
Repo-Code-Bug.

**Nutzer-Entscheidung (2026-07-18):** wird direkt in der ORS-Server-Config behoben (z.B.
`maximum_intervals` in der `ors-config.yml` auf `ors.oe5ith.at` erhöhen), kein Workaround im
Repo-Code (z.B. clientseitiges Aufteilen einer Mehrfach-Range-Anfrage in mehrere
Einzel-Requests) geplant.

**Fix erfordert:** Zugriff auf die ORS-Server-Konfiguration auf `ors.oe5ith.at`. Sobald
`maximum_intervals` erhöht ist, funktioniert die bereits implementierte Mehrfach-Ring-Anfrage
(`5 10 15` etc.) ohne weitere Repo-Code-Änderung — `IsochronesService`/`IsochronesMapLayers`
unterstützen beliebig viele Ringe pro Query bereits vollständig.
