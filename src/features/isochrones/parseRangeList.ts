import { parseDecimalInput } from '../coords/parseDecimalInput';

/**
 * Parst eine leerzeichen-getrennte Liste von Ring-Werten (z.B. "5 10 15" oder "1,5 3 5,5") in
 * aufsteigend sortierte, deduplizierte, positive Zahlen. Leerzeichen statt Komma als
 * Listentrennzeichen, damit das Komma für Dezimalwerte frei bleibt (siehe parseDecimalInput,
 * das denselben Komma-als-Dezimaltrennzeichen-Bug behebt wie in Wgs84Block.ts/UtmBlock.ts/
 * BmnBlock.ts).
 */
export function parseRangeList(value: string): number[] | null {
  const tokens = value.trim().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return null;

  const numbers = tokens.map(parseDecimalInput);
  if (numbers.some((n) => isNaN(n) || n <= 0)) return null;

  return [...new Set(numbers)].sort((a, b) => a - b);
}
