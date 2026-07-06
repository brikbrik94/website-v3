import maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import { initSidebar } from '../components/Sidebar';
import { MapLegend } from '../lib/MapLegend';
import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';
import { OverlayLoader } from '../lib/OverlayLoader';

/**
 * MapPageController - Klassischer Karten-Viewer mit Layer-Verwaltung.
 */
export class MapPageController extends BasePageController {
    private map?: maplibregl.Map;

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

            // 3. Karte initialisieren
            this.map = MapCore.init(
                mounts.map,
                basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json'
            );

            // 4. Topbar & Legende initialisieren
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

            // 5. Sidebar initialisieren (Layer-Management)
            initSidebar(mounts.sidebar, overlays,
                async (overlayId, overlayUrl, layerIds, _layerType, checked) => {
                    if (this.map) {
                        await this.toggleLayer(overlayId, overlayUrl, layerIds, checked, this.map);
                    }
                },
                undefined,
                undefined,
                layersMeta.layers
            );
            
            console.debug('[MapPageController] Mounted successfully');
        } catch (err) {
            console.error('[MapPageController] Initialization failed:', err);
        }
    }

    /**
     * Schaltet einzelne Layer oder Gruppen ein/aus über den gemeinsamen OverlayLoader.
     */
    private async toggleLayer(overlayId: string, overlayUrl: string, layerIds: string[], checked: boolean, m: maplibregl.Map) {
        try {
            if (checked) {
                await OverlayLoader.add(m, overlayId, overlayUrl, { signal: this.signal, layerIds });
            } else {
                OverlayLoader.remove(m, overlayId, { layerIds });
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
