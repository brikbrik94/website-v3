# Coords: WGS84 Format-Umschaltung (Design)

Datum: 2026-06-20

## Ziel

Auf der Koordinaten-Umrechnen-Seite (`/coords`) die beiden getrennten WGS84-Blöcke
(`Wgs84Block` „Dezimalgrad" und `DmsBlock` „Grad-Min-Sek") zu einem einzigen Block
„WGS84" zusammenfassen. Darüber ein Auswahlfeld (`.coord-select`, wie auf der
Routing-Seite) zum Umschalten des Eingabe-/Anzeigeformats:

1. **Dezimalgrad** (DD) – `48.306400` / `14.285800` — Default
2. **Grad Dezimalminuten** (DDM) – `48° 18.384' N` — neu
3. **Grad Min Sek** (DMS) – `48° 18' 23.0" N`

## Verhalten

- Auswahlfeld ist nur bedienbar, wenn der WGS84-Block der aktive Eingabeblock ist
  (konsistent mit UTM/BMN-Selects). `setActive()`/`setInactive()` der Basisklasse
  deaktivieren Selects bereits — keine Sonderlogik.
- Format-Wechsel rendert nur den Lat/Lon-Body neu und befüllt ihn aus der kanonischen
  `lat/lon`-State des Service → kein Wertverlust.
- Default-Format beim Laden: Dezimalgrad.

## Umsetzung

### `Wgs84Block` (vereinheitlicht)
- Interner State `format: 'dd' | 'ddm' | 'dms'`, Default `'dd'`.
- Header (Titel „WGS84" + Copy) + `.coord-select[data-field="format"]` + Body-Container.
- `renderBody()` erzeugt den Lat/Lon-Bereich passend zum Format.
- Format-Wechsel und Suffix-Umschaltung (N/S, E/W) laufen über Event-Delegation auf
  `this.element` (Body wird neu gerendert), nicht über direkt gebundene Listener.
- `update(state)` füllt Felder gemäß aktuellem Format; `parseInput()` liest gemäß Format
  und ruft `setWgs` / `setDdm` / `setDms`.

### `CoordsDataService` (Erweiterung)
- `toDdm(val)` → `{ d, m }` (m = Dezimalminuten)
- `getDdm()` → `{ lat:{d,m,suffix}, lon:{d,m,suffix} }`
- `setDdm(latD, latM, latSuf, lonD, lonM, lonSuf)` → zurück auf Dezimalgrad, `setWgs()`.
- Kanonische Quelle bleibt `lat/lon`.

### `CoordsSidebar`
- `DmsBlock`-Import + Instanz entfernen; `DmsBlock.ts` löschen.
- Reihenfolge: Adresse → WGS84 → UTM → BMN → MGRS → Maidenhead.

### Typen
- `types.ts`: `DdmCoords`-Typ analog zu `DmsCoords`.

### Kein neues CSS
Wiederverwendung bestehender CI-Klassen: `.coord-select`, `.coord-row`/`.coord-input`,
`.coord-row-dms`/`.coord-input-dms`/`.coord-suffix`.

## Tests (TDD)
`CoordsDataService.test.ts`: Round-trip für DDM (`toDdm`/`getDdm`/`setDdm`), inkl.
Süd-/West-Vorzeichen.

## Konventionen
`src/version.ts` auf `-dev`, `CHANGELOG.md`-Eintrag (`YYYY-MM-DD HH:mm`), keine Hardcodes.
