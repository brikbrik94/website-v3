import type { Map } from 'maplibre-gl';

/**
 * Verwaltet 3D-Terrain (Elevation), Hillshading und das Höhenlinien-Overlay für eine
 * Map-Instanz — modul-scoped (nicht pro Instanz), da pro Seite nur eine Map gleichzeitig lebt.
 * `initTerrainManager()` setzt die Toggle-Zustände bei jedem Seitenaufruf zurück, damit auf der
 * nächsten Seite nichts unerwartet aktiv bleibt.
 */
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
    // Modul-globale Toggle-Zustände zurücksetzen: sonst würden Terrain/Hillshade/Contours,
    // die auf einer Seite aktiviert wurden, auf der nächsten Seite (ohne passenden Toggle)
    // still wieder angewandt. Jede Seite startet im Standard (alles aus).
    terrainEnabled = false;
    hillshadeEnabled = false;
    contoursEnabled = false;
    // Kein Direktaufruf von applyTerrainInfrastructure() hier: MapCore.init()s restore()
    // ruft sie ohnehin garantiert auf (kalt via 'style.load', warm via setTimeout-Fallback) —
    // ein zusätzlicher, un-awaited Aufruf hier würde nur unkoordiniert parallel dazu laufen
    // (am isRestoring-Lock vorbei) und wäre ein Race-Risiko ohne Nutzen.
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

    // 3. Contours – via gemeinsamem OverlayLoader (lädt/entfernt den kompletten Style). Dynamischer
    // Import statt Modul-Top-Level-Import: OverlayLoader zieht maplibre-gl/MapCore/MapRegistry nach
    // sich (~265 KB gzip) — TerrainManager.ts wird aber bereits von TerrainControls.ts importiert,
    // das wiederum von Topbar.ts auf JEDER Seite (auch /info, ohne Karte) statisch eingebunden wird.
    // Ohne diesen dynamischen Import würde /info das komplette Karten-Bundle mitladen, obwohl
    // applyTerrainInfrastructure() dort nie aufgerufen wird (siehe
    // docs/performance/2026-07-28-baseline-audit.md, Befund 4).
    const { OverlayLoader } = await import('./OverlayLoader');
    if (contoursEnabled) {
        if (!OverlayLoader.isLoaded(CONTOURS_OVERLAY.id)) {
            try {
                await OverlayLoader.add(_map, CONTOURS_OVERLAY.id, CONTOURS_OVERLAY.url);
            } catch (err) {
                console.error(`Failed to load contours overlay: ${CONTOURS_OVERLAY.id}`, err);
            }
        }
    } else if (OverlayLoader.isLoaded(CONTOURS_OVERLAY.id)) {
        OverlayLoader.remove(_map, CONTOURS_OVERLAY.id);
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
