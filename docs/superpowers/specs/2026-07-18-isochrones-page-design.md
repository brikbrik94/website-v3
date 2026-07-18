# Isochronen-Abfrage-Seite — Design

**Status:** entworfen, freigegeben durch Nutzer (2026-07-18) — Implementierung offen.
**Herkunft:** `docs/TODO.md` → „Neue Seiten (nächste Schritte)" → „Isochronen-Abfrage-Seite".

## Ziel

Neue Karten-Seite für allgemeine Erreichbarkeitsanalyse: Nutzer setzt einen beliebigen Punkt
(Kartenklick, Geocoder-Suche oder manuelle Koordinaten), wählt ein ORS-Fahrprofil sowie
Zeit- oder Distanz-Ringe, und bekommt die resultierenden Isochronen-Polygone auf der Karte
angezeigt. Mehrere Abfragen können gleichzeitig gestapelt und einzeln ein-/ausgeblendet werden
(Vergleich mehrerer Standorte). Kein spezifischer Rettungsdienst-Fokus — generisches Werkzeug für
alle Nutzer, alle von ORS gemeldeten Profile gleichberechtigt.

Abgegrenzt von den bestehenden, statisch kuratierten „Anfahrtszeit-Ringen" auf `/karte`
(`anfahrtszeit-linz`-Overlay, serverseitig vom Tile-Server vorberechnet, fixe Werte für Linz) —
diese Seite ist eine Live-Abfrage für beliebige Punkte, analog zu `/routing`.

## Route & Landing Page

- Kanonischer Pfad: **`/isochrones`**. `/isochronen` bleibt als Alias erreichbar und redirected
  clientseitig (`history.replaceState` auf `/isochrones`, dann normaler Router-Durchlauf) — beide
  Schreibweisen zeigen auf denselben `IsochronesPageController`.
- Neue Karte auf der Landing Page (`src/main.ts`, `.card-grid`), Icon `fa-solid fa-bullseye` (oder
  ein äquivalentes, während der Umsetzung gegen bestehende FontAwesome-Nutzung im Repo
  abzugleichen), `href="/isochrones"`.

## Dateistruktur

Mirrored 1:1 an `src/features/routing/` + `src/pages/RoutingPage.ts`:

- `src/features/isochrones/IsochronesDataService.ts` — reiner State-Container
- `src/features/isochrones/IsochronesMapLayers.ts` — Source-/Layer-Registrierung, `setData()`
- `src/features/isochrones/IsochronesSidebarAdapter.ts` — verdrahtet Formular/Liste mit
  DataService + MapLayers
- `src/features/isochrones/parseRangeList.ts` — Parser für die Ring-Werte-Eingabe (siehe unten)
- `src/components/IsochronesSidebar.ts` — reines Rendering (Formular + Ergebnis-Liste)
- `src/pages/IsochronesPage.ts` — `IsochronesPageController extends BasePageController`
- `src/lib/IsochronesService.ts` — eigenständiges Modul für den ORS-Aufruf (kein Anbau an
  `RoutingService.ts` — eigene, fokussierte Aufgabe; ruft für Health-Check/Profile-Liste aber
  direkt `RoutingService.checkHealth()`/`.getProfiles()` auf, da das generische ORS-Abfragen sind,
  keine Duplikation nötig)
- `src/lib/MapStyles.ts` — Ergänzung um `getIsochroneRingColor(index, total)`

Kein neuer PHP-Endpoint: `api/ors.php?path=isochrones/{profile}` funktioniert bereits über den
bestehenden generischen Proxy (derselbe Mechanismus wie `path=directions/{profile}/geojson` bei
Routing). `api/stations.php` ist kein Vorbild hier — das ist wegen der zusätzlichen DB-Abfrage ein
Sonderfall, Isochronen brauchen keine DB.

## Datenfluss & API

**Request:**

```
POST /api/ors.php?path=isochrones/{profile}
{
  "locations": [[lon, lat]],
  "range": [300, 600, 900],
  "range_type": "time"
}
```

`range`-Werte in Sekunden (`time`) bzw. Metern (`distance`) — Minuten-/km-Eingabe des Nutzers wird
clientseitig umgerechnet (`*60` bzw. `*1000`).

**Response:** GeoJSON `FeatureCollection`, ein `Polygon`-Feature pro Ring, `properties.value` =
Range-Wert in Sekunden/Metern, `properties.center` = Ausgangspunkt (ORS-Standardformat).

**`IsochronesDataService`:**

```ts
Map<queryId, {
  id: number;              // monoton steigender Zähler, rein lokaler Session-State
  point: [number, number]; // [lat, lon]
  label: string;           // Geocoder-Adresse oder formatierte Koordinaten
  profile: string;
  rangeType: 'time' | 'distance';
  ranges: number[];        // Nutzereingabe, Minuten bzw. km
  geojson: FeatureCollection;
}>
eyeActiveStates: Set<queryId>
```

Struktur bewusst analog zu `RoutingDataService.stationRoutes`/`eyeActiveStates`.

**Fehlerfall:** `IsochronesService.calculateIsochrones()` gibt bei ORS-Fehler/Netzwerkfehler
`null` zurück (wie `RoutingService.calculateRoute`). Adapter zeigt `Toast` statt eines dauerhaften
Sidebar-Fehlertexts — fehlgeschlagene Abfragen erzeugen schlicht keinen Listeneintrag.

## Map-Layer & Darstellung

- **Eine gemeinsame GeoJSON-Source** `isochrones-rings` + ein `fill`-Layer
  `isochrones-rings-layer` für alle Ringe aller gestapelten Abfragen. Bei jedem Update (neue
  Abfrage, Augen-Toggle, Entfernen) wird die komplette FeatureCollection aus
  `IsochronesDataService` neu gebaut — nur Ringe von Queries mit `eyeActiveStates.has(queryId)`
  werden included. Kein separates Source/Layer-Paar pro Abfrage (Layer-Wachstum, kein
  Präzedenzfall im Repo).
- **Zeichenreihenfolge:** ORS liefert Ringe kumulativ (größerer Ring enthält kleineren
  vollständig) — Features werden **absteigend nach Ring-Index sortiert** in die
  FeatureCollection geschrieben (größter zuerst), sonst würde der äußere Ring den inneren optisch
  überdecken.
- **Farbverlauf:** `getIsochroneRingColor(index, total)` in `src/lib/MapStyles.ts` interpoliert
  zwischen zwei CI-Token-Farben (kein hartcodierter Hex-Wert) nach Ring-*Position*
  (`index/(total-1)`), nicht nach Query — zwei Queries mit gleicher Ring-Anzahl bekommen dieselbe
  Farbfolge. Konkretes Token-Paar wird während der Implementierung gegen
  `oe5ith-ci/css/common.css` abgeglichen (offen, ob `--accent` genug Helligkeitsstufen hat oder
  interpoliert werden muss).
- **Paint:** `fill-color: ['get', 'color']`, `fill-opacity: 0.35` (fest, kein Property —
  konsistent mit den bestehenden Anfahrtszeit-Flächen), `fill-outline-color` dunkler für Kontur.
- **Ausgangspunkt-Pin:** pro aktiver Query ein Punkt-Feature in einer zweiten Source
  `isochrones-points` (analog `routing-pin-start`/`-target`, `MapCore.createPinLayer()`).
- **Punkt setzen:** einfacher Kartenklick setzt den Punkt direkt (wie Routing SEW/NEF —
  `handleMapClick` → Punkt setzen, ohne Kontextmenü-Umweg, da es nur einen Punkttyp gibt).

## Legende

Dynamisch aus den aktuell **eye-aktiven** Queries aufgebaut (Abweichung vom Muster bei
`/routing`/`/nah`, wo die Legende einmalig beim Mount gebaut wird und danach statisch bleibt) —
hier zwingend, weil Ranges pro Query frei wählbar sind und sich der sichtbare Zustand durch
Augen-Toggle ändert. Pro sichtbarer Query ein Legenden-Eintrag pro Ring mit Farbe + formatiertem
Wert (z.B. „5 min", „2,5 km"), dedupliziert bei identischer Farbe+Label-Kombination (analog zum
bestehenden Dedupe-Muster der Anfahrtszeit-Ringe, siehe
[2026-07-12-map-legend-granularity-design.md](./2026-07-12-map-legend-granularity-design.md)).
Legende wird bei jedem Toggle/Entfernen neu aufgebaut.

## Sidebar (Typ 4: Tool-Panel + Ergebnis-Liste, `oe5ith-ci/docs/sidebar-types.md`)

**Formularteil** (`tool-panel-title` „Isochronen"):

1. Profil-Select (`.form-select`), Optionen live von `IsochronesService`/`RoutingService.getProfiles()`
2. Range-Typ als Segmented Control („Zeit" / „Distanz", `.segmented`/`.segmented-btn`)
3. Ring-Werte als Freitext-Feld (`.form-input`), **leerzeichen-getrennt** (z.B. `5 10 15` oder
   `1,5 3 5,5`) — Komma bleibt für Dezimalwerte reserviert, kollidiert nicht mit dem
   Listentrennzeichen. Geparst über neuen `parseRangeList()`-Helper, der jeden Einzelwert durch
   den bestehenden `parseDecimalInput()` (`src/features/coords/parseDecimalInput.ts`) schickt.
4. Geocoder-Suchfeld (`GeocoderSearchField`) zum Punkt setzen
5. Manuelles Koordinaten-Feld: einfaches lat/lon-Zahlenpaar mit `parseDecimalInput()` — **nicht**
   die volle Multi-System-`/coords`-UI
6. Submit-Button „Berechnen" (volle Breite, unten im Formularteil), disabled solange kein Punkt
   gesetzt ist

`tool-sep`, dann Ergebnis-Liste (Typ 4, wie Routing SEW/NEF):

- `result-header`: Anzahl aktiver Abfragen + „Alle löschen"-Button (`.btn.btn-sm.btn-ghost`)
- Pro Query ein `result-item`: Nummer-Badge, Label (Adresse oder Koordinaten), Profil + Range-Typ
  als `result-item-sub`, Augen-Icon (`result-action`, togglet `eyeActiveStates`) + Lösch-Icon
  (entfernt Query komplett aus DataService + Map + Legende)
- Klick auf Item ohne aktives Auge: Ringe werden zuerst sichtbar (Auge aktiviert), dann
  `fitBounds()` auf die Ring-Extents dieser Query
- `result-empty` Leerzustand vor der ersten Abfrage: „Klicke auf die Karte oder suche eine
  Adresse, um eine Isochrone zu berechnen."

## Fehlerbehandlung & Edge Cases

- ORS-/Netzwerkfehler → `Toast`, kein Listeneintrag, Submit-Button verliert `.loading`
- `parseRangeList()` liefert bei 0 gültigen Werten `null` → Submit clientseitig verhindert,
  `Toast`-Hinweis statt Leerlauf-Request
- Kein Punkt gesetzt → Submit-Button disabled
- Navigation weg von der Seite während laufender Abfrage → `BasePageController`s
  `AbortController`/`this.signal` übernimmt Abbruch, keine Extra-Logik nötig
- Kein hartes Client-Limit für Anzahl gestapelter Abfragen (Ausweg: „Alle löschen"); ein
  eventuelles ORS-seitiges Limit (Range-Anzahl, Rate) äußert sich als regulärer Fehlerfall — kein
  Vorab-Workaround ohne verifizierten Bedarf
- Offen/unverifiziert: ob `driving-emergency` bei ORS-Isochrones überhaupt unterstützt wird (die
  Matrix-Abfrage ist dafür laut bestehendem Code-Kommentar in `RoutingService.ts` schon
  unzuverlässig) — wird während der Implementierung geprüft, nicht vorab angenommen

## Tests (TDD, siehe `parseDecimalInput.ts`-Präzedenzfall)

- `parseRangeList.test.ts` — leerzeichengetrennt, Dezimalkomma, leere/ungültige Werte, gemischt
  gültig/ungültig
- `IsochronesDataService.test.ts` — Query hinzufügen/entfernen, `eyeActiveStates`-Toggle,
  `queryId`-Vergabe
- `IsochronesMapLayers.test.ts` — FeatureCollection-Aufbau (absteigende Ring-Sortierung,
  Farbzuweisung, Filterung nach aktiven Queries)
- `getIsochroneRingColor()` — Grenzfälle (1 Ring, N Ringe)
- Kein Playwright/Browser hier verfügbar (bekannte Repo-Einschränkung) — Live-Verifikation durch
  den Nutzer nach Implementierung, wie bei allen vorherigen Karten-Features

## Out of Scope (bewusst nicht Teil dieser Iteration)

- Volle `/coords`-Multi-System-Koordinateneingabe (nur einfaches lat/lon-Paar)
- ARIA-Tastaturnavigation über das Standard-Formularverhalten hinaus
- Deep-Linking (wie `RoutingDeepLink.ts`) — kein genannter Anwendungsfall bisher, eigener
  Folge-Punkt bei Bedarf
- Persistenz gestapelter Abfragen über Seitenwechsel/Reload hinaus (State lebt nur in
  `IsochronesDataService`, wird beim `destroy()`/Navigation verworfen — konsistent mit
  `MapRegistry.clear()`-Verhalten aller anderen Seiten)
