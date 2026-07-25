import * as maplibregl from 'maplibre-gl';
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
import { PopupManager } from '../lib/PopupManager';
import { buildGenericFeaturePopupHtml } from '../lib/GenericFeaturePopup';

const SEARCH_PIN_SOURCE = 'map-search-pin';
const SEARCH_PIN_LAYER = 'map-search-pin-layer';

// Klick-Toleranz in Pixeln für queryRenderedFeatures — ohne das ist ein exakter Treffer auf
// dünnen Linien-Layern (Autobahnen 1-3px, Höhenlinien 0.5-2.7px) praktisch unmöglich.
const CLICK_TOLERANCE_PX = 4;

/**
 * MapPageController - Klassischer Karten-Viewer mit Layer-Verwaltung.
 */
export class MapPageController extends BasePageController {
    private map?: maplibregl.Map;
    private searchPinCoord: [number, number] | null = null;
    // Zählt aktive Gruppen pro Overlay, nicht pro legend_items-Inhalt — setzt voraus, dass alle
    // Gruppen eines Overlays denselben legend_items-Satz tragen (aktuell nur beim
    // Anfahrtszeit-Overlay der Fall). Trüge ein künftiges Overlay pro Gruppe unterschiedliche
    // legend_items, würden nur die Zeilen der zuerst aktivierten Gruppe angezeigt.
    private legendItemsRefCount = new Map<string, number>();

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

            // 7. Klick-Popups für aktive Overlay-Layer (generisch, keine Kuratierung pro Layer)
            this.map.on('click', this.handleOverlayClick);

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
     * Generisches Klick-Handling gegen alle aktuell aktiven Overlay-Layer (Autobahnen, Gemeinden,
     * Höhenlinien, …) — zeigt ein Popup mit den rohen Feature-properties, keine Kuratierung pro
     * Layer nötig (siehe docs/superpowers/plans, Klick+Popup-Logik-Feature).
     */
    private handleOverlayClick = (e: maplibregl.MapMouseEvent) => {
        if (!this.map) return;
        const activeLayerIds = OverlayLoader.getActiveLayerIds();
        const bbox: [[number, number], [number, number]] = [
            [e.point.x - CLICK_TOLERANCE_PX, e.point.y - CLICK_TOLERANCE_PX],
            [e.point.x + CLICK_TOLERANCE_PX, e.point.y + CLICK_TOLERANCE_PX]
        ];
        const features = this.map.queryRenderedFeatures(bbox, { layers: activeLayerIds });

        if (features.length === 0) {
            PopupManager.closePopup();
            return;
        }

        const feat = features[0];
        // Anders als bei Tracking/NAH (reine Point-Geometrien, Symbol-/Circle-Layer) sind
        // /karte-Overlays gemischt (Linien: Autobahnen/Höhenlinien; Polygone: Gemeinden/Bezirke/
        // Ski-Flächen) — die tatsächliche Klick-Position (e.lngLat) ist deshalb der einzige
        // Anker, der für jede Geometrieart funktioniert, statt aus feat.geometry abzuleiten.
        const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const html = buildGenericFeaturePopupHtml(feat.layer.id, feat.properties);
        PopupManager.showFeaturePopup(this.map, coordinates, html);
    };

    /**
     * Schaltet einzelne Layer oder Gruppen ein/aus über den gemeinsamen OverlayLoader und hält
     * die Legende synchron (nur aktive Layer werden dort gelistet, siehe
     * docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md).
     */
    private async toggleLayer(event: LayerToggleEvent, m: maplibregl.Map, legend: MapLegend) {
        try {
            if (event.checked) {
                await OverlayLoader.add(m, event.overlayId, event.overlayUrl, { signal: this.signal, layerIds: event.layerIds });
                if (event.legendItems) {
                    // Mehrere Gruppen desselben Overlays (z.B. die 6 Anfahrtszeit-Ringe) teilen
                    // dieselbe kuratierte Farbskala — nur beim Übergang 0→1 aktiven Gruppen
                    // tatsächlich rendern, sonst Duplikate.
                    const count = (this.legendItemsRefCount.get(event.overlayId) ?? 0) + 1;
                    this.legendItemsRefCount.set(event.overlayId, count);
                    if (count === 1) {
                        event.legendItems.forEach((item, idx) => {
                            legend.addEntry({
                                id: `${event.overlayId}:legend-item:${idx}`,
                                label: item.label,
                                type: item.type,
                                color: item.color,
                            });
                        });
                    }
                } else if (event.swatch) {
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
                if (event.legendItems) {
                    const count = Math.max(0, (this.legendItemsRefCount.get(event.overlayId) ?? 1) - 1);
                    this.legendItemsRefCount.set(event.overlayId, count);
                    if (count === 0) {
                        event.legendItems.forEach((_, idx) => legend.removeEntry(`${event.overlayId}:legend-item:${idx}`));
                    }
                } else {
                    legend.removeEntry(event.legendId);
                }
            }
            m.triggerRepaint();
        } catch (err) {
            console.error(`[MapPageController] toggleLayer error:`, err);
        }
    }

    public destroy(): void {
        super.destroy();
        PopupManager.closePopup();
        this.map?.off('click', this.handleOverlayClick);
        this.map?.remove();
        console.debug('[MapPageController] Destroyed');
    }
}
