import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import maplibregl from 'maplibre-gl';
import { Toast } from '../lib/Toast';
import { initNahSidebar, renderNahResults, updateNahServerStatus } from '../components/NahSidebar';
import { calculateDistance, calculateFlightTime, formatDuration, formatETA } from '../lib/FlightMath';
import { MAP_ROUTE_STYLES, MAP_COLORS } from '../lib/MapStyles';
import { MapLegend } from '../lib/MapLegend';

export interface MapItem {
  name: string;
  type: string;
  style: { url: string };
  file: { url: string };
}

interface Inventory {
  maps: MapItem[];
}

export interface NahStation {
  osm_id: string;
  name: string;
  callsign: string;
  region: string;
  op_type: string;
  is_active: boolean;
  is_night_ready: boolean;
  fixed_start: string | null;
  fixed_end: string | null;
  lat: number;
  lon: number;
}

export interface NahStationResult extends NahStation {
  distance: number;
  duration: number;
  durationStr: string;
  eta: string;
}

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
    const nahRes = await fetch('/api/nah');
    if (!nahRes.ok) throw new Error(`API Error: ${nahRes.status}`);
    const data = await nahRes.json();
    
    stations = data.stations || [];
    const refreshAt = data.refresh_at;
    
    // Clear existing markers
    stationMarkers.forEach(m => m.remove());
    stationMarkers = [];

    stations.forEach((station) => {
      const color = station.is_active ? MAP_COLORS.success : MAP_COLORS.muted;
      const statusText = station.is_active ? 'EINSATZBEREIT' : 'NICHT AKTIV';
      
      const el = document.createElement('div');
      el.innerHTML = `<i class="fa-solid fa-helicopter" style="color: ${color}; font-size: 24px; text-shadow: 0 0 3px rgba(0,0,0,0.5); cursor: pointer;"></i>`;
      
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

  const source = map.getSource('nah-lines') as maplibregl.GeoJSONSource;
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features: lineFeatures as any
    });
  }

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
    // 1. Inventar laden (CI-konform)
    const invRes = await fetch('https://tiles.oe5ith.at/inventory.json');
    if (!invRes.ok) throw new Error('Inventory load failed');
    const inventory: Inventory = await invRes.json();
    const basemaps = inventory.maps.filter(m => m.type === 'basemap');

    // 2. Layout aufbauen (mit Sidebar Mount)
    container.innerHTML = `
      <div id="topbar-mount"></div>
      <div class="layout">
        <div id="sidebar-mount"></div>
        <main id="map" style="flex: 1; height: 100%; position: relative; min-width: 0;">
          ${MapCore.getAttributionHtml()}
        </main>
        <div class="map-legend" id="map-legend" style="display:none; position:fixed; bottom:16px; right:16px;">
          <div class="map-legend-title"></div>
          <div class="map-legend-entries"></div>
        </div>
      </div>
    `;

    const topbarMount = document.getElementById('topbar-mount')!;
    const sidebarMount = document.getElementById('sidebar-mount')!;
    const mapContainer = document.getElementById('map')!;

    const legend = new MapLegend('#map-legend');
    legend.setTitle('Luftrettung');
    legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.active.color, label: 'Gewählte Station' });
    legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.background.color, label: 'Nächste Stationen' });
    legend.addEntry({ type: 'dot',  color: MAP_COLORS.success, label: 'Einsatzbereit' });
    legend.addEntry({ type: 'dot',  color: MAP_COLORS.muted, label: 'Nicht aktiv' });

    // 3. Karte initialisieren
    map = MapCore.init(mapContainer, basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');
    map.jumpTo({ center: [13.5, 48.0], zoom: 7 });

    map.on('load', () => {
      if (!map) return;
      if (!map.getSource('nah-lines')) {
        map.addSource('nah-lines', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'nah-lines',
          type: 'line',
          source: 'nah-lines',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.color, MAP_ROUTE_STYLES.background.color],
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.weight, MAP_ROUTE_STYLES.background.weight],
            'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.opacity, MAP_ROUTE_STYLES.background.opacity]
          }
        });
      }
    });

    // 4. Komponenten initialisieren
    initTopbar(topbarMount, basemaps, (url) => {
      map?.setStyle(url);
      map?.once('style.load', () => MapCore.reapplyBaseLayers());
    }, () => legend.toggle());

    initNahSidebar(sidebarMount);
    const sidebarResults = document.getElementById('nah-sidebar-results')!;

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
      const res = await fetch('/api/ping');
      updateNahServerStatus(res.ok);
    } catch (e) {
      updateNahServerStatus(false);
    }
  };

  checkConnection();
  connectionInterval = setInterval(checkConnection, 30000); // Alle 30 Sekunden
};
