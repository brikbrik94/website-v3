# Routing-Zusammenfassung: Fahrmodus-Icon & Warnungs-Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In der Routing-Sidebar-Zusammenfassungsbox (A→B) das Fahrmodus-Badge durch ein reines Icon links neben der Distanz/Dauer-Kv-Zeile ersetzen und die Warn-Badges (Maut/Zufahrtsbeschränkung) in dieselbe Karte verschieben statt als getrennten Block danach.

**Architecture:** Reine Präsentationsänderung innerhalb `updateRoutingSummary()` (`src/components/RoutingSidebar.ts`) + neue, scoped CSS-Regeln in `src/styles/sidebar.css`. Keine Änderung an Datenfluss, Typen oder `RoutingDetailsFormatter.ts` (liefert weiterhin `{icon, label}` — nur die Render-Stelle nutzt das anders).

**Tech Stack:** Vanilla TypeScript, Vitest (Unit-Tests mit gestubtem `document`, keine echte DOM-Lib), Vanilla CSS mit CI-Tokens (`var(--accent)` etc.).

## Global Constraints

- `npx tsc --noEmit && npm test` muss nach jedem Task grün bleiben (`CLAUDE.md`).
- Keine hartkodierten Farben/Radien/etc. — nur CSS-Tokens aus `src/styles/common.css` (`var(--accent)`, …).
- Bestehende, gemeinsam genutzte Klassen `.result-kv`/`.result-badges` (auch von Stationsliste/Tracking verwendet) dürfen **nicht global verändert** werden — neue Regeln nur scoped über neue Wrapper-/Sibling-Selektoren.
- Deutsche UI-Copy/Kommentare, passend zum Rest der Datei.
- Jeder Task endet mit einem eigenen Commit (Conventional-Commits-Präfix, deutscher Subject).

---

### Task 1: Icon-Layout & Warnungs-Nesting in `updateRoutingSummary()`

**Files:**
- Modify: `src/components/RoutingSidebar.ts:278-316` (Funktion `updateRoutingSummary`)
- Modify: `src/styles/sidebar.css` (nach Zeile 295, direkt nach der bestehenden `.result-badges`-Regel)
- Test: `src/components/RoutingSidebar.test.ts`

**Interfaces:**
- Consumes: `getProfileBadge(profile: string): { icon: string; label: string }` und `getRouteWarnings(extras: RouteExtras | undefined): { icon: string; label: string }[]` aus `src/features/routing/RoutingDetailsFormatter.ts` (unverändert, bereits importiert in `RoutingSidebar.ts:6`).
- Produces: `updateRoutingSummary(distance, duration, title?, profile?, extras?)` — Signatur bleibt exakt gleich, nur das gerenderte HTML ändert sich. Andere Module (`RoutingSidebarAdapter.ts`) rufen sie unverändert auf.

- [ ] **Step 1: Bestehende Tests auf die neue Struktur umschreiben (failing red)**

Ersetze den kompletten Inhalt von `src/components/RoutingSidebar.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateRoutingSummary } from './RoutingSidebar';

function createFakeElement() {
  const classes = new Set<string>();
  return {
    innerHTML: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
  };
}

describe('updateRoutingSummary badges', () => {
  let details: ReturnType<typeof createFakeElement>;

  beforeEach(() => {
    details = createFakeElement();
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'routing-details' ? details : null),
    });
  });

  it('renders no mode icon and no warning badges when only distance/duration are given', () => {
    updateRoutingSummary(1000, 60);
    expect(details.innerHTML).not.toContain('result-mode-icon');
    expect(details.innerHTML).not.toContain('fa-car');
    expect(details.innerHTML).not.toContain('fa-truck-medical');
    expect(details.innerHTML).not.toContain('badge-yellow');
  });

  it('renders the Normalfahrt mode icon (not a text badge) for driving-car', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car');
    expect(details.innerHTML).toContain('result-mode-icon');
    expect(details.innerHTML).toContain('fa-car');
    expect(details.innerHTML).toContain('title="Normalfahrt"');
    expect(details.innerHTML).not.toContain('badge-blue');
  });

  it('renders the Blaulichtfahrt mode icon (not a text badge) for driving-emergency', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-emergency');
    expect(details.innerHTML).toContain('result-mode-icon');
    expect(details.innerHTML).toContain('fa-truck-medical');
    expect(details.innerHTML).toContain('title="Blaulichtfahrt"');
    expect(details.innerHTML).not.toContain('badge-blue');
  });

  it('renders a toll warning badge inside the same card as the kv row when extras indicate tollways', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car', {
      tollways: { values: [[0, 1, 1]], summary: [{ value: 1, distance: 1000, amount: 92.8 }] },
    });
    expect(details.innerHTML).toContain('badge-yellow');
    expect(details.innerHTML).toContain('Enthält Mautstraßen');
    // Warnungen müssen innerhalb desselben .result-item stehen wie die Kv-Zeile,
    // nicht als eigener Block danach.
    const itemOpenIdx = details.innerHTML.indexOf('result-item active no-click');
    const kvIdx = details.innerHTML.indexOf('result-kv');
    const warningIdx = details.innerHTML.indexOf('badge-yellow');
    const listCloseIdx = details.innerHTML.lastIndexOf('</div>');
    expect(itemOpenIdx).toBeGreaterThanOrEqual(0);
    expect(kvIdx).toBeGreaterThan(itemOpenIdx);
    expect(warningIdx).toBeGreaterThan(kvIdx);
    expect(warningIdx).toBeLessThan(listCloseIdx);
  });

  it('renders no warning badges when extras have no tollways/restrictions', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car', {
      tollways: { values: [[0, 1, 0]], summary: [{ value: 0, distance: 1000, amount: 100 }] },
    });
    expect(details.innerHTML).not.toContain('badge-yellow');
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/components/RoutingSidebar.test.ts`
Expected: FAIL — mindestens die Assertions auf `result-mode-icon`, `title="Normalfahrt"`/`title="Blaulichtfahrt"` und `not.toContain('badge-blue')` schlagen fehl, weil der aktuelle Code noch `<span class="badge badge-blue">` ohne `title`-Attribut rendert.

- [ ] **Step 3: `updateRoutingSummary()` auf neue Struktur umbauen**

Ersetze in `src/components/RoutingSidebar.ts` die komplette Funktion `updateRoutingSummary` (aktuell Zeilen 278-316) durch:

```typescript
export const updateRoutingSummary = (
  distance: number,
  duration: number,
  title: string = 'Zusammenfassung',
  profile?: string,
  extras?: RouteExtras
) => {
  const details = document.getElementById('routing-details')!;
  const distKm = (distance / 1000).toFixed(2);
  const durMin = Math.round(duration / 60);

  const kvHtml = `
    <div class="result-kv">
      <div class="result-kv-item"><span class="result-kv-label">Distanz</span><span class="result-kv-value">${distKm} km</span></div>
      <div class="result-kv-item"><span class="result-kv-label">Dauer</span><span class="result-kv-value">${durMin} min</span></div>
    </div>
  `;

  const summaryRowHtml = profile
    ? (() => {
        const badge = getProfileBadge(profile);
        return `
          <div class="result-summary-row">
            <span class="result-mode-icon" title="${badge.label}" aria-label="${badge.label}" role="img">
              <i class="${badge.icon}" aria-hidden="true"></i>
            </span>
            ${kvHtml}
          </div>
        `;
      })()
    : kvHtml;

  const warningBadgesHtml = getRouteWarnings(extras)
    .map((w) => `<span class="badge badge-yellow"><i class="${w.icon}"></i> ${w.label}</span>`)
    .join('');

  details.classList.remove('hidden');
  details.innerHTML = `
    <div class="result-header">
      <span class="result-label">${title}</span>
    </div>
    <div class="result-list">
      <div class="result-item active no-click">
        ${summaryRowHtml}
        ${warningBadgesHtml ? `<div class="result-badges">${warningBadgesHtml}</div>` : ''}
      </div>
    </div>
  `;
};
```

Die Imports von `getProfileBadge`/`getRouteWarnings` (Zeile 6) und der Typ `RouteExtras` (Zeile 3) bleiben unverändert, beide werden weiterhin verwendet.

- [ ] **Step 4: CSS für Icon-Zeile ergänzen**

In `src/styles/sidebar.css` direkt nach der bestehenden Regel (endet bei Zeile 295 mit der schließenden `}` von `.result-badges`) einfügen:

```css
.result-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.result-summary-row .result-kv {
  padding-left: 0;
  margin-bottom: 0;
}
.result-mode-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 25px;
  font-size: 1.4rem;
  color: var(--accent);
}
.result-summary-row + .result-badges {
  padding-left: 0;
}
```

Die bestehenden `.result-kv`/`.result-badges`-Basisregeln (Zeilen 266-295) bleiben unverändert — die neuen Regeln wirken nur innerhalb von `.result-summary-row` bzw. auf ein direkt darauf folgendes `.result-badges`, betreffen also nicht die Stationsliste (`renderStationResults`) oder die Tracking-Sidebar, die dieselben Basisklassen ohne `.result-summary-row` nutzen.

- [ ] **Step 5: Tests laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/components/RoutingSidebar.test.ts`
Expected: PASS (5/5)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler

- [ ] **Step 7: Commit**

```bash
git add src/components/RoutingSidebar.ts src/components/RoutingSidebar.test.ts src/styles/sidebar.css
git commit -m "$(cat <<'EOF'
refactor(routing): Fahrmodus als Icon neben Distanz/Dauer statt Text-Badge

Ersetzt das separate blaue Fahrmodus-Textbadge ("Normalfahrt"/"Blaulichtfahrt")
durch ein reines Icon links neben der Distanz/Dauer-Kv-Zeile (Tooltip trägt das
Label). Warn-Badges (Maut/Zufahrtsbeschränkung) wandern in dieselbe Karte wie
die Kv-Zeile statt als getrennter Block danach. Design:
docs/superpowers/specs/2026-07-05-routing-summary-layout-design.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Adapter-Integrationstest an neue Struktur anpassen

**Files:**
- Modify: `src/features/routing/RoutingSidebarAdapter.test.ts:132-136` und `:172-174`

**Interfaces:**
- Consumes: `updateRoutingSummary` (aus Task 1, Signatur unverändert), gerendert über den realen `RoutingSidebarAdapter.init()`-Flow (kein Mock von `updateRoutingSummary` in dieser Testdatei — `vi.importActual` wird für `RoutingSidebar` verwendet, siehe `RoutingSidebarAdapter.test.ts:20-33`).
- Produces: keine neuen Exporte — reiner Test-Anpassungs-Task.

- [ ] **Step 1: Assertions verschärfen (failing red erwartbar nur, falls Task 1 noch nicht gelaufen wäre — hier: direkt anpassen und verifizieren)**

In `src/features/routing/RoutingSidebarAdapter.test.ts`, im Test `'requests extra_info and passes profile/extras through to the sidebar summary'` (aktuell Zeilen 132-136):

```typescript
    const details = elements['routing-details'];
    expect(details.innerHTML).toContain('result-mode-icon');
    expect(details.innerHTML).toContain('fa-car');
    expect(details.innerHTML).toContain('title="Normalfahrt"');
    expect(details.innerHTML).not.toContain('badge-blue');
    expect(details.innerHTML).toContain('badge-yellow');
    expect(details.innerHTML).toContain('Enthält Mautstraßen');
```

Im Test `'does not request extra_info for driving-emergency ...'` (aktuell Zeilen 172-174):

```typescript
    const details = elements['routing-details'];
    expect(details.innerHTML).toContain('result-mode-icon');
    expect(details.innerHTML).toContain('fa-truck-medical');
    expect(details.innerHTML).toContain('title="Blaulichtfahrt"');
    expect(details.innerHTML).not.toContain('badge-blue');
```

- [ ] **Step 2: Tests laufen lassen, Erfolg bestätigen**

Run: `npx vitest run src/features/routing/RoutingSidebarAdapter.test.ts`
Expected: PASS (3/3) — die Implementierung aus Task 1 erfüllt diese Assertions bereits; dieser Task verifiziert die Integration über den echten Adapter-Flow.

- [ ] **Step 3: Vollen Testlauf + Typecheck bestätigen**

Run: `npx tsc --noEmit && npm test`
Expected: alle Suiten grün, keine Regressionen in anderen Dateien (insbesondere keine anderen Tests, die auf `.badge-blue` oder die alte Struktur der Zusammenfassungsbox prüfen).

- [ ] **Step 4: Commit**

```bash
git add src/features/routing/RoutingSidebarAdapter.test.ts
git commit -m "$(cat <<'EOF'
test(routing): Adapter-Regressionstests an Icon-Layout der Zusammenfassung anpassen

Verschärft die Assertions in RoutingSidebarAdapter.test.ts auf das neue
Fahrmodus-Icon (.result-mode-icon + Tooltip) statt der entfernten
.badge-blue-Textzeile, verifiziert über den echten Adapter-Render-Flow.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Browser-Verifikation

**Files:** keine Code-Änderungen — reine manuelle Verifikation.

**Interfaces:**
- Consumes: laufender Dev-Server (`npm run dev`), Routing-Seite `/routing`, Modus „A → B".
- Produces: bestätigtes visuelles Ergebnis (oder Findings, die in einem Folge-Fix behoben werden, bevor dieser Task als erledigt gilt).

- [ ] **Step 1: Dev-Server starten**

Run: `npm run dev`
Expected: Vite auf `http://127.0.0.1:5173` (oder konfigurierter Port), PHP-API auf `127.0.0.1:8081`, keine Startfehler.

- [ ] **Step 2: Route mit Mautanteil prüfen (Profil `driving-car`)**

Im Browser `/routing` öffnen, Modus „A → B", Profil `driving-car`, eine Strecke mit bekanntem Mautanteil eingeben (z.B. Linz → St. Pölten, siehe `docs/superpowers/specs/2026-07-04-routing-sidebar-details-design.md`), Route berechnen.

Erwartung:
- Auto-Icon sitzt links neben der Distanz/Dauer-Zeile, vertikal mittig über beide Zeilen, mit Tooltip „Normalfahrt" bei Hover.
- Kein blaues Text-Badge mehr oberhalb der Distanz/Dauer-Zeile.
- Warn-Badge „⚠ Enthält Mautstraßen" erscheint **innerhalb derselben Karte**, direkt unter der Distanz/Dauer-Zeile, optisch nicht mehr als separater Block danach.

- [ ] **Step 3: Route ohne Warnungen + Profil `driving-emergency` prüfen**

Profil auf `driving-emergency` wechseln, dieselbe oder eine andere Strecke berechnen.

Erwartung:
- Blaulicht-Icon (`fa-truck-medical`) statt Auto-Icon, Tooltip „Blaulichtfahrt".
- Keine Warn-Badges (da für `driving-emergency` kein `extra_info` angefragt wird, siehe `RoutingSidebarAdapter.ts:33-37`) — Kv-Zeile direkt am Kartenende, keine leere Lücke.

- [ ] **Step 4: Dev-Server stoppen**

Run: Ctrl+C im Terminal des Dev-Servers.

- [ ] **Step 5: Bei Abweichungen: Findings dokumentieren, Fix nachziehen**

Falls Icon-Größe/Ausrichtung optisch nicht zur zweizeiligen Kv-Box passt: `font-size`/`width` in `.result-mode-icon` (`src/styles/sidebar.css`) direkt anpassen, erneut visuell prüfen, dann als Teil dieses Tasks committen (kein neuer Task nötig für reine CSS-Feinjustierung).

```bash
git add src/styles/sidebar.css
git commit -m "$(cat <<'EOF'
fix(routing): Icon-Größe der Fahrmodus-Anzeige nach visueller Prüfung angepasst

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(Nur ausführen, falls tatsächlich eine Anpassung nötig war — sonst diesen Step auslassen.)

---

### Task 4: Changelog-Eintrag

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: keine.
- Produces: neuer journalierter `## [Unreleased] - YYYY-MM-DD HH:mm`-Block (Konvention: jede Änderung bekommt einen eigenen datierten Block, bestehende Blöcke werden nicht überschrieben — siehe `AGENT_INSTRUCTIONS.md`).

- [ ] **Step 1: Neuen Unreleased-Block einfügen**

In `CHANGELOG.md` direkt nach der Zeile `# Changelog` / vor dem ersten bestehenden `## [Unreleased] - 2026-07-05 06:08`-Block einfügen (aktuelles Datum/Uhrzeit zum Zeitpunkt der Ausführung verwenden):

```markdown
## [Unreleased] - 2026-07-05 08:00

### Geändert
- **Fahrmodus-Anzeige in der Routing-Zusammenfassung von Text-Badge auf Icon umgestellt** (`src/components/RoutingSidebar.ts`, `updateRoutingSummary`). Live-Test des Fahrmodus-/Warn-Badge-Features zeigte eine unsaubere Anordnung: das Fahrmodus-Badge stand als eigene blaue Textzeile über der Distanz/Dauer-Box, die Warn-Badges (Maut/Zufahrtsbeschränkung) als getrennter Block danach ohne erkennbaren Bezug zur Route. Jetzt: reines Icon (Auto/Rettungswagen) links neben der unveränderten Distanz/Dauer-Kv-Zeile (Label nur noch als Tooltip), Warn-Badges direkt in derselben Karte darunter. Neue, scoped CSS-Regeln (`.result-summary-row`, `.result-mode-icon`) in `sidebar.css`, bestehende `.result-kv`/`.result-badges`-Basisklassen (auch von Stationsliste/Tracking genutzt) unverändert. Design: [docs/superpowers/specs/2026-07-05-routing-summary-layout-design.md](./docs/superpowers/specs/2026-07-05-routing-summary-layout-design.md). `npx tsc --noEmit && npm test` grün, beide Profile live gegen den Dev-Server verifiziert.
```

- [ ] **Step 2: Finale Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: alle Suiten grün.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs(changelog): Fahrmodus-Icon-Layout-Änderung dokumentieren

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
