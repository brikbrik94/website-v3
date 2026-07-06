import maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { attachHoverCursor } from '../lib/HoverCursor';
import { initTopbar } from '../components/Topbar';
import { MapLegend } from '../lib/MapLegend';
import { LayoutHelper } from '../lib/LayoutHelper';
import { ContextMenu } from '../components/ContextMenu';
import { InventoryService } from '../services/InventoryService';
import { ContextMenuItem } from '../types/common';

import { RoutingDataService } from '../features/routing/RoutingDataService';
import { RoutingMapLayers } from '../features/routing/RoutingMapLayers';
import { RoutingSidebarAdapter } from '../features/routing/RoutingSidebarAdapter';

/**
 * RoutingPageController - Orchestriert die Routing-Seite.
 */
export class RoutingPageController extends BasePageController {
    private map?: maplibregl.Map;
    private sidebarAdapter?: RoutingSidebarAdapter;

    public async mount(container: HTMLElement): Promise<void> {
        try {
            // 1. Daten laden (Basemaps für Topbar)
            const invService = InventoryService.getInstance();
            const basemaps = await invService.getBasemaps();

            // 2. Basis-Layout rendern
            const mounts = LayoutHelper.renderBaseLayout(container, {
                withLegend: true,
                legendTitle: 'Routing'
            });

            // 3. Dienste & Ressourcen initialisieren
            RoutingMapLayers.registerResources();
            const dataService = new RoutingDataService();
            
            // 4. Karte initialisieren
            this.map = MapCore.init(
                mounts.map,
                basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
                () => this.handleMapRestore()
            );

            // 5. Sidebar Adapter & UI initialisieren
            this.sidebarAdapter = new RoutingSidebarAdapter(dataService, this.map, this.signal);
            this.sidebarAdapter.init(mounts.sidebar);

            // 6. Topbar & Legende initialisieren
            const legend = new MapLegend(mounts.legend!);
            initTopbar(mounts.topbar, basemaps, (url) => {
                if (this.map) this.map.setStyle(url);
            }, () => legend.toggle());

            // 7. Event-Listener
            this.setupMapListeners();

            console.debug('[RoutingPageController] Mounted successfully');
        } catch (err) {
            console.error('[RoutingPageController] Initialization failed:', err);
        }
    }

    private setupMapListeners(): void {
        if (!this.map || !this.sidebarAdapter) return;

        this.map.on('click', (e) => this.sidebarAdapter?.handleMapClick(e));

        attachHoverCursor(this.map, ['routing-path']);

        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.lngLat;
            const modeBtn = document.querySelector('.segmented-btn.active');
            const mode = modeBtn?.getAttribute('data-mode') || 'ab';

            const menuItems: (ContextMenuItem | 'sep' | { label: string, type: 'label' })[] = [
                { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, type: 'label' },
                'sep'
            ];

            if (mode === 'ab') {
                menuItems.push({ 
                    label: 'Als Startpunkt setzen', 
                    icon: 'fa-solid fa-location-dot',
                    onClick: () => this.sidebarAdapter?.setCoord('start', lat, lng)
                });
                menuItems.push({ 
                    label: 'Als Zielpunkt setzen', 
                    icon: 'fa-solid fa-flag-checkered',
                    onClick: () => this.sidebarAdapter?.setCoord('target', lat, lng)
                });
            } else {
                menuItems.push({ 
                    label: 'Als Einsatzort setzen', 
                    icon: 'fa-solid fa-truck-medical',
                    onClick: () => this.sidebarAdapter?.setCoord('target', lat, lng)
                });
            }

            ContextMenu.show(e.originalEvent.clientX, e.originalEvent.clientY, menuItems);
        });
    }

    private handleMapRestore(): void {
        if (this.sidebarAdapter) {
            this.sidebarAdapter.reapplyLayers();
        }
    }

    public destroy(): void {
        super.destroy();
        this.map?.remove();
        console.debug('[RoutingPageController] Destroyed');
    }
}
