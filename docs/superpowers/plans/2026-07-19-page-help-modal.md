# Seiten-Hilfe (Topbar-Button + Modal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein runder „?"-Button in der Topbar (neben der Legende) öffnet pro Kartenseite ein Modal mit kurzer, seitenspezifischer Bedienhilfe.

**Architecture:** Drei fokussierte Bausteine — ein reines Daten-Modul (`HELP_CONTENT`, keyed nach Seitenpfad), ein generisches Modal in `GlobalModals.ts` (analog Changelog/Copyright, Body live befüllt bei `open-help`-Event), und ein `.btn-help`-Button in `Topbar.ts` neben `.btn-legend`, der das Event auslöst und nur gerendert wird, wenn für den aktuellen Pfad ein `HELP_CONTENT`-Eintrag existiert.

**Tech Stack:** Vanilla TypeScript, Vite, Vitest. Kein neuer Endpoint, keine neue CSS-Datei, kein neuer Router-Pfad.

**Spec:** [docs/superpowers/specs/2026-07-19-page-help-modal-design.md](../specs/2026-07-19-page-help-modal-design.md)

## Global Constraints

- Scope: nur die 6 Kartenseiten `/karte`, `/routing`, `/nah`, `/coords`, `/tracking`, `/isochrones`. Kein Button/Modal auf Landing-Page oder `/info/*`.
- UI-Texte und Code-Kommentare auf Deutsch (Repo-Konvention).
- Vor jedem Commit: `npx tsc --noEmit && npm test` muss grün sein.
- Dateien immer explizit stagen (`git add <datei>`), nie `git add -A`.
- Vor `git add` auf `docs/TODO.md`/`docs/CHANGELOG.md` (Sammel-Dateien) per `git diff <datei>` prüfen, dass der Diff wirklich nur die eigene Änderung enthält.
- Conventional-Commits-Präfixe, deutscher Subject-Text.
- Das Spec-Dokument (`docs/superpowers/specs/2026-07-19-page-help-modal-design.md`) ist noch **nicht** committet — es reitet mit dem ersten Code-Commit (Task 1) mit, kein eigener Doku-Commit (Repo-Konvention).
- Kein Playwright/Browser-Zugriff hier verfügbar — Live-Verifikation (Button-Platzierung, Modal-Optik, mobile Ansicht) bleibt nach Abschluss der Umsetzung dem Nutzer überlassen.

---

### Task 1: Content-Modul `HelpContent.ts`

**Files:**
- Create: `src/content/HelpContent.ts`
- Test: `src/content/HelpContent.test.ts`
- Commit (zusätzlich, nicht separat): `docs/superpowers/specs/2026-07-19-page-help-modal-design.md`, `docs/superpowers/plans/2026-07-19-page-help-modal.md`

**Interfaces:**
- Produces: `export interface HelpSection { heading: string; body: string; }`, `export interface HelpEntry { title: string; sections: HelpSection[]; }`, `export const HELP_CONTENT: Record<string, HelpEntry>` — konsumiert von Task 2 (`GlobalModals.ts`) und Task 3 (`Topbar.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/content/HelpContent.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { HELP_CONTENT } from './HelpContent';

const EXPECTED_PATHS = ['/karte', '/routing', '/nah', '/coords', '/tracking', '/isochrones'];

describe('HELP_CONTENT', () => {
  it('has an entry for each of the 6 feature pages', () => {
    EXPECTED_PATHS.forEach((path) => {
      expect(HELP_CONTENT[path]).toBeDefined();
    });
  });

  it('has no entries outside the 6 feature pages', () => {
    expect(Object.keys(HELP_CONTENT).sort()).toEqual([...EXPECTED_PATHS].sort());
  });

  it('gives every entry a non-empty title and at least one section', () => {
    Object.values(HELP_CONTENT).forEach((entry) => {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.sections.length).toBeGreaterThan(0);
    });
  });

  it('gives every section a non-empty heading and body', () => {
    Object.values(HELP_CONTENT).forEach((entry) => {
      entry.sections.forEach((section) => {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/HelpContent.test.ts`
Expected: FAIL — `Cannot find module './HelpContent'` (Datei existiert noch nicht).

- [ ] **Step 3: Write the implementation**

Create `src/content/HelpContent.ts`:

```ts
export interface HelpSection {
  heading: string;
  body: string;
}

export interface HelpEntry {
  title: string;
  sections: HelpSection[];
}

export const HELP_CONTENT: Record<string, HelpEntry> = {
  '/karte': {
    title: 'Karte',
    sections: [
      {
        heading: 'Ebenen & Objekte',
        body: 'Über die Legende lassen sich einzelne Kartenebenen ein- und ausblenden. Ein Klick auf eine bereits aktive Ebene in der Legende blendet nur diese wieder aus.'
      },
      {
        heading: 'Erkunden',
        body: 'Ein Klick auf Straßen, Gemeinden, Höhenlinien oder Rettungsdienst-Stationen öffnet ein Infofenster mit den Details des angeklickten Objekts. Über die Seitenleiste lassen sich außerdem Adressen suchen und der eigene Standort anzeigen.'
      }
    ]
  },
  '/routing': {
    title: 'Routing',
    sections: [
      {
        heading: 'Route berechnen',
        body: 'Start- und Zielpunkt werden per Rechtsklick (auf Touch-Geräten durch langes Halten) auf der Karte gesetzt, oder über die Adresssuche. Anschließend wird ein Fahrprofil gewählt und die Route berechnet.'
      },
      {
        heading: 'Ergebnis',
        body: 'Zur berechneten Route gibt es eine ausklappbare Schritt-für-Schritt-Wegbeschreibung mit Abbiege-Symbolen. Über einen Teilen-Link lässt sich die Route inklusive Start, Ziel und Fahrprofil an andere weitergeben.'
      }
    ]
  },
  '/nah': {
    title: 'Luftrettung',
    sections: [
      {
        heading: 'Status auf der Karte',
        body: 'Farbe und Symbol der Marker zeigen die aktuelle Verfügbarkeit der Rettungsdienst-Stützpunkte. Liegen mehrere Hubschrauber am selben Standort, erscheinen sie als ein Marker mit einem Anzahl-Badge.'
      },
      {
        heading: 'Details',
        body: 'Ein Klick auf einen Marker öffnet die Details zu allen Stationen an diesem Standort.'
      }
    ]
  },
  '/coords': {
    title: 'Umrechner',
    sections: [
      {
        heading: 'Formate',
        body: 'Eine Koordinate lässt sich in einem beliebigen Format eingeben — WGS84 (Grad/Minuten/Sekunden), UTM, BMN, MGRS oder Maidenhead — alle anderen Felder aktualisieren sich automatisch.'
      },
      {
        heading: 'Punkt auf der Karte',
        body: 'Ein Rechtsklick (auf Touch-Geräten langes Halten) auf der Karte übernimmt die Koordinate an dieser Stelle. Die Wanderwege-Ebene lässt sich optional dazuschalten.'
      }
    ]
  },
  '/tracking': {
    title: 'Live Tracking',
    sections: [
      {
        heading: 'Live-Daten',
        body: 'Flugzeuge (ADS-B) und Schiffe (AIS) in der Region werden laufend aktualisiert; die Symbole zeigen Kategorie und Kurs.'
      },
      {
        heading: 'Filtern',
        body: 'Über die Auswahl „Alle / ADS-B / AIS" in der Seitenleiste lässt sich die Anzeige auf eine der beiden Quellen eingrenzen.'
      }
    ]
  },
  '/isochrones': {
    title: 'Isochronen',
    sections: [
      {
        heading: 'Punkt & Profil',
        body: 'Ein Punkt wird per Kartenklick, Adresssuche oder manueller Koordinaten-Eingabe gesetzt. Danach werden Fahrprofil sowie die gewünschten Zeit- oder Distanz-Ringe gewählt.'
      },
      {
        heading: 'Ergebnisse verwalten',
        body: 'Mehrere Abfragen lassen sich gleichzeitig anzeigen und über das Augen-Symbol einzeln ein- oder ausblenden — praktisch, um verschiedene Standorte zu vergleichen.'
      }
    ]
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/HelpContent.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/content/HelpContent.ts src/content/HelpContent.test.ts docs/superpowers/specs/2026-07-19-page-help-modal-design.md docs/superpowers/plans/2026-07-19-page-help-modal.md
git commit -m "feat(help): Content-Modul für seitenspezifische Hilfetexte"
```

---

### Task 2: Hilfe-Modal in `GlobalModals.ts`

**Files:**
- Modify: `src/lib/GlobalModals.ts`

**Interfaces:**
- Consumes: `HELP_CONTENT` aus `../content/HelpContent` (Task 1).
- Produces: DOM-Element `#help-modal` (mit `#help-modal-title`, `#help-modal-body`), reagiert auf `window`-Event `'open-help'` (kein Payload) — konsumiert von Task 3 (`Topbar.ts` dispatcht das Event).

- [ ] **Step 1: Import HELP_CONTENT**

In `src/lib/GlobalModals.ts`, Zeile 1, ändern von:

```ts
import { APP_VERSION } from '../version';
```

zu:

```ts
import { APP_VERSION } from '../version';
import { HELP_CONTENT } from '../content/HelpContent';
```

- [ ] **Step 2: Modal-Markup ergänzen**

Im selben File das Ende des Copyright-Modals (kurz vor dem schließenden Template-Literal) finden:

```html
          <h2>Software</h2>
          <p>© 2026 OE5ITH Cloud Services. Alle Rechte vorbehalten.</p>
          <p class="t-tiny t-subtle">Anwendung Version: ${APP_VERSION}</p>
        </div>
      </div>
    </div>
  `;
```

Ersetzen durch (neues Modal direkt danach eingefügt, vor dem schließenden Backtick):

```html
          <h2>Software</h2>
          <p>© 2026 OE5ITH Cloud Services. Alle Rechte vorbehalten.</p>
          <p class="t-tiny t-subtle">Anwendung Version: ${APP_VERSION}</p>
        </div>
      </div>
    </div>

    <!-- Help Modal (seiten-spezifische Kurzhilfe, Inhalt live befüllt bei open-help) -->
    <div class="modal-backdrop" id="help-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="help-modal-title"></span>
          <button class="modal-close" data-close="help-modal"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body" id="help-modal-body"></div>
      </div>
    </div>
  `;
```

- [ ] **Step 3: Event-Listener ergänzen**

Im selben File finden:

```ts
  window.addEventListener('open-copyright', () => {
    document.getElementById('copyright-modal')?.classList.add('open');
  });

  // Close Logic via Delegation
```

Ersetzen durch:

```ts
  window.addEventListener('open-copyright', () => {
    document.getElementById('copyright-modal')?.classList.add('open');
  });

  window.addEventListener('open-help', () => {
    const entry = HELP_CONTENT[window.location.pathname];
    if (!entry) return;
    document.getElementById('help-modal-title')!.textContent = entry.title;
    document.getElementById('help-modal-body')!.innerHTML = entry.sections
      .map((s) => `<h3>${s.heading}</h3><p>${s.body}</p>`)
      .join('');
    document.getElementById('help-modal')?.classList.add('open');
  });

  // Close Logic via Delegation
```

Das bestehende `mount.addEventListener('click', ...)` weiter unten (Backdrop-Klick, `.modal-close`-Button) greift automatisch auch für `#help-modal` — keine weitere Änderung nötig.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 5: Tests laufen lassen (Regressionscheck)**

Run: `npm test`
Expected: alle bisherigen Tests weiterhin grün (kein Test deckt `GlobalModals.ts` direkt ab, aber Task 1s Tests müssen weiter grün bleiben)

- [ ] **Step 6: Commit**

```bash
git add src/lib/GlobalModals.ts
git commit -m "feat(help): generisches Hilfe-Modal in GlobalModals ergänzt"
```

---

### Task 3: „?"-Button in `Topbar.ts`

**Files:**
- Modify: `src/components/Topbar.ts`

**Interfaces:**
- Consumes: `HELP_CONTENT` aus `../content/HelpContent` (Task 1); dispatcht `window.dispatchEvent(new CustomEvent('open-help'))`, konsumiert von Task 2s Listener.

- [ ] **Step 1: Import HELP_CONTENT**

In `src/components/Topbar.ts`, Zeile 1–4 ändern von:

```ts
import { MapItem } from '../types/inventory';
import { TerrainControls } from './TerrainControls';
import { BasemapStore } from '../lib/BasemapStore';
import { renderTopbarNav } from './TopbarNav';
```

zu:

```ts
import { MapItem } from '../types/inventory';
import { TerrainControls } from './TerrainControls';
import { BasemapStore } from '../lib/BasemapStore';
import { renderTopbarNav } from './TopbarNav';
import { HELP_CONTENT } from '../content/HelpContent';
```

- [ ] **Step 2: helpEntry berechnen**

Im selben File finden:

```ts
  const hasMap = basemaps.length > 0;
  const currentPath = window.location.pathname;
```

Ersetzen durch:

```ts
  const hasMap = basemaps.length > 0;
  const currentPath = window.location.pathname;
  const helpEntry = HELP_CONTENT[currentPath];
```

- [ ] **Step 3: Desktop-Button ergänzen**

Im selben File (Desktop `controls-panel`) finden:

```html
            <button class="topbar-toggle topbar-toggle--icon-only btn-legend" data-tooltip="Legende">
              <i class="fa-solid fa-list-ul"></i>
              <span class="topbar-toggle-label">Legende</span>
            </button>
          </div>

          <!-- Tablet Toggle -->
```

Ersetzen durch:

```html
            <button class="topbar-toggle topbar-toggle--icon-only btn-legend" data-tooltip="Legende">
              <i class="fa-solid fa-list-ul"></i>
              <span class="topbar-toggle-label">Legende</span>
            </button>
            ${helpEntry ? `
            <button class="topbar-toggle topbar-toggle--icon-only btn-help" data-tooltip="Hilfe">
              <i class="fa-solid fa-circle-question"></i>
              <span class="topbar-toggle-label">Hilfe</span>
            </button>
            ` : ''}
          </div>

          <!-- Tablet Toggle -->
```

- [ ] **Step 4: Mobile-Button ergänzen**

Im selben File (mobiles `controls-overlay` / `.controls-btn-group`) finden:

```html
          <button class="topbar-toggle btn-legend">
            <i class="fa-solid fa-list-ul"></i> 
            <span class="topbar-toggle-label">Legende</span>
          </button>
        </div>
      </div>
      ` : ''}
```

Ersetzen durch:

```html
          <button class="topbar-toggle btn-legend">
            <i class="fa-solid fa-list-ul"></i> 
            <span class="topbar-toggle-label">Legende</span>
          </button>
          ${helpEntry ? `
          <button class="topbar-toggle btn-help">
            <i class="fa-solid fa-circle-question"></i>
            <span class="topbar-toggle-label">Hilfe</span>
          </button>
          ` : ''}
        </div>
      </div>
      ` : ''}
```

- [ ] **Step 5: Klick-Listener ergänzen**

Im selben File (innerhalb des `if (hasMap) { ... }`-Blocks) finden:

```ts
    container.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-legend')) {
        handleLegendToggle();
      }
    });

    // Custom Actions Listeners
```

Ersetzen durch:

```ts
    container.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-legend')) {
        handleLegendToggle();
      }
    });

    // Help Button Listener (öffnet seiten-spezifisches Hilfe-Modal)
    document.querySelectorAll('.btn-help').forEach((btn) => {
      btn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('open-help')));
    });

    // Custom Actions Listeners
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 7: Tests laufen lassen (Regressionscheck)**

Run: `npm test`
Expected: alle Tests weiterhin grün

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: erfolgreicher Build, keine neuen Warnungen außer der bereits bekannten Chunk-Size-Warnung

- [ ] **Step 9: Commit**

```bash
git add src/components/Topbar.ts
git commit -m "feat(help): Hilfe-Button in Topbar neben Legende ergänzt"
```

---

### Task 4: Doku nachziehen (CHANGELOG, TODO.md)

**Files:**
- Modify: `docs/CHANGELOG.md`
- Modify: `docs/TODO.md`

**Interfaces:** keine (reine Doku-Änderungen).

- [ ] **Step 1: CHANGELOG.md — neuen Unreleased-Block ergänzen**

In `docs/CHANGELOG.md`, ganz oben nach der Einleitung (vor dem aktuell obersten `## [...]`-Block) einfügen:

```markdown
## [Unreleased] - <aktuelles Datum + Uhrzeit, Format YYYY-MM-DD HH:mm>

### Hinzugefügt
- **Seiten-Hilfe:** Neuer „?"-Button in der Topbar (neben der Legende) auf den 6 Kartenseiten
  (`/karte`, `/routing`, `/nah`, `/coords`, `/tracking`, `/isochrones`). Öffnet ein Modal mit
  kurzer, seitenspezifischer Bedienhilfe (`src/content/HelpContent.ts`, generisches Modal in
  `GlobalModals.ts` analog zu Changelog/Copyright). Ersetzt die ursprünglich in `TODO.md`
  geplante eigene `/hilfe`-Seite durch einen kontextbezogenen Ansatz. Spec:
  [docs/superpowers/specs/2026-07-19-page-help-modal-design.md](./superpowers/specs/2026-07-19-page-help-modal-design.md).
```

Datum/Uhrzeit vor dem Einfügen ermitteln mit: `date "+%Y-%m-%d %H:%M"`

- [ ] **Step 2: TODO.md — Hilfeseite-Eintrag als erledigt markieren**

In `docs/TODO.md` finden:

```markdown
- [ ] **Hilfeseite** — Übersicht/Beschreibung der App-Funktionen, Einstieg vermutlich über einen
  neuen Topbar-Link (analog zu den bestehenden `.nav-link`-Einträgen in `src/main.ts`).
```

Ersetzen durch:

```markdown
- [x] **Hilfeseite** (2026-07-19) — ✅ ERLEDIGT, aber anders als ursprünglich hier notiert: statt
  einer eigenen `/hilfe`-Seite gibt es jetzt einen „?"-Button in der Topbar (neben der Legende)
  auf den 6 Kartenseiten, der ein seitenspezifisches Kurzhilfe-Modal öffnet
  (`src/content/HelpContent.ts` + Erweiterung von `GlobalModals.ts`/`Topbar.ts`). Nutzer-
  Entscheidung während des Brainstormings (2026-07-19): kontextbezogene Hilfe statt separater
  Übersichtsseite. Spec:
  [docs/superpowers/specs/2026-07-19-page-help-modal-design.md](./superpowers/specs/2026-07-19-page-help-modal-design.md).
```

- [ ] **Step 3: Diff gegenprüfen (Sammel-Dateien!)**

Run: `git diff docs/CHANGELOG.md docs/TODO.md`
Erwartet: der Diff enthält **ausschließlich** die beiden eigenen Änderungen von Step 1 und 2 — keine fremden, noch unstaged liegenden Änderungen anderer Punkte. Falls doch: nur die eigenen Hunks stagen (`git add -p`), nicht die ganze Datei.

- [ ] **Step 4: docs:bausteine-Katalog gegenprüfen (safety net)**

Run: `npm run docs:bausteine`
Erwartet: kein Diff in `docs/architecture/bausteine.md` (weder `GlobalModals.ts` noch `Topbar.ts` haben ihre exportierte Signatur geändert; `HelpContent.ts` liegt unter `src/content/`, nicht `src/lib/`, wird vom Katalog nicht erfasst).

- [ ] **Step 5: Finale Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: alle Tests grün (bisherige + die 4 neuen aus Task 1), keine TypeScript-Fehler.

Run: `npm run build`
Expected: erfolgreicher Build.

- [ ] **Step 6: Commit**

```bash
git add docs/CHANGELOG.md docs/TODO.md
git commit -m "docs(help): CHANGELOG- und TODO-Eintrag für Seiten-Hilfe ergänzt"
```

---

## Nach Abschluss (nicht Teil dieses Plans)

- Live-Verifikation im Browser durch den Nutzer (Button-Platzierung Desktop/Tablet/Mobile,
  Modal-Optik, Backdrop-Klick, Inhalt pro Seite) — kein Playwright hier verfügbar.
- In-App-Changelog (`GlobalModals.ts` `changelog-modal-body`) und Versions-Bump laufen wie
  gehabt erst beim nächsten Release (siehe `CLAUDE.md`-Release-Checkliste), nicht Teil dieses
  Feature-Plans.
