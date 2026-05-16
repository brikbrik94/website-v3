import maplibregl from 'maplibre-gl';
import { MapCore } from '../lib/MapCore';
import { MAP_COLORS } from '../lib/MapStyles';
import { initTopbar } from '../components/Topbar';
import { initTrackingSidebar, updateTrackingList, updateTrackingServerStatus, setActiveTrackingItem } from '../components/TrackingSidebar';
import { TrackingItem } from '../types/tracking';
import { AisInterpreter } from '../api/AisInterpreter';
import { AdsbInterpreter } from '../api/AdsbInterpreter';
import { PopupManager } from '../lib/PopupManager';
import { MapRegistry } from '../lib/MapRegistry';

import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';

export const initTrackingPage = async (container: HTMLElement) => {
  // Clear registry to avoid stale data from other pages
  MapRegistry.clear();

  // 1. Daten laden
  const invService = InventoryService.getInstance();
  const basemaps = await invService.getBasemaps();

  // 2. Basis-Layout
  const mounts = LayoutHelper.renderBaseLayout(container);

  // State
  let aisVisible = true;
  let adsbVisible = true;
  let selectedId: string | number | null = null;
  let refreshTimeout: any = null;
  let isRefreshing = false;
  let currentFilter = 'all';
  let currentAdsbItems: TrackingItem[] = [];
  let currentAisItems: TrackingItem[] = [];

  // Interpreten mit Lokalen Proxies (CI-konform)
  const ais = new AisInterpreter('/api/ais.php');
  const adsb = new AdsbInterpreter('/api/adsb.php');

  // Handle Popups
  const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' });

  // --- Interaction Handlers (Static to prevent leaks) ---
  const onMapClick = (e: any, m: maplibregl.Map) => {
    const features = m.queryRenderedFeatures(e.point, { layers: ['adsb-icons', 'ais-icons', 'ais-dots-moving', 'ais-dots-static'] });
    
    if (features.length === 0) {
      setActiveTrackingItem('');
      selectedId = null;
      popup.remove();
      if (m.getLayer('adsb-tracks')) m.setPaintProperty('adsb-tracks', 'line-width', 1.5);
      if (m.getLayer('ais-track-lines')) m.setPaintProperty('ais-track-lines', 'line-width', 2);
      return;
    }

    const feat = features[0];
    const props = feat.properties || {};
    const layerId = feat.layer.id;
    const isAdsb = layerId.includes('adsb');
    
    selectedId = isAdsb ? props.hex : props.mmsi;
    setActiveTrackingItem(selectedId!);

    // Highlight logic
    if (m.getLayer('adsb-tracks')) {
      m.setPaintProperty('adsb-tracks', 'line-width', ['case', ['==', ['get', 'hex'], (selectedId || '').toString()], 4, 1.5]);
    }
    if (m.getLayer('ais-track-lines')) {
      m.setPaintProperty('ais-track-lines', 'line-width', ['case', ['==', ['get', 'mmsi'], typeof selectedId === 'number' ? selectedId : Number(selectedId) || -1], 4, 2]);
    }

    const html = PopupManager.buildHtml(layerId, props);
    popup.setLngLat(e.lngLat).setHTML(html).addTo(m);
    e.preventDefault();
  };

  // --- Helper Functions ---

  const loadAllSprites = async (m: maplibregl.Map) => {
    console.log('[Tracking] Loading sprites...');
    const adsbSprite = 'https://tiles.oe5ith.at/assets/sprites/adsb/sprite';
    const aisSprite = 'https://tiles.oe5ith.at/assets/sprites/ais/sprite';

    // Register for persistence
    MapRegistry.registerImage('adsb-sprite', adsbSprite);
    MapRegistry.registerImage('ais-sprite', aisSprite);

    try {
      await Promise.all([
        MapCore.loadSprites(m, adsbSprite),
        MapCore.loadSprites(m, aisSprite)
      ]);
    } catch (err) {
      console.error('[Tracking] Sprite loading failed', err);
    }
  };

  const ensureTrackingLayers = (m: maplibregl.Map) => {
    console.log('[Tracking] Ensuring layers exist...');

    // --- ADS-B LAYERS ---
    MapCore.ensureGeoJsonLayer(m, 'adsb', {
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
        'line-width': ['case', ['==', ['get', 'hex'], (selectedId || '').toString()], 4, 1.5],
        'line-opacity': 0.7 
      },
      layout: { 
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': adsbVisible ? 'visible' : 'none' 
      }
    });

    if (!m.getLayer('adsb-icons')) {
      const adsbIconsDef: any = {
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
          'text-color': MAP_COLORS.white, 
          'text-halo-color': MAP_COLORS.black, 
          'text-halo-width': 2 
        }
      };
      MapRegistry.registerLayer(adsbIconsDef.id, adsbIconsDef);
      m.addLayer(adsbIconsDef);
    }

    // --- AIS LAYERS ---
    MapCore.ensureGeoJsonLayer(m, 'ais', {
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
        'line-width': ['case', ['==', ['get', 'mmsi'], typeof selectedId === 'number' ? selectedId : Number(selectedId) || -1], 4, 2],
        'line-opacity': 0.8 
      }
    });

    if (!MapRegistry.getSource('adsb-tracks')) {
      MapRegistry.registerSource('adsb-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: 0 });
    }
    if (!m.getSource('adsb-tracks')) {
      m.addSource('adsb-tracks', MapRegistry.getSource('adsb-tracks')!.definition);
    }

    if (!MapRegistry.getSource('ais-tracks')) {
      MapRegistry.registerSource('ais-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, tolerance: 0 });
    }
    if (!m.getSource('ais-tracks')) {
      m.addSource('ais-tracks', MapRegistry.getSource('ais-tracks')!.definition);
    }

    if (!m.getLayer('ais-icons')) {
      const shipColorMatch: any = ['match', ['get', 'shipclass'], 4, MAP_COLORS.warning, 6, MAP_COLORS.danger, MAP_COLORS.accent];

      const aisMovingDef: any = {
        id: 'ais-dots-moving',
        type: 'circle',
        source: 'ais',
        maxzoom: 11,
        filter: [
          'all',
          ['>', ['coalesce', ['get', 'speed'], 0], 0.2]
        ],
        layout: { 'visibility': aisVisible ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 11, 4],
          'circle-color': shipColorMatch,
          'circle-stroke-color': MAP_COLORS.black,
          'circle-stroke-width': 0.5
        }
      };
      MapRegistry.registerLayer(aisMovingDef.id, aisMovingDef);
      m.addLayer(aisMovingDef);

      const aisStaticDef: any = {
        id: 'ais-dots-static',
        type: 'circle',
        source: 'ais',
        filter: [
          'all',
          ['<=', ['coalesce', ['get', 'speed'], 0], 0.2]
        ],
        layout: { 'visibility': aisVisible ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 14, 5],
          'circle-color': shipColorMatch,
          'circle-stroke-color': MAP_COLORS.black,
          'circle-stroke-width': 0.5
        }
      };
      MapRegistry.registerLayer(aisStaticDef.id, aisStaticDef);
      m.addLayer(aisStaticDef);

      const aisIconsDef: any = {
        id: 'ais-icons',
        type: 'symbol',
        source: 'ais',
        minzoom: 11,
        filter: [
          'all',
          ['>', ['coalesce', ['get', 'speed'], 0], 0.2]
        ],
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
          'text-font': ['Open-Sans-Regular'],
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
          'text-color': MAP_COLORS.white, 
          'text-halo-color': MAP_COLORS.black, 
          'text-halo-width': 2 
        }
      };
      MapRegistry.registerLayer(aisIconsDef.id, aisIconsDef);
      m.addLayer(aisIconsDef);

      // Layer interactions are now handled by onMapClick
      m.on('mouseenter', 'adsb-icons', () => m.getCanvas().style.cursor = 'pointer');
      m.on('mouseleave', 'adsb-icons', () => m.getCanvas().style.cursor = '');
      m.on('mouseenter', 'ais-icons', () => m.getCanvas().style.cursor = 'pointer');
      m.on('mouseleave', 'ais-icons', () => m.getCanvas().style.cursor = '');
    }
  };

  const applyCurrentDataToMap = (m: maplibregl.Map) => {
    console.log('[Tracking] Applying current data to map sources...');
    const adsbResult = adsb.getLastResult();
    const aisResult = ais.getLastResult();

    if (m.getSource('adsb') && adsbResult) {
      (m.getSource('adsb') as maplibregl.GeoJSONSource).setData(adsbResult);
    }
    if (m.getSource('adsb-tracks')) {
      (m.getSource('adsb-tracks') as maplibregl.GeoJSONSource).setData(adsb.getTracksAsGeoJson());
    }
    if (m.getSource('ais') && aisResult) {
      (m.getSource('ais') as maplibregl.GeoJSONSource).setData(aisResult);
    }
    if (m.getSource('ais-tracks')) {
      (m.getSource('ais-tracks') as maplibregl.GeoJSONSource).setData(ais.getTracksAsGeoJson());
    }
  };

  const refresh = async (m: maplibregl.Map) => {
    // Check if the current map is still active
    if (!m.getContainer().isConnected) {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      return;
    }

    // Self-healing: if layers are missing (e.g. after style change that didn't trigger onRestore correctly)
    if (!m.getSource('adsb') || !m.getLayer('adsb-icons')) {
      console.warn('[Tracking] Tracking layers missing during refresh, re-ensuring...');
      ensureTrackingLayers(m);
      applyCurrentDataToMap(m);
    }

    if (isRefreshing) return;
    isRefreshing = true;
    console.log('[Tracking] Fetching fresh data...');

    try {
      // 1. Fetch ADS-B
      const adsbData = await adsb.fetch();
      const adsbTracks = adsb.getTracksAsGeoJson();
      
      if (m.getSource('adsb')) {
        (m.getSource('adsb') as maplibregl.GeoJSONSource).setData(adsbData);
        // Update Registry for persistence
        const reg = MapRegistry.getSource('adsb');
        if (reg) reg.definition.data = adsbData;
      }
      if (m.getSource('adsb-tracks')) {
        (m.getSource('adsb-tracks') as maplibregl.GeoJSONSource).setData(adsbTracks);
        // Update Registry for persistence
        const reg = MapRegistry.getSource('adsb-tracks');
        if (reg) reg.definition.data = adsbTracks;
      }

      currentAdsbItems = (adsbData.features || []).map(f => ({
        id: f.properties?.hex || '',
        label: f.properties?.flight?.trim() || f.properties?.hex || 'Unknown',
        info: `${Math.round((f.properties?.alt_baro as number) || 0)}ft | ${Math.round(f.properties?.gs || 0)}kt`,
        type: 'adsb',
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        details: {
          'Höhe': `${Math.round((f.properties?.alt_baro as number) || 0)} ft`,
          'Speed': `${Math.round(f.properties?.gs || 0)} kt`,
          'Kurs': `${Math.round(f.properties?.track || 0)}°`,
          'RSSI': `${f.properties?.rssi || '?' } dBm`
        }
      }));

      // 2. Fetch AIS
      const aisData = await ais.fetch();
      const aisTracks = ais.getTracksAsGeoJson();

      if (m.getSource('ais')) {
        (m.getSource('ais') as maplibregl.GeoJSONSource).setData(aisData);
        // Update Registry for persistence
        const reg = MapRegistry.getSource('ais');
        if (reg) reg.definition.data = aisData;
      }
      if (m.getSource('ais-tracks')) {
        (m.getSource('ais-tracks') as maplibregl.GeoJSONSource).setData(aisTracks);
        // Update Registry for persistence
        const reg = MapRegistry.getSource('ais-tracks');
        if (reg) reg.definition.data = aisTracks;
      }

      currentAisItems = (aisData.features || []).map(f => ({
        id: f.properties?.mmsi || '',
        label: f.properties?.shipname || f.properties?.callsign || `MMSI: ${f.properties?.mmsi}`,
        info: `${f.properties?.speed || 0}kt | Class: ${f.properties?.shipclass || '-'}`,
        type: 'ais',
        lat: (f.geometry as any).coordinates[1],
        lon: (f.geometry as any).coordinates[0],
        details: {
          'MMSI': f.properties?.mmsi,
          'SOG': `${f.properties?.speed || 0} kt`,
          'COG': `${f.properties?.cog || 0}°`,
          'RSSI': `${f.properties?.rssi || '?' } dBm`
        }
      }));

      // UI Update
      updateTrackingList([...currentAdsbItems, ...currentAisItems], currentFilter);
      if (selectedId) setActiveTrackingItem(selectedId);

      const packetRate = (currentAdsbItems.length * 12) + (currentAisItems.length * 4) + Math.floor(Math.random() * 10);
      updateTrackingServerStatus(true, true, currentAdsbItems.length, currentAisItems.length, packetRate);

    } catch (e) {
      console.warn('[Tracking] Refresh failed', e);
      updateTrackingServerStatus(false, false, currentAdsbItems.length, currentAisItems.length, 0);
    } finally {
      isRefreshing = false;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => refresh(m), 10000);
    }
  };

  // --- Main Execution ---

  // 3. Karte initialisieren
  const map = MapCore.init(
    mounts.map, 
    basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
    async (m) => {
      console.log('[Tracking] onRestore triggering...');
      
      // 1. Ensure layers are there (Synchronous)
      ensureTrackingLayers(m);
      
      // 2. Put existing data back on map immediately
      applyCurrentDataToMap(m); 
      
      // 3. Load sprites in background (don't await)
      loadAllSprites(m);
      
      // Initialer Refresh falls noch nicht geschehen
      if (!refreshTimeout) {
        console.log('[Tracking] Initial refresh triggered via onRestore');
        refresh(m);
      }
    }
  );

  // Global map click listener
  map.on('click', (e) => onMapClick(e, map));

  // Topbar
  initTopbar(mounts.topbar, basemaps, (url) => {
    map.setStyle(url);
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
  initTrackingSidebar(mounts.sidebar, (item) => {
    selectedId = item.id;
    map.flyTo({ center: [item.lon, item.lat], zoom: 14 });

    // Update highlight
    if (map.getLayer('adsb-tracks')) {
      map.setPaintProperty('adsb-tracks', 'line-width', ['case', ['==', ['get', 'hex'], (selectedId || '').toString()], 4, 1.5]);
    }
    if (map.getLayer('ais-track-lines')) {
      map.setPaintProperty('ais-track-lines', 'line-width', ['case', ['==', ['get', 'mmsi'], typeof selectedId === 'number' ? selectedId : Number(selectedId) || -1], 4, 2]);
    }
  });

  mounts.sidebar.addEventListener('tracking-filter-change', (e: any) => {
    currentFilter = e.detail;
    updateTrackingList([...currentAdsbItems, ...currentAisItems], currentFilter);
    if (selectedId) setActiveTrackingItem(selectedId);
  });

  // Initial UI state (Buttons active)
  setTimeout(() => {
    document.getElementById('btn-toggle-adsb')?.classList.add('active');
    document.getElementById('btn-toggle-ais')?.classList.add('active');
  }, 100);
};

// Legacy Export for main.ts compatibility
export const TrackingPage = {
  render: initTrackingPage
};
