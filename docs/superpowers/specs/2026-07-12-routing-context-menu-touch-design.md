# Routing-Kontextmenü: Touchsteuerung — Design

**Status:** Genehmigt
**Datum:** 2026-07-12

## Kontext

TODO.md → „Map-Subsystem: Anschlussfeatures" → „Routing-Kontextmenü: Touchsteuerung". Das
Zielwahl-Kontextmenü (`src/components/ContextMenu.ts`, genutzt von `RoutingPage.ts:72-102` und
`CoordsPage.ts:77-89`) öffnet aktuell ausschließlich über MapLibres `contextmenu`-Map-Event, das
wiederum nur auf das native Browser-`contextmenu`-DOM-Event reagiert (Rechtsklick auf Desktop).

**Root Cause recherchiert und live vom Nutzer bestätigt (2026-07-12):** Long-Press auf Touch löst
das native `contextmenu`-Event hier nicht aus. Ursache ist **kein** CI-/Design-System-Bug (weder
`oe5ith-ci` noch website-v3-eigenes CSS setzt `touch-action` irgendwo) — die Ursache liegt in
MapLibres eigenem, mitgeliefertem `maplibre-gl.css`:

```css
.maplibregl-canvas-container.maplibregl-touch-zoom-rotate.maplibregl-touch-drag-pan,
.maplibregl-canvas-container.maplibregl-touch-zoom-rotate.maplibregl-touch-drag-pan .maplibregl-canvas {
  touch-action: none
}
```

Diese Regel greift, sobald Touch-Pan **und** Touch-Pinch-Zoom/Rotate aktiv sind (Projekt-Standard,
siehe `MapCore.init()`) — nötig, damit die Karte per Touch überhaupt bedienbar ist. `touch-action:
none` unterdrückt aber auf den meisten mobilen Browsern (v.a. Android Chrome) die native
Long-Press-Erkennung für `contextmenu`. Das Entfernen dieser Regel ist keine Option (würde
Pan/Zoom auf Touch brechen) — daher: eigene Long-Press-Erkennung, unabhängig vom nativen Event.

## Entscheidungen aus dem Brainstorming

1. **Nur Touch-Trigger, keine Tastaturnavigation.** Der TODO-Punkt nennt zusätzlich „Menüstruktur/
   Tastaturbedienung am ARIA-APG-Menu-Pattern orientieren" — bewusst nicht Teil dieser Umsetzung.
   Long-Press öffnet künftig dasselbe Menü, das bestehende Maus-/Klick-Verhalten (inkl. Escape zum
   Schließen) bleibt unverändert. Volle Tastaturnavigation (Pfeiltasten, Roving Tabindex, Home/End)
   als eigener Folge-Punkt.
2. **Kein visuelles Hold-Feedback in v1.** Menü erscheint direkt nach der Haltezeit, keine
   Ring-/Puls-Animation am Berührungspunkt. Kann bei Bedarf nach Live-Test nachgezogen werden.
3. **Eigene Long-Press-Erkennung statt CSS-Fix**, siehe Root-Cause oben — `touch-action: none` ist
   für Pan/Zoom notwendig, der native `contextmenu`-Weg ist damit für Touch nicht nutzbar.
4. **Neuer, geteilter Baustein statt Duplikat pro Seite** — `RoutingPage.ts` und `CoordsPage.ts`
   nutzen beide `ContextMenu`; die Long-Press-Erkennung selbst ist seitenunabhängig (nur „wann ist
   ein Long-Press passiert, wo") und gehört analog zu `src/lib/HoverCursor.ts` (`attachHoverCursor`)
   in einen eigenen, kleinen Baustein — nicht in eine der beiden Page-Dateien.

## Umsetzung

### 1. Neuer Baustein `src/lib/LongPressGesture.ts`

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

- `touchstart`/`touchmove` als `{ passive: true }` registriert — kein `preventDefault()` dort,
  damit MapLibres eigenes Pan-Handling für echte Wisch-/Pan-Gesten unangetastet bleibt (wir
  brechen bei Bewegung nur unseren eigenen Timer ab, blockieren aber nichts).
- `preventDefault()` ausschließlich auf dem `touchend`, das einen bereits ausgelösten Long-Press
  abschließt — unterdrückt den nachträglichen synthetischen `click`, den mobile Browser sonst
  nach `touchend` feuern und der das gerade geöffnete `ContextMenu` (schließt bei jedem
  `document`-Klick, `ContextMenu.ts:15`) sofort wieder zuklappen würde.
- Ein zweiter Finger (Pinch-Zoom) bricht die Erkennung ab (`touches.length !== 1`), sowohl beim
  Start als auch, wenn er während des Haltens dazukommt.

### 2. `src/pages/RoutingPage.ts`

`setupMapListeners()` (Zeilen 65-103): bestehende Menü-Aufbau-Logik aus dem `contextmenu`-Handler
in eine neue Methode `showContextMenuAt(lat, lng, clientX, clientY)` extrahieren, von beiden
Triggern aufgerufen:

```ts
import { attachLongPress } from '../lib/LongPressGesture';

// ...

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

### 3. `src/pages/CoordsPage.ts`

Gleiches Muster, `mount()` (Zeilen 77-89):

```ts
import { attachLongPress } from '../lib/LongPressGesture';

// ...

this.map.on('contextmenu', (e) => {
    this.showContextMenuAt(e.lngLat.lat, e.lngLat.lng, e.originalEvent.clientX, e.originalEvent.clientY);
});

attachLongPress(this.map, (e) => {
    this.showContextMenuAt(e.lngLat.lat, e.lngLat.lng, e.clientX, e.clientY);
});
```

Neue Methode:

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

## Error Handling / Edge Cases

- **Kurzer Tap** (`touchstart`→`touchend` vor Ablauf der 500ms): Timer wird auf `touchend`
  gelöscht, bevor er feuert — kein Menü, wie bei einem normalen Tap erwartet.
- **Pinch-Zoom** (zweiter Finger, beim Start oder während des Haltens): bricht die Erkennung ab,
  MapLibres eigenes Zoom-Handling läuft unbeeinflusst weiter.
- **Wisch-/Pan-Geste** (Bewegung >10px): Timer wird abgebrochen; da `touchmove` passiv registriert
  ist (kein `preventDefault()`), pant MapLibre normal weiter.
- **Dauerhaftes Halten nach Auslösung:** Timer ist ein einmaliger `setTimeout`, kein Interval —
  das Menü öffnet sich genau einmal pro Long-Press, kein wiederholtes Auslösen.
- **Mehrere Long-Presses nacheinander:** jeder `touchstart` setzt `fired` zurück und startet einen
  neuen Timer — kein Zustand bleibt zwischen zwei Gesten hängen.
- **Schließen des Menüs** (Tap woanders, Escape): unverändert über die bestehende
  `ContextMenu.ts`-Logik, hier nicht angefasst.

## Testing

- `LongPressGesture.test.ts` (neu), mit handgebautem Fake-Canvas (`addEventListener` sammelt
  Callbacks in einem `vi.fn()`-Spy, analog `HoverCursor.test.ts`) + `vi.useFakeTimers()`:
  - Löst nach 500ms bei stationärem Touch aus, ruft `onLongPress` mit `lngLat`/`clientX`/`clientY`.
  - Löst **nicht** vor Ablauf der 500ms aus.
  - Bricht bei Bewegung >10px ab (kein Aufruf trotz abgelaufener Zeit).
  - Löst weiterhin aus bei Bewegung ≤10px (Toleranz).
  - Ignoriert Mehrfach-Touch (Pinch) komplett.
  - Bricht einen laufenden Timer bei `touchend` vor Ablauf ab (kurzer Tap).
  - Ruft `preventDefault()` auf dem `touchend`, das einen ausgelösten Long-Press abschließt.
  - Ruft `preventDefault()` **nicht** auf einem normalen Tap-`touchend`.
  - Registriert Listener nur einmal bei wiederholtem Aufruf für dieselbe Map-Instanz (Idempotenz).
  - Registriert unabhängig für zwei verschiedene Map-Instanzen.
- `npx tsc --noEmit && npm test` muss grün bleiben.
- Live-Verifikation durch den Nutzer auf einem echten Touch-Gerät auf `/routing` und `/coords`:
  Long-Press öffnet das Menü an der richtigen Position; normales Pan/Pinch-Zoom bleibt
  unbeeinträchtigt; ein kurzer Tap öffnet kein Menü; Rechtsklick auf Desktop funktioniert
  weiterhin unverändert.

## Out of Scope

- Volle ARIA-APG-Tastaturnavigation für `ContextMenu.ts` (Entscheidung 1) — eigener Folge-Punkt.
- Visuelles Hold-Feedback (Entscheidung 2) — bei Bedarf nach Live-Test nachziehen.
- Änderungen an `ContextMenu.ts` selbst — reiner neuer Trigger-Pfad, die Menü-Komponente bleibt
  unangetastet.
