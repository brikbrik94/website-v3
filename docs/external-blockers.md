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
