import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import maplibregl from 'maplibre-gl';
import { Toast } from '../lib/Toast';
import { initNahSidebar, renderNahResults, updateNahServerStatus } from '../components/NahSidebar';
import { calculateDistance, calculateFlightTime, formatDuration, formatETA } from '../lib/FlightMath';

export interface MapItem {
  name: string;
  type: string;
  style: { url: string };
  file: { url: string };
}

interface Inventory {
  maps: MapItem[];
}

export const initNahPage = async (container: HTMLElement) => {
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
      </div>
    `;

    const topbarMount = document.getElementById('topbar-mount')!;
    const sidebarMount = document.getElementById('sidebar-mount')!;
    const mapContainer = document.getElementById('map')!;

    // 3. Karte initialisieren
    const map = MapCore.init(mapContainer, basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');
    map.jumpTo({ center: [13.5, 48.0], zoom: 7 });

    map.on('load', () => {
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
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#10b981', '#3b82f6'],
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 4, 2],
            'line-opacity': 0.8
          }
        });
      }
    });

    // 4. Komponenten initialisieren
    initTopbar(topbarMount, basemaps, (url) => {
      map.setStyle(url);
      map.once('style.load', () => MapCore.reapplyBaseLayers());
    });

    initNahSidebar(sidebarMount);
    const sidebarResults = document.getElementById('nah-sidebar-results')!;

    // 5. NAH-Daten laden und Marker setzen
    const nahRes = await fetch('/api/nah');
    if (!nahRes.ok) throw new Error(`API Error: ${nahRes.status}`);
    const stations = await nahRes.json();
    
    stations.forEach((station: any) => {
      const color = station.is_active ? '#10b981' : '#6b7280'; // CI Success vs CI Muted
      const statusText = station.is_active ? 'EINSATZBEREIT' : 'NICHT AKTIV';
      
      const el = document.createElement('div');
      el.innerHTML = `<i class="fa-solid fa-helicopter" style="color: ${color}; font-size: 24px; text-shadow: 0 0 3px rgba(0,0,0,0.5); cursor: pointer;"></i>`;
      
      let hoursHtml = '';
      if (station.op_type === 'fixed' && station.fixed_start && station.fixed_end) {
        hoursHtml = `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end}</td></tr>`;
      } else if (station.op_type === 'daylight') {
        if (station.fixed_start && station.fixed_end) {
          hoursHtml = `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end} (max. Daylight)</td></tr>`;
        } else if (station.fixed_start) {
          hoursHtml = `<tr><td>Zeiten</td><td>Ab ${station.fixed_start} bis Sonnenuntergang</td></tr>`;
        } else {
          hoursHtml = `<tr><td>Zeiten</td><td>Sonnenauf- bis untergang</td></tr>`;
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

      new maplibregl.Marker({ element: el })
        .setLngLat([station.lon, station.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, maxWidth: '300px' }).setHTML(popupHtml))
        .addTo(map);
    });

    // 6. Map-Click Logik für Luftlinie & Sidebar
    let targetMarker: maplibregl.Marker | null = null;
    let currentResults: any[] = [];
    let currentIncidentCoord: [number, number] | null = null;

    map.on('click', (e) => {
      // Ignorieren, wenn der Klick auf einen Marker erfolgte
      if ((e.originalEvent.target as HTMLElement).closest('.maplibregl-marker')) {
        return;
      }

      const { lng, lat } = e.lngLat;
      currentIncidentCoord = [lng, lat];

      // Reset previous results state (we always have at most 5 lines)
      for (let i = 0; i < 5; i++) {
        map.setFeatureState({ source: 'nah-lines', id: i }, { selected: false });
      }

      // Ziel-Marker setzen
      if (targetMarker) targetMarker.remove();
      targetMarker = new maplibregl.Marker({ color: '#3b82f6' })
        .setLngLat([lng, lat])
        .addTo(map);

      // Distanz zu allen AKTIVEN Stationen berechnen
      const results = stations
        .filter((s: any) => s.is_active)
        .map((s: any) => {
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
        .sort((a: any, b: any) => a.distance - b.distance)
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
    });

    // Klick auf Sidebar-Result zentriert Karte
    sidebarResults.addEventListener('click', (e) => {
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

    if (stations.length > 0) {
      Toast.success(`${stations.length} NAH-Stützpunkte geladen.`);
    }

  } catch (err) {
    console.error('[NahPage]', err);
    Toast.error('Fehler beim Initialisieren der Luftrettungs-Seite');
  }

  // Alive Ping Logik (Heartbeat)
  const checkConnection = async () => {
    try {
      const res = await fetch('/api/ping');
      updateNahServerStatus(res.ok);
    } catch (e) {
      updateNahServerStatus(false);
    }
  };

  checkConnection();
  setInterval(checkConnection, 30000); // Alle 30 Sekunden
};
