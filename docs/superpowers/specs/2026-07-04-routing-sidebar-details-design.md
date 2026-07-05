# Routing-Sidebar: Detailanzeige für A→B-Routen — Design

**Status:** Genehmigt · Umsetzung in zwei Phasen (CI-Abhängigkeit für Phase 2)
**Datum:** 2026-07-04

## Kontext

Anlass war ein Bugfix (`RoutingSidebarAdapter.clearAll` versteckte `#routing-details`
per Inline-Style statt CSS-Klasse, siehe `CHANGELOG.md` 2026-07-04 11:56) — die
A→B-Zusammenfassung (Distanz/Dauer) war dadurch nie sichtbar. Beim Verifizieren kam
die Anschlussfrage auf: ORS liefert bei einer Routenberechnung deutlich mehr Daten,
als aktuell angezeigt wird (live gegen den laufenden ORS-Server geprüft, Strecke
Linz→St. Pölten, `driving-car`):

| Feld | Bereits in Response? | Beispielwert |
|---|---|---|
| `summary.distance/duration` | immer | 125.36 km / 84 min |
| `segments[0].steps` (Turn-by-Turn) | immer, ohne Zusatzparameter | 18 Steps, z.B. „Head northeast on Untere Donauländer, B129" |
| `extras.tollways` | nur mit `extra_info: [...]` im Request | 92.8 % der Strecke mautpflichtig |
| `extras.roadaccessrestrictions` | nur mit `extra_info` | 100 % frei befahrbar |
| `extras.waytype` | nur mit `extra_info` | 94.9 % Hauptstraße |

Zusätzlich gibt es nur zwei ORS-Profile (`driving-car`, `driving-emergency` —
bestätigt via `/api/ors.php?path=status`), die im bestehenden Profil-Dropdown schon
wählbar sind. Für dieselbe Strecke liefert `driving-emergency` 65 statt 84 Minuten.

## Entscheidungen aus dem Brainstorming

1. **Fahrmodus-Badge** (Normalfahrt/Blaulichtfahrt) nur als Sidebar-Badge in der
   Zusammenfassungs-Box — kein Kartensymbol. Damit reicht FontAwesome
   (`fa-solid fa-car` / `fa-solid fa-truck-medical`, beide bereits Teil des
   installierten `@fortawesome/fontawesome-free`-Pakets) — **keine CI-Änderung
   nötig.**
2. **Turn-by-Turn-Anweisungen** eingeklappt, Klick zum Aufklappen.
3. **Straßentyp/Maut/Zufahrtsbeschränkung** nur als auffällige Warn-Badges
   (z.B. „⚠ Enthält Mautstraßen"), nicht als vollständige Prozent-Aufschlüsselung —
   nutzt die bereits vorhandenen `.badge`/`.badge-yellow`-Klassen (wie
   `renderRoutingLoading`/`renderRoutingError` in `RoutingSidebar.ts` das schon tun).
   **Keine CI-Änderung nötig.**
4. Scope nur A→B-Modus. SEW/NEF (Detailanzeige für hervorgehobene Einzelstation)
   ist eine spätere Erweiterung → `ROADMAP.md`.

## CI-Prüfung: was tatsächlich fehlt

`oe5ith-ci` hat bereits ein Accordion-Pattern (`.accordion`/`.acc-*`,
`docs/sidebar.md` „Accordion-Gruppen"), aber das ist speziell für
Layer-Toggle-Gruppen gebaut: Dot + Status-Badge + Checkbox-Liste +
„Alle an/aus"-Controls, `max-height`-Transition **JS-gesteuert** (`acc-body`
braucht `--acc-body-height` von `scrollHeight`, siehe `css/sidebar.css:145-153`).
Das passt nicht für eine einfache Text-Liste ohne Checkboxen/Controls/Status.

→ Für die Turn-by-Turn-Liste fehlt eine **generische, leichte
Single-Disclosure-Komponente** (Header klickbar, ein Body, kein Checkbox-State).
Das ist laut `oe5ith-ci/CLAUDE.md` Regel 2/3 ("Keine Custom-Component-Klassen,
erst bestehende Patterns prüfen") ein legitimer Fall für eine neue CI-Komponente,
kein Grund für Ad-hoc-CSS in website-v3.

Anfrage dazu: `oe5ith-ci/ci-routing-disclosure-request.md` (Format analog zur
bestehenden `ci-split-view-request.md`).

## Umsetzung — zwei Phasen

### Phase 1 (jetzt, keine CI-Abhängigkeit)

- `RoutingService.calculateRoute()`: neuer optionaler Parameter `extraInfo?: string[]`,
  hängt `extra_info` nur an, wenn übergeben. Nur der A→B-Aufruf in
  `RoutingSidebarAdapter.ts` übergibt `['waytype', 'tollways', 'roadaccessrestrictions']`;
  die SEW/NEF-Stationssuche (inkl. der parallelen `driving-emergency`-Detailrouten
  in `findNearestStations`) bleibt unverändert.
- `types/common.ts`: `RouteResult`/neuer `RouteFeatureProperties`-Typ um `summary`,
  `extras` erweitert (additiv).
- Neues Modul `src/features/routing/RoutingDetailsFormatter.ts`:
  - `getProfileBadge(profile: string): { icon: string; label: string }` —
    Mapping `driving-car`→Auto/"Normalfahrt", `driving-emergency`→
    Truck-medical/"Blaulichtfahrt", Fallback (generisches Icon + Rohprofilname)
    für unbekannte künftige Profile.
  - `getRouteWarnings(extras): { icon: string; label: string }[]` — nur Einträge,
    wenn Mautanteil > 0 % oder Zufahrtsbeschränkung ≠ 100 % frei; sonst leeres Array.
- `RoutingSidebar.ts`: `updateRoutingSummary()` um optionale Parameter `profile` und
  `extras` erweitert; rendert bei Angabe zusätzlich Fahrmodus-Badge (oberhalb der
  Distanz/Dauer-Kv-Liste) und Warn-Badges (darunter). Bestehende Aufrufe
  (`clearAll()` → `updateRoutingSummary(0, 0)`) bleiben unverändert gültig.
- `RoutingSidebarAdapter.ts`: A→B-Zweig übergibt `profile` und `extraInfo` durch.
- Tests: `RoutingDetailsFormatter.test.ts` (Profil-Mapping inkl. Fallback,
  Warn-Schwellenwerte 0 % vs. >0 %); `RoutingSidebarAdapter.test.ts` erweitert um
  den `extraInfo`-Request-Fall.
- `ROADMAP.md`: Eintrag für SEW/NEF-Erweiterung (Detailanzeige für hervorgehobene
  Einzelstation).
- `TODO.md`: Eintrag „Turn-by-Turn-Anzeige blockiert auf CI-Disclosure-Komponente"
  mit Verweis auf `oe5ith-ci/ci-routing-disclosure-request.md`.

### Phase 2 (nach CI-Erweiterung, separat)

- `formatSteps(segments)`-Helper + Rendering der Turn-by-Turn-Liste im neuen
  CI-Disclosure-Pattern, sobald `oe5ith-ci` es liefert. Nicht Teil dieser
  Implementierung.

## Testing

`npx tsc --noEmit && npm test` muss grün bleiben; neue Formatter-Funktionen sind
pure und ohne DOM testbar. Browser-Verifikation (Playwright gegen laufenden
Dev-Server) für Fahrmodus-Badge + Warn-Badges vor Abschluss, analog zum
vorherigen Bugfix.
