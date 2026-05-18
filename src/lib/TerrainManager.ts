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

export let terrainEnabled = false;
export let hillshadeEnabled = false;
export let contoursEnabled = false;

export function initTerrainManager(map: Map, elevationUrl: string) {
    _map = map;
    _elevationUrl = elevationUrl;
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
        if (!MapRegistry.getSource(CONTOURS_OVERLAY.id)) {
            try {
                const res = await fetch(CONTOURS_OVERLAY.url);
                const style = await res.json();
                
                if (style.sprite) {
                    MapRegistry.registerImage(CONTOURS_OVERLAY.id, style.sprite, CONTOURS_OVERLAY.url);
                }

                for (const [sId, def] of Object.entries(style.sources)) {
                    MapRegistry.registerSource(sId, def);
                }
                
                style.layers.forEach((l: any) => {
                    MapRegistry.registerLayer(l.id, l);
                });
            } catch (err) {
                console.error(`Failed to load contours overlay: ${CONTOURS_OVERLAY.id}`, err);
            }
        }
    } else {
        // Wenn deaktiviert, aus Registry entfernen
        if (MapRegistry.getSource(CONTOURS_OVERLAY.id)) {
            // Wir müssen hier die Quellen und Layer entfernen, die wir registriert haben.
            // Da wir die Style-Datei nicht permanent im Speicher haben, versuchen wir es über die ID.
            // In diesem speziellen Fall wissen wir, dass die Source ID 'basemap-at-contours' ist.
            MapRegistry.unregisterSource(CONTOURS_OVERLAY.id);
            
            // Layer sind schwieriger zu identifizieren ohne Liste.
            // Wir entfernen sie auch direkt von der Karte, falls vorhanden.
            const style = _map.getStyle();
            if (style && style.layers) {
                style.layers.forEach((l: any) => {
                    if (l.source === CONTOURS_OVERLAY.id) {
                        MapRegistry.unregisterLayer(l.id);
                        if (_map?.getLayer(l.id)) _map.removeLayer(l.id);
                    }
                });
            }
            if (_map.getSource(CONTOURS_OVERLAY.id)) _map.removeSource(CONTOURS_OVERLAY.id);
            MapRegistry.unregisterImage(CONTOURS_OVERLAY.id);
        }
    }

    // MapRegistry synchronisieren (fügt fehlende hinzu)
    await MapRegistry.restore(_map, MapCore.loadSprites);
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
