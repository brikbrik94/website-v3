# CI-Aufgabe: Karten-Hintergrund-Token + WGS84-Zeilenklassen

**Ziel-Repo:** `oe5ith-ci` (Design-System-Submodul)
**Datum:** 2026-06-20
**Auslöser:** Konsumierende Seite `website-v3` (Koordinaten-Umrechner + Karte)

## Kontext

In `website-v3` wurden zwei UI-Anpassungen umgesetzt, die aktuell nur in den **lokalen
Kopien** der CI-CSS-Dateien (`src/styles/*`) liegen. Laut CI-Regel dürfen die aus dem CI
gespiegelten Dateien in der App **nicht** verändert werden (sonst Konflikte beim Re-Sync).
Deshalb sollen diese Ergänzungen sauber ins CI-Repo übernommen werden, damit sie
sync-fest und für alle OE5ITH-Seiten verfügbar sind.

Es handelt sich um **reine Ergänzungen** (keine bestehenden Regeln/Werte ändern):
1. Neuer Design-Token `--map-bg` (Karten-Container-Hintergrund, weiß als Default,
   per Stylesheet überschreibbar).
2. `.full-map` nutzt diesen Token als Hintergrund.
3. Neue Layout-Klassen `.coord-row-wgs` / `.coord-vals` für eine formatübergreifend
   einheitlich breite WGS84-Koordinatenzeile.

## Regeln beachten

- Bestehende Tokens/Regeln **nicht** verändern, nur ergänzen.
- Keine Hardcodes außerhalb der Token-Definition (Farben/Radien/etc. als Token).
  Der Hex-Wert gehört ausschließlich in die Token-Definition in `common.css`
  (so wie bei `--white`, `--bg` usw.).
- CI-Versionierung & Changelog gemäß CI-Konvention pflegen (siehe `docs/versioning.md`
  bzw. `CHANGELOG.md` im CI-Repo).
- Doku-Konventionen des CI beachten (`docs/`-Standard), falls Tokens dort gelistet werden
  (z. B. `docs/tokens.md` um `--map-bg` ergänzen).

## Änderungen

### 1. `css/common.css` — neuen Token ergänzen

Im `:root`-Block bei den Basis-Farben, direkt nach `--border-strong`:

```css
  --map-bg:           #ffffff; /* Hintergrund des Karten-Containers (weiß als Default, per Stylesheet überschreibbar) */
```

### 2. `css/utils.css` — `.full-map` bekommt den Hintergrund

Bestehende `.full-map`-Regel um die `background`-Zeile erweitern (Rest unverändert):

```css
.full-map {
  flex: 1;
  height: 100%;
  min-height: 0;
  position: relative;
  background: var(--map-bg);   /* NEU */
}
```

### 3. `css/coords.css` — neue WGS84-Zeilenklassen

Neuen Block ergänzen (sinnvoll direkt vor dem `COORD-ROW-INLINE`-Abschnitt).
Baut auf der bereits vorhandenen CI-Klasse `.coord-input-dms` auf:

```css
/* ═══════════════════════════════════════
   COORD-ROW-WGS — Einheitliche WGS84-Zeile (Label + n Felder + Suffix)
   Gleiche Gesamtbreite über DD / DDM / DMS hinweg; Felder teilen sich
   den verfügbaren Platz, das Suffix sitzt immer am selben Anschlag.
   ═══════════════════════════════════════ */
.coord-row-wgs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.coord-row-wgs:last-child { margin-bottom: 0; }

.coord-vals {
  flex: 1;
  display: flex;
  gap: 4px;
  min-width: 0;
}
.coord-vals .coord-input-dms {
  width: auto;
  flex: 1;
  min-width: 0;
  text-align: left;
}
```

## Optional (Doku)

- `docs/tokens.md`: `--map-bg` mit Default `#ffffff` und Zweck „Karten-Container-Hintergrund"
  aufnehmen.
- Falls es eine Referenz-/Demo-Seite für die Map-Utilities oder den Coords-Block gibt,
  dort die neuen Klassen erwähnen.

## Verifikation

- `--map-bg` ist in `common.css` definiert; `.full-map` rendert standardmäßig weiß und
  reagiert auf ein Überschreiben von `--map-bg` (bzw. ein Override der `.full-map`-Regel).
- `.coord-row-wgs`-Zeilen: bei 1, 2 oder 3 Feldern in `.coord-vals` sitzt das nachfolgende
  `.coord-suffix` immer am selben rechten Anschlag (gleiche Gesamtbreite); die Felder sind
  linksbündig.
- Keine bestehenden Regeln/Tokens verändert; nur Ergänzungen.

## Nachgelagert in `website-v3` (NICHT Teil dieser CI-Aufgabe)

Nach CI-Release + `src/styles/`-Re-Sync:
- `src/styles/common.css` und `src/styles/coords.css` enthalten die Ergänzungen dann aus
  dem CI (lokale Hand-Edits werden durch identischen CI-Inhalt ersetzt → Mirror sauber).
- In `src/app.css` kann die Zeile `background: var(--map-bg);` der `.full-map`-Regel
  entfallen (Hintergrund kommt nun aus CI-`utils.css`); `min-width: 0;` bleibt als
  app-spezifisches Layout erhalten.
