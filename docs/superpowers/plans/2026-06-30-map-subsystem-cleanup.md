# Map-Subsystem: Cleanup-Roadmap & Code-Review

Datum: 2026-06-30. Kontext: Nach den Sprite-/Overlay-Fixes (v3.4.0 → v3.5.1) ein
strukturierter Multi-Agent-Code-Review des Karten-Subsystems, der einen Aufräum-/
Vereinheitlichungs-Durchgang treibt, bevor die nächsten Features kommen.

## Status

- **U2 (Restore-Pfade konsolidieren):** erledigt in v3.5.2 — **visuelle Verifikation offen**.
- **U1 (OverlayLoader, Contours + Hiking):** erledigt in v3.5.2 — **visuelle Verifikation offen**.
- Rest: offen (siehe TODO).

> ⚠️ U2 + U1 wurden ohne Dev-Server-Zugang committed; das Laufzeitverhalten der Karte
> ist noch nicht visuell geprüft. Siehe Verifikations-Checkliste unten.

## TODO (Tasks)

**Features (nach dem Cleanup):**
1. Legende mit Funktion befüllen — `MapLegend` pro Seite mit aktiven Layern füllen, interaktiv.
2. Karten-Klick + Overlay-Infos seitenübergreifend — Klick-auf-Feature (heute nur Tracking) generisch, Overlay-Feature-Infos im Popup.
3. Routing-Kontextmenü: Touchsteuerung — Long-Press fürs Zielwahl-Menü (Kontextmenü-Handler: `RoutingPage.ts:76`).

**Cleanup / Vereinheitlichung:**
4. **U2 Restore-Pfade konsolidieren — ERLEDIGT (v3.5.2).**
5. **U1 OverlayLoader (Contours+Hiking) — ERLEDIGT (v3.5.2).**
6. U3 Sprite-Handling cachen + `SPRITE_BASE`-Konstante.
7. U4 Pin-/Marker-Boilerplate zusammenfassen (`createPinLayer`, `setPointSource`).
8. U5 NAH DOM-Marker → Symbol-Layer migrieren (siehe Projekt-Memory).
9. U6 Hover-Cursor vereinheitlichen (`attachHoverCursor`).
10. U7 MapRegistry-Buchhaltung vereinfachen.
11. Kleinere Map-Bugs (siehe unten).
12. U1b MapPage.toggleLayer in OverlayLoader generalisieren (ID-Prefixing + Layer-Subset).

## Code-Review-Findings (Map-Subsystem, 8 Finder-Angles, verifiziert)

### Bugs (verifiziert)

- **#1 Cross-Page-State-Leak — `TerrainManager.ts`** *(behoben in U2/v3.5.2)*: Modul-globale
  Flags `terrainEnabled`/`hillshadeEnabled`/`contoursEnabled` wurden nie über Seitenwechsel
  zurückgesetzt → Terrain auf einer Seite an, auf nächster (ohne Toggle) still wieder angewandt.
- **#2 Doppelter Restore bei Basemap-Wechsel — `MapPage.ts`, `TrackingPage.ts`** *(behoben in U2)*:
  `setStyle()` triggert `style.load`→`restore()` **und** zusätzlich `triggerRestore()` → ganzer
  Registry-Restore inkl. Sprite-Laden lief 2×.
- **#3 `loadSprites` lädt+dekodiert Sprite-Sheet bei jedem Style-Reload neu — `MapCore.ts:209`**
  *(offen → U3)*: fetch + `getImageData` pro Icon, `hasImage`-Guard greift erst danach; durch #2 sogar doppelt.
- **#4 Width-Desync — `TrackingMapLayers.ts:69` vs `:223`** *(offen → Kleinere Map-Bugs)*:
  `ensureLayers` setzt selektierte Track-Breite 5/3, `highlightItem` 4/1.5.
- **#5 Inline `style="color:…"` in generiertem HTML — `NahMapLayers.ts:84,108`** *(offen → U5)*:
  Verstoß gegen `for-coding-agents.md`.

### Plausibel (Trigger unsicher) — offen, Sammeltask „Kleinere Map-Bugs"

- TerrainManager Double-Add-Race bei „warmem" Init (un-awaited `applyTerrainInfrastructure` +
  paralleler Restore passieren beide den Leer-Guard).
- NAH-Feature-State-Reset hardcoded `for (i<5)` (`NahMapLayers.ts:148`) → stale `selected` bei >5 Ergebnissen.
- TrackingPage-Timer (`setTimeout`, `TrackingPage.ts:130`) nicht in `destroy()` gecleart.

### Aussortierte False-Positives

- PopupManager-Dot-Klick: der `|| 'ais-icons'`-Fallback liefert für AIS-Dots korrekt.
- CoordsPage-Hiking-Toggle-Off: Source heißt zufällig `hiking` → matchte (anders als Contours-Bug).
- `@2x`-ohne-pixelRatio-Doppelgröße: unsere Sprites tragen alle `pixelRatio:2`.

### Strukturell / Vereinheitlichung (Begründung der U-Tasks)

- **U1** Overlay-Laden 3× dupliziert & divergent (MapPage / CoordsPage / TerrainManager) → `OverlayLoader`. *(Contours+Hiking erledigt; MapPage = U1b.)*
- **U2** Restore an 3 Stellen mit unterschiedlicher Reihenfolge (`restore`/`triggerRestore`/`reapplyBaseLayers`). *(erledigt: 1 Pfad, `reapplyBaseLayers` war toter Code.)*
- **U3** `loadSprites` baut MapLibres natives Sprite-Handling nach (DPR/@2x, stretch/content, sdf manuell) → cachen oder nativ; `SPRITE_BASE` als eine Konstante.
- **U4** Pin-/Marker-Boilerplate pro Feature dupliziert (identische `ci-symbol-location`-Defs Coords & NAH, Point-`setData` 5×).
- **U5** NAH nutzt DOM-Marker, alle anderen Symbol-Layer → gegensätzlicher Lifecycle; auf `nah-*`-Symbol-Layer migrieren.
- **U6** Hover-Cursor-Logik dupliziert (Tracking gefixt, Routing inline `RoutingPage.ts:69`).
- **U7** Dreifach-Buchhaltung (`activeLayers` + `overlayMetadata` + `MapRegistry`), Tripel-Guards, `JSON.parse(JSON.stringify())` je Restore.

## Verifikations-Checkliste (nach U2 + U1, `npm run dev`)

1. Karte: Overlay (RD) an → Basemap wechseln → Overlay bleibt, lädt **einmal** (Network-Tab: Sprite-Fetch nicht doppelt).
2. Tracking: Symbole sichtbar → Basemap wechseln → kommen einmal sauber zurück.
3. Terrain-Leak: Karte Terrain/Hillshade/Höhenlinien an → zu Koordinaten/NAH → dort **kein** ungewolltes Terrain.
4. Höhenlinien an → aus → verschwinden (auch nach Basemap-Wechsel dazwischen).
5. Koordinaten: Wanderwege an → aus → an → aus → sauber, kein Geister-Layer.
6. Seitenwechsel: Coords (Wanderwege an) → weg → zurück → Startzustand (aus), keine Doppel-Layer.
