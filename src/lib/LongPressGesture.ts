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
