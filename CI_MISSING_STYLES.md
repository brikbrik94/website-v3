# Vorschläge für CI-Erweiterungen (oe5ith-ci)

Dieses Dokument listet alle CSS-Klassen, Hilfsklassen und Komponenten-Erweiterungen auf, die in `oe5ith-ci` (Stand v1.0) fehlen, aber für eine saubere, inline-css-freie Kartendarstellung und InfoPage benötigt werden.

Diese Klassen wurden im Projekt temporär in `src/app.css` definiert und sollten bei Gelegenheit in das Upstream-Repo `oe5ith-ci` überführt werden.

---

## 1. Allgemeine Utilities (`oe5ith-ci/css/utils.css`)

### Textausrichtung & Opazität
```css
.text-center { text-align: center; }
.text-left   { text-align: left; }
.opacity-50  { opacity: 0.5; }
.hidden      { display: none !important; }

```

### Flexbox & Layout
```css
.flex-1 { flex: 1; }
.flex-2 { flex: 2; }
.w-full { width: 100%; }
.flex-align-center { display: flex; align-items: center; }
.flex-col { display: flex; flex-direction: column; }
.justify-between { justify-content: space-between; }
.gap-4 { gap: 4px; }


/* Tabellen-Wrapper für horizontales Scrollen auf Mobile */
.table-wrapper {
  overflow-x: auto;
  width: 100%;
}
```

### Spacing & Margin Resets
```css
.m-0  { margin: 0; }
.mt-0 { margin-top: 0; }
.mt-8 { margin-top: 8px; }
.mt-12 { margin-top: 12px; }
.mb-8  { margin-bottom: 8px; }
.pb-0 { padding-bottom: 0; }
.p-double-gap { padding: calc(2 * var(--card-gap)); }
.mb-1-5-gap   { margin-bottom: calc(1.5 * var(--card-gap)); }
.p-2rem { padding: 2rem; }
```

### Borders & Decoration
```css
.border-none { border: none; }
```

---

## 2. Text- & Farb-Utilities (`oe5ith-ci/css/typography.css`)

```css
/* Schriftgewichtungen */
.font-medium    { font-weight: 500; }
.font-semibold  { font-weight: 600; }

/* Textfarben basierend auf CI-Tokens */
.t-success { color: var(--success); }
.t-danger  { color: var(--danger); }
.t-muted   { color: var(--muted); }
.t-subtle  { color: var(--subtle); }
.t-white   { color: var(--white); }
```

---

## 3. Sidebar-Erweiterungen (`oe5ith-ci/css/sidebar.css`)

### Dot-Default-Hintergrund
Der Dot im Accordion-Header sollte standardmäßig die Akzentfarbe haben:
```css
.acc-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--accent); /* Hinzufügen! */
}
```

### Lade- und Fehlerzustände im Accordion-Body
Wenn Layer asynchron geladen werden, werden oft Loading/Error-Hinweise gerendert:
```css
.acc-item.loading-state {
  padding-left: 24px;
  color: var(--subtle);
  font-size: 0.8rem;
}
.acc-item.error-state {
  padding-left: 24px;
  color: var(--danger);
  font-size: 0.8rem;
}
```

---

## 4. Spezifische Komponenten-Klassen

### Sprites & Asset Previews (`oe5ith-ci/css/cards.css`)
Für quadratische Icon-/Bildvorschauen innerhalb von Cards (z.B. im Inventory-Debugger):
```css
.sprite-preview-img {
  width: 20px;
  height: 20px;
  padding: 2px;
  border-radius: var(--badge-radius);
  background: var(--bg);
  object-fit: contain;
}
```

### Tabellen-Spaltenbreite & Border-Collapse (`oe5ith-ci/css/page.css` oder neue Klasse)
```css
/* Generelle Utility-Klasse für Tabellenbreiten */
.table-col-25 {
  width: 25%;
}

.border-collapse {
  border-collapse: collapse;
}

/* Deaktiviert Punkt-Hintergrund für reine Icon-Status-Anzeigen */
.no-dot-bg {
  background: none !important;
  box-shadow: none !important;
}

.pos-relative {
  position: relative;
}

.coord-header-status {
  font-size: 0.65rem;
  color: var(--subtle);
  font-weight: 500;
}

.cursor-pointer {
  cursor: pointer;
}

.t-tiny {
  font-size: 0.75rem;
}
```
