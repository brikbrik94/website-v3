# OE5ITH GeoPortal

Ein Geo-Webportal für den österreichischen Rettungsdienst-Kontext: interaktive Karten, Routing
mit Sondersignal-Unterstützung, Luftrettungs-Status, Koordinatenumrechnung und Live-Tracking von
Flugzeugen/Schiffen. Der Name (`oe5ith.at`) leitet sich vom Amateurfunk-Rufzeichenpräfix
**OE5** (Österreich, Region 5) ab.

Für KI-Coding-Agenten: die verbindlichen Arbeitsanweisungen stehen in [CLAUDE.md](./CLAUDE.md)
(repo-spezifisch) und [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) (generisch). Dieses
Dokument hier ist die produkt-/funktionsorientierte Übersicht für Menschen.

## Tech-Stack

Vanilla TypeScript + Vite (Frontend), dünner PHP-Backend-Proxy über eine PostGIS-Datenbank und
externe Dienste (OpenRouteService für Routing, Nominatim für Geocoding, ein Tile-Server für
Basiskarten/Overlays, ADS-B/AIS-Gateways für Live-Tracking). Details: [CLAUDE.md](./CLAUDE.md).

## Seiten & Funktionen

Jede Seite unten ist so beschrieben, dass sich daraus später Endnutzer-Hilfetexte ableiten lassen
(siehe [ROADMAP.md](./docs/ROADMAP.md) → „Hilfeseite"). Die Reihenfolge folgt der Topbar-Navigation.

### `/karte` — Karten-Viewer

Freies Erkunden der verfügbaren Kartenebenen: Basiskarte über die Topbar wechseln, Overlay-Layer
(z.B. Höhenlinien, Wanderwege) einzeln per Sidebar-Checkbox ein-/ausschalten. Kein spezifischer
Anwendungsfall über die reine Kartenansicht hinaus — Einstiegspunkt für alle anderen Kartenseiten.

*Technisch:* `src/pages/MapPage.ts`, Layer-Metadaten aus `layers.json`/Inventory-Service,
Basisinfrastruktur `src/lib/MapCore.ts`.

### `/routing` — Routenplanung mit Sondersignal-Unterstützung

Drei Modi, wählbar über Segmented-Buttons:

- **A→B:** Start-/Zielpunkt per Rechtsklick-Kontextmenü auf der Karte setzen, Route berechnen mit
  Fahrmodus **Normalfahrt** oder **Blaulichtfahrt** (Sondersignal). Ergebnis: Route auf der Karte,
  Dauer/Distanz, Maut-/Zufahrts-Warnhinweise und eine ausklappbare Turn-by-Turn-Wegbeschreibung.
- **SEW-Modus:** Einsatzort setzen — die App ermittelt automatisch die nächstgelegene(n)
  Rettungsdienst-Station(en) (Fahrzeit-basiert, nicht Luftlinie).
- **NEF-Modus:** Wie SEW, aber für Notarzt-Einsatzfahrzeuge/-Stationen.

*Technisch:* `src/pages/RoutingPage.ts`, `src/features/routing/`, Fahrzeitberechnung über die
ORS-Matrix-API (`api/stations.php`/`api/ors.php`).

### `/nah` — Luftrettung (Hubschrauber-Status)

Zeigt alle Luftrettungsstationen (Hubschrauber-Stützpunkte) auf der Karte mit
**Echtzeit-Betriebsstatus** (aktiv / außer Dienst / außer Saison) — serverseitig berechnet aus
Betriebszeiten und aktuellem Sonnenstand (Tageslicht-Stationen sind nur bei Helligkeit aktiv).
Klick auf einen beliebigen Punkt der Karte berechnet die nächstgelegenen **aktiven** Stationen zu
diesem Einsatzort (Flugpfad-Linien + Sidebar-Liste mit Distanz/Zeit). Stützpunkte mit mehreren
Hubschraubern am selben Standort (z.B. Christophorus 14/99) werden zu einem Marker mit
Anzahl-Badge zusammengefasst; die Icon-Farbe zeigt den besten Status aller dortigen Maschinen.

*Technisch:* `src/pages/NahPage.ts`, `src/features/nah/`, Statuslogik in `api/nah.php` und
`NahMapLayers.computeStationStatus()`/`computeGroupStatus()`.

### `/coords` — Koordinaten-Umrechner

Wandelt zwischen Koordinatenformaten um: WGS84 (Dezimalgrad, DMS, Grad-Dezimalminuten), UTM,
BMN (österreichisches Bundesmeldenetz), MGRS, Maidenhead-Locator und Google Plus Code — alle
Formate synchron, ein Klick auf das Himmelsrichtung-Suffix wechselt das Vorzeichen. Punkt per
Rechtsklick auf der Karte setzen oder eines der Formate direkt eintippen. Optionaler
Wanderwege-Overlay zuschaltbar.

*Technisch:* `src/pages/CoordsPage.ts`, `src/features/coords/`, Formatkonvertierung u.a. über
`proj4`, `mgrs`, `open-location-code`.

### `/tracking` — Live-Tracking (Flugzeuge & Schiffe)

Live-Kartenanzeige für ADS-B (Flugzeuge) und AIS (Schiffe) über einen WebSocket-Push-Backend,
inklusive Flugbahnen/Fahrspuren ("Tracks") der letzten Zeit. Filterbare Sidebar-Liste; Klick auf
ein Karten-Symbol oder einen Listeneintrag selektiert/hebt das jeweilige Ziel hervor.

*Technisch:* `src/features/tracking/TrackingPage.ts`, WebSocket-Verbindung in
`TrackingDataService.ts`, Backend-Proxies `api/adsb.php`/`api/ais.php`.

### `/info/*` — System-Status-Dashboard

Kein Endnutzer-Feature im engeren Sinn, sondern ein Monitoring-/Diagnose-Bereich mit mehreren
Untermodulen (Subpath wählt das Modul):

- **Health** — Live-Ping aller Backend-Dienste (PHP, DB, NAH, Tracking-Gateway, ORS, Geocoder,
  Tile-Registry)
- **Regions** — NAH-/RD-/NEF-Verfügbarkeit nach Bundesland/Organisation
- **Inventory** — Verzeichnis aller Karten-Layer/Sprites/Fonts
- **Tracking-Endpoints**, **NAH-Status**, **Debug**

*Technisch:* `src/pages/InfoPage.ts` + `src/components/info/`.

## Backend-API

Alle `api/*.php`-Endpoints sind als OpenAPI-3.x-Spec dokumentiert: [docs/openapi.yaml](./docs/openapi.yaml)
(Validierung: `npm run validate:openapi`).

## Entwicklung

Kurzreferenz — vollständige Details (Architektur, Standards, Release-Prozess) in [CLAUDE.md](./CLAUDE.md):

```bash
npm run dev         # Vite + PHP-Dev-Server parallel
npm run build        # Type-Check + Production-Build
npm test              # Vitest
npx tsc --noEmit      # nur Type-Check
composer run lint     # PSR-12-Check für api/*.php
bash scripts/security-audit.sh   # OWASP-Teilaudit
```

## Weiterführende Dokumentation

- [CHANGELOG.md](./docs/CHANGELOG.md) — technisches Änderungsprotokoll
- [ROADMAP.md](./docs/ROADMAP.md) / [TODO.md](./docs/TODO.md) — geplante Features / offene Aufgaben
- [docs/security/owasp-top10-checklist.md](./docs/security/owasp-top10-checklist.md) — Security-Self-Check
- [CLAUDE.md](./CLAUDE.md) — Architektur, Standards, Coding-Konventionen (primär für Coding-Agenten,
  aber auch als technische Referenz für Menschen geeignet)
