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

    // Handle Popups
    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' });

    const ensureTrackingLayers = () => {
      console.log('[Tracking] Ensuring layers exist...');

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
            'icon-rotate': ['coalesce', ['get', 'track'], 0],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'text-field': ['get', 'flight'],
            'text-size': 11,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'visibility': adsbVisible ? 'visible' : 'none'
          },
          paint: { 
            'text-color': '#fff', 
            'text-halo-color': '#000', 
            'text-halo-width': 1 
          }
        });

        // AIS Layers
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
            'icon-rotate': ['coalesce', ['get', 'cog'], 0],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-size': 0.8,
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'visibility': aisVisible ? 'visible' : 'none'
          },
          paint: { 
            'text-color': '#fff', 
            'text-halo-color': '#000', 
            'text-halo-width': 1 
          }
        });

        // Setup Hover Effects (Only once when sources/layers are added)
        const setupHover = (layerId: string, titleKey: string) => {
          map.on('mouseenter', layerId, () => map.getCanvas().style.cursor = 'pointer');
          map.on('mouseleave', layerId, () => map.getCanvas().style.cursor = '');
          map.on('click', layerId, (e) => {
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties;
            const coords = (feat.geometry as any).coordinates.slice();
            const html = `<div class="map-popup-detail"><strong>${props?.[titleKey] || 'Objekt'}</strong><pre style="font-size: 0.7rem; margin-top: 5px;">${JSON.stringify(props, null, 2)}</pre></div>`;
            popup.setLngLat(coords).setHTML(html).addTo(map);
          });
        };
        setupHover('adsb-points', 'flight');
        setupHover('ais-points', 'name');
      }
    };

    const loadAllSprites = async () => {
      console.log('[Tracking] Loading sprites...');
      await Promise.all([
        MapCore.loadSprites(map, 'https://tiles.oe5ith.at/assets/sprites/adsb/sprite'),
        MapCore.loadSprites(map, 'https://tiles.oe5ith.at/assets/sprites/ais/sprite')
      ]);
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
      map.once('idle', async () => {
        await MapCore.reapplyBaseLayers();
        await loadAllSprites();
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

    const onMapLoaded = async () => {
      console.log('[Tracking] Map fully loaded.');
      await loadAllSprites();
      ensureTrackingLayers();

      const refresh = async () => {
        if (!map.getContainer().isConnected) {
          console.log('[Tracking] Container disconnected, stopping loop.');
          clearInterval(interval);
          return;
        }

        // 1. Fetch ADS-B
        try {
          const adsbData = await adsb.fetch();
          console.log('[Tracking] ADS-B Data received:', adsbData);
          
          if (adsbData.features.length > 0) {
            console.log('[Tracking] First ADS-B feature geom:', adsbData.features[0].geometry.coordinates);
          }

          if (map.getSource('adsb')) {
            (map.getSource('adsb') as maplibregl.GeoJSONSource).setData(adsbData);
            console.log('[Tracking] ADS-B Source updated.');
          } else {
            console.error('[Tracking] ADS-B Source NOT FOUND on map!');
          }
          
          const adsbTracks = adsb.getTracksAsGeoJson();
          console.log('[Tracking] ADS-B Tracks:', adsbTracks);
          if (map.getSource('adsb-tracks')) (map.getSource('adsb-tracks') as maplibregl.GeoJSONSource).setData(adsbTracks);

          const adsbItems: TrackingItem[] = adsbData.features.map(f => ({
            id: f.properties?.hex || '',
            label: f.properties?.flight || 'Unknown',
            info: `Alt: ${f.properties?.alt_baro}ft | GS: ${f.properties?.gs}kt`,
            type: 'adsb',
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0]
          }));
          updateTrackingList('adsb-list', adsbItems);
        } catch (e) {
          console.error('[Tracking] ADS-B Refresh failed', e);
          updateTrackingList('adsb-list', []);
        }

        // 2. Fetch AIS
        try {
          const aisData = await ais.fetch();
          console.log('[Tracking] AIS Data received:', aisData);

          if (map.getSource('ais')) {
            (map.getSource('ais') as maplibregl.GeoJSONSource).setData(aisData);
            console.log('[Tracking] AIS Source updated.');
          }
          
          if (map.getSource('ais-tracks')) (map.getSource('ais-tracks') as maplibregl.GeoJSONSource).setData(ais.getTracksAsGeoJson());

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
          console.error('[Tracking] AIS Refresh failed', e);
          updateTrackingList('ais-list', []);
        }
      };

      const interval = setInterval(refresh, 5000);
      refresh();
    };

    if (map.loaded()) onMapLoaded();
    else map.on('load', onMapLoaded);
  }
};
