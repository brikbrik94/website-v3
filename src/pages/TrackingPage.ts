import maplibregl from 'maplibre-gl';
import { MapCore } from '../lib/MapCore';
import { MAP_COLORS } from '../lib/MapStyles';
import { initTopbar } from '../components/Topbar';
import { initTrackingSidebar, updateTrackingList, TrackingItem } from '../components/TrackingSidebar';
import { AisInterpreter } from '../api/AisInterpreter';
import { AdsbInterpreter } from '../api/AdsbInterpreter';
import { PopupManager } from '../lib/PopupManager';

export const initTrackingPage = async (container: HTMLElement) => {
  // Layout initialisieren
  container.innerHTML = `
    <div id="topbar-container"></div>
    <div class="layout">
      <div id="sidebar-container"></div>
      <main id="map" class="full-map"></main>
    </div>
  `;

  // 1. Inventar laden (CI-konform)
  let basemaps = [];
  try {
    const invRes = await fetch('https://tiles.oe5ith.at/inventory.json');
    if (!invRes.ok) throw new Error('Inventory load failed');
    const inventory = await invRes.json();
    basemaps = inventory.maps.filter((m: any) => m.type === 'basemap');
  } catch (err) {
    console.error('[Tracking] Inventory load failed', err);
  }

  const map = MapCore.init(document.getElementById('map')!, basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');

  // Interpreten mit Lokalen Proxies (CI-konform)
  const ais = new AisInterpreter('/api/ais.php');
  const adsb = new AdsbInterpreter('/api/adsb.php');

  // State
  let aisVisible = true;
  let adsbVisible = true;
  let selectedId: string | number | null = null;
  let refreshTimeout: any = null;
  let isRefreshing = false;

  // Handle Popups
  const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' });

  const loadAllSprites = async () => {
    console.log('[Tracking] Loading sprites...');
    await Promise.all([
      MapCore.loadSprites(map, 'https://tiles.oe5ith.at/assets/sprites/adsb/sprite'),
      MapCore.loadSprites(map, 'https://tiles.oe5ith.at/assets/sprites/ais/sprite')
    ]);
  };

  const ensureTrackingLayers = () => {
    if (!map.isStyleLoaded()) return;
    console.log('[Tracking] Ensuring layers exist...');

    // --- ADS-B LAYERS ---
    if (!map.getSource('adsb')) {
      map.addSource('adsb', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('adsb-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      map.addLayer({
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
          'line-width': ['case', ['==', ['get', 'hex'], selectedId || ''], 4, 1.5],
          'line-opacity': 0.7 
        },
        layout: { 
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': adsbVisible ? 'visible' : 'none' 
        }
      });

      map.addLayer({
        id: 'adsb-icons',
        type: 'symbol',
        source: 'adsb',
        layout: {
          'icon-image': [
            'match', ["get", "category"],
            "A1", "plane-a1", "C1", "plane-a1",
            "A2", "plane-a2", "C2", "plane-a2",
            "A3", "plane-a3", "B3", "plane-a3", "C3", "plane-a3",
            "A4", "plane-a4", "B4", "plane-a4",
            "A5", "plane-a5",
            "A6", "plane-a6",
            "A7", "plane-a7", "B6", "plane-a7",
            "plane-unknown"
          ],
          'icon-size': 0.6,
          'icon-rotate': ['coalesce', ['get', 'track'], ['get', 'true_heading'], 0],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'text-field': ['coalesce', ['get', 'flight'], ['get', 'hex']],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-optional': true,
          'visibility': adsbVisible ? 'visible' : 'none'
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
          'text-color': MAP_COLORS.black, 
          'text-halo-color': MAP_COLORS.white, 
          'text-halo-width': 2 
        }
      });
    }

    // --- AIS LAYERS ---
    if (!map.getSource('ais')) {
      map.addSource('ais', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('ais-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      map.addLayer({
        id: 'ais-track-lines',
        type: 'line',
        source: 'ais-tracks',
        minzoom: 10,
        layout: { 
          'line-join': 'round', 
          'line-cap': 'round',
          'visibility': aisVisible ? 'visible' : 'none'
        },
        paint: { 
          'line-color': MAP_COLORS.accent, 
          'line-width': ['case', ['==', ['get', 'mmsi'], selectedId || 0], 4, 2],
          'line-opacity': 0.8 
        }
      });

      const shipColorMatch: any = ['match', ['get', 'shipclass'], 4, MAP_COLORS.warning, 6, MAP_COLORS.danger, MAP_COLORS.accent];

      map.addLayer({
        id: 'ais-dots-moving',
        type: 'circle',
        source: 'ais',
        maxzoom: 12,
        filter: [
          'all',
          ['>', ['coalesce', ['get', 'speed'], 0], 0.2],
          ['!=', ['get', 'cog'], null]
        ] as any,
        layout: { 'visibility': aisVisible ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 12, 4],
          'circle-color': shipColorMatch,
          'circle-stroke-color': MAP_COLORS.black,
          'circle-stroke-width': 0.5
        }
      });

      map.addLayer({
        id: 'ais-dots-static',
        type: 'circle',
        source: 'ais',
        filter: [
          'any',
          ['<=', ['coalesce', ['get', 'speed'], 0], 0.2],
          ['==', ['get', 'cog'], null]
        ] as any,
        layout: { 'visibility': aisVisible ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 14, 5],
          'circle-color': shipColorMatch,
          'circle-stroke-color': MAP_COLORS.black,
          'circle-stroke-width': 0.5
        }
      });

      map.addLayer({
        id: 'ais-icons',
        type: 'symbol',
        source: 'ais',
        minzoom: 11,
        filter: [
          'all',
          ['>', ['coalesce', ['get', 'speed'], 0], 0.2],
          ['!=', ['get', 'cog'], null]
        ] as any,
        layout: {
          'icon-image': [
            'match', ['get', 'shipclass'],
            1, 'ship-small',
            2, 'ship-cargo',
            4, 'ship-passenger',
            5, 'ship-cargo',
            6, 'ship-tanker',
            11, 'ship-buoy',
            'ship-unknown'
          ],
          'icon-rotate': ['coalesce', ['get', 'heading'], ['get', 'cog'], 0],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 14, 0.7],
          'text-field': ['coalesce', ['get', 'shipname'], ['get', 'callsign'], ""],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-optional': true,
          'visibility': aisVisible ? 'visible' : 'none'
        },
        paint: { 
          'icon-color': shipColorMatch,
          'icon-halo-color': MAP_COLORS.black,
          'icon-halo-width': 1,
          'text-color': MAP_COLORS.black, 
          'text-halo-color': MAP_COLORS.white, 
          'text-halo-width': 2 
        }
      });

      // Setup Popups
      const setupPopup = (layerId: string) => {
        map.on('click', layerId, (e) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const html = PopupManager.buildHtml(layerId, feat.properties || {});
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });
        map.on('mouseenter', layerId, () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', layerId, () => map.getCanvas().style.cursor = '');
      };
      setupPopup('adsb-icons');
      setupPopup('ais-icons');
      setupPopup('ais-dots-moving');
      setupPopup('ais-dots-static');
    }
  };

  const refresh = async () => {
    if (!map.getContainer().isConnected) {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      return;
    }

    if (isRefreshing) return;
    isRefreshing = true;

    // 1. Fetch ADS-B
    try {
      const adsbData = await adsb.fetch();
      if (map.getSource('adsb')) {
        (map.getSource('adsb') as maplibregl.GeoJSONSource).setData(adsbData);
      }
      const adsbTracks = adsb.getTracksAsGeoJson();
      if (map.getSource('adsb-tracks')) {
        (map.getSource('adsb-tracks') as maplibregl.GeoJSONSource).setData(adsbTracks);
      }

      const adsbItems: TrackingItem[] = (adsbData.features || []).map(f => ({
        id: f.properties?.hex || '',
        label: f.properties?.flight?.trim() || f.properties?.hex || 'Unknown',
        info: `${Math.round(f.properties?.alt_baro || 0)}ft | ${Math.round(f.properties?.gs || 0)}kt`,
        type: 'adsb',
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      }));
      updateTrackingList('adsb-list', adsbItems);
    } catch (e) {
      console.warn('[Tracking] ADS-B Update failed', e);
    }

    // 2. Fetch AIS
    try {
      const aisData = await ais.fetch();
      if (map.getSource('ais')) {
        (map.getSource('ais') as maplibregl.GeoJSONSource).setData(aisData);
      }
      const aisTracks = ais.getTracksAsGeoJson();
      if (map.getSource('ais-tracks')) {
        (map.getSource('ais-tracks') as maplibregl.GeoJSONSource).setData(aisTracks);
      }

      const aisItems: TrackingItem[] = (aisData.features || []).map(f => ({
        id: f.properties?.mmsi || '',
        label: f.properties?.name || `MMSI: ${f.properties?.mmsi}`,
        info: `${f.properties?.sog || 0}kt | Class: ${f.properties?.shipclass || '-'}`,
        type: 'ais',
        lat: (f.geometry as any).coordinates[1],
        lon: (f.geometry as any).coordinates[0]
      }));
      updateTrackingList('ais-list', aisItems);
    } catch (e) {
      console.warn('[Tracking] AIS Update failed', e);
    }

    isRefreshing = false;
    refreshTimeout = setTimeout(refresh, 5000);
  };

  // Topbar
  initTopbar(document.getElementById('topbar-container')!, basemaps, (url) => {
    map.setStyle(url);
    map.once('style.load', async () => {
      await MapCore.reapplyBaseLayers();
      await loadAllSprites();
      ensureTrackingLayers();
      refresh(); // Re-trigger data apply
    });
  }, undefined, [
    {
      id: 'toggle-adsb',
      icon: 'fa-solid fa-plane',
      title: 'Flugverkehr',
      onClick: (active) => {
        adsbVisible = active;
        const state = active ? 'visible' : 'none';
        if (map.getLayer('adsb-icons')) map.setLayoutProperty('adsb-icons', 'visibility', state);
        if (map.getLayer('adsb-tracks')) map.setLayoutProperty('adsb-tracks', 'visibility', state);
      }
    },
    {
      id: 'toggle-ais',
      icon: 'fa-solid fa-ship',
      title: 'Schifffahrt',
      onClick: (active) => {
        aisVisible = active;
        const state = active ? 'visible' : 'none';
        ['ais-icons', 'ais-dots-moving', 'ais-dots-static', 'ais-track-lines'].forEach(l => {
          if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', state);
        });
      }
    }
  ]);

  // Sidebar
  initTrackingSidebar(document.getElementById('sidebar-container')!, (item) => {
    selectedId = item.id;
    map.flyTo({ center: [item.lon, item.lat], zoom: 14 });

    // Update highlight
    if (map.getLayer('adsb-tracks')) {
      map.setPaintProperty('adsb-tracks', 'line-width', ['case', ['==', ['get', 'hex'], selectedId || ''], 4, 1.5]);
    }
    if (map.getLayer('ais-track-lines')) {
      map.setPaintProperty('ais-track-lines', 'line-width', ['case', ['==', ['get', 'mmsi'], selectedId || 0], 4, 2]);
    }
  });

  // Map Loaded Handler
  const onMapReady = async () => {
    console.log('[Tracking] Map Ready.');
    await loadAllSprites();
    ensureTrackingLayers();

    // Initial data load
    refresh();
  };

  if (map.loaded()) onMapReady();
  else map.on('load', onMapReady);

  // Initial UI state
  setTimeout(() => {
    document.getElementById('btn-toggle-adsb')?.classList.add('active');
    document.getElementById('btn-toggle-ais')?.classList.add('active');
  }, 100);
};

// Legacy Export for main.ts compatibility
export const TrackingPage = {
  render: initTrackingPage
};

