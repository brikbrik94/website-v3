import maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { CoordsDataService } from '../features/coords/CoordsDataService';
import { CoordsSidebar } from '../features/coords/CoordsSidebar';
import { MapCore, MARKERS_SPRITE_BASE } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import { LayoutHelper } from '../lib/LayoutHelper';
import { InventoryService } from '../services/InventoryService';
import { MapRegistry } from '../lib/MapRegistry';
import { OverlayLoader } from '../lib/OverlayLoader';
import { MAP_COLORS } from '../lib/MapStyles';
import { Toast } from '../lib/Toast';
import { ContextMenu } from '../components/ContextMenu';
import { ContextMenuItem } from '../types/common';

const COORDS_PIN_SOURCE = 'coords-pin';
const COORDS_PIN_LAYER = 'coords-pin-layer';
const SPRITE_BASE = MARKERS_SPRITE_BASE;

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
        this.sidebar = new CoordsSidebar(mounts.sidebar, this.service, this.signal);
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
        // Bewusst kein 'click' (blockiert sonst Linksklick als Setzen-Aktion und ist
        // inkonsistent zum Routing-Kontextmenü-Pattern); Rechtsklick-Drag ist bereits für die
        // 3D-Steuerung (Kippen/Rotieren) reserviert, daher Kontextmenü statt Direktbindung.
        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.lngLat;
            const menuItems: (ContextMenuItem | 'sep' | { label: string, type: 'label' })[] = [
                { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, type: 'label' },
                'sep',
                {
                    label: 'Koordinate hier setzen',
                    icon: 'fa-solid fa-location-dot',
                    onClick: () => this.service.setWgs(lat, lng)
                }
            ];
            ContextMenu.show(e.originalEvent.clientX, e.originalEvent.clientY, menuItems);
        });

        this.service.addListener((state) => {
            if (this.map) {
                MapCore.setPointSource(this.map, COORDS_PIN_SOURCE, [state.lon, state.lat]);
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
        const layerDef = MapCore.createPinLayer(COORDS_PIN_LAYER, COORDS_PIN_SOURCE, {
            icon: 'ci-symbol-location',
            size: 0.75,
            anchor: 'center',
            color: MAP_COLORS.accent,
        });
        MapCore.ensureGeoJsonLayer(map, COORDS_PIN_SOURCE, layerDef);
        MapCore.setPointSource(map, COORDS_PIN_SOURCE, [pos.lon, pos.lat]);
    }

    public destroy() {
        super.destroy();
        this.map?.remove();
        console.debug('[CoordsPageController] Destroyed');
    }
}
