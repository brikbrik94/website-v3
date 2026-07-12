# Routing-Kontextmenü: Touchsteuerung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Zielwahl-Kontextmenü auf `/routing` und `/coords` öffnet sich künftig auch per Long-Press auf Touch-Geräten, nicht mehr nur per Rechtsklick auf Desktop.

**Architecture:** Ein neuer, seitenunabhängiger Baustein `src/lib/LongPressGesture.ts` (analog `HoverCursor.ts`) erkennt Long-Press-Gesten direkt über `touchstart`/`touchmove`/`touchend`/`touchcancel` auf dem Karten-Canvas — unabhängig vom nativen `contextmenu`-Event, das auf Touch wegen MapLibres `touch-action: none` (siehe Spec) nicht zuverlässig feuert. `RoutingPage.ts` und `CoordsPage.ts` rufen ihre bereits bestehende Menü-Aufbau-Logik künftig sowohl vom bestehenden `contextmenu`-Handler als auch vom neuen Long-Press-Callback auf.

**Tech Stack:** TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`), Vitest, MapLibre GL.

**Spec:** [docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md](../specs/2026-07-12-routing-context-menu-touch-design.md)

## Global Constraints

- Verifikation vor jedem Fortschritt: `npx tsc --noEmit && npm test` muss grün sein (CLAUDE.md).
- Jede Task committet ihre eigenen Änderungen (SDD-Standardablauf). Das Spec-/Plan-Doc reitet mit
  **Task 1s** Commit mit (erster echter Code-Commit), kein separater reiner Doku-Commit. Dateien
  immer explizit stagen, nie `git add -A`.
- CHANGELOG.md-Eintrag als `## [Unreleased] - YYYY-MM-DD HH:MM`-Journal-Block
  (AGENT_INSTRUCTIONS.md §4), Kategorie „Hinzugefügt" (neue Bedienmöglichkeit, kein reiner Fix).
- Deutsche Kommentare/Copy, passend zum Rest der Datei.
- `touchstart`/`touchmove`-Listener müssen `{ passive: true }` bleiben — kein `preventDefault()`
  dort, sonst bricht MapLibres eigenes Pan-Handling auf Touch (siehe Spec, Umsetzung Abschnitt 1).

---

### Task 1: `src/lib/LongPressGesture.ts` — Long-Press-Erkennung

**Files:**
- Create: `src/lib/LongPressGesture.ts`
- Test: `src/lib/LongPressGesture.test.ts`

**Interfaces:**
- Produces: `export interface LongPressEvent { lngLat: maplibregl.LngLat; clientX: number; clientY: number }` und `export function attachLongPress(map: maplibregl.Map, onLongPress: (e: LongPressEvent) => void): void` — wird von Task 2 (`RoutingPage.ts`, `CoordsPage.ts`) importiert und aufgerufen.

- [ ] **Step 1: Failing-Tests schreiben**

Neue Datei `src/lib/LongPressGesture.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachLongPress } from './LongPressGesture';

function mockMap(unprojectResult: any = { lat: 47.1, lng: 14.2 }) {
  const listeners: Record<string, ((e: any) => void)[]> = {};
  const addEventListener = vi.fn((type: string, cb: (e: any) => void) => {
    (listeners[type] ??= []).push(cb);
  });
  const canvas = {
    addEventListener,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const map = {
    getCanvas: () => canvas,
    unproject: vi.fn(() => unprojectResult),
  } as any;
  const fire = (type: string, e: any) => listeners[type]?.forEach((cb) => cb(e));
  return { map, fire, addEventListener };
}

function touch(x: number, y: number) {
  return { touches: [{ clientX: x, clientY: y }] } as any;
}

describe('attachLongPress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires after the hold duration on a stationary single touch', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledWith({ lngLat: { lat: 47.1, lng: 14.2 }, clientX: 100, clientY: 200 });
  });

  it('does not fire before the hold duration elapses', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    vi.advanceTimersByTime(499);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels the hold when the touch moves beyond the tolerance', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    fire('touchmove', touch(120, 200));
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('does not cancel the hold for movement within tolerance', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    fire('touchmove', touch(105, 200));
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('ignores multi-touch (pinch) gestures', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', { touches: [{ clientX: 100, clientY: 200 }, { clientX: 150, clientY: 200 }] });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels a pending hold on touchend before the duration elapses', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    fire('touchend', { preventDefault: vi.fn() });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('calls preventDefault on the touchend that follows a fired long-press', () => {
    const { map, fire } = mockMap();
    attachLongPress(map, vi.fn());

    fire('touchstart', touch(100, 200));
    vi.advanceTimersByTime(500);

    const preventDefault = vi.fn();
    fire('touchend', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not call preventDefault on a touchend from an ordinary tap', () => {
    const { map, fire } = mockMap();
    attachLongPress(map, vi.fn());

    fire('touchstart', touch(100, 200));
    const preventDefault = vi.fn();
    fire('touchend', { preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('does not re-register listeners on a second call for the same map instance', () => {
    const { map, addEventListener } = mockMap();
    attachLongPress(map, vi.fn());
    attachLongPress(map, vi.fn());
    expect(addEventListener).toHaveBeenCalledTimes(4);
  });

  it('registers independently for two different map instances', () => {
    const { map: mapA, addEventListener: addA } = mockMap();
    const { map: mapB, addEventListener: addB } = mockMap();
    attachLongPress(mapA, vi.fn());
    attachLongPress(mapB, vi.fn());
    expect(addA).toHaveBeenCalledTimes(4);
    expect(addB).toHaveBeenCalledTimes(4);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run src/lib/LongPressGesture.test.ts`
Expected: FAIL — Modul `./LongPressGesture` existiert noch nicht.

- [ ] **Step 3: Implementieren**

Neue Datei `src/lib/LongPressGesture.ts`:

```ts
import maplibregl from 'maplibre-gl';

const _attached = new WeakSet<maplibregl.Map>();

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;

export interface LongPressEvent {
  lngLat: maplibregl.LngLat;
  clientX: number;
  clientY: number;
}

/**
 * Öffnet denselben Trigger-Pfad wie MapLibres 'contextmenu'-Event, aber über eine eigene
 * Touch-Long-Press-Erkennung — das native contextmenu-Event feuert auf Touch nicht zuverlässig,
 * weil MapLibre bei aktivem Touch-Pan+Zoom `touch-action: none` auf den Canvas setzt (siehe
 * docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md).
 * Idempotent: mehrfache Aufrufe für dieselbe Map-Instanz registrieren die Listener nur einmal.
 * Kein explizites Cleanup nötig (siehe HoverCursor.ts — neue Seite = neue Map-Instanz).
 */
export function attachLongPress(map: maplibregl.Map, onLongPress: (e: LongPressEvent) => void): void {
  if (_attached.has(map)) return;
  _attached.add(map);

  const canvas = map.getCanvas();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;
  let fired = false;

  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    clear();
    fired = false;
    if (e.touches.length !== 1) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    timer = setTimeout(() => {
      timer = null;
      fired = true;
      const rect = canvas.getBoundingClientRect();
      const lngLat = map.unproject([startX - rect.left, startY - rect.top]);
      onLongPress({ lngLat, clientX: startX, clientY: startY });
    }, LONG_PRESS_MS);
  }, { passive: true });

  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    if (timer === null) return;
    const dx = e.touches[0]?.clientX - startX;
    const dy = e.touches[0]?.clientY - startY;
    if (e.touches.length !== 1 || Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) {
      clear();
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e: TouchEvent) => {
    clear();
    if (fired) {
      e.preventDefault();
      fired = false;
    }
  });

  canvas.addEventListener('touchcancel', clear);
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg verifizieren**

Run: `npx vitest run src/lib/LongPressGesture.test.ts`
Expected: PASS, alle 10 Tests grün.

- [ ] **Step 5: Volle Testsuite + Typecheck**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TypeScript-Fehler, alle Tests grün (156 bestehende + 10 neue = 166).

- [ ] **Step 6: Committen**

Dieser Commit trägt zusätzlich die bereits vorhandenen, noch unkommittierten Doku-Änderungen
dieser Arbeit mit (Spec- und Plan-Doc) — kein separater reiner Doku-Commit:

```bash
git add docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md docs/superpowers/plans/2026-07-12-routing-context-menu-touch.md src/lib/LongPressGesture.ts src/lib/LongPressGesture.test.ts
git commit -m "feat(routing): Long-Press-Erkennung für Touch-Kontextmenü (LongPressGesture.ts)"
```

---

### Task 2: `RoutingPage.ts` + `CoordsPage.ts` — Long-Press verdrahten

**Files:**
- Modify: `src/pages/RoutingPage.ts:1-14` (Imports), `:65-103` (`setupMapListeners`, neue Methode `showContextMenuAt`)
- Modify: `src/pages/CoordsPage.ts:1-14` (Imports), `:73-89` (Event-Listener-Block, neue Methode `showContextMenuAt`)

**Interfaces:**
- Consumes: `attachLongPress`, `LongPressEvent` aus Task 1 (`../lib/LongPressGesture`).
- Produces: nichts, das andere Tasks konsumieren.

**Hinweis zum Testvorgehen:** Wie bei anderen Page-Controllern in diesem Projekt (`Sidebar.ts`,
`MapPage.ts`) — kein dediziertes Unit-Test-File für DOM-/Map-Wiring, live im Browser verifiziert.
Nur Typecheck + volle Testsuite als Regressionsschutz.

- [ ] **Step 1: `RoutingPage.ts` — Import ergänzen**

`src/pages/RoutingPage.ts:8`, nach der bestehenden Zeile `import { ContextMenu } from '../components/ContextMenu';` ergänzen:

```ts
import { attachLongPress } from '../lib/LongPressGesture';
```

- [ ] **Step 2: `RoutingPage.ts` — `setupMapListeners()` umbauen**

`src/pages/RoutingPage.ts:65-103`, den kompletten Methodenkörper ersetzen. Alt:

```ts
    private setupMapListeners(): void {
        if (!this.map || !this.sidebarAdapter) return;

        this.map.on('click', (e) => this.sidebarAdapter?.handleMapClick(e));

        attachHoverCursor(this.map, ['routing-path']);

        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.lngLat;
            const modeBtn = document.querySelector('.segmented-btn.active');
            const mode = modeBtn?.getAttribute('data-mode') || 'ab';

            const menuItems: (ContextMenuItem | 'sep' | { label: string, type: 'label' })[] = [
                { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, type: 'label' },
                'sep'
            ];

            if (mode === 'ab') {
                menuItems.push({ 
                    label: 'Als Startpunkt setzen', 
                    icon: 'fa-solid fa-location-dot',
                    onClick: () => this.sidebarAdapter?.setCoord('start', lat, lng)
                });
                menuItems.push({ 
                    label: 'Als Zielpunkt setzen', 
                    icon: 'fa-solid fa-flag-checkered',
                    onClick: () => this.sidebarAdapter?.setCoord('target', lat, lng)
                });
            } else {
                menuItems.push({ 
                    label: 'Als Einsatzort setzen', 
                    icon: 'fa-solid fa-truck-medical',
                    onClick: () => this.sidebarAdapter?.setCoord('target', lat, lng)
                });
            }

            ContextMenu.show(e.originalEvent.clientX, e.originalEvent.clientY, menuItems);
        });
    }
```

Neu:

```ts
    private setupMapListeners(): void {
        if (!this.map || !this.sidebarAdapter) return;

        this.map.on('click', (e) => this.sidebarAdapter?.handleMapClick(e));

        attachHoverCursor(this.map, ['routing-path']);

        this.map.on('contextmenu', (e) => {
            this.showContextMenuAt(e.lngLat.lat, e.lngLat.lng, e.originalEvent.clientX, e.originalEvent.clientY);
        });

        attachLongPress(this.map, (e) => {
            this.showContextMenuAt(e.lngLat.lat, e.lngLat.lng, e.clientX, e.clientY);
        });
    }

    private showContextMenuAt(lat: number, lng: number, clientX: number, clientY: number): void {
        const modeBtn = document.querySelector('.segmented-btn.active');
        const mode = modeBtn?.getAttribute('data-mode') || 'ab';

        const menuItems: (ContextMenuItem | 'sep' | { label: string, type: 'label' })[] = [
            { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, type: 'label' },
            'sep'
        ];

        if (mode === 'ab') {
            menuItems.push({
                label: 'Als Startpunkt setzen',
                icon: 'fa-solid fa-location-dot',
                onClick: () => this.sidebarAdapter?.setCoord('start', lat, lng)
            });
            menuItems.push({
                label: 'Als Zielpunkt setzen',
                icon: 'fa-solid fa-flag-checkered',
                onClick: () => this.sidebarAdapter?.setCoord('target', lat, lng)
            });
        } else {
            menuItems.push({
                label: 'Als Einsatzort setzen',
                icon: 'fa-solid fa-truck-medical',
                onClick: () => this.sidebarAdapter?.setCoord('target', lat, lng)
            });
        }

        ContextMenu.show(clientX, clientY, menuItems);
    }
```

- [ ] **Step 3: `CoordsPage.ts` — Import ergänzen**

`src/pages/CoordsPage.ts:13`, nach der bestehenden Zeile `import { ContextMenu } from '../components/ContextMenu';` ergänzen:

```ts
import { attachLongPress } from '../lib/LongPressGesture';
```

- [ ] **Step 4: `CoordsPage.ts` — Event-Listener-Block umbauen**

`src/pages/CoordsPage.ts:73-89`, ersetzen. Alt:

```ts
        // 7. Event Listeners
        // Bewusst kein 'click' (blockiert sonst Linksklick als Setzen-Aktion und ist
        // inkonsistent zum Routing-Kontextmenü-Pattern); Rechtsklick-Drag ist bereits für die
        // 3D-Steuerung (Kippen/Rotieren) reserviert, daher Kontextmenü statt Direktbindung.
        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.lngLat;
            const menuItems: (ContextMenuItem | 'sep' | { label: string, type: 'label' })[] = [
                { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, type: 'label' },
                'sep',
                {
                    label: 'Koordinate hier setzen',
                    icon: 'fa-solid fa-location-dot',
                    onClick: () => this.service.setWgs(lat, lng)
                }
            ];
            ContextMenu.show(e.originalEvent.clientX, e.originalEvent.clientY, menuItems);
        });
```

Neu:

```ts
        // 7. Event Listeners
        // Bewusst kein 'click' (blockiert sonst Linksklick als Setzen-Aktion und ist
        // inkonsistent zum Routing-Kontextmenü-Pattern); Rechtsklick-Drag ist bereits für die
        // 3D-Steuerung (Kippen/Rotieren) reserviert, daher Kontextmenü statt Direktbindung.
        this.map.on('contextmenu', (e) => {
            this.showContextMenuAt(e.lngLat.lat, e.lngLat.lng, e.originalEvent.clientX, e.originalEvent.clientY);
        });

        attachLongPress(this.map, (e) => {
            this.showContextMenuAt(e.lngLat.lat, e.lngLat.lng, e.clientX, e.clientY);
        });
```

Neue Methode ergänzen (z.B. direkt nach `mount()`):

```ts
    private showContextMenuAt(lat: number, lng: number, clientX: number, clientY: number): void {
        const menuItems: (ContextMenuItem | 'sep' | { label: string, type: 'label' })[] = [
            { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, type: 'label' },
            'sep',
            {
                label: 'Koordinate hier setzen',
                icon: 'fa-solid fa-location-dot',
                onClick: () => this.service.setWgs(lat, lng)
            }
        ];
        ContextMenu.show(clientX, clientY, menuItems);
    }
```

- [ ] **Step 5: Typecheck + volle Testsuite**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TypeScript-Fehler, alle Tests grün (166).

- [ ] **Step 6: Committen**

```bash
git add src/pages/RoutingPage.ts src/pages/CoordsPage.ts
git commit -m "feat(routing): Long-Press öffnet Zielwahl-Kontextmenü auf /routing und /coords"
```

---

### Task 3: TODO.md, CHANGELOG, finale Verifikation, Commit

**Files:**
- Modify: `TODO.md` (Punkt „Routing-Kontextmenü: Touchsteuerung" als erledigt markieren)
- Modify: `CHANGELOG.md` (neuer `[Unreleased]`-Journal-Block ganz oben)
- Stage & commit: `TODO.md`, `CHANGELOG.md`

**Interfaces:** keine — reiner Doku-/Verifikations-/Commit-Task, letzter Schritt der Kette.

- [ ] **Step 1: `TODO.md` aktualisieren**

`TODO.md`, den Punkt „**Routing-Kontextmenü: Touchsteuerung**" (aktuell `- [ ]`) ersetzen. Alt:

```markdown
- [ ] **Routing-Kontextmenü: Touchsteuerung** — Das Zielwahl-Kontextmenü in `RoutingPage.ts:76`
  reagiert nur auf Rechtsklick (Desktop). Ziel: Long-Press-Geste als Touch-Äquivalent für
  Tablet/Smartphone. Menüstruktur/Tastaturbedienung am ARIA-APG-Menu-Pattern orientieren (siehe
  CLAUDE.md → Standards-Referenzen, Accessibility).
```

Neu:

```markdown
- [x] **Routing-Kontextmenü: Touchsteuerung** (2026-07-12) — ✅ ERLEDIGT. Long-Press öffnet das
  Zielwahl-Kontextmenü jetzt auch auf Touch-Geräten, auf `/routing` und `/coords` (beide nutzen
  denselben `ContextMenu`-Baustein). Root Cause recherchiert: kein CI-/CSS-Bug, sondern MapLibres
  eigenes `touch-action: none` (nötig für Pan/Zoom per Touch) unterdrückt die native
  `contextmenu`-Long-Press-Erkennung — daher neue, eigene Erkennung in
  `src/lib/LongPressGesture.ts` (`attachLongPress()`, analog `HoverCursor.ts`), unabhängig vom
  nativen Event. Rechtsklick auf Desktop bleibt unverändert. Spec:
  [docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md](./docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md).
  166 Tests grün, 0 TypeScript-Fehler. **Bewusst nicht Teil dieses Punkts:** volle
  ARIA-APG-Tastaturnavigation fürs Menü (Pfeiltasten, Roving Tabindex) — eigener Folge-Punkt bei
  Bedarf; visuelles Hold-Feedback während des Haltens — bei Bedarf nach Live-Test nachziehen.
```

- [ ] **Step 2: Aktuellen Zeitstempel ermitteln**

Run: `date +"%Y-%m-%d %H:%M"`

- [ ] **Step 3: CHANGELOG.md-Eintrag ergänzen**

`CHANGELOG.md`, ganz oben nach der Intro-Zeile einfügen (vor der zuletzt vorhandenen
`## [Unreleased]`- bzw. `## [X.Y.Z]`-Überschrift — je nachdem, ob zum Ausführungszeitpunkt schon
ein offener `[Unreleased]`-Block existiert; falls ja, neuen Journal-Block **darunter**, nicht den
bestehenden überschreiben), Zeitstempel aus Step 2 einsetzen:

```markdown
## [Unreleased] - 2026-07-12 HH:MM

### Hinzugefügt
- **Routing-Kontextmenü: Touchsteuerung** (TODO.md → Map-Subsystem: Anschlussfeatures) — Long-Press
  öffnet das Zielwahl-Kontextmenü jetzt auch auf Touch-Geräten (`/routing`, `/coords`), nicht mehr
  nur per Rechtsklick. Neuer Baustein `src/lib/LongPressGesture.ts` erkennt die Geste unabhängig
  vom nativen `contextmenu`-Event (das auf Touch wegen MapLibres `touch-action: none` nicht
  zuverlässig feuert). Spec:
  [docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md](./docs/superpowers/specs/2026-07-12-routing-context-menu-touch-design.md).
```

- [ ] **Step 4: Finale Verifikation**

Run: `npx tsc --noEmit && npm test`
Expected: 0 TypeScript-Fehler, alle Tests grün.

- [ ] **Step 5: Committen**

```bash
git add TODO.md CHANGELOG.md
git commit -m "docs: Routing-Kontextmenü-Touchsteuerung als erledigt festgehalten"
git status
```

Expected: `git status` zeigt einen sauberen Working Tree (bis auf das unveränderte
`oe5ith-ci`-Submodul).
