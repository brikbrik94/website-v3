# Projekt TODOs

Aufgaben im **aktuellen Scope**: Fixes, Cleanup, Erweiterungen an bereits bestehendem Code/Features.
Neue, noch nicht existierende Features/Funktionen gehören in [ROADMAP.md](./ROADMAP.md), nicht hierher.
Abgeschlossene Aufgaben wandern ins [TODO_ARCHIVE.md](./TODO_ARCHIVE.md).

## Map-Subsystem: Anschlussfeatures

Von ROADMAP.md hierher verschoben (2026-07-09) — Erweiterungen an bereits bestehenden Komponenten
(`MapLegend`, `RoutingPage`-Kontextmenü, `NahMapLayers`), keine komplett neuen Features, daher im
Zweifel hier statt in der Roadmap (siehe `AGENT_INSTRUCTIONS.md` §3). Die Legende ist bewusst in
Einzelschritte zerlegt statt als ein großer Punkt — Machbarkeits-Check (2026-07-09) hat gezeigt,
dass `MapRegistry` aktuell keinerlei Legenden-Semantik kennt (nur rohe MapLibre-Layer-Definitionen,
kein Label, keine Zuordnung Layer→Legenden-Zeile) und `/karte` mit ihren dynamisch aus
`layers.json`/Overlay-Style-JSONs geladenen Layer-Gruppen der komplexeste Fall ist. Reihenfolge:
zuerst Infrastruktur + `/karte` als Machbarkeitsnachweis, danach erst die übrigen Seiten — nicht
alle vier auf einmal anfassen.

- [x] **Schritt 1: MapLegend interaktiv + Registry-Metadata** (2026-07-09) — ✅ ERLEDIGT
  `MapLegend.addEntry()`-Einträge sind jetzt klickbar (×-Button zum Ausblenden). Neuer Farb-Resolver
  für MapLibre-Paint-Expressions (`resolveLegendSwatch()` + `swatchTypeForLayerType()` in
  `src/lib/resolveLegendSwatch.ts`), mit „?"-Fallback für nicht aufgelöste Farben. Bewusst
  **keine** `MapRegistry`-Legend-Metadata-Abstraktion gebaut (Entscheidung 4 im Spec-Doc) —
  `MapRegistry.ts` selbst wurde nicht angefasst. Reine Infrastruktur, dokumentiert in
  [docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md](./docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md).
  129 Tests grün, 0 TypeScript-Fehler.
- [x] **Schritt 2: Anwendung auf `/karte`** (2026-07-09, Nachbesserung nach Live-Test 2026-07-09) —
  ✅ ERLEDIGT. Legende auf `/karte` zeigt nur aktive Layer (Sidebar-Accordion → Legende automatisch
  bei Ein-/Ausschalten). Klick auf „×" in der Legende löst einen echten `.click()` auf das
  zugehörige Accordion-Item aus (derselbe bestehende Toggle-Pfad, keine zweite Implementierung) —
  die Legende kann Layer nur ausblenden, nicht einschalten, das bleibt Sache der Sidebar. **Nach
  Live-Test durch den Nutzer (echte Overlays: Autobahnen, OpenSkiMap, Contours) drei reale Lücken
  gefunden und behoben** (Details: CHANGELOG.md, 2026-07-09 22:57) — u.a. fehlten für alle
  `layers.json`-kuratierten Overlays (14 Stück) komplett die Legenden-Einträge, da deren
  `template`-Feld keine echten MapLibre-Typen enthält; behoben durch bedarfsweises Nachladen des
  echten `style.json` (gecacht) für die Farbauflösung, `layers.json` bleibt weiter für die
  Gruppierung zuständig. Spec-Abdeckung: alle 7 Entscheidungen umgesetzt. Alle Fixes gegen echte,
  live abgerufene Overlay-Style-Daten verifiziert (nicht nur synthetische Testfälle). 133 Tests
  grün, 0 TypeScript-Fehler.
  **Hinweis: vollständige interaktive Browser-Verifikation weiterhin ausstehend** (keine
  Playwright/Headless-Browser in dieser Umgebung) — die drei jetzt behobenen Lücken wurden vom
  Nutzer manuell im Browser gefunden; ein erneuter Durchlauf nach diesem Fix steht noch aus.
- [ ] **Schritt 3: Anwendung auf `/nah`** — migriert die 5 bestehenden, hardcodierten
  `legend.addEntry()`-Aufrufe (`NahPage.ts:39-43`) auf das neue System. Sonderfall: der
  Stationen-Symbol-Layer hat eine `match`-Expression auf `status` (`NahMapLayers.ts:209-215`) —
  **ein** Layer wird zu **drei** Legenden-Zeilen (Einsatzbereit/Außer Dienst/Außer Saison), das
  Metadata-Format aus Schritt 1 muss mehrere Label/Farbe-Paare pro Layer-ID abbilden können.
- [ ] **Schritt 4: Anwendung auf `/routing`** — `RoutingPage.ts` instanziiert `MapLegend` aktuell
  nur für den Topbar-Toggle-Button, befüllt sie nie.
- [ ] **Schritt 5: Anwendung auf `/tracking`** — hat aktuell noch gar keine `MapLegend`-Instanz,
  muss zuerst ergänzt werden (`LayoutHelper.renderBaseLayout(..., { withLegend: true })` fehlt in
  `TrackingPage.ts`).
- [ ] **Karten-Klick + Overlay-Infos seitenübergreifend** — Klick-auf-Feature-Popups gibt es aktuell
  nur auf der Tracking-Seite (`PopupManager` dort verdrahtet). Ziel: generisches Klick-Handling für
  alle Overlay-Layer (NAH, RD/NEF, Contours/Hiking) mit Popup-Infos, nicht Tracking-spezifisch.
- [ ] **Routing-Kontextmenü: Touchsteuerung** — Das Zielwahl-Kontextmenü in `RoutingPage.ts:76`
  reagiert nur auf Rechtsklick (Desktop). Ziel: Long-Press-Geste als Touch-Äquivalent für
  Tablet/Smartphone. Menüstruktur/Tastaturbedienung am ARIA-APG-Menu-Pattern orientieren (siehe
  CLAUDE.md → Standards-Referenzen, Accessibility).
- [ ] **NAH: Betreiber-spezifische Icons** — Im Sprite-Set `oe5ith-markers` liegen bereits 9
  Betreiber-Logos (`nah-adac-luftrettung`, `nah-oeamtc-flugrettung`, `nah-drf-luftrettung`, …),
  aktuell ungenutzt. Ziel: NAH-Stationsmarker zeigen das Icon ihres Betreibers statt eines
  generischen Symbols. Braucht (a) ein neues `operator`-Feld in `NahStation`/`api/nah.php`
  (aktuell nur `name`/`callsign` vorhanden, keine Zuordnung zu den Sprite-Keys), und (b) eine
  separate Lösung für die Status-Anzeige (grün/rot/grau), da diese Sprites nicht-SDF sind und
  sich nicht per `icon-color` einfärben lassen (z.B. zusätzlicher Status-Dot-Layer neben dem
  Betreiber-Icon). Bewusst aus der U5-Migration
  ([docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md](./docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md))
  herausgehalten, die auf ein generisches Status-Icon setzt.

## Sonstiges

- [ ] **DOM-Testumgebung (jsdom/happy-dom) einrichten** — `src/lib/GeocoderSearchField.ts`
  (2026-07-09, ROADMAP.md → Karten-Interaktion & Such-Features) manipuliert echtes DOM
  (querySelector/addEventListener/innerHTML) und hat deshalb keinen automatisierten Test; das
  Projekt hat aktuell keine DOM-Testumgebung (bestehende DOM-nahe Tests wie
  `RoutingSidebarAdapter.test.ts` nutzen handgebaute Fake-Elemente statt echtem DOM). Ziel:
  `jsdom` oder `happy-dom` als Dev-Dependency + Vitest-Environment-Konfiguration ergänzen, danach
  Test für `GeocoderSearchField` (Debounce, `suppressWhen`, `onSelect`, Outside-Click-Dismiss)
  nachziehen.

Siehe [TODO_ARCHIVE.md](./TODO_ARCHIVE.md) für den zuletzt abgearbeiteten Stand (2026-07-09).
Bekannte, aber außerhalb dieses Repos liegende Probleme stehen in
[docs/external-blockers.md](./docs/external-blockers.md).
