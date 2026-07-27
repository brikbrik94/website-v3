import * as maplibregl from 'maplibre-gl';
import { TerraDraw, TerraDrawRectangleMode, TerraDrawRenderMode, ValidateMaxAreaSquareMeters } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import type { Feature, Polygon } from 'geojson';
import { GraphDataService } from './GraphDataService';
import { GraphMapLayers, buildGraphFeatures, EDGES_LAYER_ID, NODES_LAYER_ID } from './GraphMapLayers';
import { calculateBboxArea } from './calculateBboxArea';
import { GraphExportService } from '../../lib/GraphExportService';
import { PopupManager } from '../../lib/PopupManager';
import { Toast } from '../../lib/Toast';
import {
  initGraphSidebar,
  setGraphBbox,
  renderGraphResult,
  MAX_BBOX_AREA_M2,
  GraphFormParams
} from '../../components/GraphSidebar';

/**
 * Übersetzt ein von terra-draw gezeichnetes Rechteck (Polygon, ggf. nicht perfekt
 * achsenparallel bei gedrehter/geneigter Karte) in eine achsenparallele ORS-Bbox
 * [[minLon,minLat],[maxLon,maxLat]] über die Min/Max-Koordinaten des Rings.
 */
export function rectangleFeatureToBbox(feature: Feature<Polygon>): [[number, number], [number, number]] {
  const ring = feature.geometry.coordinates[0];
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLon, minLat], [maxLon, maxLat]];
}

export class GraphSidebarAdapter {
  private dataService = new GraphDataService();
  private draw: TerraDraw;
  private currentBbox: [[number, number], [number, number]] | null = null;
  private nodesVisible = true;

  constructor(private map: maplibregl.Map, private abortSignal: AbortSignal) {
    this.draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawRenderMode({ styles: {} }),
        new TerraDrawRectangleMode({
          validation: (feature) => ValidateMaxAreaSquareMeters(feature, MAX_BBOX_AREA_M2)
        })
      ]
    });
    this.draw.start();
    this.draw.setMode('render');

    this.draw.on('finish', (id) => {
      const feature = this.draw.getSnapshotFeature(id) as Feature<Polygon> | undefined;
      if (!feature) return;
      this.currentBbox = rectangleFeatureToBbox(feature);
      setGraphBbox(this.currentBbox);
      this.draw.setMode('render');
    });
  }

  public async init(container: HTMLElement): Promise<void> {
    await initGraphSidebar(container, {
      onDrawBbox: () => {
        this.draw.clear();
        this.currentBbox = null;
        setGraphBbox(null);
        this.draw.setMode('rectangle');
      },
      onUseCurrentView: () => this.handleUseCurrentView(),
      onSubmit: (params) => this.handleSubmit(params),
      onNodesVisibleChange: (visible) => {
        this.nodesVisible = visible;
        GraphMapLayers.setNodesVisible(this.map, visible);
      }
    }, this.abortSignal);

    GraphMapLayers.ensureBaseLayers(this.map);
    setGraphBbox(null);
  }

  public reapplyLayers(): void {
    GraphMapLayers.ensureBaseLayers(this.map);
    const state = this.dataService.getResult();
    if (state) GraphMapLayers.update(this.map, state.features);
    GraphMapLayers.setNodesVisible(this.map, this.nodesVisible);
  }

  public handleMapClick(e: maplibregl.MapMouseEvent): void {
    const features = this.map.queryRenderedFeatures(e.point, { layers: [EDGES_LAYER_ID, NODES_LAYER_ID] });
    if (features.length === 0) {
      PopupManager.closePopup();
      return;
    }
    const feat = features[0];
    const html = PopupManager.buildHtml(feat.layer.id, feat.properties || {});
    PopupManager.showFeaturePopup(this.map, [e.lngLat.lng, e.lngLat.lat], html);
  }

  public destroy(): void {
    this.draw.stop();
    PopupManager.closePopup();
  }

  private handleUseCurrentView(): void {
    const bounds = this.map.getBounds();
    const bbox: [[number, number], [number, number]] = [
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()]
    ];
    if (calculateBboxArea(bbox) > MAX_BBOX_AREA_M2) {
      Toast.warning('Ansicht zu groß, bitte weiter hineinzoomen.');
      return;
    }
    this.currentBbox = bbox;
    setGraphBbox(bbox);
  }

  private async handleSubmit(params: GraphFormParams): Promise<void> {
    if (!this.currentBbox) return;
    const btn = document.getElementById('btn-query-export') as HTMLButtonElement;
    btn?.classList.add('loading');

    const response = await GraphExportService.queryExport(params.profile, params.format, this.currentBbox, params.geometry);
    if (this.abortSignal.aborted) return;
    btn?.classList.remove('loading');

    if (!response.ok) {
      const message = response.status === 504
        ? 'Zeitüberschreitung — Bbox verkleinern und erneut versuchen.'
        : 'Export fehlgeschlagen.';
      Toast.error(message);
      return;
    }

    const features = buildGraphFeatures(response.raw, response.format);
    this.dataService.setResult({
      bbox: this.currentBbox,
      profile: params.profile,
      format: params.format,
      geometry: params.geometry,
      features,
      payloadBytes: response.payloadBytes
    });

    GraphMapLayers.update(this.map, features);
    GraphMapLayers.setNodesVisible(this.map, this.nodesVisible);
    renderGraphResult({
      nodesCount: features.nodesCount,
      edgesCount: features.edgesCount,
      payloadBytes: response.payloadBytes,
      format: params.format
    });
  }
}
