import maplibregl, { GeoJSONSource, LayerSpecification } from 'maplibre-gl';
import { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { MapCore, MARKERS_SPRITE_BASE } from '../../lib/MapCore';
import { MapRegistry } from '../../lib/MapRegistry';
import { RoutingDataService } from './RoutingDataService';
import { MAP_ROUTE_STYLES, MAP_COLORS } from '../../lib/MapStyles';

// --- Constants for Source and Layer IDs ---
const ROUTING_PATH_SOURCE_ID = 'routing-path';
const ROUTING_PATH_LAYER_ID = 'routing-path';

const STATIONS_SOURCE_ID = 'stations';
const STATIONS_LAYER_ID = 'station-icons';

const PIN_SOURCE_START = 'routing-pin-start';
const PIN_SOURCE_TARGET = 'routing-pin-target';
const PIN_LAYER_START = 'routing-pin-start-layer';
const PIN_LAYER_TARGET = 'routing-pin-target-layer';

export class RoutingMapLayers {
  private static SPRITE_BASE = MARKERS_SPRITE_BASE;

  public static registerResources() {
    MapRegistry.registerImage('oe5ith-markers', this.SPRITE_BASE);
  }

  public static updateStartPin(map: maplibregl.Map, lngLat: [number, number] | null) {
    MapCore.setPointSource(map, PIN_SOURCE_START, lngLat);
  }

  public static updateTargetPin(map: maplibregl.Map, lngLat: [number, number] | null) {
    MapCore.setPointSource(map, PIN_SOURCE_TARGET, lngLat);
  }

  public static ensureBaseLayers(map: maplibregl.Map) {
    // 1. Routing Path Layer (bottom)
    const routingLayerDef: LayerSpecification = {
      id: ROUTING_PATH_LAYER_ID,
      type: 'line',
      source: ROUTING_PATH_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['get', 'width'],
        'line-opacity': ['get', 'opacity'],
      },
    };
    MapCore.ensureGeoJsonLayer(map, ROUTING_PATH_SOURCE_ID, routingLayerDef);
    MapRegistry.registerSource(ROUTING_PATH_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    // 2. Stations Layer
    const stationsLayerDef: LayerSpecification = {
      id: STATIONS_LAYER_ID,
      type: 'symbol',
      source: STATIONS_SOURCE_ID,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 0.7,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    };
    MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE_ID, stationsLayerDef);
    MapRegistry.registerSource(STATIONS_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    // 3. CI-Pin Layer für Start (grün)
    const startPinLayerDef = MapCore.createPinLayer(PIN_LAYER_START, PIN_SOURCE_START, {
      icon: 'ci-pin',
      size: 0.5,
      anchor: 'bottom',
      color: MAP_COLORS.success,
      haloColor: MAP_COLORS.white,
      haloWidth: 2,
    });
    MapCore.ensureGeoJsonLayer(map, PIN_SOURCE_START, startPinLayerDef);

    // 4. CI-Pin Layer für Ziel (rot)
    const targetPinLayerDef = MapCore.createPinLayer(PIN_LAYER_TARGET, PIN_SOURCE_TARGET, {
      icon: 'ci-pin',
      size: 0.5,
      anchor: 'bottom',
      color: MAP_COLORS.danger,
      haloColor: MAP_COLORS.white,
      haloWidth: 2,
    });
    MapCore.ensureGeoJsonLayer(map, PIN_SOURCE_TARGET, targetPinLayerDef);

    // Enforce layer order: Routen unter Stationen, Pins oben
    if (map.getLayer(STATIONS_LAYER_ID) && map.getLayer(ROUTING_PATH_LAYER_ID)) {
      map.moveLayer(ROUTING_PATH_LAYER_ID, STATIONS_LAYER_ID);
    }
  }

  public static updateRoutesLayer(map: maplibregl.Map, dataService: RoutingDataService) {
    const source = map.getSource(ROUTING_PATH_SOURCE_ID) as GeoJSONSource;
    if (!source) {
      this.ensureBaseLayers(map);
    }

    const features: Feature<LineString>[] = [];
    dataService.getStationRoutes().forEach((route, id) => {
      if (!route?.features?.[0]?.geometry) return;
      
      const routeFeature = route.features[0] as Feature<LineString>;
      const isHighlighted = id === dataService.getCurrentHighlightedId();
      const isEyeActive = dataService.isEyeActive(id);

      let style;
      if (isHighlighted) style = MAP_ROUTE_STYLES.active;
      else if (isEyeActive) style = MAP_ROUTE_STYLES.background;
      else return;

      features.push({
        type: 'Feature',
        geometry: routeFeature.geometry,
        properties: {
          color: style.color,
          width: style.weight, // Mapped to 'line-width' in layer paint properties
          opacity: style.opacity,
        },
      });
    });

    const data: FeatureCollection<LineString> = { type: 'FeatureCollection', features };
    if (source) source.setData(data);
  }

  public static updateStationsLayer(map: maplibregl.Map, dataService: RoutingDataService) {
    const source = map.getSource(STATIONS_SOURCE_ID) as GeoJSONSource;
    if (!source) {
      this.ensureBaseLayers(map);
    }
    
    const stations = dataService.getNearestStations();
    const features: Feature<Point>[] = stations.map(s => ({
      type: 'Feature',
      geometry: { 
        type: 'Point', 
        coordinates: [s.lon, s.lat] // MapLibre expects [lng, lat]
      },
      properties: { ...s },
    }));

    const data: FeatureCollection<Point> = { type: 'FeatureCollection', features };
    if (source) source.setData(data);
  }

  public static updateSingleRoute(map: maplibregl.Map, routeFeature: Feature<LineString>) {
    const source = map.getSource(ROUTING_PATH_SOURCE_ID) as GeoJSONSource;
    if (!source) {
      this.ensureBaseLayers(map);
    }

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: routeFeature.geometry,
          properties: {
            color: MAP_ROUTE_STYLES.active.color,
            width: MAP_ROUTE_STYLES.active.weight, // Mapped to 'line-width'
            opacity: MAP_ROUTE_STYLES.active.opacity,
          },
        },
      ],
    };
    
    if (source) source.setData(data);
  }
}

