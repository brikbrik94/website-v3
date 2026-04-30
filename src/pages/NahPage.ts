import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import maplibregl from 'maplibre-gl';
import { showToast } from '../lib/Toast';

export interface MapItem {
  id: string;
  name: string;
  style: {
    version: number;
    url: string;
  };
}

const BASEMAPS: MapItem[] = [
  { id: 'alidade-satellite', name: 'Stadia Satellite', style: { version: 8, url: 'https://tiles.stadiamaps.com/styles/alidade_satellite.json' } },
  { id: 'osm-bright', name: 'OSM Bright', style: { version: 8, url: 'https://tiles.stadiamaps.com/styles/osm_bright.json' } }
];

export const initNahPage = async (container: HTMLElement) => {
  container.innerHTML = `
    <div class="topbar-container"></div>
    <div class="layout" style="height: calc(100dvh - 60px);">
      <div id="map" style="flex: 1;"></div>
    </div>
  `;

  const topbarContainer = container.querySelector('.topbar-container') as HTMLElement;
  const mapContainer = document.getElementById('map') as HTMLElement;

  const mapCore = new MapCore(mapContainer, BASEMAPS[0].style);
  await mapCore.init();
  
  // Set initial view roughly to Austria
  mapCore.getMap().jumpTo({ center: [14.0, 47.5], zoom: 6 });

  initTopbar(topbarContainer, BASEMAPS, (url) => {
    mapCore.setStyle(url);
  });

  try {
    const res = await fetch('/api/nah.php');
    if (!res.ok) throw new Error('API Error');
    const stations = await res.json();
    
    stations.forEach((station: any) => {
      const color = station.is_active ? '#10b981' : '#6b7280'; // Green if active, gray if inactive
      const el = document.createElement('div');
      el.innerHTML = `<i class="fa-solid fa-helicopter" style="color: ${color}; font-size: 24px; text-shadow: 0 0 3px rgba(0,0,0,0.5);"></i>`;
      
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="color: var(--text-base); padding: 5px;">
          <h4 style="margin: 0 0 5px 0;">${station.callsign}</h4>
          <p style="margin: 0; font-size: 0.9em; color: var(--muted);">${station.name}</p>
          <p style="margin: 5px 0 0 0; font-size: 0.85em;">
            Status: <strong style="color: ${color}">${station.is_active ? 'Aktiv' : 'Inaktiv'}</strong><br>
            Typ: ${station.op_type}
          </p>
        </div>
      `);

      new maplibregl.Marker({ element: el })
        .setLngLat([station.lon, station.lat])
        .setPopup(popup)
        .addTo(mapCore.getMap());
    });

    if (stations.length > 0) {
      showToast(`${stations.length} NAH-Stützpunkte geladen.`, 'success');
    } else {
      showToast('Keine NAH-Stützpunkte gefunden.', 'warning');
    }
  } catch (err) {
    console.error(err);
    showToast('Fehler beim Laden der NAH-Daten', 'error');
  }
};
