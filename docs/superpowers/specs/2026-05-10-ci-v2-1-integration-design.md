# Design Spec: Integration von CI v2.1.0 (Topbar-Refactoring)

**Status:** Draft  
**Datum:** 2026-05-10  
**Autor:** Gemini CLI  
**Betrifft:** `src/components/Topbar.ts`, `src/styles/topbar.css` (falls Anpassungen nötig)

## 1. Zielsetzung
Aktualisierung der Topbar-Komponente auf den neuesten Stand des `oe5ith-ci` Design Systems (v2.1.0). Dies umfasst die Reduzierung der Navigationslinks durch ein Dropdown, die Einführung von Icon-only Toggles mit Tooltips und die Bereinigung der Overlay-Struktur für mobile Endgeräte.

## 2. Änderungen

### 2.1 Navigation (`topbar-right`)
Die Anzahl der direkt sichtbaren Links wird reduziert, um Platz für das Branding und die Center-Controls zu schaffen.

*   **Direkte Links:** "Routing" und "Luftrettung".
*   **Nav-Dropdown ("Mehr"):**
    *   Bezeichnung: "Mehr"
    *   Inhalt: "Karte", "Umrechner", "Tracking".
    *   Verhalten: Auf Mobile (`max-width: 768px`) wird das gesamte Dropdown gemäß CI-Regeln ausgeblendet.

### 2.2 Icon-Only Toggles (`topbar-center`)
Alle Toggle-Buttons in der `controls-panel` (Desktop) werden auf den `.topbar-toggle--icon-only` Standard umgestellt.

*   **HTML-Struktur:**
    ```html
    <button class="topbar-toggle topbar-toggle--icon-only" 
            data-tooltip="[Titel]" 
            aria-pressed="[state]">
      <i class="[icon-class]"></i>
      <span class="topbar-toggle-label">[Titel]</span>
    </button>
    ```
*   **Betroffene Elemente:**
    *   `btn-legend` (Legende)
    *   `btn-terrain` (Gelände)
    *   `btn-hillshade` (Höhenschatten)
    *   Sämtliche `customActions` in `initTopbar`.

### 2.3 Controls-Overlay (Tablet/Mobile)
Das Overlay wird restrukturiert, um den vertikalen Fluss und die Gruppierung zu verbessern.

*   **Struktur:**
    1.  **Basemap-Dropdown:** Volle Breite, umschlossen von einem `.form-field` mit `.overlay-section-label`.
    2.  **Trenner:** `<div class="controls-sep"></div>`.
    3.  **Buttons:** Ein Container `.controls-btn-group` (2er Grid), der alle Toggles (Terrain, Hillshade, Custom, Legende) aufnimmt. Durch den `.topbar-toggle-label`-Span im HTML zeigen diese im Overlay automatisch Text neben dem Icon an.

## 3. Technische Details

### 3.1 State Management
*   Das Nav-Dropdown benötigt eine eigene Toggle-Logik in `initTopbar`, da es sich um ein Standard-Menü (und kein Listbox-Basemap-Dropdown) handelt.
*   Schließen des Menüs bei `Escape` oder Klick außerhalb.

### 3.2 CI-Konformität
*   Nutzung der neuen CSS-Klasse `.topbar-nav-dropdown`.
*   Sicherstellung, dass die Basemap-Dropdown-Breite fix bleibt (wie in `topbar.md` gefordert).

## 4. Testkriterien
1.  **Desktop:** Nur "Routing", "Luftrettung" und das "Mehr"-Dropdown sind rechts sichtbar.
2.  **Desktop:** Hover über Toggles (z.B. Legende) zeigt den Tooltip an.
3.  **Mobile:** Das "Mehr"-Dropdown ist ausgeblendet.
4.  **Mobile:** Im Tools-Overlay sind die Buttons untereinander/im Grid mit Labels sichtbar.
5.  **Interaktion:** Klick auf einen Link im "Mehr"-Dropdown führt zur korrekten Seite.
