import { RoutingService } from './RoutingService';

const ORS_BASE_URL = '/api/ors.php';

export type GraphExportFormat = 'json' | 'topojson';

export type GraphExportResult =
  | { ok: true; raw: unknown; format: GraphExportFormat; payloadBytes: number }
  | { ok: false; status: number | null };

/**
 * Abstraktionsschicht über den `/api/ors.php`-Proxy für den ORS-`/export`-Endpoint (interner
 * Routing-Graph als Bbox-Ausschnitt). Health-Check/Profil-Liste wiederverwendet von
 * RoutingService (generische ORS-Abfragen), analog IsochronesService. `status` im
 * Fehlerfall wird durchgereicht, damit der Adapter gezielt auf 504 (Bbox zu groß/Timeout,
 * siehe Design-Spec-Kalibrierung) reagieren kann statt auf eine generische Fehlermeldung.
 */
export const GraphExportService = {
  checkHealth: RoutingService.checkHealth,
  getProfiles: RoutingService.getProfiles,

  async queryExport(
    profile: string,
    format: GraphExportFormat,
    bbox: [[number, number], [number, number]],
    geometry: boolean
  ): Promise<GraphExportResult> {
    const path = format === 'topojson' ? `export/${profile}/topojson` : `export/${profile}`;
    const url = `${ORS_BASE_URL}?path=${path}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox, geometry })
      });

      if (!res.ok) return { ok: false, status: res.status };
      // Größe aus dem bereits vorliegenden Response-Body-Text ableiten statt raw erneut zu
      // serialisieren (JSON.stringify(raw).length wäre sowohl unnötiger Zusatzaufwand bei
      // ggf. mehrere MB großen Antworten als auch ungenau, da ein neu serialisiertes Objekt
      // nicht zwangsläufig gleich lang ist wie die tatsächliche Drahtgröße).
      const text = await res.text();
      const raw = JSON.parse(text);
      return { ok: true, raw, format, payloadBytes: text.length };
    } catch (e) {
      console.error('Graph-Export Fehler:', e);
      return { ok: false, status: null };
    }
  }
};
