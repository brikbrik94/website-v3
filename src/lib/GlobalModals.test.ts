// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { initGlobalModals } from './GlobalModals';

describe('initGlobalModals', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('gives every modal-close button an accessible name', () => {
    initGlobalModals();

    // Icon-only Close-Buttons (nur <i class="fa-xmark">, kein sichtbarer Text) brauchen ein
    // aria-label, sonst schlägt Lighthouses button-name-Audit auf jeder Seite fehl, da
    // GlobalModals global (main.ts) auf allen Seiten gemountet wird (siehe
    // docs/performance/2026-07-28-baseline-audit.md, Befund 1 - Root Cause bei der ersten
    // Umsetzung fälschlich beim Topbar-Mobile-Toggle statt hier vermutet, per Re-Audit korrigiert).
    const closeButtons = document.querySelectorAll('.modal-close');
    expect(closeButtons.length).toBe(3);
    closeButtons.forEach((btn) => {
      expect(btn.getAttribute('aria-label')).toBe('Schließen');
    });
  });
});
