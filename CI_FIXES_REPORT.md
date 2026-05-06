# CI Fixes Report: Topbar Layout Conflict

## Problembeschreibung: "Sticky Elements" in der Topbar

Bei der Integration des neuesten `oe5ith-ci` (Stand 06.05.2026) tritt ein Layout-Fehler auf, bei dem alle Elemente im `.controls-panel` der Topbar ohne Abstand aneinanderkleben.

### Ursache (Architektur-Konflikt)

Der Fehler entsteht durch eine unglückliche Kombination von Komponenten-Styling und Utility-Klassen:

1.  **CI Topbar Logik:** Das CI setzt `.controls-panel { display: contents; }`. Damit "verschwindet" der Container für den Browser und die darin liegenden Buttons werden direkt in der Topbar (die ein `gap: 8px` hat) angeordnet. In diesem Zustand hat `.controls-panel` selbst **keinen** definierten `gap`.
2.  **Utility Klassen Konflikt:** In der Implementierung nutzen wir `<div class="controls-panel desktop-only">`. Die Klasse `.desktop-only` (definiert in `topbar.css` oder `common.css`) setzt jedoch ein hartes `display: flex;`.
3.  **Das Resultat:** Die Utility-Klasse überschreibt `display: contents`. Der Container existiert nun wieder als echtes Flex-Element, hat aber im CI keinen eigenen `gap` definiert. Die Elemente kleben zusammen.

### Fehler-Reproduktion
```html
<!-- Dieser Container klebt zusammen, da .desktop-only das 'contents' überschreibt -->
<div class="controls-panel desktop-only">
  <button>A</button>
  <button>B</button>
</div>
```

---

### Empfohlener Fix für das `oe5ith-ci` Repo

Um das System robust gegen Utility-Klassen zu machen, sollte `.controls-panel` in der `topbar.css` immer einen Fallback-Gap erhalten:

```css
/* In oe5ith-ci/css/topbar.css */
.controls-panel {
  display: contents;
  gap: 8px; /* WICHTIG: Fallback für den Fall, dass display: contents überschrieben wird */
}
```

### Lokale Korrektur (Interim)
Ich habe diesen Fix lokal in `src/styles/topbar.css` angewendet, damit die Website sofort wieder korrekt dargestellt wird. Dieser Fix wird bei jedem CI-Sync überschrieben, bis er im Haupt-Repo (`oe5ith-ci`) gemergt wurde.

---
*Erstellt von Gemini CLI - 06.05.2026*
