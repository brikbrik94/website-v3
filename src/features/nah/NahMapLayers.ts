import maplibregl from 'maplibre-gl';
import { MapCore, MARKERS_SPRITE_BASE } from '../../lib/MapCore';
import { MAP_COLORS, MAP_ROUTE_STYLES } from '../../lib/MapStyles';
import { MapRegistry } from '../../lib/MapRegistry';
import { NahStation, NahStationResult } from '../../types/nah';

const SPRITE_BASE = MARKERS_SPRITE_BASE;
const TARGET_PIN_SOURCE = 'nah-target-pin';
const TARGET_PIN_LAYER = 'nah-target-pin-layer';
const STATIONS_SOURCE = 'nah-stations';
const STATIONS_LAYER = 'nah-stations-layer';
const HELI_ICON_ID = 'nah-heli-icon';
const HELI_ICON_SIZE = 64;

export type NahStationStatus = 'active' | 'inactive' | 'offseason';

const STATUS_BADGE_CLASS: Record<NahStationStatus, string> = {
  active: 'badge-green',
  inactive: 'badge-red',
  offseason: 'badge-gray',
};

const STATUS_TEXT: Record<NahStationStatus, string> = {
  active: 'EINSATZBEREIT',
  inactive: 'AUSSER DIENST (Betriebszeit)',
  offseason: 'AUSSER SAISON',
};

// WeakSet statt Boolean-Flag: initLayers() läuft bei jedem Basemap-Wechsel erneut für
// dieselbe Map-Instanz (Guard nötig), aber NahPageController erzeugt bei jedem Seitenbesuch
// eine neue Map-Instanz (kein Guard gewünscht, sonst blieben Hover-Listener nach einem
// Seitenwechsel für die neue Instanz fälschlich deaktiviert). Ein WeakSet trackt das korrekt
// pro Instanz, ohne dass destroy() den Zustand manuell zurücksetzen müsste.
const _stationHoverAttached = new WeakSet<maplibregl.Map>();
function attachStationHoverCursor(map: maplibregl.Map) {
  if (_stationHoverAttached.has(map)) return;
  _stationHoverAttached.add(map);
  map.on('mouseenter', STATIONS_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', STATIONS_LAYER, () => { map.getCanvas().style.cursor = ''; });
}

// Ein Popup wird für alle Stationsklicks wiederverwendet (analog TrackingMapLayers),
// statt pro Station ein eigenes Popup zu halten wie bei den früheren DOM-Markern.
let _stationPopup: maplibregl.Popup | null = null;
function getStationPopup(): maplibregl.Popup {
  if (!_stationPopup) {
    _stationPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' });
  }
  return _stationPopup;
}

// Rendert das fa-helicopter-Glyph (Font Awesome 7 Free, solid, ) einmalig auf einen
// Canvas und registriert es als SDF-Icon. Es gibt kein einfärbbares Helikopter-Icon im
// oe5ith-markers Sprite-Set (nur nicht-SDF Betreiber-Logos, siehe ROADMAP.md); dieser Weg
// vermeidet eine externe Sprite-Server-Abhängigkeit für ein einzelnes generisches Icon.
async function ensureHeliIcon(map: maplibregl.Map): Promise<void> {
  if (map.hasImage(HELI_ICON_ID)) return;

  try {
    await document.fonts.load(`900 ${HELI_ICON_SIZE}px "Font Awesome 7 Free"`);
  } catch (e) {
    console.warn('[NahMapLayers] Font Awesome Font konnte nicht vorab geladen werden', e);
  }

  if (map.hasImage(HELI_ICON_ID)) return;

  const canvas = document.createElement('canvas');
  canvas.width = HELI_ICON_SIZE;
  canvas.height = HELI_ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.font = `900 ${Math.round(HELI_ICON_SIZE * 0.85)}px "Font Awesome 7 Free"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.fillText('', HELI_ICON_SIZE / 2, HELI_ICON_SIZE / 2 + HELI_ICON_SIZE * 0.03);

  try {
    const imageData = ctx.getImageData(0, 0, HELI_ICON_SIZE, HELI_ICON_SIZE);
    if (!map.hasImage(HELI_ICON_ID)) {
      map.addImage(HELI_ICON_ID, imageData, { sdf: true });
    }
  } catch (e) {
    console.error('[NahMapLayers] Konnte Helikopter-Icon nicht registrieren', e);
  }
}

export const NahMapLayers = {
  computeStationStatus(station: NahStation): NahStationStatus {
    if (!station.in_season) return 'offseason';
    if (!station.is_active) return 'inactive';
    return 'active';
  },

  buildStationPopupHtml(station: NahStation): string {
    const status = this.computeStationStatus(station);
    const badgeClass = STATUS_BADGE_CLASS[status];
    const statusText = STATUS_TEXT[status];

    let hoursHtml = '';
    if (station.op_type === 'fixed' && station.fixed_start && station.fixed_end) {
      hoursHtml = `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end}</td></tr>`;
    } else if (station.op_type === 'daylight') {
      if (station.fixed_start && station.fixed_end) {
        hoursHtml = `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end} (max. ECET)</td></tr>`;
      } else if (station.fixed_start) {
        hoursHtml = `<tr><td>Zeiten</td><td>Ab ${station.fixed_start} bis ECET</td></tr>`;
      } else {
        hoursHtml = `<tr><td>Zeiten</td><td>BCET bis ECET</td></tr>`;
      }
    } else if (station.op_type === '24/7') {
      hoursHtml = `<tr><td>Zeiten</td><td>24 Stunden / 7 Tage</td></tr>`;
    }

    return `
      <div class="map-popup-detail">
        <div class="popup-header">
          <div class="popup-header-title">${station.callsign}</div>
          <div class="popup-header-org">${station.name}</div>
        </div>
        <table class="popup-kv">
          <tr><td>Status</td><td><span class="badge ${badgeClass}">${statusText}</span></td></tr>
          <tr><td>Betrieb</td><td>${station.op_type}</td></tr>
          ${hoursHtml}
          <tr><td>Nacht</td><td>${station.is_night_ready ? 'Ja' : 'Nein'}</td></tr>
          ${status === 'offseason' ? `<tr><td>Saison</td><td>Monate: ${station.months_active?.join(', ') || '-'}</td></tr>` : ''}
        </table>
      </div>
    `;
  },

  /**
   * Renders the NAH stations as a data-driven symbol layer (replaces the former
   * per-station maplibregl.Marker approach).
   */
  setStations(map: maplibregl.Map, stations: NahStation[]) {
    if (!map.getSource(STATIONS_SOURCE)) {
      this.initLayers(map);
    }

    const features = stations.map((station) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [station.lon, station.lat] },
      properties: { ...station, status: this.computeStationStatus(station) }
    }));

    const data = {
      type: 'FeatureCollection',
      features: features as any
    };

    const source = map.getSource(STATIONS_SOURCE) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data as any);
    }

    MapRegistry.registerSource(STATIONS_SOURCE, {
      type: 'geojson',
      data: data
    });
  },

  /**
   * Looks up the station (if any) hit by a map click, for use in the page's central
   * click handler (queryRenderedFeatures, analogous to TrackingMapLayers.handleMapClick).
   */
  findClickedStation(map: maplibregl.Map, point: [number, number]): { station: NahStation & { status: NahStationStatus }; coordinates: [number, number] } | null {
    const features = map.queryRenderedFeatures(point, { layers: [STATIONS_LAYER] });
    if (features.length === 0) return null;

    const feat = features[0];
    const coordinates = (feat.geometry as any).coordinates as [number, number];
    return {
      station: feat.properties as NahStation & { status: NahStationStatus },
      coordinates
    };
  },

  /**
   * Handles a map click against the stations layer: shows the station popup and
   * returns true if a station was hit, false otherwise (caller falls back to its
   * own click behaviour, e.g. NahPageController's incident calculation).
   */
  handleStationClick(map: maplibregl.Map, e: maplibregl.MapMouseEvent): boolean {
    const hit = this.findClickedStation(map, [e.point.x, e.point.y]);
    if (!hit) return false;

    const html = this.buildStationPopupHtml(hit.station);
    getStationPopup().setLngLat(hit.coordinates).setHTML(html).addTo(map);
    return true;
  },

  /**
   * Initializes the NAH-specific map layers and sources.
   */
  initLayers(map: maplibregl.Map) {
    MapRegistry.registerImage('oe5ith-markers', SPRITE_BASE);
    void ensureHeliIcon(map);

    // Einsatzort-Pin (ci-symbol-location, accent-Farbe, ohne Halo)
    const targetPinLayerDef = MapCore.createPinLayer(TARGET_PIN_LAYER, TARGET_PIN_SOURCE, {
      icon: 'ci-symbol-location',
      size: 0.75,
      anchor: 'center',
      color: MAP_COLORS.accent,
    });
    MapCore.ensureGeoJsonLayer(map, TARGET_PIN_SOURCE, targetPinLayerDef);

    // NAH-Stationen (Symbol-Layer statt DOM-Marker; siehe
    // docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md)
    const stationsLayerDef = {
      id: STATIONS_LAYER,
      type: 'symbol',
      source: STATIONS_SOURCE,
      layout: {
        'icon-image': HELI_ICON_ID,
        'icon-size': 0.5,
        'icon-allow-overlap': true,
      },
      paint: {
        'icon-color': [
          'match', ['get', 'status'],
          'active', MAP_COLORS.success,
          'inactive', MAP_COLORS.danger,
          'offseason', MAP_COLORS.muted,
          MAP_COLORS.success
        ]
      }
    };
    MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, stationsLayerDef as any);
    attachStationHoverCursor(map);

    const sourceId = 'nah-lines';
    const layerId = 'nah-lines';

    const layerDef = {
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          MAP_ROUTE_STYLES.active.color,
          MAP_ROUTE_STYLES.background.color
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          MAP_ROUTE_STYLES.active.weight,
          MAP_ROUTE_STYLES.background.weight
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          MAP_ROUTE_STYLES.active.opacity,
          MAP_ROUTE_STYLES.background.opacity
        ]
      }
    };

    MapCore.ensureGeoJsonLayer(map, sourceId, layerDef as any);
  },

  setTargetPin(map: maplibregl.Map, lng: number, lat: number) {
    MapCore.setPointSource(map, TARGET_PIN_SOURCE, [lng, lat]);
  },

  clearTargetPin(map: maplibregl.Map) {
    MapCore.setPointSource(map, TARGET_PIN_SOURCE, null);
  },

  /**
   * Updates flight path lines on the map.
   */
  updateFlightPaths(map: maplibregl.Map, incidentCoord: [number, number], results: NahStationResult[]) {
    const sourceId = 'nah-lines';
    
    // Self-healing check
    if (!map.getSource(sourceId)) {
      this.initLayers(map);
    }

    const [lng, lat] = incidentCoord;

    // Reset feature states
    for (let i = 0; i < 5; i++) {
      map.setFeatureState({ source: sourceId, id: i }, { selected: false });
    }

    const lineFeatures = results.map((s, index) => ({
      type: 'Feature',
      id: index,
      geometry: {
        type: 'LineString',
        coordinates: [[lng, lat], [s.lon, s.lat]]
      },
      properties: { osm_id: s.osm_id }
    }));

    const data = {
      type: 'FeatureCollection',
      features: lineFeatures as any
    };

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data as any);
    }

    // Persist in MapRegistry for style switches
    MapRegistry.registerSource(sourceId, {
      type: 'geojson',
      data: data
    });
  }
};
