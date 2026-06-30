import { Map } from 'maplibre-gl';
import { MapRegistry } from './MapRegistry';
import { MapCore } from './MapCore';

export const ELEVATION_SOURCE_ID = 'at-elevation';
export const HILLSHADE_LAYER_ID = 'at-hillshade';

export const CONTOURS_OVERLAY = {
    id: 'basemap-at-contours',
    url: 'https://tiles.oe5ith.at/overlays/styles/basemap-at-contours/style.json'
};

let _map: Map | null = null;
let _elevationUrl: string | null = null;

// Tatsächlich hinzugefügte Contour-Ressourcen. Nötig, weil die Source-/Layer-IDs aus
// dem Contours-Style stammen (z.B. Source 'esri') und nicht CONTOURS_OVERLAY.id sind –
// ohne dieses Tracking lässt sich das Overlay nicht wieder entfernen.
let _contourSourceIds: string[] = [];
let _contourLayerIds: string[] = [];

export let terrainEnabled = false;
export let hillshadeEnabled = false;
export let contoursEnabled = false;

export function initTerrainManager(map: Map, elevationUrl: string) {
    _map = map;
    _elevationUrl = elevationUrl;
    // Neue Karteninstanz: Tracking zurücksetzen (alte IDs gehörten zur zerstörten Karte).
    _contourSourceIds = [];
    _contourLayerIds = [];
    // Sofort anwenden falls bereits aktiviert
    applyTerrainInfrastructure();
}

/**
 * Sucht einen optimalen Einfügepunkt für das Hillshading.
 * Wir wollen über dem Boden/Wasser sein, aber unter Straßen und Text.
 */
function findHillshadeInsertionPoint(map: Map): string | undefined {
    const style = map.getStyle();
    if (!style || !style.layers) return undefined;

    // Wir suchen den ersten Layer, der Straßen oder Text darstellt.
    // Typische Schlagworte in IDs für OSM-Styles:
    const topLayerKeywords = ['symbol', 'label', 'text', 'road', 'highway', 'poi', 'building'];
    
    const insertionLayer = style.layers.find(layer => {
        const id = layer.id.toLowerCase();
        const isSymbol = layer.type === 'symbol';
        const hasKeyword = topLayerKeywords.some(kw => id.includes(kw));
        return isSymbol || hasKeyword;
    });

    return insertionLayer?.id;
}

export async function applyTerrainInfrastructure() {
    if (!_map || !_map.getStyle()) return;

    // 1. Terrain (3D)
    if (_elevationUrl) {
        if (!_map.getSource(ELEVATION_SOURCE_ID)) {
            _map.addSource(ELEVATION_SOURCE_ID, {
                type: 'raster-dem',
                url: _elevationUrl,
                tileSize: 512,
                encoding: 'terrarium'
            });
        }
        _map.setTerrain(terrainEnabled ? { source: ELEVATION_SOURCE_ID, exaggeration: 1.0 } : null);
    } else {
        _map.setTerrain(null);
    }

    // 2. Hillshade
    const hasHillshade = Boolean(_map.getLayer(HILLSHADE_LAYER_ID));
    if (hillshadeEnabled && _elevationUrl) {
        if (!hasHillshade) {
            const beforeId = findHillshadeInsertionPoint(_map);
            _map.addLayer({
                id: HILLSHADE_LAYER_ID,
                type: 'hillshade',
                source: ELEVATION_SOURCE_ID,
                paint: { 
                    'hillshade-exaggeration': 0.4,
                    'hillshade-shadow-color': '#000000',
                    'hillshade-highlight-color': '#ffffff',
                    'hillshade-accent-color': '#000000'
                }
            }, beforeId);
        }
    } else if (hasHillshade) {
        _map.removeLayer(HILLSHADE_LAYER_ID);
    }

    // 3. Contours (via MapRegistry)
    if (contoursEnabled) {
        if (_contourLayerIds.length === 0 && _contourSourceIds.length === 0) {
            try {
                const res = await fetch(CONTOURS_OVERLAY.url);
                const style = await res.json();

                if (style.sprite) {
                    MapRegistry.registerImage(CONTOURS_OVERLAY.id, style.sprite, CONTOURS_OVERLAY.url);
                    await MapCore.loadSprites(_map, style.sprite, CONTOURS_OVERLAY.url);
                }

                const resolvedSources = MapCore.resolveSourceUrls(style.sources, CONTOURS_OVERLAY.url);
                for (const [sId, def] of Object.entries(resolvedSources)) {
                    MapRegistry.registerSource(sId, def);
                    if (!_map.getSource(sId)) {
                        _map.addSource(sId, JSON.parse(JSON.stringify(def)));
                    }
                    _contourSourceIds.push(sId);
                }

                style.layers.forEach((l: any) => {
                    MapRegistry.registerLayer(l.id, l);
                    if (_map && !_map.getLayer(l.id)) {
                        _map.addLayer(JSON.parse(JSON.stringify(l)));
                    }
                    _contourLayerIds.push(l.id);
                });
            } catch (err) {
                console.error(`Failed to load contours overlay: ${CONTOURS_OVERLAY.id}`, err);
            }
        }
    } else if (_contourLayerIds.length > 0 || _contourSourceIds.length > 0) {
        // Wenn deaktiviert, exakt die hinzugefügten Ressourcen entfernen.
        // Layer zuerst, dann Sources (Sources mit aktiven Layern lassen sich nicht entfernen).
        for (const layerId of _contourLayerIds) {
            if (_map.getLayer(layerId)) {
                _map.removeLayer(layerId);
                console.debug(`[TerrainManager] Removed contour layer: ${layerId}`);
            }
            MapRegistry.unregisterLayer(layerId);
        }
        for (const sourceId of _contourSourceIds) {
            if (_map.getSource(sourceId)) {
                _map.removeSource(sourceId);
                console.debug(`[TerrainManager] Removed contour source: ${sourceId}`);
            }
            MapRegistry.unregisterSource(sourceId);
        }
        MapRegistry.unregisterImage(CONTOURS_OVERLAY.id);
        _contourLayerIds = [];
        _contourSourceIds = [];
    }
}

export function toggleTerrain(): boolean {
    terrainEnabled = !terrainEnabled;
    applyTerrainInfrastructure();
    return terrainEnabled;
}

export function toggleHillshade(): boolean {
    hillshadeEnabled = !hillshadeEnabled;
    applyTerrainInfrastructure();
    return hillshadeEnabled;
}

export function toggleContours(): boolean {
    contoursEnabled = !contoursEnabled;
    applyTerrainInfrastructure();
    return contoursEnabled;
}
