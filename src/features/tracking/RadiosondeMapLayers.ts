import * as maplibregl from 'maplibre-gl';
import { type LayerSpecification } from 'maplibre-gl';
import { MapCore } from '../../lib/MapCore';
import { MAP_COLORS, getAltitudeColorStops, METERS_TO_FEET } from '../../lib/MapStyles';
import { PopupManager } from '../../lib/PopupManager';
import { attachHoverCursor } from '../../lib/HoverCursor';

const TRACKS_SOURCE = 'radiosonde-tracks';
const POINTS_SOURCE = 'radiosonde';
const TRACKS_LAYER = 'radiosonde-tracks-layer';
const POINTS_LAYER = 'radiosonde-points-layer';

// Eigene Funktionen statt Inline-Literale in ensureLayers() (Muster wie NahMapLayers'
// buildStationsLayerDef()), damit die Paint-Expressions ohne Karteninstanz testbar sind.
function buildTracksLayerDef(): LayerSpecification {
    return {
        id: TRACKS_LAYER,
        type: 'line',
        source: TRACKS_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
            // Farbe = Höhe (gemeinsame Skala mit ADS-B, siehe getAltitudeColorStops()), aktiv/
            // beendet wird stattdessen über die Strichdicke unterschieden (siehe line-width unten).
            'line-color': [
                'interpolate', ['linear'],
                ['*', ['coalesce', ['get', 'alt_mid'], 0], METERS_TO_FEET],
                ...getAltitudeColorStops()
            ],
            'line-width': ['case', ['==', ['get', 'active'], true], 3, 1.5],
            'line-opacity': ['case', ['==', ['get', 'active'], true], 0.9, 0.5]
        }
    };
}

function buildPointsLayerDef(): LayerSpecification {
    return {
        id: POINTS_LAYER,
        type: 'circle',
        source: POINTS_SOURCE,
        paint: {
            'circle-radius': 6,
            'circle-color': [
                'interpolate', ['linear'],
                ['*', ['coalesce', ['get', 'altitude'], 0], METERS_TO_FEET],
                ...getAltitudeColorStops()
            ],
            'circle-stroke-color': MAP_COLORS.black,
            'circle-stroke-width': 1.5
        }
    };
}

export class RadiosondeMapLayers {
    private map: maplibregl.Map;
    private visible = true;

    constructor(map: maplibregl.Map) {
        this.map = map;
    }

    public static getTracksLayerDefinition(): LayerSpecification {
        return buildTracksLayerDef();
    }

    public static getPointsLayerDefinition(): LayerSpecification {
        return buildPointsLayerDef();
    }

    public setVisibility(visible: boolean): void {
        this.visible = visible;
        const state = visible ? 'visible' : 'none';
        if (this.map.getLayer(TRACKS_LAYER)) this.map.setLayoutProperty(TRACKS_LAYER, 'visibility', state);
        if (this.map.getLayer(POINTS_LAYER)) this.map.setLayoutProperty(POINTS_LAYER, 'visibility', state);
    }

    public ensureLayers(): void {
        const m = this.map;
        const visibility = this.visible ? 'visible' : 'none';

        const tracksDef = buildTracksLayerDef();
        MapCore.ensureGeoJsonLayer(m, TRACKS_SOURCE, {
            ...tracksDef,
            layout: { ...tracksDef.layout, visibility }
        });

        MapCore.ensureGeoJsonLayer(m, POINTS_SOURCE, {
            ...buildPointsLayerDef(),
            layout: { visibility }
        });

        attachHoverCursor(m, [POINTS_LAYER]);
    }

    public handleMapClick(e: maplibregl.MapMouseEvent, onSelect: (id: string | number | null) => void): void {
        const features = this.map.queryRenderedFeatures(e.point, { layers: [POINTS_LAYER] });

        if (features.length === 0) {
            PopupManager.closePopup();
            onSelect(null);
            return;
        }

        const feat = features[0];
        const props = feat.properties || {};
        onSelect(props.callsign ?? null);

        const coordinates = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
        const html = PopupManager.buildHtml(POINTS_LAYER, props);
        PopupManager.showFeaturePopup(this.map, coordinates, html);
    }

    public updateData(sourceId: string, data: GeoJSON.GeoJSON): void {
        if (this.map.getSource(sourceId)) {
            (this.map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        }
    }

    public destroy(): void {
        PopupManager.closePopup();
    }
}
