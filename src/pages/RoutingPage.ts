import maplibregl from 'maplibre-gl';
import { initTopbar } from '../components/Topbar';
import { initRoutingSidebar, updateRoutingSummary, renderStationResults, setRoutingCoord, renderRoutingError, renderRoutingLoading } from '../components/RoutingSidebar';
import { RoutingService } from '../lib/RoutingService';
import { MapCore } from '../lib/MapCore';
import { ContextMenu } from '../components/ContextMenu';
import { Toast } from '../lib/Toast';

export const initRoutingPage = async (container: HTMLElement) => {
  // 1. Setup Container & Map
  const invRes = await fetch('https://tiles.oe5ith.at/inventory.json');
  const inventory = await invRes.json();
  const basemaps = inventory.maps.filter((m: any) => m.type === 'basemap');

  container.innerHTML = `
    <div id="topbar-mount"></div>
    <div class="layout">
      <div id="sidebar-mount"></div>
      <main id="map" style="flex: 1; height: 100%; position: relative; min-width: 0;">
        ${MapCore.getAttributionHtml()}
      </main>
    </div>
  `;

  const mapContainer = document.getElementById('map')!;
  const topbarMount = document.getElementById('topbar-mount')!;
  const sidebarMount = document.getElementById('sidebar-mount')!;

  const map = MapCore.init(mapContainer, basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');
  map.once('style.load', () => MapCore.reapplyBaseLayers());

  // 2. State & Constants
  let startMarker: maplibregl.Marker | null = null;
  let targetMarker: maplibregl.Marker | null = null;
  const stationRoutes = new Map<number, any>(); 
  const eyeActiveStates = new Set<number>();
  let currentHighlightedId: number | null = null;

  const SPRITE_BASE = 'https://tiles.oe5ith.at/assets/sprites/oe5ith-markers/sprite';
  map.on('styleimagemissing', async () => { await MapCore.loadSprites(map, SPRITE_BASE); });

  // Paint Configs
  const PAINT_HIGHLIGHT = { 'line-opacity': 1.0, 'line-width': 6 };
  const PAINT_DEZENT    = { 'line-opacity': 0.3, 'line-width': 4 };
  const PAINT_HIDDEN    = { 'line-opacity': 0.0, 'line-width': 0 };

  // 3. Layer Management
  const ensureBaseLayers = () => {
    if (!map.getSource('stations')) {
      map.addSource('stations', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }});
      map.addLayer({
        id: 'station-icons', type: 'symbol', source: 'stations',
        layout: { 'icon-image': ['get', 'icon'], 'icon-size': 0.7, 'icon-allow-overlap': true, 'icon-ignore-placement': true }
      });
    }
    if (!map.getSource('route')) {
      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }});
      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.8 }
      }, 'station-icons');
    }
  };
  map.on('load', ensureBaseLayers);

  const clearResults = () => {
    stationRoutes.forEach((_, id) => {
      if (map.getLayer(`route-${id}`)) map.removeLayer(`route-${id}`);
      if (map.getSource(`route-${id}`)) map.removeSource(`route-${id}`);
    });
    stationRoutes.clear();
    eyeActiveStates.clear();
    currentHighlightedId = null;
  };

  const updateRouteVisuals = (id: number, params: any) => {
    const layerId = `route-${id}`;
    if (!map.getLayer(layerId)) return;

    let style = PAINT_HIDDEN;
    if (id === currentHighlightedId) {
      style = PAINT_HIGHLIGHT;
    } else if (eyeActiveStates.has(id)) {
      // Wenn etwas anderes highlighted ist, die "Augen" noch dezent-er machen
      style = currentHighlightedId !== null ? { 'line-opacity': 0.1, 'line-width': 3 } : PAINT_DEZENT;
    }

    map.setPaintProperty(layerId, 'line-opacity', style['line-opacity']);
    map.setPaintProperty(layerId, 'line-width', style['line-width']);
  };

  const syncAllVisuals = () => {
    stationRoutes.forEach((_, id) => updateRouteVisuals(id, null));
  };

  const updateMarker = (type: 'start' | 'target', lat: number, lng: number) => {
    if (type === 'start') {
      if (startMarker) startMarker.remove();
      startMarker = new maplibregl.Marker({ color: '#22c55e' }).setLngLat([lng, lat]).addTo(map);
    } else {
      if (targetMarker) targetMarker.remove();
      targetMarker = new maplibregl.Marker({ color: '#ef4444' }).setLngLat([lng, lat]).addTo(map);
    }
  };

  // 4. Component Init
  initTopbar(topbarMount, basemaps, (url) => {
    map.setStyle(url);
    map.once('style.load', async () => {
      await MapCore.reapplyBaseLayers();
      ensureBaseLayers();
    });
  });

  map.on('contextmenu', (e) => {
    const { lat, lng } = e.lngLat;
    const mode = document.querySelector('.segmented-btn.active')?.getAttribute('data-mode') || 'ab';
    const menuItems: any[] = [{ label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, type: 'label' }, 'sep'];
    if (mode === 'ab') {
      menuItems.push({ label: 'Als Startpunkt setzen', icon: 'fa-solid fa-location-dot', onClick: () => { updateMarker('start', lat, lng); setRoutingCoord('start', lat, lng); }});
      menuItems.push({ label: 'Als Zielort setzen', icon: 'fa-solid fa-flag-checkered', onClick: () => { updateMarker('target', lat, lng); setRoutingCoord('target', lat, lng); }});
    } else {
      menuItems.push({ label: 'Als Einsatzort setzen', icon: 'fa-solid fa-truck-medical', onClick: () => { updateMarker('target', lat, lng); setRoutingCoord('target', lat, lng); }});
    }
    ContextMenu.show(e.originalEvent.clientX, e.originalEvent.clientY, menuItems);
  });

  initRoutingSidebar(sidebarMount, async (params) => {
    const btn = document.getElementById('btn-start-routing') as HTMLButtonElement;
    if (btn) btn.classList.add('loading');
    clearResults();
    updateMarker('target', params.target[0], params.target[1]);
    
    if (params.mode === 'ab') {
      if (startMarker) startMarker.remove();
      updateMarker('start', params.start![0], params.start![1]);
      const result = await RoutingService.calculateRoute(params.start!, params.target, params.profile);
      if (btn) btn.classList.remove('loading');
      if (result && result.features?.length > 0) {
        (map.getSource('route') as maplibregl.GeoJSONSource).setData(result);
        const bounds = new maplibregl.LngLatBounds();
        result.features[0].geometry.coordinates.forEach((c: any) => bounds.extend(c as [number, number]));
        map.fitBounds(bounds, { padding: 80, duration: 1000 });
        updateRoutingSummary(result.features[0].properties.summary.distance, result.features[0].properties.summary.duration);
      }
    } else {
      Toast.show(params.profile === 'driving-emergency' ? 'Starte Blaulicht-Routing Vergleich...' : 'Suche nächste Standorte...', 'info');
      const stations = await RoutingService.findNearestStations(params.target, params.mode as 'sew' | 'nef', params.profile);
      if (btn) btn.classList.remove('loading');

      if (!stations || stations.length === 0) {
        renderRoutingError('Keine Standorte gefunden.');
        return;
      }

      (map.getSource('stations') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: stations.map(s => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { name: s.name, icon: s.icon }}))
      });

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([params.target[1], params.target[0]]);
      stations.forEach(s => bounds.extend([s.lon, s.lat]));
      map.fitBounds(bounds, { padding: 80, duration: 1000 });

      renderStationResults(stations, 
        // TOGGLE (Auge)
        async (s, active) => {
          if (active) eyeActiveStates.add(s.id); else eyeActiveStates.delete(s.id);
          const layerId = `route-${s.id}`;
          
          if (!map.getSource(layerId)) {
            let route = stationRoutes.get(s.id);
            if (!route) {
              route = await RoutingService.calculateRoute([s.lat, s.lon], params.target, params.profile);
              if (route) stationRoutes.set(s.id, route);
            }
            if (route) {
              map.addSource(layerId, { type: 'geojson', data: route });
              map.addLayer({
                id: layerId, type: 'line', source: layerId,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#3b82f6', 'line-width': 0, 'line-opacity': 0 }
              }, 'station-icons');
            }
          }
          syncAllVisuals();
        },
        // HIGHLIGHT (Klick auf Feld)
        async (s) => {
          if (currentHighlightedId === s.id) {
            currentHighlightedId = null;
          } else {
            currentHighlightedId = s.id;
            const layerId = `route-${s.id}`;
            if (!map.getSource(layerId)) {
              let route = stationRoutes.get(s.id);
              if (!route) {
                route = await RoutingService.calculateRoute([s.lat, s.lon], params.target, params.profile);
                if (route) stationRoutes.set(s.id, route);
              }
              if (route) {
                map.addSource(layerId, { type: 'geojson', data: route });
                map.addLayer({
                  id: layerId, type: 'line', source: layerId,
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: { 'line-color': '#3b82f6', 'line-width': 0, 'line-opacity': 0 }
                }, 'station-icons');
              }
            }
          }
          syncAllVisuals();
        }
      );
    }
  });
};
