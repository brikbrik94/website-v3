import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import * as maplibregl from 'maplibre-gl';
import { Toast } from '../lib/Toast';
import { initNahSidebar, updateNahServerStatus } from '../components/NahSidebar';
import { MAP_ROUTE_STYLES, MAP_COLORS } from '../lib/MapStyles';
import { MapLegend } from '../lib/MapLegend';
import { resolveLegendSwatchBranches } from '../lib/resolveLegendSwatch';
import { PopupManager } from '../lib/PopupManager';
import { NahStationResult } from '../types/nah';
import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';
import { BasePageController } from '../core/BasePageController';

// Feature Modules
import { NahDataService } from '../features/nah/NahDataService';
import { NahMapLayers } from '../features/nah/NahMapLayers';
import { NahSidebarAdapter } from '../features/nah/NahSidebarAdapter';

export class NahPageController extends BasePageController {
  private dataService: NahDataService | null = null;
  private currentResults: NahStationResult[] = [];
  private currentIncidentCoord: [number, number] | null = null;
  private map: maplibregl.Map | null = null;
  private sidebarResults: HTMLElement | null = null;

  public async mount(container: HTMLElement): Promise<void> {
    try {
      // 1. Load basic infrastructure
      const invService = InventoryService.getInstance();
      const basemaps = await invService.getBasemaps();

      // 2. Base Layout
      const mounts = LayoutHelper.renderBaseLayout(container, { 
        withLegend: true, 
        legendTitle: 'Luftrettung' 
      });

      const legend = new MapLegend(mounts.legend!);
      legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.active.color, label: 'Gewählte Station' });
      legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.background.color, label: 'Nächste Stationen' });

      // Status-Farben werden aus der echten Stations-Layer-Definition gelesen (eine Quelle der
      // Wahrheit statt separat gepflegter MAP_COLORS-Duplikate), Icon passend zum Kartensymbol.
      const statusBranches = resolveLegendSwatchBranches(NahMapLayers.getStationsLayerDefinition(), {
        active: 'Einsatzbereit',
        inactive: 'Außer Dienst (Betriebszeit)',
        offseason: 'Außer Saison',
      });
      if (statusBranches) {
        statusBranches.forEach((b) => legend.addEntry({ type: 'icon', icon: 'fa-solid fa-helicopter', color: b.color, label: b.label }));
      } else {
        console.warn('[NahPage] Status-Legende konnte nicht aus der Stations-Layer-Definition abgeleitet werden, nutze Fallback-Werte');
        legend.addEntry({ type: 'dot', color: MAP_COLORS.success, label: 'Einsatzbereit' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.danger, label: 'Außer Dienst (Betriebszeit)' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.muted, label: 'Außer Saison' });
      }

      initNahSidebar(mounts.sidebar);
      this.sidebarResults = document.getElementById('nah-sidebar-results')!;

      // 3. Map Initialization
      this.map = MapCore.init(
        mounts.map, 
        basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
        async (m) => {
          NahMapLayers.initLayers(m);
          if (this.currentIncidentCoord && this.sidebarResults) {
            this.performCalculation(m, this.sidebarResults, this.currentIncidentCoord[0], this.currentIncidentCoord[1]);
          }
          m.triggerRepaint();
        }
      );
      this.map.jumpTo({ center: [13.5, 48.0], zoom: 7 });

      // 4. Component Initialization
      initTopbar(mounts.topbar, basemaps, (url) => {
        if (!this.map) return;
        this.map.setStyle(url);
      }, () => legend.toggle());

      // 5. Setup Data Service
      this.dataService = new NahDataService(this.signal);
      this.dataService.setCallbacks(
        (stations) => {
          if (!this.map) return;
          NahMapLayers.setStations(this.map, stations);

          if (stations.length > 0) {
            Toast.success(`${stations.length} NAH-Stützpunkte geladen.`);
          }

          // Recalculate if we already have an incident coord
          if (this.currentIncidentCoord && this.sidebarResults) {
            this.performCalculation(this.map, this.sidebarResults, this.currentIncidentCoord[0], this.currentIncidentCoord[1]);
          }
        },
        (online) => updateNahServerStatus(online)
      );

      await this.dataService.start();

      // 6. Map Event Handlers
      this.map.on('click', this.handleMapClick);

      // Sidebar Interaction
      this.sidebarResults.addEventListener('click', this.handleSidebarClick);

    } catch (err) {
      console.error('[NahPage]', err);
      Toast.error('Fehler beim Initialisieren der Luftrettungs-Seite');
    }
  }

  public destroy(): void {
    super.destroy();

    // Data service is automatically stopped via AbortSignal in its constructor

    PopupManager.closePopup();

    if (this.map) {
      NahMapLayers.clearTargetPin(this.map);
    }

    if (this.map) {
      this.map.off('click', this.handleMapClick);
    }
    
    if (this.sidebarResults) {
      this.sidebarResults.removeEventListener('click', this.handleSidebarClick);
    }
  }

  private handleMapClick = (e: maplibregl.MapMouseEvent) => {
    if (!this.map || !this.sidebarResults) return;

    if (NahMapLayers.handleStationClick(this.map, e)) {
      return;
    }

    const { lng, lat } = e.lngLat;
    this.performCalculation(this.map, this.sidebarResults, lng, lat);
  };

  private handleSidebarClick = (e: MouseEvent) => {
    NahSidebarAdapter.handleSidebarClick(e, {
      map: this.map,
      currentIncidentCoord: this.currentIncidentCoord,
      currentResults: this.currentResults
    });
  };

  private performCalculation(map: maplibregl.Map, sidebarResults: HTMLElement, lng: number, lat: number) {
    if (!this.dataService) return;

    this.currentIncidentCoord = [lng, lat];

    NahMapLayers.setTargetPin(map, lng, lat);

    const results = this.dataService.getNearestActiveStations(lng, lat);
    this.currentResults = results;

    NahMapLayers.updateFlightPaths(map, [lng, lat], results);
    NahSidebarAdapter.updateResults(sidebarResults, results);
  }
}
