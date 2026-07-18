# CI-Erweiterung: `.coord-vals`-Feldbreiten nach Dezimal-/Ganzzahl-Rolle — Anforderung

**Status:** ✅ Umgesetzt in `oe5ith-ci` v1.21.1 (2026-07-18, Commit `53a1353`) — exakt wie
vorgeschlagen (`flex: 0 0 36px` für Nicht-Dezimal-Felder). In website-v3 konsumiert:
`src/styles/coords.css` gesynct, lokaler Override in `src/app.css` entfernt (redundant zur
CI-Regel geworden). Submodul-Pointer aktualisiert (2026-07-18).
**Angefragt von:** website-v3 (Koordinaten-Umrechner, `src/features/coords/blocks/Wgs84Block.ts`)
**Datum:** 2026-07-18

---

## 1. Warum

`.coord-vals .coord-input-dms` (`css/coords.css`) teilt die verfügbare Zeilenbreite aktuell
gleichmäßig auf **alle** Input-Felder einer WGS84-Zeile auf (`flex: 1` pro Feld). Bei DMS-Format
(3 Felder: Grad, Minuten, Sekunden) bekommt das Sekunden-Feld — das mit z.B. `36.4521` die
meisten Zeichen braucht — nur 1/3 der Zeilenbreite, genauso viel wie das Grad-Feld (das nie mehr
als 3 Ziffern braucht, max. 180° bei Länge). Nutzer meldeten das als „Eingabe wirkt zu stark
begrenzt" (kein echtes Zeichenlimit, aber visuell eng).

Grad- und ganzzahlige Minuten-Felder haben eine bekannte, kleine Obergrenze:
- Grad: max. 3 Ziffern (Breite bis 180°, Länge bis 180°).
- Minuten (nur bei DMS als eigenes ganzzahliges Feld): max. 2 Ziffern (0-59).

Das jeweils letzte Feld einer Zeile ist immer das Dezimalfeld (Minuten bei DDM, Sekunden bei
DMS) und trägt bereits `inputmode="decimal"` (aus `Wgs84Block.ts`, für die mobile Tastatur) —
dieses Attribut eignet sich direkt als CSS-Hook, ohne neues Markup.

## 2. Vorschlag

In `css/coords.css`, direkt bei der bestehenden `.coord-vals .coord-input-dms`-Regel ergänzt:

```css
.coord-vals .coord-input-dms:not([inputmode="decimal"]) {
  flex: 0 0 36px;
  width: 36px;
}
```

Nicht-Dezimal-Felder (Grad, ganzzahlige Minuten) bekommen eine feste, schmale Breite; das
verbleibende Dezimalfeld (immer das letzte in der Zeile) behält `flex: 1` aus der bestehenden
Regel und bekommt dadurch automatisch den gesamten Rest der Zeile. Keine Änderung an
`Wgs84Block.ts`/anderen Konsumenten nötig — reine CSS-Ergänzung.

**Aktuell website-v3-seitig als lokaler Override in `src/app.css` umgesetzt** (nicht in
`src/styles/coords.css`, um die Mirror-Kopie von `oe5ith-ci/css/coords.css` nicht divergieren zu
lassen) — kann nach Übernahme hier entfernt werden.

## 3. Referenz-Komponente

`components/sidebar-types.html` bzw. wo auch immer die bestehende `COORD-ROW-WGS`-Referenz liegt
— DMS-Beispiel ergänzen/aktualisieren, damit der Breitenunterschied sichtbar ist.

## 4. Doku-Updates im CI-Repo

- `docs/sidebar-types.md` (oder wo `.coord-row-wgs`/`.coord-vals` dokumentiert sind): Hinweis
  ergänzen, dass Nicht-Dezimal-Felder automatisch schmal bleiben, sofern kein
  `inputmode="decimal"` gesetzt ist.
- `CHANGELOG.md`: Eintrag (additiv, keine bestehende Regel geändert).

## 5. Akzeptanzkriterien (Checkliste)

- [ ] `.coord-vals .coord-input-dms:not([inputmode="decimal"])` in `css/coords.css` ergänzt.
- [ ] Bestehende `.coord-vals .coord-input-dms`-Regel (Dezimalfeld, `flex: 1`) unverändert.
- [ ] DD-Format (nur 1 Dezimalfeld pro Zeile) optisch unverändert (volle Zeilenbreite).
- [ ] `components/`-Referenz zeigt den Unterschied bei DMS.
- [ ] `CHANGELOG.md` aktualisiert.

## 6. Was website-v3 danach damit macht (Kontext, nicht Teil der CI-Arbeit)

Sobald die Regel in `oe5ith-ci` verfügbar ist: lokalen Override in `src/app.css` entfernen,
`src/styles/coords.css` per nächstem CI-Sync aktualisieren. Keine weitere Code-Änderung nötig,
da `Wgs84Block.ts` das `inputmode="decimal"`-Attribut bereits korrekt setzt.
