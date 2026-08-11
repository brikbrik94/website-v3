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
- **AIS-Sprite (`/tracking`) — nur die `@2x`-Variante fehlt.** `TrackingMapLayers.ts` lädt über
  denselben `MapCore.loadSprites`-Pfad wie das (funktionierende) ADS-B-Sprite auch
  `https://tiles.oe5ith.at/assets/sprites/ais/sprite@2x.png`/`.json` — beide liefern 404, während
  `assets/sprites/ais/sprite.png` (1x, ohne `@2x`) und alle `adsb/`-Varianten `200` liefern
  (verifiziert per `curl`, 2026-08-11). Code-Pfad ist identisch/korrekt zum funktionierenden
  ADS-B-Fall, nur das serverseitige `@2x`-Asset für AIS fehlt. **Funktional unkritisch:**
  `MapCore.loadSprites` hat bereits einen `@2x`→`1x`-Fallback bei Ladefehler, die App zeigt die
  AIS-Icons also vermutlich trotzdem korrekt (in geringerer Auflösung) — der 404 ist reines
  Konsolenrauschen (fällt bei Lighthouses `errors-in-console`-Audit auf, siehe
  `docs/performance/2026-07-28-baseline-audit.md`, Befund 3 / TODO.md „Performance"-Sektion).
  Entdeckt beim Performance-Baseline-Audit (2026-07-28), Root-Cause bestätigt 2026-08-11.

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
