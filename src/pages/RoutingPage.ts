import maplibregl from 'maplibre-gl';
import { initTopbar } from '../components/Topbar';
import { initRoutingSidebar, updateRoutingSummary, renderStationResults, setRoutingCoord, renderRoutingError } from '../components/RoutingSidebar';
import { RoutingService } from '../lib/RoutingService';
import { MapCore } from '../lib/MapCore';
import { ContextMenu } from '../components/ContextMenu';
import { MAP_ROUTE_STYLES, MAP_COLORS } from '../lib/MapStyles';
import { MapLegend } from '../lib/MapLegend';
import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';
import { MapRegistry } from '../lib/MapRegistry';

export const initRoutingPage = async (container: HTMLElement) => {
  // 1. Daten laden
  const invService = InventoryService.getInstance();
  const basemaps = await invService.getBasemaps();

  // Clear Registry on Page Init
  MapRegistry.clear();

  // 2. Basis-Layout
  const mounts = LayoutHelper.renderBaseLayout(container, { 
    withLegend: true, 
    legendTitle: 'Routing' 
  });

  // 2. State & Constants
  let startMarker: maplibregl.Marker | null = null;
  let targetMarker: maplibregl.Marker | null = null;
  const stationRoutes = new Map<number, any>(); 
  const eyeActiveStates = new Set<number>();
  let currentHighlightedId: number | null = null;

  const SPRITE_BASE = 'https://tiles.oe5ith.at/assets/sprites/oe5ith-markers/sprite';

  const ensureBaseLayers = (m: maplibregl.Map) => {
    // 1. Stations Source & Layer
    const stationsLayerDef = {
      id: 'station-icons',
      type: 'symbol',
      source: 'stations',
      layout: { 
        'icon-image': ['get', 'icon'], 
        'icon-size': 0.7, 
        'icon-allow-overlap': true, 
        'icon-ignore-placement': true 
      }
    };

    MapCore.ensureGeoJsonLayer(m, 'stations', stationsLayerDef as any);

    // 2. Routing Path Layer (unter den Icons)
    const routingLayerDef = {
      id: 'routing-path',
      type: 'line',
      source: 'routing-path',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity']
      }
    };

    MapCore.ensureGeoJsonLayer(m, 'routing-path', routingLayerDef as any);

    if (m.getLayer('station-icons') && m.getLayer('routing-path')) {
      m.moveLayer('routing-path', 'station-icons');
    }
  };

  const refreshMapRoutes = () => {
    // Self-healing check
    if (!map.getSource('routing-path')) {
      ensureBaseLayers(map);
    }

    const features: any[] = [];
    
    stationRoutes.forEach((route, id) => {
      if (!route || !route.geometry) return;

      const isHighlighted = id === currentHighlightedId;
      const isEyeActive = eyeActiveStates.has(id);

      if (isHighlighted) {
        features.push({
          type: 'Feature',
          geometry: route.geometry,
          properties: { 
            color: MAP_ROUTE_STYLES.active.color,
            width: MAP_ROUTE_STYLES.active.weight,
            opacity: MAP_ROUTE_STYLES.active.opacity
          }
        });
      } else if (isEyeActive) {
        features.push({
          type: 'Feature',
          geometry: route.geometry,
          properties: { 
            color: MAP_ROUTE_STYLES.background.color,
            width: MAP_ROUTE_STYLES.background.weight,
            opacity: MAP_ROUTE_STYLES.background.opacity
          }
        });
      }
    });

    const data = { type: 'FeatureCollection', features };
    const source = map.getSource('routing-path') as maplibregl.GeoJSONSource;
    if (source) source.setData(data as any);

    MapRegistry.registerSource('routing-path', {
      type: 'geojson',
      data: data
    });
  };

  const map = MapCore.init(
    mounts.map, 
    basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
    async (m) => {
      await MapCore.loadSprites(m, SPRITE_BASE);
      ensureBaseLayers(m);
      refreshMapRoutes(); // Re-apply current routes on style change
    }
  );

  // 1.1 Initialize Legend
  const legend = new MapLegend(mounts.legend!);
  legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.active.color, label: 'Primärroute' });
  legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.background.color, label: 'Vergleich / Alternativ' });

  const clearResults = () => {
    stationRoutes.clear();
    eyeActiveStates.clear();
    currentHighlightedId = null;

    const emptyData = { type: 'FeatureCollection', features: [] };

    const routeSource = map.getSource('routing-path') as maplibregl.GeoJSONSource;
    if (routeSource) routeSource.setData(emptyData as any);
    MapRegistry.registerSource('routing-path', { type: 'geojson', data: emptyData });

    const stationSource = map.getSource('stations') as maplibregl.GeoJSONSource;
    if (stationSource) stationSource.setData(emptyData as any);
    MapRegistry.registerSource('stations', { type: 'geojson', data: emptyData });

    renderStationResults([], () => {}, () => {});
    const details = document.getElementById('routing-details');
    if (details) details.style.display = 'none';
  };

  const updateMarker = (type: 'start' | 'target', lat: number, lng: number) => {
    if (type === 'start') {
      if (startMarker) startMarker.remove();
      startMarker = new maplibregl.Marker({ color: MAP_COLORS.success }).setLngLat([lng, lat]).addTo(map);
    } else {
      if (targetMarker) targetMarker.remove();
      targetMarker = new maplibregl.Marker({ color: MAP_COLORS.danger }).setLngLat([lng, lat]).addTo(map);
    }
  };

  // 4. Component Init
  initTopbar(mounts.topbar, basemaps, (url) => {
    map.setStyle(url);
  }, () => legend.toggle());

  // Popup for stations
  const stationPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 25 });

  map.on('click', 'station-icons', (e) => {
    const feat = e.features?.[0];
    if (!feat) return;
    const props = feat.properties || {};
    stationPopup.setLngLat(e.lngLat)
      .setHTML(`<b>${props.name}</b><br>${props.org || ''}`)
      .addTo(map);
  });

  map.on('mouseenter', 'station-icons', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'station-icons', () => map.getCanvas().style.cursor = '');

  map.on('contextmenu', (e) => {
    const { lat, lng } = e.lngLat;
    const mode = document.querySelector('.segmented-btn.active')?.getAttribute('data-mode') || 'ab';
    const menuItems: any[] = [{ label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, type: 'label' }, 'sep'];
    if (mode === 'ab') {
      menuItems.push({ label: 'Als Startpunkt setzen', icon: 'fa-solid fa-location-dot', onClick: () => { updateMarker('start', lat, lng); setRoutingCoord('start', lat, lng); }});
      menuItems.push({ label: 'Als Zielpunkt setzen', icon: 'fa-solid fa-flag-checkered', onClick: () => { updateMarker('target', lat, lng); setRoutingCoord('target', lat, lng); }});
    } else {
      menuItems.push({ label: 'Als Einsatzort setzen', icon: 'fa-solid fa-truck-medical', onClick: () => { updateMarker('target', lat, lng); setRoutingCoord('target', lat, lng); }});
    }
    ContextMenu.show(e.originalEvent.clientX, e.originalEvent.clientY, menuItems);
  });

  initRoutingSidebar(mounts.sidebar, async (params) => {
    const btn = document.getElementById('btn-start-routing') as HTMLButtonElement;
    if (btn) btn.classList.add('loading');
    clearResults();
    updateMarker('target', params.target[0], params.target[1]);
    
    try {
      if (params.mode === 'ab' && params.start) {
        updateMarker('start', params.start[0], params.start[1]);
        const route = await RoutingService.calculateRoute(params.start, params.target, params.profile);
        if (route && route.features && route.features.length > 0) {
          const summary = route.features[0].properties.summary;
          updateRoutingSummary(summary.distance, summary.duration);
          
          if (!map.getSource('routing-path')) ensureBaseLayers(map);
          const data = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: route.features[0].geometry,
              properties: { ...MAP_ROUTE_STYLES.active, width: MAP_ROUTE_STYLES.active.weight, opacity: MAP_ROUTE_STYLES.active.opacity }
            }]
          };
          const source = map.getSource('routing-path') as maplibregl.GeoJSONSource;
          source.setData(data as any);

          MapRegistry.registerSource('routing-path', {
            type: 'geojson',
            data: data
          });

          const bounds = new maplibregl.LngLatBounds();
          route.features[0].geometry.coordinates.forEach((c: any) => bounds.extend(c));
          map.fitBounds(bounds, { padding: 50 });
        }
      } else {
        const results = await RoutingService.findNearestStations(params.target, params.mode as any, params.profile);
        console.log(`[Routing] Found ${results.length} nearest stations.`);

        if (results.length === 0) {
          renderRoutingError('Keine Standorte in der Nähe gefunden.');
          return;
        }

        // Populate stations source
        const stationData = {
          type: 'FeatureCollection',
          features: results.map(s => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
            properties: { ...s }
          }))
        };
        const stationSource = map.getSource('stations') as maplibregl.GeoJSONSource;
        if (stationSource) {
          stationSource.setData(stationData as any);
        }
        MapRegistry.registerSource('stations', {
          type: 'geojson',
          data: stationData
        });
        
        results.forEach((r: any) => {
           stationRoutes.set(r.id, r.route);
        });

        const fetchRouteIfNeeded = async (station: any) => {
          if (!stationRoutes.get(station.id)) {
            console.log(`[Routing] Fetching missing route for station ${station.id}`);
            const route = await RoutingService.calculateRoute([station.lat, station.lon], params.target, params.profile);
            if (route && route.features && route.features.length > 0) {
              stationRoutes.set(station.id, route.features[0]);
            }
          }
        };

        renderStationResults(results, async (station, active) => {
          if (active) {
            await fetchRouteIfNeeded(station);
            eyeActiveStates.add(station.id);
          } else {
            eyeActiveStates.delete(station.id);
          }
          refreshMapRoutes();
        }, async (station) => {
          // Toggle highlight: if same station clicked again, deselect it
          if (currentHighlightedId === station.id) {
            currentHighlightedId = null;
          } else {
            currentHighlightedId = station.id;
            await fetchRouteIfNeeded(station);
          }
          
          refreshMapRoutes();
          
          if (currentHighlightedId !== null) {
            const route = stationRoutes.get(station.id);
            if (route && route.geometry) {
              const bounds = new maplibregl.LngLatBounds();
              route.geometry.coordinates.forEach((c: any) => bounds.extend(c));
              map.fitBounds(bounds, { padding: 50 });
            }
          }
        });

        // Initial route refresh to show results on map
        refreshMapRoutes();
        
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([params.target[1], params.target[0]]);
        results.forEach((r: any) => {
           bounds.extend([r.lon, r.lat]);
        });
        map.fitBounds(bounds, { padding: 80 });
      }
    } catch (err) {
      console.error('[Routing] Calculation failed:', err);
      renderRoutingError('Route konnte nicht berechnet werden.');
    } finally {
      if (btn) btn.classList.remove('loading');
    }
  });
};
