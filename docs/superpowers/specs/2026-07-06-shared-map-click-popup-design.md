# Gemeinsame Klick-Popup-Mechanik für Tracking + NAH

Datum: 2026-07-06. Kontext: Bei der manuellen Nachtest-Runde der U5-NAH-Symbol-Layer-Migration
([docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md](./2026-07-06-nah-symbol-layer-migration-design.md))
wurde ein Bug gefunden — klickt man auf eine andere Station, während ein Popup offen ist,
schließt sich das offene Popup, das neue öffnet sich aber erst beim zweiten Klick. Ursache und
Fix sind in [ROADMAP.md](../../../ROADMAP.md) referenziert; dieses Dokument behandelt die
größere Frage, die daraus entstand: Statt den Fix nur lokal in `NahMapLayers.ts` zu duplizieren,
wird die Popup-Öffnungs-/Schließ-Mechanik zwischen Tracking und NAH vereinheitlicht — das ist
außerdem eine Teilumsetzung des offenen ROADMAP-Punkts „Karten-Klick + Overlay-Infos
seitenübergreifend".

## Ist-Zustand & Root Cause

`TrackingMapLayers` (`this.popup`, Instanzfeld) und `NahMapLayers` (`_stationPopup`,
modul-scoped Singleton) halten je eine eigene `maplibregl.Popup({ closeButton: true,
closeOnClick: true, maxWidth: '300px' })`-Instanz und öffnen sie bei jedem Klick erneut per
`.setLngLat(...).setHTML(...).addTo(map)`.

MapLibres `Popup.addTo()` entfernt bei einem bereits offenen Popup zuerst den alten
`closeOnClick`-Listener und registriert sofort einen neuen — mitten in der laufenden
Klick-Event-Verteilung. Dadurch feuert der neu registrierte Close-Listener für **denselben**
Klick nochmal und schließt das Popup, das der eigene Handler im selben Klick gerade erst
geöffnet hat. `TrackingMapLayers.handleMapClick` ruft deshalb am Ende `e.preventDefault()` auf
— das hat `NahMapLayers.handleStationClick` bei der U5-Migration nicht übernommen, daher der Bug.

## Scope

Nur Tracking + NAH — die zwei tatsächlich existierenden Konsumenten. RD/NEF- und
Contours/Hiking-Overlays haben aktuell keinerlei Klick-Popup-Code (nur ungenutzte Sprites); der
generische ROADMAP-Punkt dafür bleibt offen und baut bei Bedarf auf der hier etablierten Struktur
auf, statt jetzt spekulativ mitgestaltet zu werden.

**Bewusst nicht vereinheitlicht:** der Popup-*Inhalt*. `PopupManager.buildHtml` (Feldlisten-Schema
für ADS-B/AIS) und `NahMapLayers.buildStationPopupHtml` (bedingte Formatierung: Status-Badge,
Betriebszeiten-Zweige, Saison-Zeile) bleiben getrennte, seiten-eigene Funktionen. Ebenso bleibt
die Klick-*Erkennung* (`queryRenderedFeatures` gegen die jeweils eigene Layer-Liste, Trackings
ADS-B/AIS-ID-Extraktion, NAHs `findClickedStation`) pro Seite bestehen — nur die
Popup-Öffnungs-/Schließ-Mechanik (das tatsächlich duplizierte UND fehleranfällige Stück) wird
geteilt.

## Design

`PopupManager.ts` bekommt zwei neue Methoden auf einem modul-internen, lazy erzeugten
Popup-Singleton (analog zum bisherigen `NahMapLayers`-Singleton, aber jetzt der einzige im
gesamten Client — sicher, weil laut Architektur ([CLAUDE.md](../../../CLAUDE.md)) immer nur eine
Seite/Karteninstanz gleichzeitig lebt):

```ts
showFeaturePopup(map: maplibregl.Map, e: maplibregl.MapMouseEvent, coordinates: [number, number], html: string): void
closePopup(): void
```

`showFeaturePopup` kapselt `.setLngLat(coordinates).setHTML(html).addTo(map)` **und** das
`e.preventDefault()` — an dieser einen Stelle, nicht mehr in jedem Konsumenten separat, sodass
der Bug künftig nicht erneut vergessen werden kann. `closePopup()` ersetzt die bisherigen
direkten `this.popup.remove()`-Aufrufe (Trackings Miss-Case und `destroy()`).

**`NahMapLayers.ts`:** `_stationPopup`/`getStationPopup()` (aus U5, Task 6) entfällt vollständig.
`handleStationClick` ruft nach erfolgreichem `findClickedStation`-Treffer
`PopupManager.showFeaturePopup(map, e, hit.coordinates, this.buildStationPopupHtml(hit.station))`
auf. `findClickedStation` und seine bestehenden Tests bleiben unverändert.

**`TrackingMapLayers.ts`:** `this.popup`-Feld und dessen Konstruktor-Init entfallen. Die
Popup-Positionierung wechselt von `e.lngLat` (Klickpunkt) auf `feature.geometry.coordinates`
(exakte Feature-Position) — eine bewusste, kleine Verhaltensänderung, die Tracking an das bei
der NAH-Migration bereits als „richtiger" bewertete Verhalten angleicht. Miss-Case ruft
`PopupManager.closePopup()` statt `this.popup.remove()`; `destroy()` ebenso.

## Testing

`showFeaturePopup`/`closePopup` bleiben — wie schon `NahMapLayers.handleStationClick` zuvor —
bewusst ohne automatisierten Test (ein echtes `maplibregl.Popup` braucht eine reale DOM-Umgebung,
die dieses Repo in Vitest nicht bereitstellt; gleiches Muster wie in
[docs/superpowers/plans/2026-07-06-nah-symbol-layer-migration.md](../plans/2026-07-06-nah-symbol-layer-migration.md)
begründet). Bestehende Tests (`NahMapLayers.findClickedStation`, `PopupManager.buildHtml`)
bleiben unverändert grün.

Manuelle Browser-Verifikation (Playwright, wie bei U5):

1. `/nah`: Popup A einer Station öffnen, direkt eine andere Station anklicken — Popup B muss
   sofort (nicht erst beim zweiten Klick) mit korrektem Inhalt erscheinen.
2. `/nah`: Klick auf freie Fläche bei offenem Popup schließt es und löst weiterhin die
   Incident-Berechnung aus.
3. `/tracking`: Klick auf ein ADS-B- und ein AIS-Feature zeigt weiterhin korrekten Popup-Inhalt;
   Positionswechsel auf Feature-Koordinate sichtbar (Popup sitzt exakt am Symbol); Klick auf
   leere Fläche setzt Highlight/Auswahl weiterhin korrekt zurück (`onSelect(null)`).
4. Konsolenfehler-frei in beiden Fällen.
