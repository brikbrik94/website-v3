import maplibregl, { GeoJSONSource, LayerSpecification } from 'maplibre-gl';
import { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import { MapCore, MARKERS_SPRITE_BASE } from '../../lib/MapCore';
import { MapRegistry } from '../../lib/MapRegistry';
import { IsochronesDataService } from './IsochronesDataService';
import { getIsochroneRingColor, MAP_COLORS } from '../../lib/MapStyles';

const RINGS_SOURCE_ID = 'isochrones-rings';
const RINGS_LAYER_ID = 'isochrones-rings-layer';
const POINTS_SOURCE_ID = 'isochrones-points';
const POINTS_LAYER_ID = 'isochrones-points-layer';
const RINGS_FILL_OPACITY = 0.35;

export class IsochronesMapLayers {
  public static registerResources(): void {
    MapRegistry.registerImage('oe5ith-markers', MARKERS_SPRITE_BASE);
  }

  public static ensureBaseLayers(map: maplibregl.Map): void {
    const ringsLayerDef: LayerSpecification = {
      id: RINGS_LAYER_ID,
      type: 'fill',
      source: RINGS_SOURCE_ID,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': RINGS_FILL_OPACITY,
        'fill-outline-color': ['get', 'color']
      }
    };
    MapCore.ensureGeoJsonLayer(map, RINGS_SOURCE_ID, ringsLayerDef);

    const pointsLayerDef = MapCore.createPinLayer(POINTS_LAYER_ID, POINTS_SOURCE_ID, {
      icon: 'ci-pin',
      size: 0.5,
      anchor: 'bottom',
      color: MAP_COLORS.accent,
      haloColor: MAP_COLORS.white,
      haloWidth: 2
    });
    MapCore.ensureGeoJsonLayer(map, POINTS_SOURCE_ID, pointsLayerDef);
  }

  /**
   * Baut die FeatureCollection aller sichtbaren (eye-aktiven) Ringe neu auf. ORS liefert Ringe
   * kumulativ (größerer Ring enthält kleineren vollständig) — Features werden je Query
   * absteigend nach `properties.value` einsortiert (größter zuerst), damit kleinere Ringe beim
   * Zeichnen nicht vom größeren überdeckt werden. Farb-Index (0 = kürzeste Zeit/Distanz) ergibt
   * sich aus dem aufsteigenden Rang innerhalb der Query — setzt voraus, dass ORS genau ein
   * Feature pro angefragtem Range-Wert liefert (Standardverhalten bei einer einzelnen location).
   */
  public static updateRingsLayer(map: maplibregl.Map, dataService: IsochronesDataService): void {
    if (!map.getSource(RINGS_SOURCE_ID)) {
      this.ensureBaseLayers(map);
    }

    const features: Feature<Polygon>[] = [];
    dataService.getQueries().forEach((query, id) => {
      if (!dataService.isEyeActive(id)) return;

      const sortedAsc = [...query.geojson.features].sort(
        (a, b) => ((a.properties?.value as number) ?? 0) - ((b.properties?.value as number) ?? 0)
      );
      const total = sortedAsc.length;

      for (let index = total - 1; index >= 0; index--) {
        const feature = sortedAsc[index];
        features.push({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            queryId: id,
            color: getIsochroneRingColor(index, total)
          }
        });
      }
    });

    const data: FeatureCollection<Polygon> = { type: 'FeatureCollection', features };
    const source = map.getSource(RINGS_SOURCE_ID) as GeoJSONSource;
    if (source) source.setData(data);
    MapRegistry.registerSource(RINGS_SOURCE_ID, { type: 'geojson', data });
  }

  public static updatePointsLayer(map: maplibregl.Map, dataService: IsochronesDataService): void {
    if (!map.getSource(POINTS_SOURCE_ID)) {
      this.ensureBaseLayers(map);
    }

    const features: Feature<Point>[] = [];
    dataService.getQueries().forEach((query, id) => {
      if (!dataService.isEyeActive(id)) return;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [query.point[1], query.point[0]] },
        properties: { queryId: id }
      });
    });

    const data: FeatureCollection<Point> = { type: 'FeatureCollection', features };
    const source = map.getSource(POINTS_SOURCE_ID) as GeoJSONSource;
    if (source) source.setData(data);
    MapRegistry.registerSource(POINTS_SOURCE_ID, { type: 'geojson', data });
  }
}
