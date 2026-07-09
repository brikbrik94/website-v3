import maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore, MARKERS_SPRITE_BASE } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import { initSidebar, type LayerToggleEvent } from '../components/Sidebar';
import { MapLegend } from '../lib/MapLegend';
import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';
import { OverlayLoader } from '../lib/OverlayLoader';
import { MapRegistry } from '../lib/MapRegistry';
import { MAP_COLORS } from '../lib/MapStyles';
import type { GeocoderSelection } from '../lib/GeocoderSearchField';

const SEARCH_PIN_SOURCE = 'map-search-pin';
const SEARCH_PIN_LAYER = 'map-search-pin-layer';

/**
 * MapPageController - Klassischer Karten-Viewer mit Layer-Verwaltung.
 */
export class MapPageController extends BasePageController {
    private map?: maplibregl.Map;
    private searchPinCoord: [number, number] | null = null;

    public async mount(container: HTMLElement): Promise<void> {
        try {
            // 1. Daten laden
            const invService = InventoryService.getInstance();
            const [basemaps, layersRes] = await Promise.all([
                invService.getBasemaps(),
                fetch('https://tiles.oe5ith.at/layers.json', { signal: this.signal })
            ]);
            
            if (!layersRes.ok) throw new Error(`Failed to load layers.json: ${layersRes.status}`);
            const layersMeta = await layersRes.json();
            const overlays = await invService.getOverlays();

            // 2. Basis-Layout rendern
            const mounts = LayoutHelper.renderBaseLayout(container, {
                withLegend: true,
                legendTitle: 'Karten-Layer'
            });

            // 3. Sprite für den Such-Pin registrieren (wird von MapRegistry.restore geladen)
            MapRegistry.registerImage('oe5ith-markers', MARKERS_SPRITE_BASE);

            // 4. Karte initialisieren
            this.map = MapCore.init(
                mounts.map,
                basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
                (m) => this._setupSearchPin(m)
            );

            // 5. Topbar & Legende initialisieren
            const legend = new MapLegend(mounts.legend!);
            initTopbar(mounts.topbar, basemaps, async (url) => {
                if (this.map) {
                    console.log(`[MapPageController] Changing basemap to: ${url}`);
                    this.map.setStyle(url);

                    // Die Wiederherstellung läuft automatisch über den style.load-Listener
                    // aus MapCore.init, der die MapRegistry (inkl. der über OverlayLoader
                    // registrierten Overlays) erneut anwendet.
                }
            }, () => legend.toggle());

            // 6. Sidebar initialisieren (Layer-Management + Ortssuche)
            initSidebar(mounts.sidebar, overlays,
                async (event) => {
                    if (this.map) {
                        await this.toggleLayer(event, this.map, legend);
                    }
                },
                undefined,
                undefined,
                layersMeta.layers,
                (selection) => this._handleSearchSelect(selection),
                this.signal
            );

            console.debug('[MapPageController] Mounted successfully');
        } catch (err) {
            console.error('[MapPageController] Initialization failed:', err);
        }
    }

    /**
     * Registriert Source+Layer für den Such-Pin (analog CoordsPage._setupCoordsPin). Läuft bei
     * jedem style.load erneut, da MapLibre die per addImage/addLayer hinzugefügten Ressourcen
     * einer alten Style-Instanz beim Basemap-Wechsel verwirft.
     */
    private _setupSearchPin(map: maplibregl.Map) {
        const layerDef = MapCore.createPinLayer(SEARCH_PIN_LAYER, SEARCH_PIN_SOURCE, {
            icon: 'ci-symbol-location',
            size: 0.75,
            anchor: 'center',
            color: MAP_COLORS.accent,
        });
        MapCore.ensureGeoJsonLayer(map, SEARCH_PIN_SOURCE, layerDef);
        if (this.searchPinCoord) {
            MapCore.setPointSource(map, SEARCH_PIN_SOURCE, this.searchPinCoord);
        }
    }

    private _handleSearchSelect(selection: GeocoderSelection) {
        if (!this.map) return;
        this.searchPinCoord = [selection.lon, selection.lat];
        MapCore.setPointSource(this.map, SEARCH_PIN_SOURCE, this.searchPinCoord);
        this.map.flyTo({ center: this.searchPinCoord, zoom: 14 });
    }

    /**
     * Schaltet einzelne Layer oder Gruppen ein/aus über den gemeinsamen OverlayLoader und hält
     * die Legende synchron (nur aktive Layer werden dort gelistet, siehe
     * docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md).
     */
    private async toggleLayer(event: LayerToggleEvent, m: maplibregl.Map, legend: MapLegend) {
        try {
            if (event.checked) {
                await OverlayLoader.add(m, event.overlayId, event.overlayUrl, { signal: this.signal, layerIds: event.layerIds });
                if (event.swatch) {
                    legend.addEntry({
                        id: event.legendId,
                        label: event.legendLabel,
                        type: event.swatch.type,
                        color: event.swatch.color,
                        onRemove: () => event.itemEl.click()
                    });
                }
            } else {
                OverlayLoader.remove(m, event.overlayId, { layerIds: event.layerIds });
                legend.removeEntry(event.legendId);
            }
            m.triggerRepaint();
        } catch (err) {
            console.error(`[MapPageController] toggleLayer error:`, err);
        }
    }

    public destroy(): void {
        super.destroy();
        this.map?.remove();
        console.debug('[MapPageController] Destroyed');
    }
}
