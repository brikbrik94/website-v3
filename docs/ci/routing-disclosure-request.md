# CI-Erweiterung: Single-Disclosure (aufklappbare Text-Liste) — Anforderung

**Status:** ✅ Umgesetzt in `oe5ith-ci` v1.19.0 (2026-07-06) — `css/disclosure.css`,
`components/disclosure.html`, `docs/sidebar.md`-Abschnitt vorhanden. Submodul-Pointer in
website-v3 aktualisiert (2026-07-06); Integration in `RoutingSidebar.ts` (Abschnitt 7 unten)
steht noch aus.
**Angefragt von:** website-v3 (Routing-Sidebar, A→B-Turn-by-Turn-Anweisungen)
**Datum:** 2026-07-04

---

## 1. Warum

Die Routing-Sidebar (`website-v3/src/components/RoutingSidebar.ts`) soll nach einer
A→B-Routenberechnung die Turn-by-Turn-Anweisungen des Routing-Servers anzeigen
(z.B. 18 Schritte bei einer 125-km-Strecke) — eingeklappt per Default, mit Klick
zum Aufklappen, damit die Sidebar nicht sofort mit einer langen Liste überfüllt
wird.

`docs/sidebar.md` dokumentiert bereits ein Accordion-Pattern (`.accordion`/
`.acc-*`), das aber gezielt für **Layer-Toggle-Gruppen** gebaut ist: Dot +
Status-Badge (`unloaded`/`partial`/`all-on`) + Checkbox-Liste + „Alle an/aus"-
Controls, und die Öffnen/Schließen-Transition ist **JS-gesteuert**
(`.acc-body` braucht `--acc-body-height` von `element.scrollHeight`, siehe
`css/sidebar.css:145-153`). Für eine einfache Text-Liste ohne Checkbox-State,
ohne Status-Badge und ohne Controls ist das reiner Overhead und semantisch
falsch (Checkbox-Items für Wegbeschreibungs-Schritte ergibt keinen Sinn).

Es existiert aktuell **kein** leichtes, generisches „ein Header, ein Body,
klickbar auf/zu"-Pattern. Diese Anforderung folgt dem „Neue Komponenten"-Ablauf
aus `docs/for-coding-agents.md` (Zweck → HTML/Klassen → CSS → Referenz → Doku),
analog zur bereits umgesetzten `ci-split-view-request.md`.

> **Wichtig:** Generische, wiederverwendbare Komponente (auch für andere
> aufklappbare Detail-Listen künftig), kein Routing-spezifisches Styling.
> Keine Farben/Radien/Z-Index hardcoden — nur Tokens aus `common.css`.

---

## 2. Vorschlag: `.disclosure`

**Wann verwenden:** Eine einzelne, klickbare Kopfzeile mit optionalem Zähler/
Badge, die einen Inhaltsbereich auf-/zuklappt. Kein Auswahlzustand, keine
Checkbox-Liste, keine Gruppen-Controls — dafür bleibt `.accordion` zuständig.

**Nicht geeignet wenn:** mehrere gleichartige, unabhängig togglebare
Kategorien mit Status pro Kategorie nötig sind (→ `.accordion`).

### HTML-Struktur

Bevorzugt auf Basis von nativem `<details>`/`<summary>` (barrierefrei per
Default, kein eigenes JS für Auf-/Zuklappen nötig, entspricht dem
ARIA-APG-Disclosure-Pattern):

```html
<details class="disclosure">
  <summary class="disclosure-header">
    <span class="disclosure-title">Wegbeschreibung</span>
    <span class="disclosure-count">18 Schritte</span>
    <i class="fa-solid fa-chevron-down disclosure-chevron"></i>
  </summary>
  <div class="disclosure-body">
    <div class="disclosure-item">
      <span class="disclosure-item-text">Head northeast on Untere Donauländer, B129</span>
      <span class="disclosure-item-meta">280 m</span>
    </div>
    <!-- … -->
  </div>
</details>
```

### Klassen-Spezifikation

| Klasse | Zweck |
|---|---|
| `.disclosure` | Wrapper (`<details>`). Kein eigener Rahmen zwingend nötig, sollte sich in bestehende `.result-container`/Panel-Kontexte einfügen. |
| `.disclosure-header` | `<summary>`, Flex-Row: Titel · Zähler · Chevron. Klickbar, Hover-State analog `.acc-header:hover`, Tastatur-fokussierbar (native `<summary>`-Semantik übernimmt das). |
| `.disclosure-title` | Primärtext (`--text`). |
| `.disclosure-count` | Sekundärtext/Badge-artig (`--muted`), z.B. „18 Schritte" — kann bestehende `.badge`-Klasse wiederverwenden statt neuer Variante. |
| `.disclosure-chevron` | Rotiert bei offenem `<details>` — Reuse der bestehenden Rotationslogik aus `.acc-chevron` (`transform: rotate(180deg)`, per `details[open] .disclosure-chevron` statt `.acc-group.open`). |
| `.disclosure-body` | Inhaltscontainer. Da `<details>` das Ein-/Ausblenden nativ übernimmt, **keine JS-gesteuerte `max-height`-Berechnung nötig** — das ist der zentrale Unterschied zum Accordion. Optionale CSS-`transition` nur für das Chevron, nicht für den Body. |
| `.disclosure-item` | Einzelner Eintrag, Flex-Row: Text · Meta (rechts). |
| `.disclosure-item-text` | Primärtext. |
| `.disclosure-item-meta` | Sekundärtext rechts (`--muted`, `.mono` optional bei Zahlen). |

---

## 3. CSS-Anforderungen

- Neue Datei **`css/disclosure.css`**, eingebunden über `css/index.css`.
- Nur Tokens, keine Rohwerte. Verwendbare bestehende Tokens/Patterns:
  `--text`, `--muted`, `--border`, `--transition-fast`, `--transition-base`
  (Chevron-Rotation analog `.acc-chevron`), `rgba(255,255,255,0.03)`-Hover
  (wie `.acc-header:hover`, falls kein passender Token existiert — dann bitte
  Token vorschlagen statt roh übernehmen).
- **Kein JS-Contract** — anders als `.accordion` erwartet diese Komponente
  **keine** von außen gesetzte Höhen-Property. Das ist ausdrücklich der Punkt:
  einfacher zu konsumieren als der Accordion.
- **Reduced Motion:** Chevron-Transition unter `prefers-reduced-motion`
  deaktivieren (wie an anderen Stellen in `sidebar.css` üblich).
- **Nativer `::marker`/`::-webkit-details-marker` des `<summary>`-Elements**
  muss entfernt werden (`list-style: none`, `::-webkit-details-marker { display: none }`),
  da der Chevron das visuelle Auf/Zu-Signal übernimmt.

---

## 4. Referenz-Komponente

Datei **`components/disclosure.html`** anlegen (mit `css/demo.css`), die zeigt:

1. Geschlossenen und offenen Zustand nebeneinander (zwei `<details>`, eines mit
   `open`-Attribut).
2. Mehrere `.disclosure-item`s mit unterschiedlich langem Text (Ellipsis-Verhalten
   falls relevant).
3. `.disclosure` innerhalb eines `.result-container`/Panel-Kontexts, damit der
   Konsument sieht, wie es sich in bestehende Sidebar-Panels einfügt.

---

## 5. Doku-Updates im CI-Repo

- `docs/sidebar.md`: neuer Abschnitt „Disclosure (Single-Panel)" — mit
  Abgrenzung zu „Accordion-Gruppen" (Tabelle: wann welches Pattern).
- `docs/tokens.md`: nur falls neue Tokens entstehen (siehe Abschnitt 3 —
  im Idealfall keine neuen nötig, nur Reuse).
- `css/index.css`: `disclosure.css` importieren.
- `CHANGELOG.md`: Eintrag (additiv, nicht breaking).

---

## 6. Akzeptanzkriterien (Checkliste)

- [ ] `.disclosure` basiert auf nativem `<details>`/`<summary>` — kein JS
      für Auf-/Zuklappen erforderlich.
- [ ] Chevron rotiert bei `details[open]`, analog `.acc-chevron`-Optik.
- [ ] Tastaturbedienbar (native `<summary>`-Fokussierbarkeit reicht, kein
      zusätzliches `tabindex` nötig) — Fokus-Ring sichtbar.
- [ ] `::marker`/`::-webkit-details-marker` entfernt, Chevron übernimmt die Optik.
- [ ] Keine hardcodierten Farben/Radien/Z-Index/Transitions — nur Tokens.
- [ ] Reduced-Motion respektiert.
- [ ] `css/demo.css` nur in `components/disclosure.html`, nicht produktiv.
- [ ] Referenz-HTML, `docs/sidebar.md`, ggf. `tokens.md`, `CHANGELOG.md` aktualisiert.

---

## 7. Was website-v3 danach damit macht (Kontext, nicht Teil der CI-Arbeit)

Sobald `.disclosure` verfügbar ist, rendert `RoutingSidebar.ts` damit die
ORS-Turn-by-Turn-Schritte (`route.features[0].properties.segments[0].steps`)
innerhalb von `#routing-details`, nach der bereits vorhandenen
Distanz/Dauer-Anzeige. Distanz pro Schritt kommt aus `step.distance` (Meter),
Anweisungstext aus `step.instruction`. Es wird kein weiteres CI-Element
benötigt, sofern Abschnitt 2–5 umgesetzt ist. Sollte beim Einbau doch noch
etwas fehlen, wird es separat nachgemeldet.
