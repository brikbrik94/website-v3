# Mobile-Topbar-Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auf Mobile (≤768px) alle 5 Navigationsziele (Routing, Luftrettung, Karte, Umrechner, Tracking) über das bestehende „Mehr"-Dropdown erreichbar machen — aktuell sind Karte/Umrechner/Tracking dort gar nicht erreichbar.

**Architecture:** Reines Markup-/CSS-Update in zwei strukturell identischen, aber unabhängigen Topbar-Nav-Stellen (`src/components/Topbar.ts` für Kartenseiten, `src/main.ts` für die Landing-Page) plus ein CSS-Override-Tausch in `src/app.css`. Kein neues JS-Verhalten — die bestehende Dropdown-Open/Close-Logik und der globale `.nav-link`-Router-Handler funktionieren unverändert für die neuen Einträge.

**Tech Stack:** Vanilla TypeScript/HTML-Template-Strings, CSS Media Queries, bestehende `oe5ith-ci`-Topbar-Klassen (`.topbar-nav-link`, `.topbar-nav-dropdown`, `.topbar-nav-dropdown-item`).

**Referenz-Spec:** [docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md](../specs/2026-07-07-mobile-topbar-nav-design.md)

## Global Constraints

- Desktop (≥1025px) und Tablet (769–1024px) bleiben optisch/funktional unverändert (2 Quicklinks + 3er-Dropdown wie bisher).
- Kein Fix im `oe5ith-ci`-Submodul selbst (`src/styles/topbar.css` ist eine 1:1-Sync-Kopie) — alle neuen Overrides gehören in `src/app.css`.
- Kein neues JS — nur Markup-Erweiterung (neue `<a>`-Einträge) und CSS.
- `npx tsc --noEmit && npm test` muss grün bleiben.
- Live-Verifikation (Playwright, mehrere Breakpoints) vor Abschluss.
- Jeder Task endet mit einem eigenen Commit (Conventional Commits, deutsches Subject).

---

### Task 1: `Topbar.ts` (Kartenseiten) + CSS-Override-Tausch

**Files:**
- Modify: `src/components/Topbar.ts:100-112`
- Modify: `src/app.css:77-87`

**Interfaces:**
- Produces: neue CSS-Klasse `.topbar-nav-dropdown-item--mobile-only` (Default: `display: none`, ab `max-width: 768px`: `display: flex`) und `.topbar-nav-dropdown` auf Mobile sichtbar (`display: block !important`) — Task 2 verlässt sich auf dieselben Klassennamen/Regeln (definiert hier, nicht erneut).

- [ ] **Step 1: `src/components/Topbar.ts` Nav-Markup ändern**

Zeilen 100-112 (aktuell):

```html
        <a href="/routing" class="topbar-nav-link topbar-nav-link--mobile nav-link ${currentPath === '/routing' ? 'active' : ''}">Routing</a>
        <a href="/nah" class="topbar-nav-link topbar-nav-link--mobile nav-link ${currentPath === '/nah' ? 'active' : ''}">Luftrettung</a>

        <div class="topbar-nav-dropdown">
          <button class="topbar-nav-dropdown-toggle" id="nav-dropdown-toggle" aria-haspopup="menu" aria-expanded="false">
            Mehr <span class="chevron">▾</span>
          </button>
          <div class="topbar-nav-dropdown-menu" id="nav-dropdown-menu" role="menu">
            <a href="/karte" class="topbar-nav-dropdown-item nav-link ${currentPath === '/karte' ? 'active' : ''}" role="menuitem">Karte</a>
            <a href="/coords" class="topbar-nav-dropdown-item nav-link ${currentPath === '/coords' ? 'active' : ''}" role="menuitem">Umrechner</a>
            <a href="/tracking" class="topbar-nav-dropdown-item nav-link ${currentPath === '/tracking' ? 'active' : ''}" role="menuitem">Tracking</a>
          </div>
        </div>
```

Ersetzen durch:

```html
        <a href="/routing" class="topbar-nav-link nav-link ${currentPath === '/routing' ? 'active' : ''}">Routing</a>
        <a href="/nah" class="topbar-nav-link nav-link ${currentPath === '/nah' ? 'active' : ''}">Luftrettung</a>

        <div class="topbar-nav-dropdown">
          <button class="topbar-nav-dropdown-toggle" id="nav-dropdown-toggle" aria-haspopup="menu" aria-expanded="false">
            Mehr <span class="chevron">▾</span>
          </button>
          <div class="topbar-nav-dropdown-menu" id="nav-dropdown-menu" role="menu">
            <a href="/routing" class="topbar-nav-dropdown-item topbar-nav-dropdown-item--mobile-only nav-link ${currentPath === '/routing' ? 'active' : ''}" role="menuitem">Routing</a>
            <a href="/nah" class="topbar-nav-dropdown-item topbar-nav-dropdown-item--mobile-only nav-link ${currentPath === '/nah' ? 'active' : ''}" role="menuitem">Luftrettung</a>
            <a href="/karte" class="topbar-nav-dropdown-item nav-link ${currentPath === '/karte' ? 'active' : ''}" role="menuitem">Karte</a>
            <a href="/coords" class="topbar-nav-dropdown-item nav-link ${currentPath === '/coords' ? 'active' : ''}" role="menuitem">Umrechner</a>
            <a href="/tracking" class="topbar-nav-dropdown-item nav-link ${currentPath === '/tracking' ? 'active' : ''}" role="menuitem">Tracking</a>
          </div>
        </div>
```

(Die `topbar-nav-link--mobile`-Klasse entfällt bei den beiden Quicklinks — sie wird nach diesem
Task nirgends mehr referenziert und in Step 2 aus dem CSS entfernt.)

- [ ] **Step 2: `src/app.css` Override-Block tauschen**

Zeilen 77-87 (aktuell):

```css
/* ═══════════════════════════════════════
   TOPBAR MOBILE OVERRIDES
   Erlaubt spezifische Navigations-Links auf Mobile
   ═══════════════════════════════════════ */
@media (max-width: 768px) {
  .topbar-nav-link--mobile {
    display: flex !important;
    font-size: 0.75rem;
    padding: 4px 8px;
  }
}
```

Ersetzen durch:

```css
/* ═══════════════════════════════════════
   TOPBAR MOBILE OVERRIDES
   Auf Mobile zeigt das "Mehr"-Dropdown alle 5 Nav-Ziele
   statt nur Karte/Umrechner/Tracking; die zwei Desktop/
   Tablet-Quicklinks (Routing/Luftrettung) werden dafür
   ausgeblendet (CI-Standardverhalten für .topbar-nav-link
   greift dann wieder unverändert).
   ═══════════════════════════════════════ */
@media (max-width: 768px) {
  .topbar-nav-dropdown {
    display: block !important;
  }

  .topbar-nav-dropdown-item--mobile-only {
    display: flex;
  }
}

/* Desktop/Tablet: die zusätzlichen Mobile-Einträge im Dropdown ausblenden
   (dort bleiben Routing/Luftrettung als eigenständige Quicklinks) */
.topbar-nav-dropdown-item--mobile-only {
  display: none;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Live-Check (Kartenseite, Playwright gegen laufenden Dev-Server)**

Dev-Server muss laufen (`npm run dev`, siehe `CLAUDE.md`). Playwright-Skript:
1. `/nah` mit Viewport `375x700` öffnen.
2. Prüfen: kein `.topbar-nav-link` sichtbar (Routing/Luftrettung als Quicklinks weg), aber
   `#nav-dropdown-toggle` sichtbar (`getComputedStyle(...).display !== 'none'` auf
   `.topbar-nav-dropdown` und dem Toggle-Button selbst).
3. Auf `#nav-dropdown-toggle` klicken, prüfen: `#nav-dropdown-menu` zeigt 5 sichtbare
   `.topbar-nav-dropdown-item`-Einträge in der Reihenfolge Routing, Luftrettung, Karte,
   Umrechner, Tracking (Text-Inhalt der `<a>`-Elemente in dieser Reihenfolge auslesen).
4. Viewport auf `1200x800` (Desktop) ändern (`page.setViewportSize`), Seite neu laden: beide
   Quicklinks (`.topbar-nav-link`, ohne die `--mobile-only`-Dropdown-Duplikate) wieder sichtbar,
   `#nav-dropdown-menu` (falls geöffnet geprüft) zeigt weiterhin nur die 3 ursprünglichen
   Einträge (Karte, Umrechner, Tracking) als sichtbar — die zwei `--mobile-only`-Duplikate
   dürfen bei Desktop-Breite nicht sichtbar sein (`display: none`).

Expected: alle vier Punkte bestätigt.

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar.ts src/app.css
git commit -m "$(cat <<'EOF'
feat(ui): Mobile-Topbar zeigt alle 5 Nav-Ziele im "Mehr"-Dropdown

Kartenseiten (Topbar.ts): Karte/Umrechner/Tracking waren auf Mobile über
die Topbar nicht erreichbar (Dropdown komplett ausgeblendet). Routing/
Luftrettung sind jetzt zusätzlich als Mobile-only-Einträge im Dropdown,
die zwei Quicklinks folgen auf Mobile wieder dem CI-Standardverhalten
(ausgeblendet). Desktop/Tablet unverändert.
EOF
)"
```

---

### Task 2: `main.ts` (Landing-Page) + TODO.md-Fund + Live-Verifikation

**Files:**
- Modify: `src/main.ts:36-50`
- Modify: `TODO.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `.topbar-nav-dropdown-item--mobile-only`-CSS-Regel und `.topbar-nav-dropdown`-Mobile-Override (Task 1, `src/app.css`) — identisches Markup-Muster wie in Task 1, keine neuen Klassen.

- [ ] **Step 1: `src/main.ts` Nav-Markup identisch zu Task 1 ändern**

Zeilen 36-50 (aktuell):

```html
      <div class="topbar-right">
        <a href="/routing" class="topbar-nav-link topbar-nav-link--mobile nav-link ${currentPath === '/routing' ? 'active' : ''}">Routing</a>
        <a href="/nah" class="topbar-nav-link topbar-nav-link--mobile nav-link ${currentPath === '/nah' ? 'active' : ''}">Luftrettung</a>

        <div class="topbar-nav-dropdown">
          <button class="topbar-nav-dropdown-toggle" id="nav-dropdown-toggle" aria-haspopup="menu" aria-expanded="false">
            Mehr <span class="chevron">▾</span>
          </button>
          <div class="topbar-nav-dropdown-menu" id="nav-dropdown-menu" role="menu">
            <a href="/karte" class="topbar-nav-dropdown-item nav-link ${currentPath === '/karte' ? 'active' : ''}" role="menuitem">Karte</a>
            <a href="/coords" class="topbar-nav-dropdown-item nav-link ${currentPath === '/coords' ? 'active' : ''}" role="menuitem">Umrechner</a>
            <a href="/tracking" class="topbar-nav-dropdown-item nav-link ${currentPath === '/tracking' ? 'active' : ''}" role="menuitem">Tracking</a>
          </div>
        </div>
      </div>
```

Ersetzen durch:

```html
      <div class="topbar-right">
        <a href="/routing" class="topbar-nav-link nav-link ${currentPath === '/routing' ? 'active' : ''}">Routing</a>
        <a href="/nah" class="topbar-nav-link nav-link ${currentPath === '/nah' ? 'active' : ''}">Luftrettung</a>

        <div class="topbar-nav-dropdown">
          <button class="topbar-nav-dropdown-toggle" id="nav-dropdown-toggle" aria-haspopup="menu" aria-expanded="false">
            Mehr <span class="chevron">▾</span>
          </button>
          <div class="topbar-nav-dropdown-menu" id="nav-dropdown-menu" role="menu">
            <a href="/routing" class="topbar-nav-dropdown-item topbar-nav-dropdown-item--mobile-only nav-link ${currentPath === '/routing' ? 'active' : ''}" role="menuitem">Routing</a>
            <a href="/nah" class="topbar-nav-dropdown-item topbar-nav-dropdown-item--mobile-only nav-link ${currentPath === '/nah' ? 'active' : ''}" role="menuitem">Luftrettung</a>
            <a href="/karte" class="topbar-nav-dropdown-item nav-link ${currentPath === '/karte' ? 'active' : ''}" role="menuitem">Karte</a>
            <a href="/coords" class="topbar-nav-dropdown-item nav-link ${currentPath === '/coords' ? 'active' : ''}" role="menuitem">Umrechner</a>
            <a href="/tracking" class="topbar-nav-dropdown-item nav-link ${currentPath === '/tracking' ? 'active' : ''}" role="menuitem">Tracking</a>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Typecheck + volle Test-Suite**

Run: `npx tsc --noEmit && npm test`
Expected: keine Fehler, alle bestehenden Tests weiterhin grün.

- [ ] **Step 3: Live-Verifikation (Playwright gegen laufenden Dev-Server)**

1. `/` (Landing-Page) mit Viewport `375x700` öffnen. Gleiche vier Prüfpunkte wie in Task 1
   Step 4 (kein Quicklink sichtbar, Dropdown-Toggle sichtbar, 5 Einträge in korrekter
   Reihenfolge nach Klick, Desktop-Viewport zeigt wieder 2 Quicklinks + nur 3 sichtbare
   Dropdown-Einträge), diesmal gegen `/` statt `/nah`.
2. Zusätzlich: Tablet-Viewport `900x800` auf `/` und `/nah` — Regressionstest, dass sich
   gegenüber dem bisherigen (unveränderten) Tablet-Verhalten nichts geändert hat: 2 Quicklinks
   sichtbar, „Mehr"-Dropdown mit 3 Einträgen (Karte, Umrechner, Tracking) sichtbar.
3. Konsolenfehler sammeln (`page.on('console')`/`page.on('pageerror')`) über den gesamten
   Ablauf: keine Fehler.

Expected: alle Punkte bestätigt, keine Konsolenfehler.

- [ ] **Step 4: `TODO.md` aktualisieren**

Im Abschnitt „UI/UX & Branding (Sammeltask)" den Punkt „Mobilansicht: Quicklinks in der Topbar
durch das Dropdown ersetzen" durch folgende Zeilen ersetzen:

```markdown
- [x] **Mobilansicht: Quicklinks in der Topbar durch das Dropdown ersetzt** (2026-07-07) — siehe
  [docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md](./docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md).
  War tatsächlich kein „beengt"-Problem, sondern ein Reachability-Bug: Karte/Umrechner/Tracking
  waren auf Mobile über die Topbar gar nicht erreichbar (Dropdown komplett ausgeblendet).
- [ ] **Topbar-Nav-Markup ist zwischen `src/components/Topbar.ts` und `src/main.ts` dupliziert**
  (Landing-Page nutzt `Topbar.ts` nicht, hat eine eigene Kopie derselben Nav-Struktur) —
  gefunden beim Mobile-Topbar-Nav-Fix (2026-07-07). Mögliches künftiges Refactoring: gemeinsame
  Komponente/Helper für beide Stellen, bisher aber nur als Fund dokumentiert, nicht umgesetzt.
```

- [ ] **Step 5: `CHANGELOG.md`-Eintrag ergänzen**

Neuen `[Unreleased]`-Block oben einfügen (nicht mit bestehendem Block mergen):

```markdown
## [Unreleased] - 2026-07-07 <HH:MM einsetzen>

### Behoben
- **Mobile Topbar: Karte/Umrechner/Tracking waren nicht erreichbar** (`src/components/Topbar.ts`,
  `src/main.ts`, Design:
  [docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md](./docs/superpowers/specs/2026-07-07-mobile-topbar-nav-design.md)).
  Die CI-Basis blendet `.topbar-nav-dropdown` auf Mobile (≤768px) komplett aus; ein bestehender
  website-v3-Override zeigte zwar die zwei Quicklinks (Routing/Luftrettung) wieder an, aber
  das „Mehr"-Dropdown blieb unsichtbar — die drei darin enthaltenen Seiten waren über die
  Topbar auf Mobile nicht erreichbar. Alle 5 Ziele erscheinen jetzt auf Mobile im „Mehr"-Dropdown
  (Routing, Luftrettung, Karte, Umrechner, Tracking); Desktop/Tablet unverändert (2 Quicklinks +
  3er-Dropdown). Betraf zwei Stellen (`Topbar.ts` für Kartenseiten, `main.ts` für die
  Landing-Page — beide haben eine eigene, unabhängige Kopie derselben Nav-Struktur, als
  TODO.md-Punkt dokumentiert). Live verifiziert (Playwright, Mobile/Tablet/Desktop-Viewports auf
  `/` und `/nah`).

`npx tsc --noEmit && npm test` grün.
```

- [ ] **Step 6: Commit**

```bash
git add src/main.ts TODO.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
fix(ui): Mobile-Topbar auf der Landing-Page ebenfalls alle 5 Nav-Ziele

Identischer Fix wie in Topbar.ts (Kartenseiten) für die unabhängige
Nav-Markup-Kopie in main.ts. TODO.md/CHANGELOG.md aktualisiert,
Markup-Duplikation zwischen beiden Stellen als eigener TODO.md-Punkt
dokumentiert.
EOF
)"
```

## Self-Review (bereits durchgeführt)

- **Spec-Abdeckung:** CSS-Mechanismus + Klassennamen (Task 1), beide betroffenen Dateien
  (Task 1: `Topbar.ts`, Task 2: `main.ts`), Reihenfolge im Dropdown, Tablet/Desktop-Regression,
  Duplikations-Dokumentation (Task 2) — alle Abschnitte der Spec sind abgedeckt.
- **Placeholder-Scan:** keine TBD/TODO, kein "ähnlich wie Task N" — beide Markup-Blöcke sind
  vollständig und exakt; der einzige echte Platzhalter (`<HH:MM einsetzen>` im
  CHANGELOG-Schritt) ist eine bewusste Anweisung an den Ausführenden, echte Zeit einzusetzen,
  keine unvollständige Spezifikation.
- **Typ-/Konsistenz-Check:** `.topbar-nav-dropdown-item--mobile-only` und die
  `.topbar-nav-dropdown`-Mobile-Regel werden in Task 1 definiert und in Task 2 identisch
  (gleicher Klassenname, gleiche erwartete Wirkung) wiederverwendet — kein Drift.
