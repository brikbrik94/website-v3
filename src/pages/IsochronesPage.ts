import maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { attachHoverCursor } from '../lib/HoverCursor';
import { initTopbar } from '../components/Topbar';
import { MapLegend } from '../lib/MapLegend';
import { LayoutHelper } from '../lib/LayoutHelper';
import { InventoryService } from '../services/InventoryService';

import { IsochronesDataService } from '../features/isochrones/IsochronesDataService';
import { IsochronesMapLayers } from '../features/isochrones/IsochronesMapLayers';
import { IsochronesSidebarAdapter } from '../features/isochrones/IsochronesSidebarAdapter';

/**
 * IsochronesPageController - Orchestriert die Isochronen-Seite.
 */
export class IsochronesPageController extends BasePageController {
  private map?: maplibregl.Map;
  private sidebarAdapter?: IsochronesSidebarAdapter;

  public async mount(container: HTMLElement): Promise<void> {
    try {
      const invService = InventoryService.getInstance();
      const basemaps = await invService.getBasemaps();

      const mounts = LayoutHelper.renderBaseLayout(container, {
        withLegend: true,
        legendTitle: 'Isochronen'
      });

      IsochronesMapLayers.registerResources();
      const dataService = new IsochronesDataService();

      this.map = MapCore.init(
        mounts.map,
        basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
        () => this.handleMapRestore()
      );

      const legend = new MapLegend(mounts.legend!);

      this.sidebarAdapter = new IsochronesSidebarAdapter(dataService, this.map, legend, this.signal);
      await this.sidebarAdapter.init(mounts.sidebar);

      initTopbar(mounts.topbar, basemaps, (url) => {
        if (this.map) this.map.setStyle(url);
      }, () => legend.toggle());

      this.setupMapListeners();

      console.debug('[IsochronesPageController] Mounted successfully');
    } catch (err) {
      console.error('[IsochronesPageController] Initialization failed:', err);
    }
  }

  private setupMapListeners(): void {
    if (!this.map || !this.sidebarAdapter) return;
    attachHoverCursor(this.map, ['isochrones-rings-layer']);
    this.map.on('click', (e) => this.sidebarAdapter?.handleMapClick(e.lngLat));
  }

  private handleMapRestore(): void {
    this.sidebarAdapter?.reapplyLayers();
  }

  public destroy(): void {
    super.destroy();
    this.map?.remove();
    console.debug('[IsochronesPageController] Destroyed');
  }
}
