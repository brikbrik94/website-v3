# CI-Audit & Architektur-Report: Website V3

Dieses Dokument fasst die Erkenntnisse aus dem globalen CSS-Refactoring (Mai 2026) zusammen. Es listet identifizierte Probleme, fehlende Elemente im `oe5ith-ci` und Vorschläge für die Erweiterung des zentralen Design-Systems auf.

## 1. Identifizierte Probleme & Fixes

### A. Race-Conditions im Layer-Management
*   **Problem:** Schnelles Umschalten von Karten-Layern (insb. "Alle an") führte zu parallelen `fetch`-Anfragen für das gleiche Style-JSON. Dies verursachte MapLibre-Abstürze durch mehrfache `addSource`-Aufrufe.
*   **Lösung:** Implementierung eines **Promise-Caches** in `MapPage.ts`. Mehrfachanfragen warten nun auf denselben Promise.
*   **Empfehlung:** Dieses Pattern ("Safe Resource Loading") sollte als Standard für alle kartenbasierten Module dokumentiert werden.

### B. Layout-Clipping durch Z-Index Kaskade
*   **Problem:** Auf Desktop-Systemen wurde der Sidebar-Toggle teilweise vom Hauptinhalt (`.page-content`) überdeckt, da kein gemeinsamer Stacking-Context vorlag.
*   **Lösung:** Einführung von `--z-sidebar-base: 10` für die Sidebar und `--z-sidebar-tab: 1010` für den Toggle.
*   **Ergänzung CI:** Der Z-Index Bereich 0-1000 sollte offiziell für App-Inhalte reserviert bleiben, während CI-Overlays bei 1000+ starten.

## 2. Fehlende CI-Elemente (Lokal ergänzt)

Die folgenden Klassen wurden im Projekt lokal in `page.css` und `sidebar.css` erstellt, um Inline-Styles zu vermeiden. Sie sollten idealerweise in das `oe5ith-ci` Repo übernommen werden:

### A. Karten-Utilities
*   `.full-map`: Ein robuster Container für MapLibre (`flex: 1`, `height: 100%`, `position: relative`). Verhindert Layout-Sprünge beim Laden der Karte.
*   `.map-legend`: Standardisierte, schwebende Legende (`position: fixed`, `bottom: 16px`, `right: 16px`) mit passendem Panel-Design.

### B. Spacing & Layout
*   **Variable Spacings:** Es fehlen Helper-Klassen für Abstände basierend auf Tokens.
    *   *Vorschlag:* `.m-gap` { margin: var(--card-gap); }, `.mb-gap` { margin-bottom: var(--card-gap); }.
*   **Flex-Helfer:** Grundlegende Flex-Steuerungen wie `.flex-col` oder `.flex-center` fehlen, was oft zu `style="display: flex; ..."` im TS-Code führt.

### C. Komponenten-Erweiterungen
*   `.overlay-section-label`: Eine Variante von `.sidebar-section-label` für schwebende Overlays (z.B. Topbar-Tools auf Tablet/Mobile).
*   `.map-marker-helicopter`: Spezifisches Styling für Marker-Icons (Schatten, Filter, Hover-Animation), die direkt im DOM (MapLibre Marker) liegen.

## 3. Strategische Empfehlungen

1.  **Token-Erweiterung:** Aufnahme von `--sidebar-tab-width` (16px) und `--sidebar-tab-height` (44px) in die `common.css`, um Platzierungs-Berechnungen (`calc`) im CSS zu ermöglichen statt "Magic Numbers" zu verwenden.
2.  **Shared Utils:** Die neu erstellte `src/lib/SidebarUtils.ts` (Toggle-Logik) sollte als Referenz-Implementierung in die CI-Dokumentation aufgenommen werden, damit jede Seite das gleiche Einklapp-Verhalten zeigt.
3.  **No-Inline-Style Policy:** In `for-coding-agents.md` sollte explizit stehen, dass auch dynamische HTML-Strings im JS/TS keine `style="..."` Attribute enthalten dürfen (außer für Werte, die erst zur Laufzeit berechnet werden können).

---
*Erstellt von Gemini CLI für Daniel Herbrik - 04.05.2026*
