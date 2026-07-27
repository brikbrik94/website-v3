import * as maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { attachHoverCursor } from '../lib/HoverCursor';
import { initTopbar } from '../components/Topbar';
import { LayoutHelper } from '../lib/LayoutHelper';
import { InventoryService } from '../services/InventoryService';
import { GraphSidebarAdapter } from '../features/graph/GraphSidebarAdapter';
import { EDGES_LAYER_ID, NODES_LAYER_ID } from '../features/graph/GraphMapLayers';

/**
 * GraphPageController - Orchestriert die versteckte /graph-Seite (ORS-Routing-Graph-Export).
 * Kein Homepage-Card/Nav-Link (analog /info) - nur über direkte URL erreichbar.
 */
export class GraphPageController extends BasePageController {
  private map?: maplibregl.Map;
  private sidebarAdapter?: GraphSidebarAdapter;

  public async mount(container: HTMLElement): Promise<void> {
    try {
      const invService = InventoryService.getInstance();
      const basemaps = await invService.getBasemaps();

      const mounts = LayoutHelper.renderBaseLayout(container, {});

      this.map = MapCore.init(
        mounts.map,
        basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
        () => this.handleMapRestore()
      );

      this.sidebarAdapter = new GraphSidebarAdapter(this.map, this.signal);
      await this.sidebarAdapter.init(mounts.sidebar);

      initTopbar(mounts.topbar, basemaps, (url) => {
        if (this.map) this.map.setStyle(url);
      });

      this.setupMapListeners();

      console.debug('[GraphPageController] Mounted successfully');
    } catch (err) {
      console.error('[GraphPageController] Initialization failed:', err);
    }
  }

  private setupMapListeners(): void {
    if (!this.map || !this.sidebarAdapter) return;
    attachHoverCursor(this.map, [EDGES_LAYER_ID, NODES_LAYER_ID]);
    this.map.on('click', (e) => this.sidebarAdapter?.handleMapClick(e));
  }

  private handleMapRestore(): void {
    this.sidebarAdapter?.reapplyLayers();
  }

  public destroy(): void {
    super.destroy();
    this.sidebarAdapter?.destroy();
    this.map?.remove();
    console.debug('[GraphPageController] Destroyed');
  }
}
