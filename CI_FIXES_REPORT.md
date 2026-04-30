# CI-Fixes: Diskrepanzen & Optimierungsbedarf

Dieses Dokument beschreibt die notwendigen Änderungen im `oe5ith-ci` Repository, um die Konsistenz gemäß der `for-coding-agents.md` (Regel #1: Keine Hardcoded-Werte) sicherzustellen und Layout-Fehler auf mobilen Geräten zu beheben.

---

## 1. Z-Index System (common.css)
**Problem:** Viele Komponenten im CI-Repo nutzen hartcodierte Z-Indexe (100, 200, 1000). Dies verstößt gegen die Pflichtregel #1.

**Lösung:** Definition zentraler Z-Index Tokens in `css/common.css`.

```css
/* In :root ergänzen */
--z-map:            1;
--z-sidebar:        100;
--z-topbar:         200;
--z-dropdown:       300;
--z-modal:          1000;
--z-tooltip:        1100;
--z-sidebar-tab:    105; /* Neu für Tabs auf der Sidebar */
```

---

## 2. Mobile Layout Bugfix (common.css)
**Problem:** Auf mobilen Browsern führt `100vh` oft zu Layout-Fehlern (Inhalt verschwindet hinter der Browser-UI). Zudem fehlt ein Token für die reduzierte Topbar-Höhe auf Mobilgeräten.

**Lösung:** Einführung von `--topbar-height-mobile` und einem korrekten Mobile-Reset für `.layout`.

```css
/* In :root ergänzen */
--topbar-height-mobile: 50px;

/* Im Media-Query am Ende von common.css ergänzen */
@media (max-width: 768px) {
  .layout { 
    height: calc(100vh - var(--topbar-height-mobile)); 
    display: flex;
    flex-direction: column;
  }
}
```

---

## 3. Token-Implementierung in Komponenten

Folgende Dateien sollten von hartcodierten Werten auf die neuen Tokens umgestellt werden:

### topbar.css
```css
.topbar { z-index: var(--z-topbar); }
.dropdown-menu { z-index: var(--z-dropdown); }
.topbar-search-result { z-index: var(--z-dropdown); }
.topbar-tab { z-index: var(--z-sidebar-tab); }
```

### sidebar.css
```css
.sidebar { z-index: var(--z-sidebar); }

/* Mobile-Fix */
@media (max-width: 768px) {
  .sidebar {
    top: var(--topbar-height-mobile);
    height: calc(100vh - var(--topbar-height-mobile));
  }
}
```

### page.css & modal.css
- Alle `z-index` Werte durch entsprechende Variablen ersetzen.
- `rgba`-Farbwerte für Overlays möglichst durch Tokens wie `var(--accent-muted)` oder neue Transparenz-Tokens ersetzen.

---

## 4. Karten-Attribution (page.css)
**Problem:** In der neuen Karten-Attribution wird `z-index: 10` verwendet, was oft mit Map-Controls kollidiert.

**Lösung:**
```css
.map-attribution {
  z-index: var(--z-map); /* Oder ein spezifisches Token --z-attribution */
}
```

---

*Erstellt durch Gemini CLI für OE5ITH Website V3.*
