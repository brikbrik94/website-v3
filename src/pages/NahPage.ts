import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import maplibregl from 'maplibre-gl';
import { Toast } from '../lib/Toast';
import { initNahSidebar, renderNahResults, updateNahServerStatus } from '../components/NahSidebar';
import { calculateDistance, calculateFlightTime, formatDuration, formatETA } from '../lib/FlightMath';
import { MAP_ROUTE_STYLES, MAP_COLORS } from '../lib/MapStyles';
import { MapLegend } from '../lib/MapLegend';
import { NahStation, NahStationResult } from '../types/nah';
import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';
import { MapRegistry } from '../lib/MapRegistry';

// Module-level state to persist across reloads
let stations: NahStation[] = [];
let stationMarkers: maplibregl.Marker[] = [];
let targetMarker: maplibregl.Marker | null = null;
let currentResults: NahStationResult[] = [];
let currentIncidentCoord: [number, number] | null = null;
let refreshTimeout: any = null;
let connectionInterval: any = null;

/**
 * Manages the next automatic refresh based on server-provided timestamp or fixed delay.
 */
const scheduleNextRefresh = (map: maplibregl.Map, sidebarResults: HTMLElement, refreshAtOrDelay: string | number) => {
  if (refreshTimeout) clearTimeout(refreshTimeout);

  // Prevent memory leaks: stop if map is no longer in DOM
  if (!map.getContainer().isConnected) return;

  let delay: number;
  if (typeof refreshAtOrDelay === 'string') {
    const targetTime = Date.parse(refreshAtOrDelay);
    const now = Date.now();
    // Calculate delay: target + 10s buffer
    delay = targetTime - now + 10000;
  } else {
    delay = refreshAtOrDelay;
  }
  
  // Enforce minimum delay of 30s to prevent rapid loops
  if (delay < 30000) delay = 30000;

  console.log(`[NahPage] Next reload scheduled in ${Math.round(delay/1000)}s`);

  refreshTimeout = setTimeout(async () => {
    if (!map.getContainer().isConnected) return;
    
    console.log(`[NahPage] Dynamic reload triggered...`);
    await refreshStations(map, sidebarResults);
    
    // If a calculation was active, re-trigger it automatically to update ETAs/Distances
    if (currentIncidentCoord) {
      performCalculation(map, sidebarResults, currentIncidentCoord[0], currentIncidentCoord[1]);
    }
  }, delay);
};

/**
 * Loads NAH station data and updates markers on the map.
 * Can be called independently for periodic reloads.
 */
export const refreshStations = async (map: maplibregl.Map, sidebarResults: HTMLElement) => {
  try {
    const nahRes = await fetch('/api/nah.php');
    if (!nahRes.ok) throw new Error(`API Error: ${nahRes.status}`);
    const data = await nahRes.json();
    
    stations = data.stations || [];
    // console.log('[NahPage] Loaded stations:', stations.length, stations[0]);
    const refreshAt = data.refresh_at;
    
    // Clear existing markers
    stationMarkers.forEach(m => m.remove());
    stationMarkers = [];

    stations.forEach((station) => {
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

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([station.lon, station.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, maxWidth: '300px' }).setHTML(popupHtml))
        .addTo(map);
      
      stationMarkers.push(marker);
    });

    if (stations.length > 0) {
      Toast.success(`${stations.length} NAH-Stützpunkte geladen.`);
    }

    // Schedule next refresh if timestamp provided
    if (refreshAt) {
      scheduleNextRefresh(map, sidebarResults, refreshAt);
    }
  } catch (err) {
    console.error('[NahPage] Refresh failed', err);
    Toast.error('Fehler beim Aktualisieren der NAH-Daten');
    // Error recovery: retry in 60s
    scheduleNextRefresh(map, sidebarResults, 60000);
  }
};

/**
 * Calculates distances to active stations from a given point and updates UI/Map.
 */
export const performCalculation = (map: maplibregl.Map, sidebarResults: HTMLElement, lng: number, lat: number) => {
  currentIncidentCoord = [lng, lat];

  // Source-Guard
  if (!map.getSource('nah-lines')) return;

  // Reset previous results state (we always have at most 5 lines)
  for (let i = 0; i < 5; i++) {
    map.setFeatureState({ source: 'nah-lines', id: i }, { selected: false });
  }

  // Ziel-Marker setzen
  if (targetMarker) targetMarker.remove();
  targetMarker = new maplibregl.Marker({ color: MAP_COLORS.accent })
    .setLngLat([lng, lat])
    .addTo(map);

  // Distanz zu allen AKTIVEN Stationen berechnen
  const results: NahStationResult[] = stations
    .filter((s) => s.is_active)
    .map((s) => {
      const dist = calculateDistance(lat, lng, s.lat, s.lon);
      const duration = calculateFlightTime(dist);
      return {
        ...s,
        distance: dist,
        duration,
        durationStr: formatDuration(duration),
        eta: formatETA(duration)
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5); // Top 5

  currentResults = results;

  // Linien-Features generieren (mit index als ID für zuverlässiges Feature-State)
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

  const source = map.getSource('nah-lines') as maplibregl.GeoJSONSource;
  if (source) {
    source.setData(data as any);
  }

  // Register updated source in Registry to persist across basemap changes
  MapRegistry.registerSource('nah-lines', {
    type: 'geojson',
    data: data
  });

  renderNahResults(sidebarResults, results);
};

export const initNahPage = async (container: HTMLElement) => {
  let map: maplibregl.Map | null = null;

  // Clear all current state to prevent "ghost" markers or multiple schedulers
  stationMarkers.forEach(m => m.remove());
  stationMarkers = [];
  stations = [];
  currentResults = [];
  currentIncidentCoord = null;
  if (targetMarker) {
    targetMarker.remove();
    targetMarker = null;
  }
  if (refreshTimeout) clearTimeout(refreshTimeout);
  if (connectionInterval) clearInterval(connectionInterval);

  try {
    // 1. Daten laden
    const invService = InventoryService.getInstance();
    const basemaps = await invService.getBasemaps();

    // 2. Basis-Layout
    const mounts = LayoutHelper.renderBaseLayout(container, { 
      withLegend: true, 
      legendTitle: 'Luftrettung' 
    });

    const legend = new MapLegend(mounts.legend!);
    legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.active.color, label: 'Gewählte Station' });
    legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.background.color, label: 'Nächste Stationen' });
    legend.addEntry({ type: 'dot',  color: MAP_COLORS.success, label: 'Einsatzbereit' });
    legend.addEntry({ type: 'dot',  color: MAP_COLORS.danger, label: 'Außer Dienst (Betriebszeit)' });
    legend.addEntry({ type: 'dot',  color: MAP_COLORS.muted, label: 'Außer Saison' });

    const ensureNahLayers = (m: maplibregl.Map) => {
      const sourceId = 'nah-lines';
      const layerId = 'nah-lines';

      const layerDef = {
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.color, MAP_ROUTE_STYLES.background.color],
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.weight, MAP_ROUTE_STYLES.background.weight],
          'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.opacity, MAP_ROUTE_STYLES.background.opacity]
        }
      };

      // MapCore.ensureGeoJsonLayer handles registration and only adds if missing from map instance.
      // We don't manually register sourceDef here because it would overwrite actual results in Registry
      // if this is called during style-restore.
      MapCore.ensureGeoJsonLayer(m, sourceId, layerDef as any);
    };

    initNahSidebar(mounts.sidebar);
    const sidebarResults = document.getElementById('nah-sidebar-results')!;

    // 3. Karte initialisieren
    map = MapCore.init(
      mounts.map, 
      basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
      async (m) => {
        ensureNahLayers(m);
        if (currentIncidentCoord) {
          performCalculation(m, sidebarResults, currentIncidentCoord[0], currentIncidentCoord[1]);
        }
      }
    );
    map.jumpTo({ center: [13.5, 48.0], zoom: 7 });

    // 4. Komponenten initialisieren
    initTopbar(mounts.topbar, basemaps, (url) => {
      if (!map) return;
      map.setStyle(url);
    }, () => legend.toggle());

    // 5. NAH-Daten laden und Marker setzen (Initialer Load)
    // Dies triggert nun auch den dynamischen Scheduler
    await refreshStations(map, sidebarResults);

    // 6. Map-Click Logik für Luftlinie & Sidebar
    map.on('click', (e) => {
      if (!map) return;
      // Ignorieren, wenn der Klick auf einen Marker erfolgte
      if ((e.originalEvent.target as HTMLElement).closest('.maplibregl-marker')) {
        return;
      }

      const { lng, lat } = e.lngLat;
      performCalculation(map, sidebarResults, lng, lat);
    });

    // Klick auf Sidebar-Result zentriert Karte
    sidebarResults.addEventListener('click', (e) => {
      if (!map) return;
      const item = (e.target as HTMLElement).closest('.result-item-simple') as HTMLElement;
      if (item) {
        const index = item.dataset.index;
        
        // Auf alle Ergebnisse zoomen (Overview)
        const bounds = new maplibregl.LngLatBounds();
        if (currentIncidentCoord) bounds.extend(currentIncidentCoord);
        currentResults.forEach(r => bounds.extend([r.lon, r.lat]));
        
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 80 });
        }
        
        // Linien-Highlighting
        for (let i = 0; i < 5; i++) {
          map.setFeatureState({ source: 'nah-lines', id: i }, { selected: false });
        }
        if (index !== undefined) {
          map.setFeatureState({ source: 'nah-lines', id: parseInt(index) }, { selected: true });
        }

        // Items optisch markieren
        document.querySelectorAll('.result-item-simple').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      }
    });

  } catch (err) {
    console.error('[NahPage]', err);
    Toast.error('Fehler beim Initialisieren der Luftrettungs-Seite');
  }

  // Alive Ping Logik (Heartbeat)
  const checkConnection = async () => {
    // Prevent memory leaks: stop if map is no longer in DOM
    if (!map || !map.getContainer().isConnected) {
      if (connectionInterval) clearInterval(connectionInterval);
      return;
    }
    try {
      const res = await fetch('/api/ping.php');
      updateNahServerStatus(res.ok);
    } catch (e) {
      updateNahServerStatus(false);
    }
  };

  checkConnection();
  connectionInterval = setInterval(checkConnection, 30000); // Alle 30 Sekunden
};
