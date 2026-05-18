import maplibregl from 'maplibre-gl';
import { MapCore } from '../../lib/MapCore';
import { MAP_COLORS, MAP_ROUTE_STYLES } from '../../lib/MapStyles';
import { MapRegistry } from '../../lib/MapRegistry';
import { NahStation, NahStationResult } from '../../types/nah';

export const NahMapLayers = {
  /**
   * Initializes the NAH-specific map layers and sources.
   */
  initLayers(map: maplibregl.Map) {
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

  /**
   * Renders markers for the given NAH stations.
   * Returns an array of created markers.
   */
  renderMarkers(map: maplibregl.Map, stations: NahStation[]): maplibregl.Marker[] {
    return stations.map((station) => {
      let color = MAP_COLORS.success;
      let statusText = 'EINSATZBEREIT';

      if (!station.in_season) {
        color = MAP_COLORS.muted;
        statusText = 'AUSSER SAISON';
      } else if (!station.is_active) {
        color = MAP_COLORS.danger;
        statusText = 'AUSSER DIENST (Betriebszeit)';
      }

      const el = document.createElement('div');
      el.innerHTML = `<i class="fa-solid fa-helicopter map-marker-helicopter" style="color: ${color};"></i>`;

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

      const popupHtml = `
        <div class="map-popup-detail">
          <div class="popup-header">
            <div class="popup-header-title">${station.callsign}</div>
            <div class="popup-header-org">${station.name}</div>
          </div>
          <table class="popup-kv">
            <tr><td>Status</td><td style="color: ${color}; font-weight: 700;">${statusText}</td></tr>
            <tr><td>Betrieb</td><td>${station.op_type}</td></tr>
            ${hoursHtml}
            <tr><td>Nacht</td><td>${station.is_night_ready ? 'Ja' : 'Nein'}</td></tr>
            ${!station.in_season ? `<tr><td>Saison</td><td>Monate: ${station.months_active?.join(', ') || '-'}</td></tr>` : ''}
          </table>
        </div>
      `;

      return new maplibregl.Marker({ element: el })
        .setLngLat([station.lon, station.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, maxWidth: '300px' }).setHTML(popupHtml))
        .addTo(map);
    });
  },

  /**
   * Creates and adds a target marker at the specified coordinates.
   */
  createTargetMarker(map: maplibregl.Map, lng: number, lat: number): maplibregl.Marker {
    return new maplibregl.Marker({ color: MAP_COLORS.accent })
      .setLngLat([lng, lat])
      .addTo(map);
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
