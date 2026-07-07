# Turn-by-Turn-Anzeige für A→B-Routen — Design

**Status:** Genehmigt
**Datum:** 2026-07-07

## Kontext

Phase 2 von [docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md](./2026-07-04-routing-sidebar-details-design.md)
(Phase 1 — Fahrmodus-Badge + Warn-Badges — ist seit v3.6.0 umgesetzt). Phase 2 war blockiert
auf einer generischen Single-Disclosure-Komponente im `oe5ith-ci`-Submodul
(Anfrage: `oe5ith-ci/ci-routing-disclosure-request.md`) — seit `oe5ith-ci` v1.19.0 (2026-07-06)
verfügbar (`css/disclosure.css`, `components/disclosure.html`).

Für die Turn-by-Turn-Liste braucht es zusätzlich pro Schritt ein Abbiege-Icon (Manöver-Symbol).
`oe5ith-ci` hatte dafür noch keine passenden Icons (FontAwesome deckt Slight/Sharp-Varianten,
Kreisverkehr und Gabelung-Halten nicht ausreichend ab) — der User hat diese am 2026-07-07 im
Submodul ergänzt: `oe5ith-ci` v1.20.0 (aktuell nur auf `origin/main`, Submodul-Pointer hier noch
nicht gehoben) liefert 14 `ci-maneuver-*`-SVGs + `assets/maneuver-icons/icons.json`
(ORS-Code-Mapping 0–13) + einen neuen `.disclosure-item-icon`-Slot in `disclosure.css`.

ORS liefert `segments[].steps[]` (Turn-by-Turn) standardmäßig ohne Zusatzparameter — live gegen
den laufenden ORS-Server verifiziert (Strecke Linz-Umgebung, `driving-car`, keine
`extra_info` im Request nötig). Format pro Step:

```json
{
  "distance": 176.2, "duration": 63.4, "type": 11,
  "instruction": "Head south on Hauptplatz", "name": "Hauptplatz",
  "way_points": [0, 10]
}
```

`type` ist der numerische ORS-Manöver-Code:

| Code | Manöver | Code | Manöver |
|---|---|---|---|
| 0 | Left | 7 | Enter roundabout |
| 1 | Right | 8 | Exit roundabout |
| 2 | Sharp left | 9 | U-turn |
| 3 | Sharp right | 10 | Goal |
| 4 | Slight left | 11 | Depart |
| 5 | Slight right | 12 | Keep left |
| 6 | Straight | 13 | Keep right |

## Entscheidungen aus dem Brainstorming

1. **Abbiege-Icon pro Schritt** (nicht nur Text + Distanz) — die neuen `ci-maneuver-*`-Icons
   aus `oe5ith-ci` v1.20.0 werden genutzt.
2. **Meta-Spalte pro Schritt zeigt nur Distanz** (z.B. `"280 m"`/`"1.2 km"`), keine Dauer —
   exakt wie im CI-Referenzbeispiel; Sekundenwerte pro Einzelschritt sind selten präzise genug,
   um hilfreich zu sein.
3. **Icon-Konsum: statisches TS-Modul mit inline-SVG-Markup**, nicht Laufzeit-Fetch von
   `icons.json`/einzelnen SVG-Dateien und nicht 14 einzelne `?raw`-Asset-Importe. Begründung:
   passt zum bereits etablierten CSS-Sync-Muster in diesem Repo (Submodul-Inhalt wird einmalig
   in ein projekteigenes Modul übernommen, siehe
   `docs/superpowers/specs/archive/2026-04-30-ci-style-sync-design.md`), keine Laufzeitkosten
   (kein async Icon-Laden nötig, kein Cache-Mechanismus wie bei Sprite-Sheets nötig), sofort als
   reine Funktion testbar.
4. Scope nur A→B-Modus (wie in Phase 1 festgelegt). SEW/NEF bleibt ROADMAP.

## Umsetzung

### 1. CI-Sync

- `oe5ith-ci`-Submodul-Pointer von aktuell gepinntem Commit auf `v1.20.0` heben.
- `oe5ith-ci/css/disclosure.css` → `src/styles/disclosure.css` kopieren (byteidentische Kopie,
  wie bei den bestehenden `src/styles/*.css`-Dateien).
- `src/app.css`: `@import "./styles/disclosure.css";` ergänzen (nach `badges.css`, da
  `disclosure.css` laut CI-Doku `common.css` + `badges.css` voraussetzt für `.disclosure-count`).

### 2. Neues Modul `src/lib/ManeuverIcons.ts`

```ts
export function getManeuverIconMarkup(orsCode: number): string
```

- Enthält die 14 SVG-Inhalte aus `oe5ith-ci/assets/maneuver-icons/*.svg` als
  `Record<number, string>` (ORS-Code → inneres `<path>`/`<circle>`-Markup, 1:1 aus den
  Submodul-Dateien übernommen).
- Wrappt das Markup zur Laufzeit in
  `<svg class="disclosure-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">…</svg>`
  (gemeinsamer Wrapper statt 14x dupliziert, spart Redundanz).
- Unbekannter Code (ORS könnte künftig neue Codes einführen) → Fallback auf den
  `ci-maneuver-straight`-Pfeil, analog zum Fallback-Muster in `getProfileBadge`
  (`RoutingDetailsFormatter.ts`).

### 3. Erweiterung `src/features/routing/RoutingDetailsFormatter.ts`

```ts
export interface FormattedStep {
  iconMarkup: string;
  text: string;
  meta: string;
}

export function formatSteps(segments: RouteSegment[] | undefined): FormattedStep[]
```

- Flacht `segments[].steps[]` ab (bei A→B immer genau 1 Segment; die Funktion bleibt generisch
  für mehrere, falls ORS/ein künftiger Use-Case mehr liefert).
- Pro Step: `iconMarkup` via `getManeuverIconMarkup(step.type)`, `text` = `step.instruction`
  unverändert, `meta` = formatierte Distanz.
- Neue private Hilfsfunktion für die Distanz-Formatierung: `< 1000 m` → `"${Math.round(m)} m"`,
  `≥ 1000 m` → `"${(m/1000).toFixed(1)} km"` (Grenzfall 1000 m exakt → `"1.0 km"`).

### 4. `types/common.ts` (additiv)

```ts
export interface RouteStep {
  distance: number;
  duration: number;
  type: number;
  instruction: string;
  name: string;
  way_points: [number, number];
}

export interface RouteSegment {
  distance: number;
  duration: number;
  steps: RouteStep[];
}
```

`RouteFeatureProperties` bekommt ein zusätzliches optionales Feld `segments?: RouteSegment[]`.

### 5. `RoutingSidebarAdapter.ts`

- Destrukturiert zusätzlich `segments` aus `route.features[0].properties` (kommt von ORS immer
  mit, unabhängig von `extra_info` und unabhängig vom Profil — live verifiziert, auch für
  `driving-emergency`) und reicht es an `updateRoutingSummary` durch.

### 6. `RoutingSidebar.ts`

- `updateRoutingSummary()` bekommt einen zusätzlichen optionalen Parameter
  `segments?: RouteSegment[]`, ruft intern `formatSteps(segments)` auf.
- Rendert bei vorhandenen Steps (`formattedSteps.length > 0`) zusätzlich einen
  `<details class="disclosure">`-Block **nach** `.result-list` (eigenständiger Block, nicht in
  das bestehende `.result-item.no-click` verschachtelt — die Disclosure hat ein eigenes
  klickbares Verhalten, das nicht mit dem `no-click`-Summary-Item vermischt werden soll):
  - `disclosure-header`: Titel „Wegbeschreibung", Count-Badge (`.badge.badge-gray`) mit
    `"${steps.length} Schritte"`, Chevron-Icon.
  - `disclosure-body`: ein `disclosure-item` pro Step (Icon-Markup + `disclosure-item-text` +
    `disclosure-item-meta mono` mit der Distanz).
  - **Eingeklappt per Default** (kein `open`-Attribut) — natives `<details>`-Verhalten, kein JS
    für Auf-/Zuklappen nötig.
- Wenn `formattedSteps.length === 0` (z.B. `clearAll()` → `updateRoutingSummary(0, 0)` ohne
  Segments): kein Disclosure-Block im Markup.

## Error Handling / Edge Cases

- Fehlende/leere `segments` → `formatSteps` liefert `[]`, kein Disclosure-Block im Markup (kein
  leeres/kaputtes Panel).
- Unbekannter ORS-`type`-Code → Fallback-Icon, kein Fehler/Absturz.
- SEW/NEF-Modus bleibt unberührt (Turn-by-Turn nur A→B).
- `driving-emergency`: `segments`/`steps` kommen unabhängig von `extra_info` immer mit — keine
  Profil-Sonderbehandlung nötig (anders als bei `extras`, die nur für `driving-car` mit
  `extra_info` angefragt werden, siehe Phase 1).

## Testing

- `ManeuverIcons.test.ts` (neu): alle 14 bekannten ORS-Codes liefern `<svg
  class="disclosure-item-icon"...>`-Markup mit erwartbarem Inhalt; unbekannter Code → Fallback
  (Straight-Icon).
- `RoutingDetailsFormatter.test.ts` (erweitert): `formatSteps` — `undefined`/leere Segments →
  `[]`; ein Segment mit mehreren Steps → korrekte Reihenfolge/Texte; Distanz-Formatierung an der
  1000-m-Grenze (999 m → `"999 m"`, 1000 m → `"1.0 km"`).
- `RoutingSidebar.test.ts` (erweitert, gleiches String-Matching-Muster wie die bestehenden
  Badge-Tests): Disclosure-Block erscheint nur bei vorhandenen Steps, zeigt korrekten
  Count-Badge-Text, Icon+Text+Distanz pro Step, kein Disclosure-Block wenn Steps leer/fehlend.
- `RoutingSidebarAdapter.test.ts` (erweitert): `segments` wird aus der Response durchgereicht.
- `npx tsc --noEmit && npm test` muss grün bleiben. Danach Live-Verifikation (Playwright gegen
  laufenden Dev-Server): A→B-Route berechnen, Disclosure auf-/zuklappen, Icons visuell prüfen.

## Out of Scope

- SEW/NEF-Detailanzeige (bereits als ROADMAP-Punkt vermerkt, Phase 1).
- Exit-Nummern bei Kreisverkehr-Icons (Icons zeigen bewusst nur rein/raus, keine
  Zahlen-Overlays — laut `oe5ith-ci/docs/maneuver-icons.md`).
- Live-Nachführung „aktueller Schritt" während der Fahrt — reine statische Anzeige nach
  Routenberechnung.
