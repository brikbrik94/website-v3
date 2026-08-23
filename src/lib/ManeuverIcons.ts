import type { ManeuverKind } from '../types/common';

// Providerneutrale Manöver-Icons — alle 30 Icons 1:1 aus oe5ith-ci/assets/maneuver-icons/*.svg
// übernommen (siehe oe5ith-ci/docs/maneuver-icons.md): 14 seit v1.20.0 (ORS-Code 0-13), 16
// weitere für Valhalla-only-Konzepte seit v1.26.0 (ursprünglich als Vorschlag eingereicht,
// https://github.com/brikbrik94/oe5ith-ci/issues/2 — inzwischen geschlossen, offiziell
// übernommen). Seit oe5ith-ci v2.0.0 (Breaking, 2026-08-23) alle 30 Icons auf viewBox
// 16×24 (vorher 16×16) synchronisiert, siehe oe5ith-ci/docs/migration-v2.md. Dabei auch
// oe5ith-ci#3 (uturn-left war byte-identisch zu uturn) offiziell behoben und hier übernommen —
// der bisherige lokale Workaround (docs/ci/open-items.md) entfällt. Herleitung:
// docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md.
const MANEUVER_ICON_PATHS: Record<ManeuverKind, string> = {
  // Bestehende 14 (oe5ith-ci v1.20.0, vormals ORS-Code 0-13)
  'turn-left': '<path d="M8 19.5 Q8 10.5 2.6 10.5"/><path d="M2 7.1 L2.6 10.5 L4.1 7.8"/>',
  'turn-right': '<path d="M8 19.5 Q8 10.5 13.4 10.5"/><path d="M14 7.1 L13.4 10.5 L11.9 7.8"/>',
  'sharp-left': '<path d="M8 19.5 Q8 17.3 3.8 17.3"/><path d="M1.6 15.8 L3.8 17.3 L3.4 13.8"/>',
  'sharp-right': '<path d="M8 19.5 Q8 17.3 12.2 17.3"/><path d="M14.4 15.8 L12.2 17.3 L12.6 13.8"/>',
  'slight-left': '<path d="M8 19.5 Q8 4.5 5.7 4.5"/><path d="M7.3 1.8 L5.7 4.5 L8.1 4.8"/>',
  'slight-right': '<path d="M8 19.5 Q8 4.5 10.3 4.5"/><path d="M8.7 1.8 L10.3 4.5 L7.9 4.8"/>',
  'straight': '<path d="M8 19.5 V6"/><path d="M5.5 9.8 L8 6 L10.5 9.8"/>',
  'roundabout-enter': '<circle cx="8" cy="12" r="4"/><path d="M8 18 V16"/><path d="M6 16.5 L8 14.5 L10 16.5"/>',
  'roundabout-exit': '<circle cx="8" cy="12" r="4"/><path d="M8 8 V6"/><path d="M6 7.5 L8 5.5 L10 7.5"/>',
  'uturn': '<path d="M11 19.5 V9 A3 4.5 0 0 0 5 9 V13.5"/><path d="M2.8 10.5 L5 14.3 L7.2 10.5"/>',
  'goal': '<path d="M5 18.5 V6.5"/><path d="M5 7 L11.5 9.2 L5 11.4 Z" fill="currentColor" stroke="none"/>',
  'depart': '<circle cx="8" cy="12" r="5" stroke-width="1.3"/><circle cx="8" cy="12" r="2.2" fill="currentColor" stroke="none"/>',
  'keep-left': '<path d="M8 19.5 V13.5"/><path d="M8 13.5 Q8 9 5.5 6.8"/><path d="M7.2 4.2 L5.3 6.5 L6.8 9.6"/><path d="M8 13.5 Q8 9.8 10 8.3" opacity="0.35"/>',
  'keep-right': '<path d="M8 19.5 V13.5"/><path d="M8 13.5 Q8 9 10.5 6.8"/><path d="M8.8 4.2 L10.7 6.5 L9.2 9.6"/><path d="M8 13.5 Q8 9.8 6 8.3" opacity="0.35"/>',

  // Valhalla-only (oe5ith-ci v1.26.0, seit v2.0.0 ebenfalls auf 16×24 synchronisiert)
  'uturn-left': '<path d="M9.5 19.5 V12.6 A2.6 3.9 0 0 0 4.3 12.6 V16.2"/><path d="M2.3 14 L4.3 17 L6.3 14"/>',
  'uturn-right': '<path d="M5 19.5 V9 A3 4.5 0 0 1 11 9 V13.5"/><path d="M13.2 10.5 L11 14.3 L8.8 10.5"/>',
  'ramp-right': '<path d="M8 19.5 V13.5"/><path d="M8 13.5 Q8 9 11 7.5"/><path d="M12.8 5.3 L11 7.5 L11.8 10.5"/><path d="M8 13.5 V4.5" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'ramp-left': '<path d="M8 19.5 V13.5"/><path d="M8 13.5 Q8 9 5 7.5"/><path d="M3.2 5.3 L5 7.5 L4.2 10.5"/><path d="M8 13.5 V4.5" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'ramp-straight': '<path d="M8 19.5 V4.5"/><path d="M5.5 8.3 L8 4.5 L10.5 8.3"/><path d="M11 16.5 Q11 12 9 9" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'exit-right': '<path d="M8 19.5 Q8 17.3 12.2 17.3"/><path d="M14.4 15.8 L12.2 17.3 L12.6 13.8"/><path d="M8 19.5 V4.5" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'exit-left': '<path d="M8 19.5 Q8 17.3 3.8 17.3"/><path d="M1.6 15.8 L3.8 17.3 L3.4 13.8"/><path d="M8 19.5 V4.5" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'stay-straight': '<path d="M8 19.5 V6"/><path d="M5.5 9.8 L8 6 L10.5 9.8"/><path d="M8 13.5 Q8 9 5.5 6.8" opacity="0.35"/><path d="M8 13.5 Q8 9.8 10 8.3" opacity="0.35"/>',
  'merge': '<path d="M4 19.5 Q4 13.5 8 12"/><path d="M12 19.5 Q12 13.5 8 12"/><path d="M8 12 V4.5"/><path d="M5.5 8.3 L8 4.5 L10.5 8.3"/>',
  'ferry-enter': '<path d="M8 19.5 V9"/><path d="M5.5 12.8 L8 9 L10.5 12.8"/><path d="M2.5 21.5 Q8 23 13.5 21.5" opacity="0.6"/>',
  'ferry-exit': '<path d="M8 4.5 V15"/><path d="M5.5 11.3 L8 15 L10.5 11.3"/><path d="M2.5 21.5 Q8 23 13.5 21.5" opacity="0.6"/>',
  'depart-right': '<circle cx="6" cy="12" r="4" stroke-width="1.3"/><circle cx="6" cy="12" r="1.8" fill="currentColor" stroke="none"/><path d="M11 12 H14"/><path d="M12.3 10.3 L14 12 L12.3 13.7"/>',
  'depart-left': '<circle cx="10" cy="12" r="4" stroke-width="1.3"/><circle cx="10" cy="12" r="1.8" fill="currentColor" stroke="none"/><path d="M5 12 H2"/><path d="M3.7 10.3 L2 12 L3.7 13.7"/>',
  'goal-right': '<path d="M2 13 H6.5"/><path d="M4.8 11.3 L6.5 13 L4.8 14.7"/><path d="M10 18.5 V6.5"/><path d="M10 7 L15.5 9.2 L10 11.4 Z" fill="currentColor" stroke="none"/>',
  'goal-left': '<path d="M14 13 H9.5"/><path d="M11.2 11.3 L9.5 13 L11.2 14.7"/><path d="M6 18.5 V6.5"/><path d="M6 7 L0.5 9.2 L6 11.4 Z" fill="currentColor" stroke="none"/>',
  'becomes': '<path d="M8 19.5 V4.5"/><path d="M5.5 8.3 L8 4.5 L10.5 8.3"/><path d="M4.5 13.5 H11.5" stroke-dasharray="1 1.5" opacity="0.5"/>',
};

const FALLBACK_KIND: ManeuverKind = 'straight';

/**
 * Baut das SVG-Markup für ein Turn-by-Turn-Manöver-Icon (z.B. für die Wegbeschreibung in
 * `RoutingSidebar.ts`). Unbekannte/künftige Werte fallen auf "Straight" zurück statt nichts
 * anzuzeigen.
 */
export function getManeuverIconMarkup(kind: ManeuverKind): string {
  const inner = MANEUVER_ICON_PATHS[kind] ?? MANEUVER_ICON_PATHS[FALLBACK_KIND];
  return `<svg class="maneuver-item-icon" viewBox="0 0 16 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
