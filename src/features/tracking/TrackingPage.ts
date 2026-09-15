import * as maplibregl from 'maplibre-gl';
import { BasePageController } from '../../core/BasePageController';
import { MapCore } from '../../lib/MapCore';
import { LayoutHelper } from '../../lib/LayoutHelper';
import { initTopbar } from '../../components/Topbar';
import { MapLegend } from '../../lib/MapLegend';
import { MAP_COLORS } from '../../lib/MapStyles';
import { initTrackingSidebar, updateTrackingList, updateTrackingServerStatus, updateRadiosondeStatus, setActiveTrackingItem } from '../../components/TrackingSidebar';
import { InventoryService } from '../../services/InventoryService';
import { TrackingMapLayers } from './TrackingMapLayers';
import { TrackingDataService } from './TrackingDataService';
import { RadiosondeMapLayers } from './RadiosondeMapLayers';
import { RadiosondenDataService } from './RadiosondenDataService';
import type { TrackingItem } from '../../types/tracking';

export class TrackingPageController extends BasePageController {
    private map: maplibregl.Map | null = null;
    private mapLayers: TrackingMapLayers | null = null;
    private dataService: TrackingDataService | null = null;
    private radiosondeMapLayers: RadiosondeMapLayers | null = null;
    private radiosondeService: RadiosondenDataService | null = null;
    private selectedId: string | number | null = null;
    private currentFilter = 'all';
    private activateButtonsTimeout: ReturnType<typeof setTimeout> | null = null;
    // ADS-B/AIS (WS-Gateway) und Radiosonden (REST-Polling) liefern unabhängig voneinander —
    // letzter Stand jeder Quelle wird separat gehalten, damit ein Update der einen die andere
    // nicht aus der kombinierten Sidebar-Liste verdrängt.
    private lastAdsbAisItems: TrackingItem[] = [];
    private lastRadiosondeItems: TrackingItem[] = [];

    private refreshTrackingList(): void {
        updateTrackingList([...this.lastAdsbAisItems, ...this.lastRadiosondeItems], this.currentFilter);
        if (this.selectedId) setActiveTrackingItem(this.selectedId);
    }

    public async mount(container: HTMLElement): Promise<void> {
        const invService = InventoryService.getInstance();
        const basemaps = await invService.getBasemaps();
        const mounts = LayoutHelper.renderBaseLayout(container, {
            withLegend: true,
            legendTitle: 'Tracking'
        });

        const legend = new MapLegend(mounts.legend!);
        // Höhen-Gradient (ADS-B + Radiosonden gemeinsam), 6 Stufen aus MapStyles.ts'
        // getAltitudeColorStops() — Radiosonden-Meter werden dafür nach Fuß umgerechnet.
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt0, label: 'Boden' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt5k, label: '5.000 ft' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt15k, label: '15.000 ft' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt35k, label: '35.000 ft' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.alt40k, label: '40.000 ft' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.black, label: '100.000+ ft (nur Sonden)' });
        // AIS: Schiffstyp, 3 Farben aus ShipTypeMapper.getColor() (src/lib/ShipTypeMapper.ts) —
        // Bucket-Zuordnung dort ändern, falls sich die Kategorien hier je verschieben.
        legend.addEntry({ type: 'dot', color: MAP_COLORS.danger, label: 'Tanker / Gefahrgut' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.warning, label: 'Passagierschiff' });
        legend.addEntry({ type: 'dot', color: MAP_COLORS.accent, label: 'Sonstige Schiffe' });
        // Radiosonden-Track: Farbe = Höhe (s.o.), aktiv/beendet wird über die Strichdicke gezeigt
        // (RadiosondeMapLayers.ts line-width-'case'-Ausdruck) — Legende zeigt daher nur die Dicke,
        // keine Farbe (sonst suggeriert der Farbwert hier fälschlich eine feste Aktiv/Beendet-Farbe).
        legend.addEntry({ type: 'line', color: MAP_COLORS.muted, width: 3, label: 'Radiosonde aktiv (dick)' });
        legend.addEntry({ type: 'line', color: MAP_COLORS.muted, width: 1.5, label: 'Radiosonde beendet (dünn, 24h)' });

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
                if (this.radiosondeMapLayers) {
                    this.radiosondeMapLayers.ensureLayers();
                    const initData = this.radiosondeService?.getInitialData();
                    if (initData) {
                        this.radiosondeMapLayers.updateData('radiosonde', initData.radiosondeData);
                        this.radiosondeMapLayers.updateData('radiosonde-tracks', initData.radiosondeTracks);
                    }
                }
                this.dataService?.refresh();
            }
        );

        this.mapLayers = new TrackingMapLayers(this.map);
        this.radiosondeMapLayers = new RadiosondeMapLayers(this.map);

        this.dataService = new TrackingDataService(
            (data) => {
                if (!this.mapLayers) return;
                this.mapLayers.updateData('adsb', data.adsbData);
                this.mapLayers.updateData('adsb-tracks', data.adsbTracks);
                this.mapLayers.updateData('ais', data.aisData);
                this.mapLayers.updateData('ais-tracks', data.aisTracks);

                this.lastAdsbAisItems = [...data.adsbItems, ...data.aisItems];
                this.refreshTrackingList();
            },
            (success, adsbCount, aisCount, packetRate, sources) => {
                updateTrackingServerStatus(success, adsbCount, aisCount, packetRate, sources);
            }
        );

        this.radiosondeService = new RadiosondenDataService(this.signal);
        this.radiosondeService.setCallbacks(
            (data) => {
                if (!this.radiosondeMapLayers) return;
                this.radiosondeMapLayers.updateData('radiosonde', data.radiosondeData);
                this.radiosondeMapLayers.updateData('radiosonde-tracks', data.radiosondeTracks);

                this.lastRadiosondeItems = data.radiosondeItems;
                this.refreshTrackingList();
                updateRadiosondeStatus(data.radiosondeItems.length, true);
            },
            (online) => {
                updateRadiosondeStatus(this.lastRadiosondeItems.length, online);
            }
        );
        this.radiosondeService.start();

        this.map.on('click', (e) => {
            let hitAdsbOrAis = false;
            this.mapLayers?.handleMapClick(e, (id) => {
                if (id !== null) hitAdsbOrAis = true;
                this.selectedId = id;
                setActiveTrackingItem(id || '');
            });
            if (!hitAdsbOrAis) {
                this.radiosondeMapLayers?.handleMapClick(e, (id) => {
                    if (id === null) return;
                    this.selectedId = id;
                    setActiveTrackingItem(id);
                });
            }
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
            },
            {
                id: 'toggle-radiosonde',
                icon: 'fa-solid fa-satellite',
                title: 'Radiosonden',
                onClick: (active) => {
                    this.radiosondeMapLayers?.setVisibility(active);
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
            this.refreshTrackingList();
        });

        this.activateButtonsTimeout = setTimeout(() => {
            document.getElementById('btn-toggle-adsb')?.classList.add('active');
            document.getElementById('btn-toggle-ais')?.classList.add('active');
            document.getElementById('btn-toggle-radiosonde')?.classList.add('active');
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
        if (this.radiosondeService) {
            this.radiosondeService.destroy();
            this.radiosondeService = null;
        }
        if (this.mapLayers) {
            this.mapLayers.destroy();
            this.mapLayers = null;
        }
        if (this.radiosondeMapLayers) {
            this.radiosondeMapLayers.destroy();
            this.radiosondeMapLayers = null;
        }
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
