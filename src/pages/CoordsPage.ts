import maplibregl, { GeoJSONSource, LayerSpecification } from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { CoordsDataService } from '../features/coords/CoordsDataService';
import { CoordsSidebar } from '../features/coords/CoordsSidebar';
import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import { LayoutHelper } from '../lib/LayoutHelper';
import { InventoryService } from '../services/InventoryService';
import { MapRegistry } from '../lib/MapRegistry';
import { OverlayLoader } from '../lib/OverlayLoader';
import { MAP_COLORS } from '../lib/MapStyles';
import { Toast } from '../lib/Toast';

const COORDS_PIN_SOURCE = 'coords-pin';
const COORDS_PIN_LAYER = 'coords-pin-layer';
const SPRITE_BASE = 'https://tiles.oe5ith.at/assets/sprites/oe5ith-markers/sprite';

/**
 * CoordsPageController - Orchestrates the coordinate converter page.
 */
export class CoordsPageController extends BasePageController {
    private map?: maplibregl.Map;
    private service = new CoordsDataService();
    private sidebar?: CoordsSidebar;

    private hikingActive = false;
    private readonly HIKING_OVERLAY = {
        id: 'hiking',
        url: 'https://tiles.oe5ith.at/overlays/styles/hiking/style.json'
    };

    public async mount(container: HTMLElement) {
        // 1. Daten laden
        const invService = InventoryService.getInstance();
        const basemaps = await invService.getBasemaps();

        // 2. Basis-Layout
        const mounts = LayoutHelper.renderBaseLayout(container);

        // 3. Sidebar initialisieren
        this.sidebar = new CoordsSidebar(mounts.sidebar, this.service);
        this.sidebar.init();

        // 4. Sprite registrieren (wird von MapRegistry.restore geladen)
        MapRegistry.registerImage('oe5ith-markers', SPRITE_BASE);

        // 5. Karte initialisieren
        this.map = MapCore.init(
            mounts.map,
            basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
            async (m) => {
                this._setupCoordsPin(m);
                if (this.hikingActive) await this.toggleHikingOverlay(true);
            }
        );

        // 6. Topbar initialisieren
        initTopbar(mounts.topbar, basemaps, (url) => {
            if (this.map) {
                this.map.setStyle(url);
            }
        }, undefined, [
            {
                id: 'hiking',
                icon: 'fa-solid fa-map-signs',
                title: 'Wanderwege',
                onClick: (active) => this.toggleHikingOverlay(active)
            }
        ]);

        // 7. Event Listeners
        this.map.on('click', (e) => {
            this.service.setWgs(e.lngLat.lat, e.lngLat.lng);
        });

        this.service.addListener((state) => {
            if (this.map) {
                const source = this.map.getSource(COORDS_PIN_SOURCE) as GeoJSONSource | undefined;
                source?.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [state.lon, state.lat] }, properties: {} });
                this.map.easeTo({ center: [state.lon, state.lat] });
            }
        });

        console.debug('[CoordsPageController] Mounted');
    }

    /**
     * Schaltet den Wanderwege-Overlay ein/aus unter Verwendung der MapRegistry.
     * Hybride Logik: Direktes Feedback + Persistenz-Registry.
     */
    private async toggleHikingOverlay(active: boolean) {
        this.hikingActive = active;
        if (!this.map) return;

        const { id, url } = this.HIKING_OVERLAY;

        if (active) {
            if (!OverlayLoader.isLoaded(id)) {
                try {
                    await OverlayLoader.add(this.map, id, url, { signal: this.signal });
                } catch (err) {
                    console.error(`Failed to load hiking overlay: ${id}`, err);
                    Toast.error(`Fehler beim Laden von: ${id}`);
                    return;
                }
            }
        } else if (OverlayLoader.isLoaded(id)) {
            OverlayLoader.remove(this.map, id);
        }
        
        // Kein expliziter restore() Aufruf nötig, da wir die Karte direkt aktualisiert haben.
    }

    private _setupCoordsPin(map: maplibregl.Map) {
        const pos = this.service.getWgs();
        const layerDef: LayerSpecification = {
            id: COORDS_PIN_LAYER,
            type: 'symbol',
            source: COORDS_PIN_SOURCE,
            layout: {
                'icon-image': 'ci-symbol-location',
                'icon-size': 0.75,
                'icon-anchor': 'center',
                'icon-allow-overlap': true,
            },
            paint: { 'icon-color': MAP_COLORS.accent },
        };
        MapCore.ensureGeoJsonLayer(map, COORDS_PIN_SOURCE, layerDef);
        const source = map.getSource(COORDS_PIN_SOURCE) as GeoJSONSource | undefined;
        source?.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [pos.lon, pos.lat] }, properties: {} });
    }

    public destroy() {
        super.destroy();
        this.map?.remove();
        console.debug('[CoordsPageController] Destroyed');
    }
}
