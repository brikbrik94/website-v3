import type { ManeuverKind } from '../types/common';

// Providerneutrale Manöver-Icons — alle 30 Icons 1:1 aus oe5ith-ci/assets/maneuver-icons/*.svg
// übernommen (siehe oe5ith-ci/docs/maneuver-icons.md): 14 seit v1.20.0 (ORS-Code 0-13), 16
// weitere für Valhalla-only-Konzepte seit v1.26.0 (ursprünglich als Vorschlag eingereicht,
// https://github.com/brikbrik94/oe5ith-ci/issues/2 — inzwischen geschlossen, offiziell
// übernommen; Ausnahme 'uturn-left', siehe Kommentar dort). Herleitung:
// docs/superpowers/specs/2026-08-22-valhalla-turn-by-turn-parity-design.md.
const MANEUVER_ICON_PATHS: Record<ManeuverKind, string> = {
  // Bestehende 14 (oe5ith-ci v1.20.0, vormals ORS-Code 0-13)
  'turn-left': '<path d="M8 13 Q8 7 2.6 7"/><path d="M2 4.7 L2.6 7 L4.1 5.2"/>',
  'turn-right': '<path d="M8 13 Q8 7 13.4 7"/><path d="M14 4.7 L13.4 7 L11.9 5.2"/>',
  'sharp-left': '<path d="M8 13 Q8 11.5 3.8 11.5"/><path d="M1.6 10.5 L3.8 11.5 L3.4 9.2"/>',
  'sharp-right': '<path d="M8 13 Q8 11.5 12.2 11.5"/><path d="M14.4 10.5 L12.2 11.5 L12.6 9.2"/>',
  'slight-left': '<path d="M8 13 Q8 3 5.7 3"/><path d="M7.3 1.2 L5.7 3 L8.1 3.2"/>',
  'slight-right': '<path d="M8 13 Q8 3 10.3 3"/><path d="M8.7 1.2 L10.3 3 L7.9 3.2"/>',
  'straight': '<path d="M8 13 V4"/><path d="M5.5 6.5 L8 4 L10.5 6.5"/>',
  'roundabout-enter': '<circle cx="8" cy="8" r="4"/><path d="M8 14 V12"/><path d="M6 12.5 L8 10.5 L10 12.5"/>',
  'roundabout-exit': '<circle cx="8" cy="8" r="4"/><path d="M8 4 V2"/><path d="M6 3.5 L8 1.5 L10 3.5"/>',
  'uturn': '<path d="M11 13 V6 A3 3 0 0 0 5 6 V9"/><path d="M2.8 7 L5 9.5 L7.2 7"/>',
  'goal': '<path d="M5 14.5 V2.5"/><path d="M5 3 L11.5 5.2 L5 7.4 Z" fill="currentColor" stroke="none"/>',
  'depart': '<circle cx="8" cy="8" r="5" stroke-width="1.3"/><circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none"/>',
  'keep-left': '<path d="M8 13 V9"/><path d="M8 9 Q8 6 5.5 4.5"/><path d="M7.2 2.8 L5.3 4.3 L6.8 6.4"/><path d="M8 9 Q8 6.5 10 5.5" opacity="0.35"/>',
  'keep-right': '<path d="M8 13 V9"/><path d="M8 9 Q8 6 10.5 4.5"/><path d="M8.8 2.8 L10.7 4.3 L9.2 6.4"/><path d="M8 9 Q8 6.5 6 5.5" opacity="0.35"/>',

  // Valhalla-only (oe5ith-ci v1.26.0). 'uturn-right' 1:1 aus dem offiziellen
  // ci-maneuver-uturn-right.svg übernommen. 'uturn-left' bewusst NICHT synchronisiert — die
  // offizielle oe5ith-ci-Version von ci-maneuver-uturn-left.svg (Stand v1.26.0) ist byte-identisch
  // zum bestehenden bare 'uturn' oben (derselbe Kollisions-Fehler, der hier lokal beim
  // Plan-Self-Review bereits gefunden und korrigiert wurde — der ursprüngliche GitHub-Issue-Text
  // hat den Fehler versehentlich weitergetragen, oe5ith-ci hat ihn wörtlich übernommen). Bis
  // oe5ith-ci das behebt, bleibt hier die bereits korrigierte, eigenständige lokale Fassung
  // erhalten — siehe docs/ci/open-items.md für den nachgemeldeten Bug.
  'uturn-left': '<path d="M9 13 V8 A4 4 0 0 0 3 8 V11"/><path d="M1 9.5 L3 11.5 L5 9.5"/>',
  'uturn-right': '<path d="M5 13 V6 A3 3 0 0 1 11 6 V9"/><path d="M13.2 7 L11 9.5 L8.8 7"/>',
  'ramp-right': '<path d="M8 13 V9"/><path d="M8 9 Q8 6 11 5"/><path d="M12.8 3.5 L11 5 L11.8 7"/><path d="M8 9 V3" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'ramp-left': '<path d="M8 13 V9"/><path d="M8 9 Q8 6 5 5"/><path d="M3.2 3.5 L5 5 L4.2 7"/><path d="M8 9 V3" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'ramp-straight': '<path d="M8 13 V3"/><path d="M5.5 5.5 L8 3 L10.5 5.5"/><path d="M11 11 Q11 8 9 6" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'exit-right': '<path d="M8 13 Q8 11.5 12.2 11.5"/><path d="M14.4 10.5 L12.2 11.5 L12.6 9.2"/><path d="M8 13 V3" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'exit-left': '<path d="M8 13 Q8 11.5 3.8 11.5"/><path d="M1.6 10.5 L3.8 11.5 L3.4 9.2"/><path d="M8 13 V3" stroke-dasharray="1.5 1.5" opacity="0.4"/>',
  'stay-straight': '<path d="M8 13 V4"/><path d="M5.5 6.5 L8 4 L10.5 6.5"/><path d="M8 9 Q8 6 5.5 4.5" opacity="0.35"/><path d="M8 9 Q8 6.5 10 5.5" opacity="0.35"/>',
  'merge': '<path d="M4 13 Q4 9 8 8"/><path d="M12 13 Q12 9 8 8"/><path d="M8 8 V3"/><path d="M5.5 5.5 L8 3 L10.5 5.5"/>',
  'ferry-enter': '<path d="M8 13 V6"/><path d="M5.5 8.5 L8 6 L10.5 8.5"/><path d="M2.5 13 Q8 15.5 13.5 13" opacity="0.6"/>',
  'ferry-exit': '<path d="M8 3 V10"/><path d="M5.5 7.5 L8 10 L10.5 7.5"/><path d="M2.5 13 Q8 15.5 13.5 13" opacity="0.6"/>',
  'depart-right': '<circle cx="6" cy="8" r="4" stroke-width="1.3"/><circle cx="6" cy="8" r="1.8" fill="currentColor" stroke="none"/><path d="M11 8 H14"/><path d="M12.3 6.3 L14 8 L12.3 9.7"/>',
  'depart-left': '<circle cx="10" cy="8" r="4" stroke-width="1.3"/><circle cx="10" cy="8" r="1.8" fill="currentColor" stroke="none"/><path d="M5 8 H2"/><path d="M3.7 6.3 L2 8 L3.7 9.7"/>',
  'goal-right': '<path d="M2 9 H6.5"/><path d="M4.8 7.3 L6.5 9 L4.8 10.7"/><path d="M10 14.5 V2.5"/><path d="M10 3 L15.5 5.2 L10 7.4 Z" fill="currentColor" stroke="none"/>',
  'goal-left': '<path d="M14 9 H9.5"/><path d="M11.2 7.3 L9.5 9 L11.2 10.7"/><path d="M6 14.5 V2.5"/><path d="M6 3 L0.5 5.2 L6 7.4 Z" fill="currentColor" stroke="none"/>',
  'becomes': '<path d="M8 13 V3"/><path d="M5.5 5.5 L8 3 L10.5 5.5"/><path d="M4.5 9 H11.5" stroke-dasharray="1 1.5" opacity="0.5"/>',
};

const FALLBACK_KIND: ManeuverKind = 'straight';

/**
 * Baut das SVG-Markup für ein Turn-by-Turn-Manöver-Icon (z.B. für die Wegbeschreibung in
 * `RoutingSidebar.ts`). Unbekannte/künftige Werte fallen auf "Straight" zurück statt nichts
 * anzuzeigen.
 */
export function getManeuverIconMarkup(kind: ManeuverKind): string {
  const inner = MANEUVER_ICON_PATHS[kind] ?? MANEUVER_ICON_PATHS[FALLBACK_KIND];
  return `<svg class="disclosure-item-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
