# CI-Erweiterung: Icon-Swatch für `MapLegend` (`.map-legend-icon`) — Anforderung

**Status:** ✅ Umgesetzt in `oe5ith-ci` v1.21.0 (2026-07-18, Commit `52cf75e`) — `.map-legend-icon`
(12×12px), `MapLegend.addEntry()` mit `type: 'icon'`/`icon`-Feld, `components/modal.html`- und
`docs/map-legend.md`-Beispiel vorhanden, exakt wie unten vorgeschlagen. In website-v3 konsumiert:
`src/types/common.ts` (`LegendEntry.type`/`icon`), `src/lib/MapLegend.ts`, `src/pages/NahPage.ts`
(Status-Einträge nutzen jetzt `fa-solid fa-helicopter` statt Farbpunkt). Submodul-Pointer
aktualisiert (2026-07-18).
**Angefragt von:** website-v3 (NAH-Luftrettungs-Legende, `src/pages/NahPage.ts` / `src/features/nah/NahMapLayers.ts`)
**Datum:** 2026-07-18

---

## 1. Warum

Die Kartenlegende (`.map-legend`, `MapLegend`-Klasse, dokumentiert in `docs/map-legend.md`) kennt
aktuell 3 Eintragstypen: `dot` (Kreis 10×10px), `line` (24×3px), `area` (16×12px). Alle drei sind
reine Farbflächen ohne Formsemantik.

Auf `/nah` in website-v3 zeigt die Karte NAH-Stützpunkte als **Helikopter-Symbol** (ein per Canvas
gerendertes FontAwesome-`fa-helicopter`-Glyph, als SDF-Icon registriert und über
`icon-color` je nach Status eingefärbt — `active`/`inactive`/`offseason` → grün/rot/grau). Die
zugehörige Legende zeigt für dieselben 3 Status aktuell aber nur **schlichte Farbpunkte**
(`type: 'dot'`) — visuell inkonsistent zur tatsächlichen Kartendarstellung. Ein Nutzer, der einen
grünen Hubschrauber auf der Karte sieht, aber nur einen grünen Punkt in der Legende, muss die
Verbindung gedanklich selbst herstellen.

Gewünscht: ein vierter, generischer Eintragstyp `icon`, der ein beliebiges FontAwesome-Glyph
(nicht auf Hubschrauber beschränkt — andere Portale/künftige website-v3-Seiten könnten andere
Icons brauchen, z.B. Flugzeug-Symbole für Tracking) in der Legende zeigt, farblich per Token
einfärbbar wie die bestehenden Swatch-Typen.

> **Wichtig:** Generische, wiederverwendbare Erweiterung des bestehenden `MapLegend`-Patterns
> (analog zur Denkweise von `ci-routing-disclosure-request.md`, inzwischen `docs/ci/routing-disclosure-request.md`)
> — kein NAH- oder Hubschrauber-spezifisches Styling in der CI-Komponente selbst.

---

## 2. Vorschlag: `.map-legend-icon`

**Wann verwenden:** Wenn der Legenden-Eintrag dieselbe Symbol-Form zeigen soll, die auch auf der
Karte für die entsprechenden Features verwendet wird (z.B. ein Helikopter-Icon für
Luftrettungs-Stützpunkte), statt einer generischen Farbfläche.

**Nicht geeignet wenn:** eine reine Farbkodierung ohne Formsemantik ausreicht — dafür bleibt
`dot`/`line`/`area` zuständig.

### HTML-Struktur

```html
<div class="map-legend-entry">
  <i class="fa-solid fa-helicopter map-legend-icon" style="color: var(--success);"></i>
  <span class="map-legend-label">Einsatzbereit</span>
</div>
```

Die konkrete FontAwesome-Klasse (`fa-helicopter` im Beispiel) kommt vom Konsumenten (website-v3),
nicht von der CI-Komponente selbst — analog dazu, wie `color` bei `dot`/`line`/`area` heute schon
zur Laufzeit per Inline-Style gesetzt wird (`marker.style.background = entry.color`), nicht als
CSS-Konstante in der Komponente.

### CSS-Anforderung

`.map-legend-icon` in `css/modal.css`, direkt bei den bestehenden `.map-legend-dot`/`-line`/`-area`-
Regeln ergänzt, mit vergleichbarer Boxgröße/Ausrichtung (`flex-shrink: 0`, damit es sich wie die
anderen Swatch-Typen in `.map-legend-entry`s Flex-Row einfügt):

```css
.map-legend-icon {
  width: 12px;
  height: 12px;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
```

Kein neuer Farb-Token nötig — `color` wird wie bei den anderen Swatch-Typen vom Konsumenten per
Inline-Style gesetzt (`style="color: ..."` statt `style="background: ..."`, da es sich um eine
Icon-Glyph statt eine Fläche handelt).

---

## 3. Referenz-Komponente

`components/modal.html`, Abschnitt „Karten-Legende" (dort, wo `dot`/`line`/`area` bereits gezeigt
werden) um ein viertes Beispiel mit `.map-legend-icon` ergänzen (z.B. `fa-helicopter` oder ein
anderes neutrales Glyph als Platzhalter).

---

## 4. Doku-Updates im CI-Repo

- `docs/map-legend.md`:
  - Tabelle „Eintragstypen" um eine Zeile ergänzen: `icon` | FontAwesome-Glyph 12×12px | Symbol-Marker mit Formsemantik (z.B. Fahrzeuge, Stationen) |.
  - TypeScript-Interface-Beispiel erweitern:
    ```ts
    interface LegendEntry {
      type: 'dot' | 'line' | 'area' | 'icon';
      color: string;
      label: string;
      icon?: string; // FontAwesome-Klassen, nur bei type: 'icon' relevant, z.B. 'fa-solid fa-helicopter'
    }
    ```
  - JS-API-Beispiel um einen `addEntry({ type: 'icon', icon: 'fa-solid fa-helicopter', color: '#22c55e', label: 'Aktiv' })`-Aufruf ergänzen.
- `CHANGELOG.md`: Eintrag (additiv, nicht breaking — bestehende `dot`/`line`/`area`-Konsumenten
  bleiben unverändert funktionsfähig).

---

## 5. Akzeptanzkriterien (Checkliste)

- [ ] `.map-legend-icon` in `css/modal.css`, Boxgröße/Ausrichtung konsistent mit den bestehenden
      Swatch-Typen in `.map-legend-entry`.
- [ ] Farbe wird weiterhin per Inline-Style vom Konsumenten gesetzt, keine hardcodierte Farbe in
      der CI-Komponente.
- [ ] FontAwesome-Icon-Klasse ist frei wählbar durch den Konsumenten, keine Hubschrauber- oder
      Domänen-Bindung in der CI-Komponente selbst.
- [ ] `components/modal.html` „Karten-Legende"-Abschnitt zeigt ein Icon-Beispiel.
- [ ] `docs/map-legend.md` (Tabelle, TS-Interface, JS-API-Beispiel) und `CHANGELOG.md` aktualisiert.
- [ ] Bestehende `dot`/`line`/`area`-Konsumenten (u.a. website-v3 `/karte`, `/nah`) bleiben ohne
      Anpassung funktionsfähig (rein additive Erweiterung).

---

## 6. Was website-v3 danach damit macht (Kontext, nicht Teil der CI-Arbeit)

Sobald `.map-legend-icon` verfügbar ist, wird `MapLegend.addEntry()` (`src/lib/MapLegend.ts`) um
den `icon`-Typ erweitert (rendert `<i class="${entry.icon} map-legend-icon">` statt eines
`div.map-legend-dot`, Farbe per `style.color` statt `style.background`), und
`src/pages/NahPage.ts` stellt die 3 Status-Einträge von `type: 'dot'` auf
`type: 'icon', icon: 'fa-solid fa-helicopter'` um — die Legende zeigt dann dieselbe
Helikopter-Form wie der Kartenlayer selbst, weiterhin farblich aus der echten Layer-Definition
abgeleitet (siehe `TODO.md` Schritt 3 / `resolveLegendSwatchBranches()`). Kein weiteres
CI-Element nötig, sofern Abschnitt 2–4 umgesetzt sind.
