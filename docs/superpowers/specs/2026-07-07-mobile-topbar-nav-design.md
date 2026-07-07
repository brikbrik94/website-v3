# Mobile-Topbar: Quicklinks durch „Mehr"-Dropdown ersetzen — Design

**Status:** Genehmigt
**Datum:** 2026-07-07

## Kontext

TODO.md-Punkt aus dem UI/UX & Branding-Sammeltask (übernommen aus `docs/proposals/todo.txt`,
2026-07-05): „Mobilansicht: Quicklinks in der Topbar durch das Dropdown ersetzen." Ursprüngliche
Vermutung im TODO-Text: „Auf schmalen Viewports aktuell vermutlich beides parallel
sichtbar/beengt".

Recherche + Live-Verifikation (Playwright, 375px Viewport, `/nah`) ergab eine andere
Ist-Situation als vermutet:

- `oe5ith-ci/css/topbar.css` (1:1 nach `src/styles/topbar.css` synchronisiert) blendet auf Mobile
  (`@media (max-width: 768px)`) sowohl `.topbar-nav-link` als auch `.topbar-nav-dropdown` per
  `!important` komplett aus (Zeilen 659-663).
- `src/app.css` holt gezielt nur die zwei Links mit der Zusatzklasse `.topbar-nav-link--mobile`
  (Routing, Luftrettung) per eigenem Override zurück:
  ```css
  @media (max-width: 768px) {
    .topbar-nav-link--mobile {
      display: flex !important;
      font-size: 0.75rem;
      padding: 4px 8px;
    }
  }
  ```
- Das „Mehr"-Dropdown (`.topbar-nav-dropdown`, enthält Karte/Umrechner/Tracking) hat **keinen**
  entsprechenden Override und bleibt auf Mobile unsichtbar.

**Tatsächlicher Ist-Zustand:** Auf Mobile sind **Karte, Umrechner und Tracking über die Topbar
nicht erreichbar** — kein „beengt", sondern eine echte Reachability-Lücke. Live bestätigt
(Screenshot `/nah` bei 375px: nur „Routing"/„Luftrettung" sichtbar, kein „Mehr"-Trigger).

Betroffen sind zwei Stellen mit strukturell identischer, aber unabhängig kopierter Nav-Markup:
`src/components/Topbar.ts` (Kartenseiten, Zeilen 100-112) und `src/main.ts` (Landing-Page,
Zeilen 37-49) — die Landing-Page nutzt `Topbar.ts` nicht, sondern hat ihre eigene Kopie derselben
Struktur.

## Entscheidung aus dem Brainstorming

Alle 5 Ziele (Routing, Luftrettung, Karte, Umrechner, Tracking) werden auf Mobile ins bestehende
„Mehr"-Dropdown zusammengeführt — die zwei Quicklinks verschwinden dort als eigenständige Links.
Auf Desktop/Tablet bleibt alles wie bisher (2 Quicklinks + 3er-Dropdown).

**Mechanismus: CSS-only, keine neue JS-Logik.** Die zwei Quicklink-Einträge (Routing,
Luftrettung) werden zusätzlich als Menüpunkte ins bestehende `#nav-dropdown-menu`-Markup
aufgenommen (mit einer neuen Modifier-Klasse `.topbar-nav-dropdown-item--mobile-only`), die per
Default (Desktop/Tablet) ausgeblendet ist und nur ab `max-width: 768px` sichtbar wird. Umgekehrt
entfällt der bestehende `.topbar-nav-link--mobile`-Force-Show-Override in `src/app.css`
ersatzlos — dadurch greift für Routing/Luftrettung wieder der CI-Standard (`.topbar-nav-link`
auf Mobile ausgeblendet), identisch zum bisherigen Verhalten von Karte/Umrechner/Tracking. Das
„Mehr"-Dropdown selbst (`.topbar-nav-dropdown`) bekommt einen neuen, gezielten Mobile-Override in
`src/app.css` (gleiches Override-Muster wie das bisherige, nur umgekehrte Richtung), der es auf
Mobile wieder sichtbar macht.

**Warum CSS-only statt Viewport-Check in JS:** Kein Resize-Handling nötig (Rotation/Fenstergröße
ändern sich korrekt automatisch), bestehende Dropdown-Open/Close-Logik (`Topbar.ts`) und der
globale Router-Klick-Handler für `.nav-link` funktionieren unverändert weiter — nur
Sichtbarkeit einzelner Einträge ändert sich per Media Query, keine neue Event-Bindung nötig.

**Reihenfolge im mobilen „Mehr"-Menü:** Routing, Luftrettung, Karte, Umrechner, Tracking (bisherige
Quicklink-Priorität zuerst, dann die bereits bestehenden Dropdown-Einträge in unveränderter
Reihenfolge).

**Nicht Teil dieser Änderung:** Die Duplikation der Topbar-Nav-Struktur zwischen `Topbar.ts` und
`main.ts` wird nicht aufgelöst (separates, größeres Refactoring) — beide Stellen bekommen
denselben Fix unabhängig appliziert, die Duplikation wird nur als Fund dokumentiert (neuer
TODO.md-Punkt).

## Umsetzung

### 1. `src/components/Topbar.ts` — zwei mobile-only Einträge im Dropdown ergänzen

Im bestehenden `#nav-dropdown-menu`-Block (aktuell Zeilen 107-111), vor den drei bestehenden
Einträgen, zwei neue Einträge einfügen:

```html
<a href="/routing" class="topbar-nav-dropdown-item topbar-nav-dropdown-item--mobile-only nav-link ${currentPath === '/routing' ? 'active' : ''}" role="menuitem">Routing</a>
<a href="/nah" class="topbar-nav-dropdown-item topbar-nav-dropdown-item--mobile-only nav-link ${currentPath === '/nah' ? 'active' : ''}" role="menuitem">Luftrettung</a>
```

Die bestehenden zwei Quicklink-`<a>`-Elemente (aktuell Zeilen 100-101, mit
`.topbar-nav-link--mobile`) verlieren die jetzt überflüssige `topbar-nav-link--mobile`-Klasse
(bleiben als reine `.topbar-nav-link nav-link`-Elemente bestehen — auf Desktop/Tablet weiterhin
sichtbar wie bisher, auf Mobile jetzt wieder per CI-Standard ausgeblendet).

### 2. `src/main.ts` — identischer Fix in der Landing-Page-eigenen Kopie

Gleiche Änderung wie Punkt 1, in der strukturell identischen (aber unabhängigen)
Nav-Markup-Stelle in `src/main.ts` (Zeilen 37-49).

### 3. `src/app.css` — Overrides tauschen

Den bestehenden Block

```css
@media (max-width: 768px) {
  .topbar-nav-link--mobile {
    display: flex !important;
    font-size: 0.75rem;
    padding: 4px 8px;
  }
}
```

ersatzlos entfernen (Klasse wird nach Punkt 1/2 nirgends mehr verwendet), und stattdessen
ergänzen:

```css
/* Mobile: "Mehr"-Dropdown zeigt alle 5 Nav-Ziele statt nur Karte/Umrechner/Tracking */
@media (max-width: 768px) {
  .topbar-nav-dropdown {
    display: block !important;
  }

  .topbar-nav-dropdown-item--mobile-only {
    display: flex;
  }
}

/* Desktop/Tablet: die zwei zusätzlichen Mobile-Einträge im Dropdown ausblenden
   (dort bleiben Routing/Luftrettung als eigenständige Quicklinks, wie bisher) */
.topbar-nav-dropdown-item--mobile-only {
  display: none;
}
```

`display: block !important` für `.topbar-nav-dropdown` (nicht `flex`) deckt sich mit dem
CI-eigenen Basis-Rule (`.topbar-nav-dropdown { position: relative; }`, kein `display`-Wert
gesetzt — der Browser-Default für ein `<div>` ist `block`, das reicht hier, da der Dropdown
selbst nur ein Positionierungs-Wrapper ist, nicht selbst ein Flex-Container).

### 4. `TODO.md` — Duplikations-Fund dokumentieren

Neuer Punkt im UI/UX & Branding-Sammeltask: Topbar-Nav-Markup ist zwischen `Topbar.ts` und
`main.ts` dupliziert (separates Refactoring-Thema, nicht Teil dieser Änderung).

## Error Handling / Edge Cases

- Tablet (769–1024px) bleibt unverändert: Quicklinks + Dropdown (nur 3 Einträge) wie bisher,
  da die neuen Overrides ausschließlich unter `max-width: 768px` greifen.
- Größenänderung des Fensters/Rotation: kein JS-Zustand zu invalidieren, da alles rein CSS-basiert
  ist — funktioniert automatisch korrekt bei jeder Breite.
- Bestehende Dropdown-Open/Close-Logik (`Topbar.ts:243-280`) bleibt unverändert und funktioniert
  identisch für die neuen Einträge, da sie exakt dieselbe Klasse (`.topbar-nav-dropdown-item`)
  und denselben Elternknoten (`#nav-dropdown-menu`) nutzen wie die bestehenden drei.

## Testing

Kein automatisierter Test nötig (reines Markup/CSS, kein neues JS-Verhalten). Verifikation
erfolgt visuell (Playwright, mobiler Viewport 375px):

- `/nah` (Kartenseite, nutzt `Topbar.ts`) und `/` (Landing-Page, nutzt `main.ts`): „Mehr"-Trigger
  ist sichtbar, Routing/Luftrettung sind **nicht** mehr als eigenständige Links sichtbar.
- „Mehr" antippen: Menü zeigt alle 5 Einträge in der Reihenfolge Routing, Luftrettung, Karte,
  Umrechner, Tracking.
- Tablet-Viewport (z.B. 900px) und Desktop-Viewport: unverändertes Verhalten (2 Quicklinks + 3er-
  Dropdown) — Regressionstest.
- `npx tsc --noEmit && npm test` bleibt grün (keine TS-/Test-Änderung erwartet).

## Out of Scope

- Dedupe der Topbar-Nav-Struktur zwischen `Topbar.ts` und `main.ts` — wird nur als eigener
  TODO.md-Punkt dokumentiert.
- Keine visuelle/stilistische Änderung am „Mehr"-Dropdown selbst (Breite, Position) über das
  Nötige hinaus.
