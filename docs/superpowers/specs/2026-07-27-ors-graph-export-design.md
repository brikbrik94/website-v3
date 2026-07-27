# Routing-Graph-Export-Seite (ORS `/export`) — Design

**Status:** entworfen, freigegeben durch Nutzer (2026-07-27) — Implementierung offen.
**Herkunft:** direkter Nutzerwunsch (kein vorheriger TODO/ROADMAP-Eintrag) — neue Seite, die den
ORS-`/export`-Endpoint (internen Routing-Graph, Nodes/Edges) über eine per Karte gesetzte Bbox
abfragt und visualisiert.

## Ziel

Neue, versteckte (nicht auf der Startseite verlinkte, nicht in der Navigation gelistete) Seite
unter `/graph` — „Routing-Graph". Nutzer setzt eine Bbox (frei gezeichnet oder aktueller
Kartenausschnitt), wählt ORS-Profil, Antwortformat (`json`/`topojson`) und ob der Straßenverlauf
(„Geometry") statt reiner Luftlinien-Kanten dargestellt werden soll, und bekommt den ORS-internen
Routing-Graph (Nodes + Edges) auf der Karte gerendert. Reines Diagnose-/Analyse-Werkzeug, kein
fachlicher Rettungsdienst-Bezug — ähnlich behandelt wie `/info` (eigener Router-Pfad, aber kein
Homepage-Card, kein Nav-Link, nur über direkte URL erreichbar).

## Erkenntnisse zum ORS-`/export`-Endpoint (verifiziert gegen die produktive Instanz)

Diese Fakten stammen aus echten Testabfragen gegen `https://ors.oe5ith.at` (nicht aus der
ORS-Doku geraten) und sind für das Design bindend:

- `POST {ORS_URL}/export/{profile}` (Format `json`, Default) bzw.
  `POST {ORS_URL}/export/{profile}/topojson` (Format TopoJSON). **`geojson` existiert nicht**
  (liefert HTTP 406 „response format geojson is not supported").
- Body: `{"bbox": [[minLon,minLat],[maxLon,maxLat]], "geometry": true|false, "id": "optional"}`.
- Profile aktuell auf der Instanz (`GET /status`, `.profiles`-Keys): `driving-car`,
  `driving-emergency` — gleiche Quelle wie `RoutingService.getProfiles()`.
- `json`-Response: `{nodes: [{nodeId, location:[lon,lat]}], edges: [{fromId, toId, weight}],
  nodes_count, edges_count}` — **kein GeoJSON**, eigenes Graph-Format. `geometry`-Flag hat hier in
  Tests **keinen sichtbaren Effekt** (Edges sind bereits der rohe, unaggregierte Graph).
  `topojson`-Response: echtes TopoJSON (`type: "Topology"`, `objects.network.geometries`,
  `arcs`) — Kanten werden hier zu weniger „Arcs" gebündelt; `geometry: true` behält dabei die
  echten Straßenform-Stützpunkte (in einem Testfall bis zu 5 Punkte/Arc), `geometry: false`
  reduziert jeden Arc auf eine 2-Punkte-Gerade Node-zu-Node. **Das Geometry-Flag ist also nur bei
  Format `topojson` fachlich wirksam.**
- Fehlerfälle: fehlende `bbox` → HTTP 400; ungültiges Profil → HTTP 400 (ORS-Code 7003);
  **großflächige Bbox (Landesgröße) → HTTP 504 Gateway-Timeout**, kein sauberer ORS-Fehler.
- Größen-/Zeit-Kalibrierung (Profil `driving-car`, Raum Wien):

  | Bbox-Größe | Nodes | Edges | Payload (json) | Zeit |
  |---|---|---|---|---|
  | 1km × 1km | 338 | 500 | 42 KB | 0,26s |
  | 3km × 2km | 2.184 | 3.411 | 278 KB | 0,26s |
  | 5km × 5km | 5.859 | 9.697 | 772 KB | 0,27s |
  | Stadtgröße (~30×15km) | 65.384 | 125.305 | 9,5 MB (json) / 17,9 MB (topojson) | 3,5–5,5s |
  | Landesgröße | — | — | — | 504 Timeout |

  TopoJSON ist bei der Stadtgröße-Probe **größer** als json (kein pauschaler Effizienzvorteil
  durch Arc-Bündelung bei dieser Datenmenge) — Format-Wahl darf sich also nicht auf eine Annahme
  „topojson ist kleiner" stützen.

## Route & Einbindung

- Pfad: **`/graph`**, Titel „Routing-Graph".
- `src/main.ts`: neuer Branch `else if (path === '/graph')` mit lazy `import()`, **kein**
  `.card-nav`-Eintrag auf der Startseite (analog `/info`, das ebenfalls nur über
  `path.startsWith('/info')` geroutet wird, ohne Homepage-Card).
- Kein Alias, kein Deep-Linking — reine Direkt-URL, wie vom Nutzer gewünscht.

## Dateistruktur

Analog `src/features/isochrones/` (DataService/MapLayers/SidebarAdapter-Trio):

- `src/pages/GraphPage.ts` — `GraphPageController extends BasePageController`
- `src/features/graph/GraphDataService.ts` — reiner State-Container + ORS-Aufruf (Body-Aufbau aus
  Bbox/Profil/Format/Geometry, `this.fetchJson()` über den Page-Controller-Signal)
- `src/features/graph/GraphMapLayers.ts` — Source-/Layer-Registrierung in `MapRegistry`,
  Response→FeatureCollection-Transformation (siehe unten)
- `src/features/graph/GraphSidebarAdapter.ts` — Profil-Dropdown, Format-Toggle,
  Geometry-Checkbox, Submit-Button, Ergebnis-Info
- `src/features/graph/calculateBboxArea.ts` (+ `.test.ts`) — eigenständige kleine Utility
  (analog `parseRangeList.ts` bei Isochronen: ein Export, eine Aufgabe), Flächenberechnung aus
  zwei Koordinatenpaaren für das Größenlimit
- `src/components/GraphSidebar.ts` — reines Rendering (Formular), analog
  `IsochronesSidebar.ts`

**Backend:** `api/ors.php` — Allowlist-Regex um `export/[a-z0-9-]+` und
`export/[a-z0-9-]+/topojson` erweitern (gleiche Stelle wie bestehende Einträge, kein neuer
PHP-Endpoint nötig, gleicher generischer Proxy-Mechanismus wie bei `isochrones/{profile}`).

**Dokumentation:** `docs/openapi.yaml` bekommt einen neuen Pfad-Eintrag für `export/{profile}`
(json + topojson-Variante) — laut CLAUDE.md alleinige Quelle der Endpoint-Doku, `npm run
validate:openapi` muss grün bleiben.

**Neue npm-Abhängigkeiten:**
- `terra-draw` + `terra-draw-maplibre-gl-adapter` (`maplibre-gl >=4` als Peer-Dep, kompatibel mit
  dem hier verwendeten `^6.0.0`) — Rechteck-Zeichnen-Interaktion, keine Custom-Draw-Logik.
- `topojson-client` (schlanke, verbreitete Lib) — für die Konvertierung der `topojson`-Antwort zu
  GeoJSON auf Client-Seite; keine Custom-TopoJSON-Parsing-Logik.

## Bbox-Interaktion & Größenlimit

- **Zeichnen:** `terra-draw` mit `TerraDrawRectangleMode` über die MapLibre-Adapter-Bindung. Ein
  Toolbar-Button „Bbox zeichnen" aktiviert den Modus; das fertig gezogene Rechteck wird
  automatisch als aktuelle Bbox übernommen (kein zusätzlicher Bestätigungsklick).
- **„Aktuelle Ansicht verwenden":** zweiter Button setzt `map.getBounds()` direkt als Bbox.
- Beide Wege schreiben in denselben `currentBbox`-State in `GraphDataService`.
- **Hartes Flächenlimit: 25 km²** (z.B. 5km × 5km), clientseitig berechnet über
  `calculateBboxArea()`:
  - Während des Zeichnens (`terra-draw` `on('change')`): Live-Flächenberechnung, Rechteck wird
    optisch als ungültig markiert (rote Kontur) sobald über dem Limit, Submit-Button bleibt
    disabled.
  - Bei „aktuelle Ansicht verwenden": ist die aktuelle Ansicht zu groß, erscheint ein `Toast`
    „Ansicht zu groß, bitte weiter hineinzoomen" statt einer ORS-Anfrage.
  - Prüfung ausschließlich clientseitig (kein Backend-Check nötig — `ors.php` reicht nur durch,
    keine eigene Validierungslogik dort).

## Datenfluss & API

**Request** (`GraphDataService` baut den Body, `GraphSidebarAdapter` liefert die Formularwerte):

```
POST /api/ors.php?path=export/{profile}[/topojson]
{
  "bbox": [[minLon, minLat], [maxLon, maxLat]],
  "geometry": true | false
}
```

**Response-Handling** (`GraphMapLayers`):
- Format `json`: `{nodes, edges}` wird manuell in eine `FeatureCollection` übersetzt — Nodes
  → `Point`-Features (`properties.nodeId`), Edges → `LineString`-Features über
  Node-ID→Koordinaten-Lookup (`properties.weight`).
- Format `topojson`: Response wird über `topojson-client` (`feature()`/`merge()`) zu GeoJSON
  konvertiert; Node-Objekte existieren hier nicht separat (nur `objects.network.geometries` als
  `LineString`s) — es gibt in diesem Fall **keinen eigenen Node-Layer**, nur Edges. Das ist ein
  bewusster Unterschied zum `json`-Format und wird in der Sidebar-Ergebnis-Info kurz vermerkt
  („TopoJSON enthält keine einzelnen Knotenpunkte").

**Fehlerfall:** `GraphDataService`-Query-Methode gibt bei ORS-/Netzwerkfehler `null` zurück (wie
`RoutingService.calculateRoute`/`IsochronesService`). Adapter zeigt `Toast`, kein dauerhafter
Sidebar-Fehlertext.

## Map-Layer & Darstellung

- Edge-Layer: `line`-Layer, Farbe über `MAP_COLORS`/`MAP_ROUTE_STYLES` (`src/lib/MapStyles.ts`),
  kein hartcodierter Hex-Wert.
- Node-Layer (nur bei Format `json`): `circle`-Layer, standardmäßig über `MapLegend`
  ausblendbar/einblendbar (Listbox-Pattern wie bestehende Legenden-Einträge) — bei mehreren
  Tausend Nodes sonst visuell überladen.
- Popup bei Klick (`PopupManager`): Edge → `weight` (und `distance`, falls vorhanden), Node (nur
  json) → `nodeId` + Koordinaten.
- Kein `fitBounds()` nach Abfrage — Bbox entspricht bereits der aktuellen Ansicht/Zeichnung, kein
  Kamerasprung nötig.

## Sidebar (Typ 3: Tool-Panel, `oe5ith-ci/docs/sidebar-types.md`)

Reines Formular, Ergebnis erscheint auf der Karte (kein Ergebnis-Liste-Teil wie bei
Isochronen/Routing — pro Abfrage wird der vorherige Graph-Layer komplett ersetzt, kein Stapeln
mehrerer Abfragen).

1. Profil-Select (`.form-select`), Optionen von `RoutingService.getProfiles()`
2. Format-Segmented-Control („JSON" / „TopoJSON"), Default „TopoJSON"
3. Geometry-Checkbox („Straßenverlauf statt Luftlinie"), Default `true`, **disabled bei Format
   JSON** (mit Hinweistext „nur bei TopoJSON wirksam" — siehe ORS-Verhalten oben)
4. Buttons „Bbox zeichnen" / „Aktuelle Ansicht verwenden"
5. Submit-Button „Export abfragen", disabled ohne gültige Bbox unter dem 25 km²-Limit oder
   während Profile noch laden
6. Ergebnis-Info nach erfolgreicher Abfrage: „X Nodes / Y Edges, Z KB" (Payload-Größe stark
   variabel laut Kalibrierung oben, sonst nicht sichtbar) + Hinweis bei TopoJSON ohne Node-Layer

## Fehlerbehandlung & Edge Cases

- 400 (ungültiges Profil/fehlende Bbox): sollte durch Client-Validierung nie auftreten, defensiv
  generischer `Toast`.
- **504/Timeout gezielt behandelt:** eigene Fehlermeldung „Zeitüberschreitung — Bbox verkleinern"
  statt generischem Fehlertext (bekannter Failure-Mode bei zu großen Anfragen; das 25 km²-Limit
  soll das im Normalfall verhindern, aber Serverlast kann trotzdem mal zu Timeouts führen).
- Navigation weg von der Seite während laufender Abfrage: `BasePageController`s
  `AbortController`/`this.signal` übernimmt Abbruch, kein Extra-Code nötig.
- TopoJSON-Antwort ohne Nodes: kein Fehlerfall, sondern erwartetes Verhalten (siehe oben) — keine
  leere Fehlermeldung, sondern der Hinweistext in der Ergebnis-Info.

## Tests (TDD)

- `GraphDataService.test.ts` — Body-Konstruktion (`bbox`/`geometry`), URL-Pfad je Format
  (`export/{profile}` vs. `export/{profile}/topojson`), Profil fließt in URL ein, `null` bei
  Fehler
- `GraphMapLayers.test.ts` — `json`-Response → FeatureCollection (Node-Lookup für Edges korrekt),
  `topojson`-Response → GeoJSON via `topojson-client`, kein Node-Layer bei TopoJSON
- `GraphSidebarAdapter.test.ts` — Geometry-Checkbox disabled bei Format JSON, Submit-Button
  disabled ohne gültige/zu große Bbox
- `calculateBboxArea.test.ts` — bekannte Bbox-Größen (z.B. die Kalibrierungswerte oben als
  Regressionswerte), Grenzfall exakt am 25 km²-Limit, vertauschte/negative Koordinaten
- Kein Playwright/Browser verfügbar (bekannte Repo-Einschränkung) — Live-Verifikation im Browser
  durch den Nutzer nach Implementierung (Zeichnen-Interaktion, Viewport-Button, beide Formate,
  Geometry an/aus, Limit-Überschreitung, Fehlerfall), wie bei allen vorherigen Karten-Features.
- Verifikation vor Abschluss: `npx tsc --noEmit && npm test`; `npm run validate:openapi` nach
  `openapi.yaml`-Ergänzung; `npm run docs:bausteine` nur falls `src/lib/` tatsächlich geändert
  wird (aktuell nicht geplant — Feature bleibt in `src/features/graph/` gekapselt).

## Out of Scope (bewusst nicht Teil dieser Iteration)

- Datei-Download des Rohergebnisses (nur Kartenvisualisierung, siehe Nutzerentscheidung)
- Stapeln mehrerer gleichzeitiger Graph-Abfragen (immer nur eine aktive Abfrage, wie bei
  Routing/`/karte`, nicht wie das Multi-Query-Muster bei Isochronen)
- Konfigurierbares Flächenlimit (fest auf 25 km², keine UI zum Anpassen)
- Persistenz über Seitenwechsel/Reload hinaus (State lebt nur in `GraphDataService`, verworfen bei
  `destroy()`/Navigation, konsistent mit `MapRegistry.clear()`)
- Nav-Link/Homepage-Card (bewusst nur über Direkt-URL erreichbar)
