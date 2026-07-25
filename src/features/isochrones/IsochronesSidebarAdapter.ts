import * as maplibregl from 'maplibre-gl';
import { IsochronesDataService } from './IsochronesDataService';
import { IsochronesMapLayers } from './IsochronesMapLayers';
import { IsochronesService } from '../../lib/IsochronesService';
import { GeocoderService } from '../../lib/GeocoderService';
import { Toast } from '../../lib/Toast';
import { MapLegend } from '../../lib/MapLegend';
import { getIsochroneRingColor } from '../../lib/MapStyles';
import {
  initIsochronesSidebar,
  renderIsochronesResults,
  setIsochronesPoint,
  IsochronesFormParams
} from '../../components/IsochronesSidebar';
import { LegendEntry } from '../../types/common';

/**
 * Baut die dedupliziert Legenden-Einträge aus allen aktuell eye-aktiven Queries — ein Eintrag
 * pro Ring mit Farbe + formatiertem Wert (z.B. "5 min", "2,5 km"). Rein funktional (keine
 * DOM-/Map-Zugriffe), damit unabhängig von MapLegend testbar; analog zum bestehenden
 * Dedupe-Muster der Anfahrtszeit-Ringe (siehe docs/superpowers/specs/
 * 2026-07-12-map-legend-granularity-design.md).
 */
export function buildLegendEntries(dataService: IsochronesDataService): LegendEntry[] {
  const entries: LegendEntry[] = [];
  const seen = new Set<string>();

  dataService.getQueries().forEach((query, id) => {
    if (!dataService.isEyeActive(id)) return;

    const total = query.ranges.length;
    const unit = query.rangeType === 'time' ? 'min' : 'km';

    query.ranges.forEach((value, index) => {
      const color = getIsochroneRingColor(index, total);
      const label = `${String(value).replace('.', ',')} ${unit}`;
      const key = `${color}|${label}`;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({ id: key, type: 'area', color, label });
    });
  });

  return entries;
}

export class IsochronesSidebarAdapter {
  constructor(
    private dataService: IsochronesDataService,
    private map: maplibregl.Map,
    private legend: MapLegend,
    private abortSignal: AbortSignal
  ) {}

  public async init(container: HTMLElement): Promise<void> {
    await initIsochronesSidebar(container, {
      onCalculate: (params) => this.handleCalculate(params),
      onClearAll: () => {
        this.dataService.clearAll();
        this.refresh();
      }
    }, this.abortSignal);

    this.refresh();
  }

  public async handleMapClick(lngLat: { lat: number; lng: number }): Promise<void> {
    IsochronesMapLayers.updatePendingPoint(this.map, [lngLat.lng, lngLat.lat]);
    await setIsochronesPoint(lngLat.lat, lngLat.lng);
  }

  public reapplyLayers(): void {
    IsochronesMapLayers.ensureBaseLayers(this.map);
    IsochronesMapLayers.updateRingsLayer(this.map, this.dataService);
    IsochronesMapLayers.updatePointsLayer(this.map, this.dataService);
  }

  private async handleCalculate(params: IsochronesFormParams): Promise<void> {
    const btn = document.getElementById('btn-calculate-isochrone') as HTMLButtonElement;
    btn?.classList.add('loading');

    const geojson = await IsochronesService.calculateIsochrones(
      params.point, params.profile, params.ranges, params.rangeType
    );
    if (this.abortSignal.aborted) return;
    btn?.classList.remove('loading');

    if (!geojson || geojson.features.length === 0) {
      Toast.error('Isochronen-Berechnung fehlgeschlagen');
      return;
    }

    const address = await GeocoderService.reverse(params.point[0], params.point[1]);
    if (this.abortSignal.aborted) return;
    const label = address?.display_name || `${params.point[0].toFixed(4)}, ${params.point[1].toFixed(4)}`;

    this.dataService.addQuery({
      point: params.point,
      label,
      profile: params.profile,
      rangeType: params.rangeType,
      ranges: params.ranges,
      geojson
    });

    // Der berechnete Query-Pin (updatePointsLayer) übernimmt jetzt denselben Punkt —
    // Pending-Pin entfernen, sonst läge ein doppelter Marker an derselben Stelle.
    IsochronesMapLayers.updatePendingPoint(this.map, null);
    this.refresh();
  }

  private zoomToQuery(id: number): void {
    const query = this.dataService.getQuery(id);
    if (!query) return;

    const bounds = new maplibregl.LngLatBounds();
    query.geojson.features.forEach((f) => {
      const ring = f.geometry.coordinates[0] as [number, number][];
      ring.forEach((c) => bounds.extend(c));
    });
    this.map.fitBounds(bounds, { padding: 50 });
  }

  private refresh(): void {
    IsochronesMapLayers.updateRingsLayer(this.map, this.dataService);
    IsochronesMapLayers.updatePointsLayer(this.map, this.dataService);

    this.legend.clearEntries();
    buildLegendEntries(this.dataService).forEach((entry) => this.legend.addEntry(entry));

    const queries = Array.from(this.dataService.getQueries().values());
    renderIsochronesResults(
      queries,
      this.dataService.getEyeActiveStates(),
      (id, active) => {
        this.dataService.setEyeActiveState(id, active);
        this.refresh();
      },
      (id) => this.zoomToQuery(id),
      (id) => {
        this.dataService.removeQuery(id);
        this.refresh();
      }
    );
  }
}
