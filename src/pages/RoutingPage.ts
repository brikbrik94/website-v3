import maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { attachHoverCursor } from '../lib/HoverCursor';
import { initTopbar } from '../components/Topbar';
import { MapLegend } from '../lib/MapLegend';
import { MAP_ROUTE_STYLES, MAP_COLORS } from '../lib/MapStyles';
import { LayoutHelper } from '../lib/LayoutHelper';
import { ContextMenu } from '../components/ContextMenu';
import { attachLongPress } from '../lib/LongPressGesture';
import { InventoryService } from '../services/InventoryService';
import { ContextMenuItem } from '../types/common';

import { RoutingDataService } from '../features/routing/RoutingDataService';
import { RoutingMapLayers } from '../features/routing/RoutingMapLayers';
import { RoutingSidebarAdapter } from '../features/routing/RoutingSidebarAdapter';
import { parseRoutingDeepLink } from '../features/routing/RoutingDeepLink';

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
            await this.sidebarAdapter.init(mounts.sidebar);

            // Deep-Link-Query-Parameter anwenden, falls vorhanden (z.B. Link aus dem
            // Koordinaten-Umrechner mit vorausgefüllter Route).
            const deepLinkParams = parseRoutingDeepLink(window.location.search);
            if (deepLinkParams) {
                await this.sidebarAdapter.applyDeepLink(deepLinkParams);
            }

            // 6. Topbar & Legende initialisieren
            const legend = new MapLegend(mounts.legend!);
            legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.active.color, label: 'Gewählte Route' });
            legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.background.color, label: 'Alternative Route' });
            legend.addEntry({ type: 'dot', color: MAP_COLORS.success, label: 'Startpunkt' });
            legend.addEntry({ type: 'dot', color: MAP_COLORS.danger, label: 'Zielpunkt' });
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
            this.showContextMenuAt(e.lngLat.lat, e.lngLat.lng, e.originalEvent.clientX, e.originalEvent.clientY);
        });

        attachLongPress(this.map, (e) => {
            this.showContextMenuAt(e.lngLat.lat, e.lngLat.lng, e.clientX, e.clientY);
        });
    }

    private showContextMenuAt(lat: number, lng: number, clientX: number, clientY: number): void {
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

        ContextMenu.show(clientX, clientY, menuItems);
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
