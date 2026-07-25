import * as maplibregl from 'maplibre-gl';
import { BasePageController } from '../../core/BasePageController';
import { MapCore } from '../../lib/MapCore';
import { LayoutHelper } from '../../lib/LayoutHelper';
import { initTopbar } from '../../components/Topbar';
import { MapLegend } from '../../lib/MapLegend';
import { MAP_COLORS } from '../../lib/MapStyles';
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
    private activateButtonsTimeout: ReturnType<typeof setTimeout> | null = null;

    public async mount(container: HTMLElement): Promise<void> {
        const invService = InventoryService.getInstance();
        const basemaps = await invService.getBasemaps();
        const mounts = LayoutHelper.renderBaseLayout(container, {
            withLegend: true,
            legendTitle: 'Tracking'
        });

        const legend = new MapLegend(mounts.legend!);
        // ADS-B: Höhen-Gradient, 4 Stufen aus TrackingMapLayers.ts (icon-color/line-color
        // 'interpolate'-Ausdruck über dieselben MAP_COLORS.alt*-Tokens).
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt0, label: 'Boden' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt5k, label: '5.000 ft' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt15k, label: '15.000 ft' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt35k, label: '35.000+ ft' });
        // AIS: Schiffstyp, 3 Farben aus ShipTypeMapper.getColor() (src/lib/ShipTypeMapper.ts) —
        // Bucket-Zuordnung dort ändern, falls sich die Kategorien hier je verschieben.
        legend.addEntry({ type: 'dot', color: MAP_COLORS.danger, label: 'Tanker / Gefahrgut' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.warning, label: 'Passagierschiff' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.accent, label: 'Sonstige Schiffe' });

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

        this.map.on('moveend', () => {
            if (this.dataService && this.map) {
                this.dataService.setBounds(this.map.getBounds());
            }
        });

        this.dataService.setBounds(this.map.getBounds());

        initTopbar(mounts.topbar, basemaps, async (url) => {
            if (this.map) {
                console.log(`[Tracking] Changing basemap to: ${url}`);
                this.map.setStyle(url);

                // Die Wiederherstellung (ensureLayers + loadSprites + refresh) läuft
                // automatisch über den style.load-Listener aus MapCore.init (onRestore).
            }
        }, () => legend.toggle(), [
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

        mounts.sidebar.addEventListener('tracking-filter-change', (e: Event) => {
            this.currentFilter = (e as CustomEvent<string>).detail;
            // The list update depends on data. For now, rely on next refresh.
            // Ideally we store adsbItems/aisItems locally to update immediately.
        });

        this.activateButtonsTimeout = setTimeout(() => {
            document.getElementById('btn-toggle-adsb')?.classList.add('active');
            document.getElementById('btn-toggle-ais')?.classList.add('active');
        }, 100);

        // Initial refresh
        this.dataService.refresh();
    }

    public destroy(): void {
        super.destroy();
        if (this.activateButtonsTimeout !== null) {
            clearTimeout(this.activateButtonsTimeout);
            this.activateButtonsTimeout = null;
        }
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
