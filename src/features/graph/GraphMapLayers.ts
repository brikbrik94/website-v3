import * as maplibregl from 'maplibre-gl';
import { GeoJSONSource, LayerSpecification } from 'maplibre-gl';
import { Feature, FeatureCollection, Point, LineString } from 'geojson';
import { feature as topoFeature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { MapCore } from '../../lib/MapCore';
import { MapRegistry } from '../../lib/MapRegistry';
import { MAP_COLORS } from '../../lib/MapStyles';

export const EDGES_SOURCE_ID = 'graph-edges';
export const EDGES_LAYER_ID = 'graph-edges-layer';
export const NODES_SOURCE_ID = 'graph-nodes';
export const NODES_LAYER_ID = 'graph-nodes-layer';

interface OrsJsonNode {
  nodeId: number;
  location: [number, number];
}
interface OrsJsonEdge {
  fromId: number;
  toId: number;
  weight: string;
}
interface OrsJsonExport {
  nodes: OrsJsonNode[];
  edges: OrsJsonEdge[];
}

export interface GraphFeatures {
  nodes: FeatureCollection<Point>;
  edges: FeatureCollection<LineString>;
  nodesCount: number;
  edgesCount: number;
}

const EMPTY_FEATURES: GraphFeatures = {
  nodes: { type: 'FeatureCollection', features: [] },
  edges: { type: 'FeatureCollection', features: [] },
  nodesCount: 0,
  edgesCount: 0
};

/**
 * Baut GeoJSON aus der ORS-`/export`-Antwort. Bei `json` liefert ORS ein eigenes
 * {nodes, edges}-Graph-Format (kein GeoJSON) — wird hier manuell übersetzt, Edge-Properties
 * werden dabei auf dieselben Schlüssel wie im TopoJSON-Fall normalisiert (`node_from`/`node_to`
 * statt `fromId`/`toId`), damit Styling/Popup unabhängig vom Format funktionieren. Bei
 * `topojson` liefert ORS bereits ein Topology-Objekt mit einer GeometryCollection aus
 * LineStrings — `topojson-client` löst die Arcs zu echten Koordinaten auf (ORS liefert hier
 * keine Quantisierung/`transform`, Arcs sind bereits absolute Koordinaten). TopoJSON kennt
 * keine eigenen Node-Objekte, daher bleibt der Node-Layer in diesem Fall leer.
 */
export function buildGraphFeatures(response: unknown, format: 'json' | 'topojson'): GraphFeatures {
  if (format === 'topojson') {
    const topology = response as Topology;
    const network = topology.objects.network as GeometryCollection;
    const collection = topoFeature(topology, network) as FeatureCollection<LineString>;
    return {
      nodes: { type: 'FeatureCollection', features: [] },
      edges: collection,
      nodesCount: 0,
      edgesCount: collection.features.length
    };
  }

  const data = response as OrsJsonExport;
  const nodeIndex = new Map<number, [number, number]>();
  const nodeFeatures: Feature<Point>[] = data.nodes.map((n) => {
    nodeIndex.set(n.nodeId, n.location);
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: n.location },
      properties: { nodeId: n.nodeId }
    };
  });

  const edgeFeatures: Feature<LineString>[] = [];
  for (const e of data.edges) {
    const from = nodeIndex.get(e.fromId);
    const to = nodeIndex.get(e.toId);
    if (!from || !to) continue; // Randknoten außerhalb der Bbox-Antwort, defensiv überspringen
    edgeFeatures.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [from, to] },
      properties: { node_from: e.fromId, node_to: e.toId, weight: e.weight }
    });
  }

  return {
    nodes: { type: 'FeatureCollection', features: nodeFeatures },
    edges: { type: 'FeatureCollection', features: edgeFeatures },
    nodesCount: nodeFeatures.length,
    edgesCount: edgeFeatures.length
  };
}

export class GraphMapLayers {
  public static ensureBaseLayers(map: maplibregl.Map): void {
    const edgesLayerDef: LayerSpecification = {
      id: EDGES_LAYER_ID,
      type: 'line',
      source: EDGES_SOURCE_ID,
      paint: {
        'line-color': MAP_COLORS.accent,
        'line-width': 2
      }
    };
    MapCore.ensureGeoJsonLayer(map, EDGES_SOURCE_ID, edgesLayerDef);

    const nodesLayerDef: LayerSpecification = {
      id: NODES_LAYER_ID,
      type: 'circle',
      source: NODES_SOURCE_ID,
      paint: {
        'circle-color': MAP_COLORS.muted,
        'circle-radius': 3,
        'circle-opacity': 0.85
      }
    };
    MapCore.ensureGeoJsonLayer(map, NODES_SOURCE_ID, nodesLayerDef);
  }

  public static setNodesVisible(map: maplibregl.Map, visible: boolean): void {
    if (!map.getLayer(NODES_LAYER_ID)) return;
    map.setLayoutProperty(NODES_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
  }

  public static update(map: maplibregl.Map, features: GraphFeatures): void {
    if (!map.getSource(EDGES_SOURCE_ID) || !map.getSource(NODES_SOURCE_ID)) {
      this.ensureBaseLayers(map);
    }

    const edgesSource = map.getSource(EDGES_SOURCE_ID) as GeoJSONSource;
    if (edgesSource) edgesSource.setData(features.edges);
    MapRegistry.registerSource(EDGES_SOURCE_ID, { type: 'geojson', data: features.edges });

    const nodesSource = map.getSource(NODES_SOURCE_ID) as GeoJSONSource;
    if (nodesSource) nodesSource.setData(features.nodes);
    MapRegistry.registerSource(NODES_SOURCE_ID, { type: 'geojson', data: features.nodes });
  }

  public static clear(map: maplibregl.Map): void {
    this.update(map, EMPTY_FEATURES);
  }
}
