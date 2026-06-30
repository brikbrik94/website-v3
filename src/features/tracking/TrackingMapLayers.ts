import maplibregl from 'maplibre-gl';
import { MapCore } from '../../lib/MapCore';
import { MAP_COLORS } from '../../lib/MapStyles';
import { MapRegistry } from '../../lib/MapRegistry';
import { PopupManager } from '../../lib/PopupManager';

export class TrackingMapLayers {
    private map: maplibregl.Map;
    private popup: maplibregl.Popup;
    private adsbVisible = true;
    private aisVisible = true;
    private cursorListenersAttached = false;
    private readonly hoverLayerIds = ['adsb-icons', 'ais-icons'];
    private readonly onHoverEnter = () => { this.map.getCanvas().style.cursor = 'pointer'; };
    private readonly onHoverLeave = () => { this.map.getCanvas().style.cursor = ''; };

    constructor(map: maplibregl.Map) {
        this.map = map;
        this.popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' });
    }

    public setVisibility(type: 'adsb' | 'ais', visible: boolean) {
        if (type === 'adsb') {
            this.adsbVisible = visible;
            const state = visible ? 'visible' : 'none';
            if (this.map.getLayer('adsb-icons')) this.map.setLayoutProperty('adsb-icons', 'visibility', state);
            if (this.map.getLayer('adsb-tracks')) this.map.setLayoutProperty('adsb-tracks', 'visibility', state);
        } else {
            this.aisVisible = visible;
            const state = visible ? 'visible' : 'none';
            ['ais-icons', 'ais-dots-moving', 'ais-dots-static', 'ais-track-lines'].forEach(l => {
                if (this.map.getLayer(l)) this.map.setLayoutProperty(l, 'visibility', state);
            });
        }
    }

    public async loadSprites() {
        console.log('[Tracking] Loading sprites...');
        const adsbSprite = 'https://tiles.oe5ith.at/assets/sprites/adsb/sprite';
        const aisSprite = 'https://tiles.oe5ith.at/assets/sprites/ais/sprite';

        MapRegistry.registerImage('adsb-sprite', adsbSprite);
        MapRegistry.registerImage('ais-sprite', aisSprite);

        try {
            await Promise.all([
                MapCore.loadSprites(this.map, adsbSprite),
                MapCore.loadSprites(this.map, aisSprite)
            ]);
        } catch (err) {
            console.error('[Tracking] Sprite loading failed', err);
        }
    }

    public ensureLayers(selectedId: string | number | null) {
        console.log('[Tracking] Ensuring layers exist...');
        const m = this.map;

        // --- ADS-B TRACKS ---
        MapCore.ensureGeoJsonLayer(m, 'adsb-tracks', {
            id: 'adsb-tracks',
            type: 'line',
            source: 'adsb-tracks',
            paint: { 
                'line-color': [
                    'interpolate', ['linear'],
                    ['coalesce', ['get', 'alt_mid'], 0],
                    0,     MAP_COLORS.alt0,
                    5000,  MAP_COLORS.alt5k,
                    15000, MAP_COLORS.alt15k,
                    35000, MAP_COLORS.alt35k
                ], 
                'line-width': ['case', ['==', ['get', 'hex'], (selectedId || '').toString()], 5, 3],
                'line-opacity': 0.8 
            },
            layout: { 
                'line-join': 'round',
                'line-cap': 'round',
                'visibility': this.adsbVisible ? 'visible' : 'none' 
            }
        });

        // --- ADS-B ICONS ---
        MapCore.ensureGeoJsonLayer(m, 'adsb', {
            id: 'adsb-icons',
            type: 'symbol',
            source: 'adsb',
            layout: {
                'icon-image': [
                    'match', ["get", "category"],
                    "A1", "plane-a1",
                    "A2", "plane-a2",
                    "A3", "plane-a3",
                    "A4", "plane-a4",
                    "A5", "plane-a5",
                    "A6", "plane-a6",
                    "A7", "plane-a7",
                    "B1", "plane-b1",
                    "B2", "plane-b2",
                    "B3", "plane-b3",
                    "B4", "plane-b4",
                    "B6", "plane-b6",
                    "C1", "plane-c1",
                    "C2", "plane-c2",
                    "C3", "plane-c3",
                    "plane-unknown"
                ],
                'icon-size': 0.6,
                'icon-rotate': ['coalesce', ['get', 'track'], ['get', 'true_heading'], 0],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'text-field': ['coalesce', ['get', 'flight'], ['get', 'hex']],
                'text-font': ['Open-Sans-Regular'],
                'text-size': 10,
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
                'text-allow-overlap': false,
                'text-optional': true,
                'visibility': this.adsbVisible ? 'visible' : 'none'
            },
            paint: { 
                'icon-color': [
                    'interpolate', ['linear'],
                    ['coalesce', ['get', 'alt_baro'], 0],
                    0,     MAP_COLORS.alt0,
                    5000,  MAP_COLORS.alt5k,
                    15000, MAP_COLORS.alt15k,
                    35000, MAP_COLORS.alt35k
                ],
                'icon-halo-color': MAP_COLORS.black,
                'icon-halo-width': 1,
                'text-color': MAP_COLORS.white, 
                'text-halo-color': MAP_COLORS.black, 
                'text-halo-width': 2 
            }
        });

        // --- AIS TRACKS ---
        MapCore.ensureGeoJsonLayer(m, 'ais-tracks', {
            id: 'ais-track-lines',
            type: 'line',
            source: 'ais-tracks',
            minzoom: 10,
            layout: { 
                'line-join': 'round', 
                'line-cap': 'round',
                'visibility': this.aisVisible ? 'visible' : 'none'
            },
            paint: { 
                'line-color': MAP_COLORS.accent, 
                'line-width': ['case', ['==', ['get', 'mmsi'], typeof selectedId === 'number' ? selectedId : Number(selectedId) || -1], 4, 2],
                'line-opacity': 0.8 
            }
        });

        // --- AIS DOTS & ICONS ---
        const shipColorProp = ['get', 'ui_color'];

        MapCore.ensureGeoJsonLayer(m, 'ais', {
            id: 'ais-dots-moving',
            type: 'circle',
            source: 'ais',
            maxzoom: 11,
            filter: ['all', ['>', ['coalesce', ['get', 'speed'], 0], 0.2]],
            layout: { 'visibility': this.aisVisible ? 'visible' : 'none' },
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 11, 4],
                'circle-color': shipColorProp,
                'circle-stroke-color': MAP_COLORS.black,
                'circle-stroke-width': 0.5
            }
        });

        MapCore.ensureGeoJsonLayer(m, 'ais', {
            id: 'ais-dots-static',
            type: 'circle',
            source: 'ais',
            filter: ['all', ['<=', ['coalesce', ['get', 'speed'], 0], 0.2]],
            layout: { 'visibility': this.aisVisible ? 'visible' : 'none' },
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 14, 5],
                'circle-color': shipColorProp,
                'circle-stroke-color': MAP_COLORS.black,
                'circle-stroke-width': 0.5
            }
        });

        MapCore.ensureGeoJsonLayer(m, 'ais', {
            id: 'ais-icons',
            type: 'symbol',
            source: 'ais',
            minzoom: 11,
            filter: ['all', ['>', ['coalesce', ['get', 'speed'], 0], 0.2]],
            layout: {
                'icon-image': ['get', 'ui_sprite'],
                'icon-rotate': ['coalesce', ['get', 'heading'], ['get', 'cog'], 0],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 14, 0.7],
                'text-field': ['coalesce', ['get', 'shipname'], ['get', 'callsign'], ""],
                'text-font': ['Open-Sans-Regular'],
                'text-size': 10,
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
                'text-allow-overlap': false,
                'text-optional': true,
                'visibility': this.aisVisible ? 'visible' : 'none'
            },
            paint: { 
                'icon-color': shipColorProp,
                'icon-halo-color': MAP_COLORS.black,
                'icon-halo-width': 1,
                'text-color': MAP_COLORS.white, 
                'text-halo-color': MAP_COLORS.black, 
                'text-halo-width': 2 
            }
        });

        // Cursor-Listener nur einmal registrieren (ensureLayers läuft bei jedem
        // Style-/Basemap-Wechsel erneut, sonst stapeln sich die Handler).
        if (!this.cursorListenersAttached) {
            this.cursorListenersAttached = true;
            for (const id of this.hoverLayerIds) {
                m.on('mouseenter', id, this.onHoverEnter);
                m.on('mouseleave', id, this.onHoverLeave);
            }
        }
    }

    public highlightItem(selectedId: string | number | null) {
        if (this.map.getLayer('adsb-tracks')) {
            this.map.setPaintProperty('adsb-tracks', 'line-width', ['case', ['==', ['get', 'hex'], (selectedId || '').toString()], 4, 1.5]);
        }
        if (this.map.getLayer('ais-track-lines')) {
            this.map.setPaintProperty('ais-track-lines', 'line-width', ['case', ['==', ['get', 'mmsi'], typeof selectedId === 'number' ? selectedId : Number(selectedId) || -1], 4, 2]);
        }
    }

    public handleMapClick(e: any, onSelect: (id: string | number | null) => void) {
        const features = this.map.queryRenderedFeatures(e.point, { layers: ['adsb-icons', 'ais-icons', 'ais-dots-moving', 'ais-dots-static'] });
        
        if (features.length === 0) {
            this.popup.remove();
            this.highlightItem(null);
            onSelect(null);
            return;
        }

        const feat = features[0];
        const props = feat.properties || {};
        const layerId = feat.layer.id;
        const isAdsb = layerId.includes('adsb');
        
        const selectedId = isAdsb ? props.hex : props.mmsi;
        
        this.highlightItem(selectedId);
        onSelect(selectedId);

        const html = PopupManager.buildHtml(layerId, props);
        this.popup.setLngLat(e.lngLat).setHTML(html).addTo(this.map);
        e.preventDefault();
    }

    public updateData(sourceId: string, data: any) {
        if (this.map.getSource(sourceId)) {
            (this.map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        }
    }

    public destroy() {
        this.popup.remove();
        // Cursor-Listener wieder abmelden (die Karte selbst wird von MapCore zerstört).
        if (this.cursorListenersAttached) {
            for (const id of this.hoverLayerIds) {
                this.map.off('mouseenter', id, this.onHoverEnter);
                this.map.off('mouseleave', id, this.onHoverLeave);
            }
            this.cursorListenersAttached = false;
        }
    }
}
