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
    this.draw = this.createDraw();
    const startDraw = () => {
      this.draw.start();
      this.draw.setMode('render');
    };
    if (map.isStyleLoaded()) {
      startDraw();
    } else {
      map.once('load', startDraw);
    }
  }

  /**
   * Baut eine frische TerraDraw-Instanz inkl. Adapter, Modes und `finish`-Listener. Ausgelagert
   * aus dem Konstruktor, weil `reapplyLayers()` nach einem Basemap-Wechsel (`map.setStyle()`)
   * eine komplett neue Instanz braucht statt die alte weiterzuverwenden — siehe Kommentar dort.
   */
  private createDraw(): TerraDraw {
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: this.map }),
      modes: [
        new TerraDrawRenderMode({ modeName: 'render', styles: { polygonFillOpacity: 0.15 } }),
        new TerraDrawRectangleMode({
          drawInteraction: 'click-drag',
          validation: (feature) => ValidateMaxAreaSquareMeters(feature, MAX_BBOX_AREA_M2),
          styles: { fillOpacity: 0.15 }
        })
      ]
    });
    draw.on('finish', (id) => {
      const feature = draw.getSnapshotFeature(id) as Feature<Polygon> | undefined;
      if (!feature) return;
      this.currentBbox = rectangleFeatureToBbox(feature);
      setGraphBbox(this.currentBbox);
      draw.setMode('render');
    });
    return draw;
  }

  public async init(container: HTMLElement): Promise<void> {
    await initGraphSidebar(container, {
      onDrawBbox: () => {
        // Sidebar-Buttons werden schon klickbar, sobald initGraphSidebar() aufgelöst ist (nur
        // ORS-Health-gated, nicht map-gated) — draw.start() läuft aber erst nach 'load'
        // (siehe Konstruktor). Ohne diese Guard würde ein Klick in diesem kurzen Fenster
        // "Error: Terra Draw is not enabled" werfen (selbstheilend beim zweiten Klick, aber
        // unschön). Einfacher Guard statt komplexerer Race-Behebung.
        if (!this.draw.enabled) return;
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

    // terra-draw-maplibre-gl-adapter registriert seine eigenen Sources/Layer ("td-point"/
    // "td-linestring"/"td-polygon") nicht in MapRegistry und hat selbst keine
    // styledata/style.load-Behandlung. map.setStyle() (Basemap-Wechsel) tauscht den kompletten
    // Style aus, wodurch diese Sources/Layer der alten Instanz komplett verschwinden — ohne
    // diesen Re-Init würde der nächste "Bbox zeichnen"-Klick draw.clear() aufrufen, das intern
    // ungeprüft map.getSource('td-point').setData(...) auf eine nicht mehr existierende Source
    // aufruft (TypeError, Zeichnen bleibt dauerhaft kaputt bis Reload).
    //
    // Bewusst NICHT this.draw.stop() auf der alten Instanz, um sie danach neu zu starten:
    // stop() ruft intern adapter.unregister() auf, das ungeprüft removeLayer()/removeSource()
    // für exakt diese bereits verschwundenen IDs aufruft. map.removeSource() auf eine
    // nicht-existente Source wirft laut maplibre-gl-Quelle (Style.removeSource) einen echten,
    // synchronen Error (nicht nur ein ErrorEvent wie removeLayer) — das würde unkontrolliert aus
    // reapplyLayers() herausplatzen und die aufrufende MapCore-Restore-Sequenz abbrechen, bevor
    // deren eigener MapRegistry.restore()-Schritt läuft. Stattdessen wird eine komplett neue
    // TerraDraw+Adapter-Instanz gebaut; die alte wird ohne weiteren Methodenaufruf verworfen.
    // Ihre DOM-Listener (pointerdown/-move/-up etc.) bleiben zwar am Canvas hängen, sind aber
    // folgenlos: ihr Modus ist praktisch immer 'render' (das inerte No-op-Mode, in das nach
    // jedem Zeichenvorgang und direkt nach dem Start zurückgeschaltet wird) - einzige
    // Ausnahme wäre ein Basemap-Wechsel exakt während eines laufenden Rechteck-Zeichenvorgangs,
    // ein enges Randzeitfenster, das der finale Review nicht als zu behebender Fall benannt hat.
    if (!this.map.getSource('td-polygon')) {
      this.draw = this.createDraw();
      this.draw.start();
      this.draw.setMode('render');
    }
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
    const btn = document.getElementById('btn-query-export') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
    }

    try {
      const response = await GraphExportService.queryExport(params.profile, params.format, this.currentBbox, params.geometry);
      if (this.abortSignal.aborted) return;

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
    } finally {
      if (btn) {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    }
  }
}
