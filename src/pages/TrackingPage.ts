import maplibregl from 'maplibre-gl';
import { MapCore } from '../lib/MapCore';
import { MapItem } from './MapPage';
import { initTopbar } from '../components/Topbar';
import { initTrackingSidebar, updateTrackingList, TrackingItem } from '../components/TrackingSidebar';
import { AisInterpreter } from '../api/AisInterpreter';
import { AdsbInterpreter } from '../api/AdsbInterpreter';
import { MAP_COLORS } from '../lib/MapStyles';

export const TrackingPage = {
  async render(container: HTMLElement) {
    container.innerHTML = `
      <div id="topbar-container"></div>
      <div class="layout">
        <div id="sidebar-container"></div>
        <main id="map" class="full-map"></main>
      </div>
    `;

    // 1. Inventar laden (CI-konform)
    const invRes = await fetch('https://tiles.oe5ith.at/inventory.json');
    if (!invRes.ok) throw new Error('Inventory load failed');
    const inventory = await invRes.json();
    const basemaps: MapItem[] = inventory.maps.filter((m: any) => m.type === 'basemap');

    const map = MapCore.init(document.getElementById('map')!, basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');
    const ais = new AisInterpreter('/api/ais.php');
    const adsb = new AdsbInterpreter('/api/adsb.php');

    // Layer state
    let aisVisible = true;
    let adsbVisible = true;
    let selectedId: string | number | null = null;

    const ensureTrackingLayers = () => {
      // ADS-B Layers
      if (!map.getSource('adsb')) {
        map.addSource('adsb', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('adsb-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        
        map.addLayer({
          id: 'adsb-tracks',
          type: 'line',
          source: 'adsb-tracks',
          paint: { 
            'line-color': MAP_COLORS.accent, 
            'line-width': ['case', ['==', ['get', 'hex'], selectedId || ''], 4, 1.5],
            'line-opacity': 0.6 
          }
        });
        map.addLayer({
          id: 'adsb-points',
          type: 'symbol',
          source: 'adsb',
          layout: {
            'icon-image': 'plane-a1',
            'icon-rotate': ['get', 'track'],
            'icon-allow-overlap': true,
            'text-field': ['get', 'flight'],
            'text-size': 11,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'visibility': adsbVisible ? 'visible' : 'none'
          },
          paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1 }
        });
      }

      // AIS Layers
      if (!map.getSource('ais')) {
        map.addSource('ais', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('ais-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

        map.addLayer({
          id: 'ais-tracks',
          type: 'line',
          source: 'ais-tracks',
          paint: { 
            'line-color': MAP_COLORS.success, 
            'line-width': ['case', ['==', ['get', 'mmsi'], selectedId || 0], 4, 1.5],
            'line-opacity': 0.6 
          }
        });
        map.addLayer({
          id: 'ais-points',
          type: 'symbol',
          source: 'ais',
          layout: {
            'icon-image': 'ship-unknown',
            'icon-rotate': ['get', 'cog'],
            'icon-allow-overlap': true,
            'icon-size': 0.8,
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'visibility': aisVisible ? 'visible' : 'none'
          },
          paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1 }
        });
      }
    };

    // Sidebar
    initTrackingSidebar(document.getElementById('sidebar-container')!, (item) => {
      selectedId = item.id;
      map.flyTo({ center: [item.lon, item.lat], zoom: 14 });
      
      // Update highlight immediately
      if (map.getLayer('adsb-tracks')) {
        map.setPaintProperty('adsb-tracks', 'line-width', ['case', ['==', ['get', 'hex'], selectedId || ''], 4, 1.5]);
      }
      if (map.getLayer('ais-tracks')) {
        map.setPaintProperty('ais-tracks', 'line-width', ['case', ['==', ['get', 'mmsi'], selectedId || 0], 4, 1.5]);
      }
    });

    // Topbar
    initTopbar(document.getElementById('topbar-container')!, basemaps, (url) => {
      map.setStyle(url);
      map.once('idle', () => {
        MapCore.reapplyBaseLayers();
        ensureTrackingLayers();
      });
    }, undefined, [
      {
        id: 'toggle-adsb',
        icon: 'fa-solid fa-plane',
        title: 'ADS-B Umschalten',
        onClick: (active) => {
          adsbVisible = active;
          const visibility = active ? 'visible' : 'none';
          if (map.getLayer('adsb-points')) map.setLayoutProperty('adsb-points', 'visibility', visibility);
          if (map.getLayer('adsb-tracks')) map.setLayoutProperty('adsb-tracks', 'visibility', visibility);
        }
      },
      {
        id: 'toggle-ais',
        icon: 'fa-solid fa-ship',
        title: 'AIS Umschalten',
        onClick: (active) => {
          aisVisible = active;
          const visibility = active ? 'visible' : 'none';
          if (map.getLayer('ais-points')) map.setLayoutProperty('ais-points', 'visibility', visibility);
          if (map.getLayer('ais-tracks')) map.setLayoutProperty('ais-tracks', 'visibility', visibility);
        }
      }
    ]);

    // Set buttons active by default
    document.querySelectorAll('#btn-toggle-adsb, #btn-toggle-adsb-mobile, #btn-toggle-ais, #btn-toggle-ais-mobile')
      .forEach(btn => btn.classList.add('active'));

    map.on('load', async () => {
      await Promise.all([
        MapCore.loadSprites(map, 'https://tiles.oe5ith.at/assets/sprites/adsb/sprite'),
        MapCore.loadSprites(map, 'https://tiles.oe5ith.at/assets/sprites/ais/sprite')
      ]);
      ensureTrackingLayers();

      const refresh = async () => {
        if (!map.getContainer().isConnected) {
          clearInterval(interval);
          return;
        }
        try {
          const adsbData = await adsb.fetch();
          if (map.getSource('adsb')) (map.getSource('adsb') as maplibregl.GeoJSONSource).setData(adsbData);
          if (map.getSource('adsb-tracks')) (map.getSource('adsb-tracks') as maplibregl.GeoJSONSource).setData(adsb.getTracksAsGeoJson());

          const aisData = await ais.fetch();
          if (map.getSource('ais')) (map.getSource('ais') as maplibregl.GeoJSONSource).setData(aisData);
          if (map.getSource('ais-tracks')) (map.getSource('ais-tracks') as maplibregl.GeoJSONSource).setData(ais.getTracksAsGeoJson());

          // Update Sidebar
          const adsbItems: TrackingItem[] = adsbData.features.map(f => ({
            id: f.properties?.hex || '',
            label: f.properties?.flight || 'Unknown',
            info: `Alt: ${f.properties?.alt_baro}ft | GS: ${f.properties?.gs}kt`,
            type: 'adsb',
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0]
          }));
          updateTrackingList('adsb-list', adsbItems);

          const aisItems: TrackingItem[] = aisData.features.map(f => ({
            id: f.properties?.mmsi || '',
            label: f.properties?.name || 'Unknown Ship',
            info: `MMSI: ${f.properties?.mmsi} | SOG: ${f.properties?.sog}kt`,
            type: 'ais',
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0]
          }));
          updateTrackingList('ais-list', aisItems);

        } catch (e) {
          console.error('Tracking Refresh failed', e);
        }
      };

      const interval = setInterval(refresh, 5000);
      refresh();
    });

    // Handle Popups
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    const setupPopup = (layerId: string, titleKey: string) => {
      map.on('mouseenter', layerId, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const coords = (e.features![0].geometry as any).coordinates.slice();
        const props = e.features![0].properties;
        const html = `<strong>${props?.[titleKey] || 'Info'}</strong><br>${JSON.stringify(props)}`;
        popup.setLngLat(coords).setHTML(html).addTo(map);
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });
    };

    setupPopup('adsb-points', 'flight');
    setupPopup('ais-points', 'name');
  }
};
