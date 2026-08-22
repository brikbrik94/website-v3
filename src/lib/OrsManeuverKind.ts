import type { ManeuverKind } from '../types/common';

// ORS' numerischer Manöver-Code (0-13, siehe oe5ith-ci/docs/maneuver-icons.md "ORS-Code-Katalog")
// → providerneutraler ManeuverKind.
const ORS_CODE_TO_KIND: Record<number, ManeuverKind> = {
  0: 'turn-left',
  1: 'turn-right',
  2: 'sharp-left',
  3: 'sharp-right',
  4: 'slight-left',
  5: 'slight-right',
  6: 'straight',
  7: 'roundabout-enter',
  8: 'roundabout-exit',
  9: 'uturn',
  10: 'goal',
  11: 'depart',
  12: 'keep-left',
  13: 'keep-right',
};

/** ORS könnte künftig neue Manöver-Codes einführen; "straight" ist der neutralste Fallback. */
export function orsCodeToManeuverKind(code: number): ManeuverKind {
  return ORS_CODE_TO_KIND[code] ?? 'straight';
}
