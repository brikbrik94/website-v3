import maplibregl from 'maplibre-gl';
import { BasePageController } from '../core/BasePageController';
import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import { initSidebar } from '../components/Sidebar';
import { MapLegend } from '../lib/MapLegend';
import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';
import { MapRegistry } from '../lib/MapRegistry';

/**
 * MapPageController - Klassischer Karten-Viewer mit Layer-Verwaltung.
 */
export class MapPageController extends BasePageController {
    private map?: maplibregl.Map;
    private activeLayers = new Map<string, Set<string>>();
    private overlayMetadata = new Map<string, { url: string }>();
    private cachedStyles = new Map<string, any>();
    private styleFetchPromises = new Map<string, Promise<any>>();

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
                basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
                async (m) => {
                    await this.reapplyActiveOverlays(m);
                }
            );

            // 4. Topbar & Legende initialisieren
            const legend = new MapLegend(mounts.legend!);
            initTopbar(mounts.topbar, basemaps, async (url) => {
                if (this.map) {
                    console.log(`[MapPageController] Changing basemap to: ${url}`);
                    this.map.setStyle(url);

                    // Wir leeren den Promise-Cache für Styles
                    this.styleFetchPromises.clear();

                    // Die Wiederherstellung läuft automatisch über den style.load-Listener
                    // aus MapCore.init, dessen onRestore reapplyActiveOverlays aufruft.
                }
            }, () => legend.toggle());

            // 5. Sidebar initialisieren (Layer-Management)
            initSidebar(mounts.sidebar, overlays,
                async (overlayId, overlayUrl, layerIds, _layerType, checked) => {
                    if (this.map) {
                        // Store metadata for restoration
                        if (checked) this.overlayMetadata.set(overlayId, { url: overlayUrl });
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

    private async reapplyActiveOverlays(m: maplibregl.Map) {
        console.log('[MapPageController] Re-applying active overlays...');
        const promises = Array.from(this.activeLayers.entries()).map(async ([overlayId, layers]) => {
            const meta = this.overlayMetadata.get(overlayId);
            if (meta) {
                // Hier rufen wir toggleLayer auf, was die Ressourcen in der MapRegistry registriert.
                // Da toggleLayer im Checked-Modus auch direkt zur Karte hinzufügt, ist dies doppelt sicher.
                return this.toggleLayer(overlayId, meta.url, Array.from(layers), true, m);
            }
        });
        await Promise.all(promises);
    }

    /**
     * Cache-Layer für Style-Files der Overlays.
     */
    private async getStyle(overlayId: string, url: string): Promise<any> {
        if (this.cachedStyles.has(overlayId)) return this.cachedStyles.get(overlayId);
        if (this.styleFetchPromises.has(overlayId)) return this.styleFetchPromises.get(overlayId);

        const promise = fetch(url, { signal: this.signal })
            .then(r => r.json())
            .then(style => {
                this.cachedStyles.set(overlayId, style);
                return style;
            })
            .finally(() => {
                // In-Flight-Eintrag immer entfernen – auch bei Fehler/Abort, sonst bliebe
                // ein rejektetes Promise dauerhaft gecacht und jeder Retry schlüge fehl.
                this.styleFetchPromises.delete(overlayId);
            });
        this.styleFetchPromises.set(overlayId, promise);
        return promise;
    }

    /**
     * Schaltet einzelne Layer oder Gruppen ein/aus und registriert sie in der MapRegistry.
     * Nutzt eine hybride Logik: Direkte Map-Manipulation für sofortiges Feedback 
     * und Registry-Einträge für Persistenz bei Style-Wechseln.
     */
    private async toggleLayer(overlayId: string, overlayUrl: string, layerIds: string[], checked: boolean, m: maplibregl.Map) {
        try {
            if (!m.isStyleLoaded()) {
                // isStyleLoaded() wird erst true, wenn ALLE Sources ihre initialen Tiles geladen
                // haben (nicht nur der Style-JSON geparst ist). Bei großen Basemaps (z.B. "Basemap
                // At", ~2.4 GB PMTiles) ist das an dieser Stelle oft noch nicht der Fall. Auf ein
                // erneutes 'style.load'-Event zu warten hängt hier für immer, da dieses Event schon
                // gefeuert hat (wir laufen ja im style.load-Restore-Callback) und ohne weiteren
                // setStyle()-Aufruf nicht erneut feuert. Stattdessen pollen, bis der Style wirklich
                // fertig geladen ist.
                await new Promise<void>(resolve => {
                    const check = () => {
                        if (m.isStyleLoaded()) resolve();
                        else requestAnimationFrame(check);
                    };
                    check();
                });
            }

            const style = await this.getStyle(overlayId, overlayUrl);
            if (!style) return;

            if (checked) {
                // 1. Quellen auflösen und hinzufügen/registrieren
                if (style.sources) {
                    const resolvedSources = MapCore.resolveSourceUrls(style.sources, overlayUrl);
                    for (const [srcId, srcDef] of Object.entries(resolvedSources)) {
                        const uniqueSrcId = srcId.startsWith(overlayId) ? srcId : `${overlayId}-${srcId}`;
                        MapRegistry.registerSource(uniqueSrcId, srcDef);
                        
                        if (!m.getSource(uniqueSrcId)) {
                            try {
                                m.addSource(uniqueSrcId, JSON.parse(JSON.stringify(srcDef)));
                            } catch (e) {
                                if (!m.getSource(uniqueSrcId)) console.warn(`[MapPageController] Error adding source ${uniqueSrcId}:`, e);
                            }
                        }
                    }
                }

                // 2. Sprites laden (NICHT BLOCKIEREND für Layer-Addition)
                if (style.sprite) {
                    MapRegistry.registerImage(overlayId, style.sprite, overlayUrl);
                    MapCore.loadSprites(m, style.sprite, overlayUrl).catch(err => {
                        console.warn(`[MapPageController] Sprite loading failed for ${overlayId}:`, err);
                    });
                }

                // 3. Layer hinzufügen/registrieren
                for (const layerId of layerIds) {
                    const uniqueLayerId = layerId.startsWith(overlayId) ? layerId : `${overlayId}-${layerId}`;
                    const layerDef = style.layers.find((l: any) => l.id === layerId);
                    
                    if (layerDef) {
                        const newLayer = { ...layerDef, id: uniqueLayerId };
                        if (newLayer.source && style.sources[newLayer.source]) {
                            newLayer.source = newLayer.source.startsWith(overlayId) ? newLayer.source : `${overlayId}-${newLayer.source}`;
                        }
                        
                        MapRegistry.registerLayer(uniqueLayerId, newLayer);
                        
                        if (!m.getLayer(uniqueLayerId)) {
                            try {
                                m.addLayer(JSON.parse(JSON.stringify(newLayer)));
                            } catch (e) {
                                if (!m.getLayer(uniqueLayerId)) console.error(`[MapPageController] Error adding layer ${uniqueLayerId}:`, e);
                            }
                        }
                        
                        if (!this.activeLayers.has(overlayId)) this.activeLayers.set(overlayId, new Set());
                        this.activeLayers.get(overlayId)!.add(layerId);
                    }
                }
            } else {
                // Entfernen-Logik
                for (const layerId of layerIds) {
                    const uniqueLayerId = layerId.startsWith(overlayId) ? layerId : `${overlayId}-${layerId}`;
                    if (m.getLayer(uniqueLayerId)) m.removeLayer(uniqueLayerId);
                    MapRegistry.unregisterLayer(uniqueLayerId);

                    const layers = this.activeLayers.get(overlayId);
                    if (layers) {
                        layers.delete(layerId);
                        if (layers.size === 0) {
                            this.activeLayers.delete(overlayId);
                            if (style.sources) {
                                for (const srcId in style.sources) {
                                    const uniqueSrcId = srcId.startsWith(overlayId) ? srcId : `${overlayId}-${srcId}`;
                                    if (m.getSource(uniqueSrcId)) m.removeSource(uniqueSrcId);
                                    MapRegistry.unregisterSource(uniqueSrcId);
                                }
                            }
                            MapRegistry.unregisterImage(overlayId);
                        }
                    }
                }
            }

            // Sofortiges Neuzeichnen erzwingen
            m.triggerRepaint();
        } catch (err) {
            console.error(`[MapPageController] toggleLayer critical error:`, err);
        }
    }

    public destroy(): void {
        super.destroy();
        this.map?.remove();
        console.debug('[MapPageController] Destroyed');
    }
}
