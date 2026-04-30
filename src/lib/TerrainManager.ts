import { Map } from 'maplibre-gl';

export const ELEVATION_SOURCE_ID = 'at-elevation';
export const HILLSHADE_LAYER_ID = 'at-hillshade';

let _map: Map | null = null;
let _elevationUrl: string | null = null;

export let terrainEnabled = false;
export let hillshadeEnabled = false;

export function initTerrainManager(map: Map, elevationUrl: string) {
    _map = map;
    _elevationUrl = elevationUrl;
    // Sofort anwenden falls bereits aktiviert
    applyTerrainAndHillshade();
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

export async function applyTerrainAndHillshade() {
    if (!_map || !_map.getStyle()) return;

    if (!_elevationUrl) {
        _map.setTerrain(null);
        if (_map.getLayer(HILLSHADE_LAYER_ID)) _map.removeLayer(HILLSHADE_LAYER_ID);
        return;
    }

    if (!_map.getSource(ELEVATION_SOURCE_ID)) {
        _map.addSource(ELEVATION_SOURCE_ID, {
            type: 'raster-dem',
            url: _elevationUrl,
            tileSize: 512,
            encoding: 'terrarium'
        });
    }

    _map.setTerrain(terrainEnabled ? { source: ELEVATION_SOURCE_ID, exaggeration: 1.0 } : null);

    const hasHillshade = Boolean(_map.getLayer(HILLSHADE_LAYER_ID));
    if (hillshadeEnabled && !hasHillshade) {
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
    } else if (!hillshadeEnabled && hasHillshade) {
        _map.removeLayer(HILLSHADE_LAYER_ID);
    }
}

export function toggleTerrain(): boolean {
    terrainEnabled = !terrainEnabled;
    applyTerrainAndHillshade();
    return terrainEnabled;
}

export function toggleHillshade(): boolean {
    hillshadeEnabled = !hillshadeEnabled;
    applyTerrainAndHillshade();
    return hillshadeEnabled;
}
