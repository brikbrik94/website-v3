# Routing-Zusammenfassung: Fahrmodus-Icon & Warnungen neu anordnen — Design

**Status:** Genehmigt
**Datum:** 2026-07-05

## Kontext

`2026-07-04-routing-sidebar-details-design.md` (Phase 1) hat Fahrmodus- und Warn-Badges
in die Routing-Zusammenfassungs-Box eingebaut. Nach dem Testen im Browser: die Anordnung
wirkt unaufgeräumt.

- Das Fahrmodus-Badge (`badge-blue`, Icon + Text „Normalfahrt"/„Blaulichtfahrt") steht als
  eigene Zeile **über** der Distanz/Dauer-Box.
- Die Warn-Badges (Maut/Zufahrtsbeschränkung) stehen als eigene `.result-badges`-Zeile
  **nach** der Distanz/Dauer-Box — optisch ein getrennter Block ohne erkennbaren Bezug
  zur Route.

Gewünscht: das Fahrmodus-Icon steht ganz links neben der Distanz/Dauer-Zeile (nicht mehr
als eigene Textzeile), und die Warnungen gehören sichtbar zur selben Karte wie
Distanz/Dauer.

## Entscheidungen

1. **Fahrmodus:** reines Icon (kein Text-Badge mehr), links neben der bestehenden
   Distanz/Dauer-Zwei-Spalten-Anordnung, vertikal so groß wie die zweizeilige Kv-Box.
   Label („Normalfahrt"/„Blaulichtfahrt") nur noch als Tooltip (`title` + `aria-label`).
   Distanz/Dauer-Layout selbst bleibt unverändert.
2. **Warnungen:** bleiben optisch `.badge.badge-yellow` (Warndreieck + Text), wandern aber
   in dieselbe Karte (`.result-item`) wie Icon/Distanz/Dauer, direkt unter der Kv-Zeile,
   ohne Trennlinie oder zusätzlichen Abstand — als dritte Zeile derselben Zusammenfassung.
3. Kein CI-Change: reine Komposition aus vorhandenen Primitiven (Icon, `.result-kv`,
   `.badge`). Keine neue CI-Komponente, keine neuen Tokens.
4. Bestehende gemeinsam genutzte Klassen `.result-kv`/`.result-badges` (auch von
   Stations-Liste und Tracking-Sidebar verwendet) werden **nicht global verändert** —
   neue Layout-Regeln nur scoped unter einem neuen Wrapper.

## Umsetzung

**Neue DOM-Struktur** in `RoutingSidebar.ts` (`updateRoutingSummary()`):

```html
<div class="result-item active no-click">
  <div class="result-header">
    <span class="result-label">Zusammenfassung</span>
  </div>
  <div class="result-summary-row">
    <span class="result-mode-icon" title="Normalfahrt" aria-label="Normalfahrt" role="img">
      <i class="fa-solid fa-car" aria-hidden="true"></i>
    </span>
    <div class="result-kv">
      <div class="result-kv-item"><span class="result-kv-label">Distanz</span><span class="result-kv-value">125.36 km</span></div>
      <div class="result-kv-item"><span class="result-kv-label">Dauer</span><span class="result-kv-value">84 min</span></div>
    </div>
  </div>
  <div class="result-badges">
    <span class="badge badge-yellow"><i class="fa-solid fa-triangle-exclamation"></i> Enthält Mautstraßen</span>
  </div>
</div>
```

- `getProfileBadge()`/`getRouteWarnings()` in `RoutingDetailsFormatter.ts` bleiben
  unverändert (reine Logik, liefern weiterhin `{icon, label}`). Nur die Render-Stelle in
  `RoutingSidebar.ts` ändert sich: das Fahrmodus-Icon wird jetzt in `.result-mode-icon`
  gerendert statt als `.badge.badge-blue`-Zeile; `.result-badges` wandert innerhalb
  desselben `.result-item` unter die Kv-Zeile.
- Wenn kein `profile` übergeben wird (z.B. `clearAll()` → `updateRoutingSummary(0, 0)`),
  entfällt `.result-summary-row`/Icon komplett wie bisher beim Fehlen des Badges — bereits
  bestehendes Verhalten, nur auf neue Struktur übertragen.
- **CSS** (`src/styles/sidebar.css`): neue Regeln `.result-summary-row` (Flex-Row, Icon +
  Kv, `align-items: center`, `gap`) und `.result-mode-icon` (Icon-Größe ~ Höhe der
  zweizeiligen Kv-Box, Farbe `var(--accent)`; exakte Größe im Browser feinjustiert).
  Innerhalb von `.result-summary-row` wird das linke `padding-left: 25px` von `.result-kv`
  auf `0` überschrieben (scoped Selector `.result-summary-row .result-kv`), damit das Icon
  die bisherige Einzug-Lücke füllt, ohne die globale `.result-kv`-Regel (Stationsliste,
  Tracking) zu berühren. Gleiches Prinzip für `.result-badges` innerhalb der Summary-Karte
  (`padding-left: 0`, kein Trenner/Extra-Margin zur Kv-Zeile).

## Testing

- `RoutingSidebar.test.ts`: bestehende Assertions auf die alte Badge-Struktur
  (`.badge.badge-blue` für Fahrmodus, `.result-badges` als Sibling nach `.result-list`)
  anpassen auf die neue Struktur (`.result-mode-icon` mit `title`, `.result-badges`
  innerhalb desselben `.result-item`).
- `RoutingSidebarAdapter.test.ts`: unverändert in der Logik, ggf. Selektoren in
  Assertions anpassen, die auf die alte DOM-Struktur zugreifen.
- `RoutingDetailsFormatter.test.ts`: keine Änderung nötig (reine Formatter-Logik).
- `npx tsc --noEmit && npm test` muss grün bleiben.
- Browser-Verifikation gegen laufenden Dev-Server (Strecke mit und ohne Mautanteil/
  Zufahrtsbeschränkung, beide Profile) vor Abschluss.
