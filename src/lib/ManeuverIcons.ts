// ORS-Manöver-Code (0-13) → inneres SVG-Markup, 1:1 aus oe5ith-ci/assets/maneuver-icons/*.svg
// (v1.20.0) übernommen. Siehe oe5ith-ci/docs/maneuver-icons.md für den vollständigen Katalog.
const MANEUVER_ICON_PATHS: Record<number, string> = {
  0: '<path d="M8 13 Q8 7 2.6 7"/><path d="M2 4.7 L2.6 7 L4.1 5.2"/>',
  1: '<path d="M8 13 Q8 7 13.4 7"/><path d="M14 4.7 L13.4 7 L11.9 5.2"/>',
  2: '<path d="M8 13 Q8 11.5 3.8 11.5"/><path d="M1.6 10.5 L3.8 11.5 L3.4 9.2"/>',
  3: '<path d="M8 13 Q8 11.5 12.2 11.5"/><path d="M14.4 10.5 L12.2 11.5 L12.6 9.2"/>',
  4: '<path d="M8 13 Q8 3 5.7 3"/><path d="M7.3 1.2 L5.7 3 L8.1 3.2"/>',
  5: '<path d="M8 13 Q8 3 10.3 3"/><path d="M8.7 1.2 L10.3 3 L7.9 3.2"/>',
  6: '<path d="M8 13 V4"/><path d="M5.5 6.5 L8 4 L10.5 6.5"/>',
  7: '<circle cx="8" cy="8" r="4"/><path d="M8 14 V12"/><path d="M6 12.5 L8 10.5 L10 12.5"/>',
  8: '<circle cx="8" cy="8" r="4"/><path d="M8 4 V2"/><path d="M6 3.5 L8 1.5 L10 3.5"/>',
  9: '<path d="M11 13 V6 A3 3 0 0 0 5 6 V9"/><path d="M2.8 7 L5 9.5 L7.2 7"/>',
  10: '<path d="M5 14.5 V2.5"/><path d="M5 3 L11.5 5.2 L5 7.4 Z" fill="currentColor" stroke="none"/>',
  11: '<circle cx="8" cy="8" r="5" stroke-width="1.3"/><circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none"/>',
  12: '<path d="M8 13 V9"/><path d="M8 9 Q8 6 5.5 4.5"/><path d="M7.2 2.8 L5.3 4.3 L6.8 6.4"/><path d="M8 9 Q8 6.5 10 5.5" opacity="0.35"/>',
  13: '<path d="M8 13 V9"/><path d="M8 9 Q8 6 10.5 4.5"/><path d="M8.8 2.8 L10.7 4.3 L9.2 6.4"/><path d="M8 9 Q8 6.5 6 5.5" opacity="0.35"/>',
};

// ORS könnte künftig neue Manöver-Codes einführen; "Straight" ist der neutralste Fallback.
const FALLBACK_ORS_CODE = 6;

/**
 * Baut das SVG-Markup für ein ORS-Turn-by-Turn-Manöver-Icon (z.B. für die Wegbeschreibung in
 * `RoutingSidebar.ts`). Unbekannte/künftige ORS-Codes fallen auf "Straight" (Code 6) zurück statt
 * nichts anzuzeigen.
 */
export function getManeuverIconMarkup(orsCode: number): string {
  const inner = MANEUVER_ICON_PATHS[orsCode] ?? MANEUVER_ICON_PATHS[FALLBACK_ORS_CODE];
  return `<svg class="disclosure-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
