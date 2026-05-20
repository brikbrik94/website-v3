import maplibregl from 'maplibre-gl';
import { BasePageController } from '../../core/BasePageController';
import { MapCore } from '../../lib/MapCore';
import { LayoutHelper } from '../../lib/LayoutHelper';
import { initTopbar } from '../../components/Topbar';
import { initTrackingSidebar, updateTrackingList, updateTrackingServerStatus, setActiveTrackingItem } from '../../components/TrackingSidebar';
import { InventoryService } from '../../services/InventoryService';
import { TrackingMapLayers } from './TrackingMapLayers';
import { TrackingDataService } from './TrackingDataService';

export class TrackingPageController extends BasePageController {
    private map: maplibregl.Map | null = null;
    private mapLayers: TrackingMapLayers | null = null;
    private dataService: TrackingDataService | null = null;
    private selectedId: string | number | null = null;
    private currentFilter = 'all';

    public async mount(container: HTMLElement): Promise<void> {
        const invService = InventoryService.getInstance();
        const basemaps = await invService.getBasemaps();
        const mounts = LayoutHelper.renderBaseLayout(container);

        this.map = MapCore.init(
            mounts.map,
            basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
            async () => {
                console.log('[Tracking] onRestore triggering...');
                if (this.mapLayers) {
                    this.mapLayers.ensureLayers(this.selectedId);
                    const initData = this.dataService?.getInitialData();
                    if (initData) {
                        this.mapLayers.updateData('adsb', initData.adsbData);
                        this.mapLayers.updateData('adsb-tracks', initData.adsbTracks);
                        this.mapLayers.updateData('ais', initData.aisData);
                        this.mapLayers.updateData('ais-tracks', initData.aisTracks);
                    }
                    this.mapLayers.loadSprites();
                }
                this.dataService?.refresh();
            }
        );

        this.mapLayers = new TrackingMapLayers(this.map);

        this.dataService = new TrackingDataService(
            (data) => {
                if (!this.mapLayers) return;
                this.mapLayers.updateData('adsb', data.adsbData);
                this.mapLayers.updateData('adsb-tracks', data.adsbTracks);
                this.mapLayers.updateData('ais', data.aisData);
                this.mapLayers.updateData('ais-tracks', data.aisTracks);

                updateTrackingList([...data.adsbItems, ...data.aisItems], this.currentFilter);
                if (this.selectedId) setActiveTrackingItem(this.selectedId);
            },
            (success, adsbCount, aisCount, packetRate, sources) => {
                updateTrackingServerStatus(success, adsbCount, aisCount, packetRate, sources);
            }
        );

        this.map.on('click', (e) => {
            this.mapLayers?.handleMapClick(e, (id) => {
                this.selectedId = id;
                setActiveTrackingItem(id || '');
            });
        });

        initTopbar(mounts.topbar, basemaps, async (url) => {
            if (this.map) {
                console.log(`[Tracking] Changing basemap to: ${url}`);
                this.map.setStyle(url);
                
                // Expliziter Trigger für die Wiederherstellung (wie auf MapPage), 
                // da style.load in manchen Umgebungen unzuverlässig ist.
                await MapCore.triggerRestore(this.map, async (_m) => {
                    console.log('[Tracking] Explicit restore triggering...');
                    if (this.mapLayers) {
                        this.mapLayers.ensureLayers(this.selectedId);
                        const initData = this.dataService?.getInitialData();
                        if (initData) {
                            this.mapLayers.updateData('adsb', initData.adsbData);
                            this.mapLayers.updateData('adsb-tracks', initData.adsbTracks);
                            this.mapLayers.updateData('ais', initData.aisData);
                            this.mapLayers.updateData('ais-tracks', initData.aisTracks);
                        }
                        await this.mapLayers.loadSprites();
                    }
                    this.dataService?.refresh();
                });
            }
        }, undefined, [
            {
                id: 'toggle-adsb',
                icon: 'fa-solid fa-plane',
                title: 'Flugverkehr',
                onClick: (active) => {
                    this.mapLayers?.setVisibility('adsb', active);
                }
            },
            {
                id: 'toggle-ais',
                icon: 'fa-solid fa-ship',
                title: 'Schifffahrt',
                onClick: (active) => {
                    this.mapLayers?.setVisibility('ais', active);
                }
            }
        ]);

        initTrackingSidebar(mounts.sidebar, (item) => {
            this.selectedId = item.id;
            this.map?.flyTo({ center: [item.lon, item.lat], zoom: 14 });
            this.mapLayers?.highlightItem(this.selectedId);
        });

        mounts.sidebar.addEventListener('tracking-filter-change', (e: any) => {
            this.currentFilter = e.detail;
            // The list update depends on data. For now, rely on next refresh.
            // Ideally we store adsbItems/aisItems locally to update immediately.
        });

        setTimeout(() => {
            document.getElementById('btn-toggle-adsb')?.classList.add('active');
            document.getElementById('btn-toggle-ais')?.classList.add('active');
        }, 100);

        // Initial refresh
        this.dataService.refresh();
    }

    public destroy(): void {
        super.destroy();
        if (this.dataService) {
            this.dataService.destroy();
            this.dataService = null;
        }
        if (this.mapLayers) {
            this.mapLayers.destroy();
            this.mapLayers = null;
        }
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
