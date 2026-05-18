import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { Topbar } from '../components/Topbar';
import { MapLegend } from '../lib/MapLegend';
import { renderLayout } from '../lib/LayoutHelper';
import { ContextMenu } from '../components/ContextMenu';

import { RoutingDataService } from '../features/routing/RoutingDataService';
import { RoutingMapLayers } from '../features/routing/RoutingMapLayers';
import { RoutingSidebarAdapter } from '../features/routing/RoutingSidebarAdapter';

export class RoutingPageController extends BasePageController {
    private mapCore: MapCore;
    private sidebarAdapter: RoutingSidebarAdapter;

    public async mount(container: HTMLElement): Promise<void> {
        const { mapContainer, sidebarContainer } = renderLayout(container);
        this.sidebarAdapter = new RoutingSidebarAdapter(sidebarContainer);

        this.mapCore = new MapCore(mapContainer, {
            onRestore: () => this.handleMapRestore()
        });
        
        new Topbar(this.mapCore.getMap(), {
            title: 'Routen-Planer',
            mapLegend: new MapLegend(this.mapCore.getMap()),
        });

        const dataService = new RoutingDataService({ signal: this.signal });
        const mapLayers = new RoutingMapLayers(this.mapCore.getMap());
        this.sidebarAdapter.init(dataService, mapLayers);

        this.setupMapListeners();
    }

    private setupMapListeners(): void {
        const map = this.mapCore.getMap();

        map.on('click', (e) => this.sidebarAdapter.handleMapClick(e));
        map.on('mouseenter', 'routes', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'routes', () => map.getCanvas().style.cursor = '');

        new ContextMenu(map, [
            { id: 'add_waypoint_here', label: 'Wegpunkt hier hinzufügen', action: (e) => this.sidebarAdapter.addWaypoint(e.lngLat) },
            { id: 'clear_route', label: 'Route löschen', action: () => this.sidebarAdapter.clearRoute() }
        ]);
    }



    private handleMapRestore(): void {
        if (this.sidebarAdapter) {
            this.sidebarAdapter.reapplyLayers();
        }
    }
}
