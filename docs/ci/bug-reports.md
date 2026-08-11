# CI-Bugs — Sammeldatei

Gefundene Bugs im `oe5ith-ci`-Design-System, entdeckt beim Arbeiten in `website-v3`.
**website-v3 fixt diese Bugs nicht selbst im Submodul** — das Repo wird extern mit eigenem
Review-/Check-Prozess gepflegt. Diese Datei dokumentiert Funde für die Übernahme dort; sie liegt
als normale, committete Datei in diesem Repo (`docs/ci/bug-reports.md`), analog zu den
`docs/ci/*-request.md`-Dateien für Feature-Anfragen und `docs/ci/handoff-*.md` für Handoffs
(vollständig abgeschlossene Request-/Handoff-Dateien wandern nach `docs/ci/archive/`, diese
Sammeldatei selbst bleibt dauerhaft hier, auch wenn — wie aktuell — beide Einträge unten bereits
behoben sind).

**Aktueller Stand: 1 offener Bug** (Punkt 3, Farbkontrast `.topbar-search-btn`). Punkte 1 und 2
sind behoben. Siehe `docs/ci/open-items.md` für die Gesamtübersicht.

---

## 1. Modal-Backdrop wird von der Topbar überdeckt (Stacking-Context)

**Status:** ✅ Behoben in `oe5ith-ci` v1.18.1 (2026-07-06, Commit `558f531`) —
`.modal-backdrop` nutzt jetzt `z-index: var(--z-modal)`, exakt wie unten vorgeschlagen.
Submodul-Pointer in website-v3 aktualisiert (2026-07-06).
**Gemeldet von:** website-v3 (Changelog-/Copyright-Modal, `src/lib/GlobalModals.ts`)
**Datum:** 2026-07-05

### Symptom

Modals, die über `.modal-backdrop`/`.modal` gerendert werden (z.B. das Changelog- oder
Copyright-Modal in website-v3), werden am oberen Rand von der Topbar überdeckt, wenn die
Seite eine `.topbar` mit `position: sticky` hat. Auf Kartenseiten (Topbar immer vorhanden)
sichtbar; der obere Streifen des Modals liegt optisch *hinter* der Topbar statt davor.

### Root Cause

`css/modal.css`:

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-backdrop);   /* 1040 */
  ...
}
.modal {
  ...
  z-index: var(--z-modal);      /* 1500 */
}
```

`.topbar` (`css/topbar.css`) hat `position: sticky; z-index: var(--z-topbar)` (1100).

`--z-backdrop` (1040) liegt **unter** `--z-topbar` (1100). Da `position: fixed` in Kombination
mit einem gesetzten `z-index` (≠ `auto`) einen **eigenen Stacking-Context** erzeugt, wird der
gesamte Inhalt von `.modal-backdrop` — inklusive des Kind-Elements `.modal` mit seinem
nominell höheren `z-index: var(--z-modal)` (1500) — als Einheit auf der Stacking-Ebene 1040
einsortiert. `.modal`s `z-index:1500` wirkt nur *innerhalb* des Stacking-Contexts von
`.modal-backdrop`, nicht relativ zu Geschwister-Stacking-Contexts außerhalb (wie `.topbar`).
Ergebnis: `.modal-backdrop` (und damit `.modal`) rendert unter der Topbar, unabhängig vom
`z-index`-Wert von `.modal` selbst.

Betroffene Tokens: `common.css:137` (`--z-backdrop: 1040`), `:140` (`--z-topbar: 1100`),
`:143` (`--z-modal: 1500`).

### Reproduktion (in website-v3 mit Playwright verifiziert)

1. Eine Seite mit Topbar öffnen (z.B. `/routing`).
2. Ein Modal öffnen (in website-v3: `window.dispatchEvent(new CustomEvent('open-changelog'))`).
3. `document.elementFromPoint(x, y)` am geometrischen Überlappungspunkt von `.topbar` und
   `.modal` aufrufen (z.B. `x` = horizontale Mitte des Modals, `y` = vertikale Mitte der Topbar).
4. **Vor dem Fix:** liefert ein Topbar-Kind-Element (z.B. einen Topbar-Button), nicht das Modal
   — Beweis, dass die Topbar visuell über dem Modal liegt.
5. **Nach dem Fix (siehe unten):** liefert `.modal-backdrop`.

### Fix — lokal in website-v3 bereits validiert

In `src/styles/modal.css` (website-v3-eigene Kopie) geändert:

```css
.modal-backdrop {
  ...
  z-index: var(--z-modal);   /* statt var(--z-backdrop) */
}
```

Die anderen `--z-backdrop`-Verwendungen im Repo (`sidebar-backdrop` für den mobilen
Sidebar-Drawer, `controls-backdrop` für das Topbar-Mobile-Menü) bleiben unverändert — die
sollen bewusst *unter* der Topbar bleiben (z.B. `sidebar-backdrop` startet mit
`inset: var(--topbar-height) 0 0 0`, damit die Topbar bei geöffnetem Drawer sichtbar bleibt).
`--z-backdrop` selbst also **nicht** global ändern — nur `.modal-backdrop` bekommt direkt
`var(--z-modal)` statt `var(--z-backdrop)`.

Live per Playwright verifiziert: Überlappungspunkt zeigt danach `.modal-backdrop`, mobiles
Sidebar-Backdrop bleibt weiterhin korrekt unter der Topbar (keine Regression durch den
unveränderten `--z-backdrop`-Wert).

### Auswirkung auf andere Portale

Jedes Portal, das `css/modal.css` zusammen mit einer stickyen `.topbar` verwendet, ist
vermutlich betroffen — der Bug liegt in den geteilten Tokens/der geteilten Modal-Komponente,
nicht in website-v3-spezifischem Code.

### Vorschlag für `oe5ith-ci`

- `.modal-backdrop`s `z-index` von `var(--z-backdrop)` auf `var(--z-modal)` ändern (analog zum
  website-v3-Fix), **oder** alternativ einen dedizierten Token einführen, falls Backdrop und
  Modal aus Design-System-Sicht unterschiedliche Werte brauchen sollen (z.B. für künftige
  gestapelte Modals). `--z-backdrop` selbst nicht anheben — wird von `sidebar-backdrop`/
  `controls-backdrop`-artigen Patterns bewusst unter der Topbar erwartet.
- `components/modal.html` (Referenzseite) um ein Beispiel mit sichtbarer `.topbar` ergänzen,
  damit dieser Stacking-Bug bei künftigen Änderungen visuell auffällt.

---

## 2. `.badge` erzwingt `white-space: nowrap`, kein interner Umbruch bei langen Texten

**Status:** ✅ Behoben in `oe5ith-ci` v1.21.0 (2026-07-18, Commit `cf8b22e`) — neues Modifier
`.badge-wrap` (`white-space: normal; overflow-wrap: break-word`), Default `nowrap` für kurze
Status-Badges bleibt unverändert. In website-v3 konsumiert: `src/styles/badges.css` (Klasse
gesynct), `src/components/RoutingSidebar.ts` (Warn-Badges nutzen jetzt `badge-wrap` statt
lokalem Container-Override), lokaler Override in `src/styles/sidebar.css` entfernt. Submodul-
Pointer aktualisiert (2026-07-18).
**Gemeldet von:** website-v3 (Routing-Sidebar, `src/components/RoutingSidebar.ts`,
Warn-Badges wie „Zufahrtsbeschränkungen auf der Strecke")
**Datum:** 2026-07-07

### Symptom

Ein einzelnes Badge mit langem Text (z.B. ein Warn-Badge in der Routing-Zusammenfassung) wird
am rechten Rand seines Containers abgeschnitten statt intern umzubrechen, wenn der Text breiter
als der verfügbare Platz ist (z.B. schmale Sidebar). Der umgebende Container (`.result-badges`
in website-v3) hat zwar `flex-wrap: wrap` für mehrere Badges nebeneinander, aber ein einzelnes,
zu breites Flex-Item bricht dadurch nicht intern um.

### Root Cause

`css/badges.css`:

```css
.badge {
  display: inline-flex;
  ...
  white-space: nowrap;
  ...
}
```

`white-space: nowrap` auf `.badge` selbst verhindert jeden Zeilenumbruch innerhalb des
Badge-Texts, unabhängig davon, wie der umgebende Container mit Überlauf umgeht
(`flex-wrap` wirkt nur zwischen Flex-Items, nicht innerhalb eines einzelnen Items).

### Reproduktion

1. Eine Route mit einem langen Warn-Text berechnen (in website-v3: `/routing`, A→B-Route mit
   Zufahrtsbeschränkung, z.B. Text „Zufahrtsbeschränkungen auf der Strecke").
2. Sidebar auf normaler/schmaler Breite betrachten.
3. **Vor dem Fix:** Badge-Text läuft über den rechten Sidebar-Rand hinaus / wird abgeschnitten,
   statt in einer zweiten Zeile innerhalb des Badges weiterzulaufen.

### Fix — lokal in website-v3 umgesetzt

In `src/styles/sidebar.css` (website-v3-eigene Datei, kein Submodul-Fix) ergänzt:

```css
.result-badges .badge {
  white-space: normal;
}
```

Scoped auf den Routing-/Stationslisten-Kontext (`.result-badges`); andere `.badge`-Nutzungen
im Repo (z.B. kurze Status-Badges in NAH/Tracking-Popups) bleiben von diesem Override
unberührt, da sie ohnehin nie so breit werden.

### Vorschlag für `oe5ith-ci`

- Prüfen, ob `.badge` generell auf `white-space: normal` (oder `overflow-wrap: break-word`)
  umgestellt werden sollte, oder ob `nowrap` bewusst gewählt wurde (z.B. für kurze, einzeilige
  Status-Badges wie „Online"/„v1.4.2", wo ein Umbruch unerwünscht wäre). Falls bewusst: evtl.
  eine zweite Variante (`.badge-wrap` o.ä.) für Badges mit potenziell langem, variablem Text
  (Warnungen, Freitext) im Design-System ergänzen, statt dass jedes Portal einzeln overridet.

---

## 3. `.topbar-search-btn` hat unzureichenden Farbkontrast (~2,06:1 statt min. 3:1)

**Status:** 🔴 Offen
**Gemeldet von:** website-v3 (Performance-Baseline-Audit, `npm run perf:audit` /
`lighthouse`-`color-contrast`-Audit, schlägt global auf allen 6 Kartenseiten fehl — Details:
`docs/performance/2026-07-28-baseline-audit.md`, Befund 1)
**Datum:** 2026-08-11

### Symptom

Der Suchfeld-Icon-Button in der Topbar (`.topbar-search-btn`) hat einen Text-/Icon-Kontrast von
nur ~2,06:1 gegenüber seinem Hintergrund — deutlich unter dem WCAG-2.1-AA-Minimum für
UI-Komponenten/Grafiken (3:1). Lighthouses `color-contrast`-Audit markiert das global auf jeder
Seite mit sichtbarer Topbar als fehlgeschlagen.

### Root Cause

`css/topbar.css`:

```css
.topbar-search-btn {
  ...
  color: #555;
  ...
}
```

gegen den Topbar-Hintergrund `background: var(--card-bg)` (`css/common.css`: `--card-bg: #252525`).
Kontrastberechnung (WCAG-Relativluminanz-Formel) für `#555555` auf `#252525`: **≈2,06:1** — sowohl
unter der 3:1-Schwelle für UI-Komponenten als auch weit unter der 4,5:1-Schwelle für Text.

`css/topbar.css` (website-v3-seitig unter `src/styles/topbar.css` 1:1 gesynct, `diff` zeigt nur
eine unabhängige, unrelated Zeile Unterschied) enthält an mehreren Stellen hardcodierte Hex-Werte
statt CI-Tokens (`var(--...)`) — das widerspricht `oe5ith-ci/docs/for-coding-agents.md`s eigener
Regel „Keine Werte hardcoden". `.topbar-search-btn`s `color: #555` ist ein konkretes Beispiel
dafür; andere geprüfte Farbpaare in derselben Datei (z.B. `.topbar-dropdown-toggle` `#d1d5db` auf
`#2a2a2a` ≈9,7:1) sind unauffällig — dies ist kein pauschales `topbar.css`-Problem, sondern
punktuell an dieser einen Stelle.

### Reproduktion

1. Eine beliebige Kartenseite öffnen (z.B. `/karte`), Topbar-Suchfeld-Icon-Button betrachten.
2. Lighthouse-Accessibility-Audit fahren (oder `npm run perf:audit` in diesem Repo) —
   `color-contrast` schlägt fehl, `.topbar-search-btn` als betroffenes Element gelistet.

### Warum nicht lokal in website-v3 gefixt

`src/styles/topbar.css` ist eine reine, synchronisierte Kopie von `oe5ith-ci/css/topbar.css`
(Kommentar-Header „Extrahiert aus components/topbar.html"). Ein lokaler Override würde bei
nächstem Re-Sync wieder verworfen bzw. driften — analog zur `oe5ith-ci`-Submodul-Konvention
dieses Repos (Bugs im Design-System werden dokumentiert, nicht lokal umgangen).

### Vorschlag für `oe5ith-ci`

- `.topbar-search-btn`s `color: #555` auf einen Token mit ausreichendem Kontrast gegen `--card-bg`
  umstellen (z.B. `var(--text-muted)`, falls vorhanden und kontraststark genug — sonst neuen Token
  einführen). Gleichzeitig prüfen, ob dieselbe Stelle (oder andere Buttons mit demselben Muster)
  auch von der oben genannten „keine Hardcoded-Werte"-Regel abweicht.
