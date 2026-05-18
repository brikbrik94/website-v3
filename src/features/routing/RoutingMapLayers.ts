import maplibregl from 'maplibre-gl';
import { MapCore } from '../../lib/MapCore';
import { MapRegistry } from '../../lib/MapRegistry';
import { RoutingDataService } from './RoutingDataService';
import { MAP_ROUTE_STYLES, MAP_COLORS } from '../../lib/MapStyles';

export class RoutingMapLayers {
  private static SPRITE_BASE = 'https://tiles.oe5ith.at/assets/sprites/oe5ith-markers/sprite';

  public static registerResources() {
    MapRegistry.registerImage('routing-markers', this.SPRITE_BASE);
  }

  public static ensureBaseLayers(map: maplibregl.Map) {
    // 1. Routing Path Layer (unterste Ebene)
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
    MapCore.ensureGeoJsonLayer(map, 'routing-path', routingLayerDef as any);

    // 2. Stations Layer
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
    MapCore.ensureGeoJsonLayer(map, 'stations', stationsLayerDef as any);

    // 3. Start/Target Markers Layer (oberste Ebene)
    const markersLayerDef = {
      id: 'routing-markers',
      type: 'symbol',
      source: 'routing-markers',
      layout: {
        'icon-image': ['match', ['get', 'type'], 'start', 'marker-green', 'target', 'marker-red', 'marker-blue'],
        'icon-size': 1.0,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    };
    MapCore.ensureGeoJsonLayer(map, 'routing-markers', markersLayerDef as any);

    // Sortierung
    if (map.getLayer('station-icons') && map.getLayer('routing-path')) {
      map.moveLayer('routing-path', 'station-icons');
    }
    if (map.getLayer('routing-markers') && map.getLayer('station-icons')) {
      map.moveLayer('station-icons', 'routing-markers');
    }
  }

  public static updateRoutesLayer(map: maplibregl.Map, dataService: RoutingDataService) {
    if (!map.getSource('routing-path')) {
      this.ensureBaseLayers(map);
    }

    const features: any[] = [];
    dataService.getStationRoutes().forEach((route, id) => {
      if (!route || !route.features || route.features.length === 0) return;
      const routeFeature = route.features[0];
      if (!routeFeature.geometry) return;

      const isHighlighted = id === dataService.getCurrentHighlightedId();
      const isEyeActive = dataService.isEyeActive(id);

      if (isHighlighted) {
        features.push({
          type: 'Feature',
          geometry: routeFeature.geometry,
          properties: { 
            color: MAP_ROUTE_STYLES.active.color,
            width: MAP_ROUTE_STYLES.active.weight,
            opacity: MAP_ROUTE_STYLES.active.opacity
          }
        });
      } else if (isEyeActive) {
        features.push({
          type: 'Feature',
          geometry: routeFeature.geometry,
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
    MapRegistry.registerSource('routing-path', { type: 'geojson', data });
  }

  public static updateStationsLayer(map: maplibregl.Map, dataService: RoutingDataService) {
    if (!map.getSource('stations')) {
      this.ensureBaseLayers(map);
    }
    const stations = dataService.getNearestStations();
    const data = {
      type: 'FeatureCollection',
      features: stations.map(s => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: { ...s }
      }))
    };
    const source = map.getSource('stations') as maplibregl.GeoJSONSource;
    if (source) source.setData(data as any);
    MapRegistry.registerSource('stations', { type: 'geojson', data });
  }

  public static updateMarkersLayer(map: maplibregl.Map, dataService: RoutingDataService) {
    if (!map.getSource('routing-markers')) {
      this.ensureBaseLayers(map);
    }
    const features: any[] = [];
    const start = dataService.getStartCoord();
    const target = dataService.getTargetCoord();

    if (start) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [start[1], start[0]] },
        properties: { type: 'start' }
      });
    }
    if (target) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [target[1], target[0]] },
        properties: { type: 'target' }
      });
    }

    const data = { type: 'FeatureCollection', features };
    const source = map.getSource('routing-markers') as maplibregl.GeoJSONSource;
    if (source) source.setData(data as any);
    MapRegistry.registerSource('routing-markers', { type: 'geojson', data });
  }
  
  public static updateSingleRoute(map: maplibregl.Map, routeFeature: any) {
      if (!map.getSource('routing-path')) this.ensureBaseLayers(map);
      const data = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: routeFeature.geometry,
          properties: { ...MAP_ROUTE_STYLES.active, width: MAP_ROUTE_STYLES.active.weight, opacity: MAP_ROUTE_STYLES.active.opacity }
        }]
      };
      const source = map.getSource('routing-path') as maplibregl.GeoJSONSource;
      if (source) source.setData(data as any);
      MapRegistry.registerSource('routing-path', { type: 'geojson', data });
  }
}
