const EARTH_RADIUS_M = 6371000;

/**
 * Berechnet die Fläche einer WGS84-Bbox in Quadratmetern (Äquirechteck-Näherung, bei den hier
 * relevanten Größenordnungen bis ~30 km Kantenlänge ausreichend genau). Nimmt die Koordinaten
 * unabhängig von ihrer Reihenfolge (Beträge der Differenzen), damit vertauschte Ecken kein
 * falsches (negatives) Ergebnis liefern.
 */
export function calculateBboxArea(bbox: [[number, number], [number, number]]): number {
  const [[lon1, lat1], [lon2, lat2]] = bbox;
  const midLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const widthM = Math.abs(lon2 - lon1) * (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(midLatRad);
  const heightM = Math.abs(lat2 - lat1) * (Math.PI / 180) * EARTH_RADIUS_M;
  return widthM * heightM;
}
