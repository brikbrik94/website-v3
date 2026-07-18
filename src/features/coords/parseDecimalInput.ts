/**
 * Parst eine Dezimalzahl-Eingabe, die sowohl Punkt als auch das im Deutschen übliche Komma als
 * Dezimaltrennzeichen enthalten kann — `parseFloat()` allein bricht bei einem Komma ab und
 * liefert nur den Teil davor zurück (`parseFloat("48,3") === 48` statt `48.3`), ohne Fehler.
 */
export function parseDecimalInput(value: string): number {
  return parseFloat(value.replace(',', '.'));
}
