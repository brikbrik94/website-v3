import { describe, it, expect } from 'vitest';
import { GraphMapLayers, buildGraphFeatures, EDGES_SOURCE_ID, NODES_SOURCE_ID, NODES_LAYER_ID } from './GraphMapLayers';
import { MapRegistry } from '../../lib/MapRegistry';

const ORS_JSON_RESPONSE = {
  nodes: [
    { nodeId: 1, location: [16.30, 48.20] },
    { nodeId: 2, location: [16.31, 48.205] },
    { nodeId: 3, location: [16.32, 48.21] }
  ],
  edges: [
    { fromId: 1, toId: 2, weight: '6.47' },
    { fromId: 2, toId: 3, weight: '5.10' },
    { fromId: 1, toId: 999, weight: '1.00' } // referenziert einen nicht existierenden Node
  ],
  nodes_count: 3,
  edges_count: 3
};

const ORS_TOPOJSON_RESPONSE = {
  type: 'Topology',
  objects: {
    network: {
      type: 'GeometryCollection',
      geometries: [
        {
          type: 'LineString',
          properties: { weight: '6.47', node_from: 1, node_to: 2 },
          arcs: [0]
        },
        {
          type: 'LineString',
          properties: { weight: '5.10', node_from: 2, node_to: 3 },
          arcs: [1]
        }
      ]
    }
  },
  arcs: [
    [[16.30, 48.20], [16.31, 48.205]],
    [[16.31, 48.205], [16.32, 48.21]]
  ]
};

describe('buildGraphFeatures (format=json)', () => {
  it('builds one point feature per node with nodeId in properties', () => {
    const result = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');
    expect(result.nodes.features).toHaveLength(3);
    expect(result.nodes.features[0].properties?.nodeId).toBe(1);
    expect(result.nodes.features[0].geometry).toEqual({ type: 'Point', coordinates: [16.30, 48.20] });
  });

  it('builds edges with coordinates resolved from the node lookup and normalized property names', () => {
    const result = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');
    const edge = result.edges.features.find((f) => f.properties?.node_from === 1 && f.properties?.node_to === 2);
    expect(edge?.geometry).toEqual({
      type: 'LineString',
      coordinates: [[16.30, 48.20], [16.31, 48.205]]
    });
    expect(edge?.properties?.weight).toBe('6.47');
  });

  it('skips edges referencing a node outside the response', () => {
    const result = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');
    expect(result.edges.features).toHaveLength(2);
    expect(result.edgesCount).toBe(2);
  });

  it('reports nodesCount matching the built features', () => {
    const result = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');
    expect(result.nodesCount).toBe(3);
  });
});

describe('buildGraphFeatures (format=topojson)', () => {
  it('returns an empty node collection (TopoJSON has no separate node objects)', () => {
    const result = buildGraphFeatures(ORS_TOPOJSON_RESPONSE, 'topojson');
    expect(result.nodes.features).toHaveLength(0);
    expect(result.nodesCount).toBe(0);
  });

  it('converts each LineString geometry to an edge feature, preserving properties', () => {
    const result = buildGraphFeatures(ORS_TOPOJSON_RESPONSE, 'topojson');
    expect(result.edges.features).toHaveLength(2);
    expect(result.edgesCount).toBe(2);
    const first = result.edges.features[0];
    expect(first.properties?.node_from).toBe(1);
    expect(first.properties?.node_to).toBe(2);
    expect(first.properties?.weight).toBe('6.47');
    expect(first.geometry).toEqual({
      type: 'LineString',
      coordinates: [[16.30, 48.20], [16.31, 48.205]]
    });
  });
});

function mockMapWithSource() {
  const calls: { sourceId: string; data: unknown }[] = [];
  const layers = new Set<string>();
  const layoutProps: { layerId: string; prop: string; value: unknown }[] = [];
  const map = {
    getSource: (id: string) => ({ setData: (data: unknown) => calls.push({ sourceId: id, data }) }),
    getLayer: (id: string) => (layers.has(id) ? {} : undefined),
    setLayoutProperty: (layerId: string, prop: string, value: unknown) => layoutProps.push({ layerId, prop, value }),
    _registerLayer: (id: string) => layers.add(id)
  } as any;
  return { map, calls, layoutProps };
}

describe('GraphMapLayers.update', () => {
  it('writes edges and nodes to their respective sources and registers them in MapRegistry', () => {
    const { map, calls } = mockMapWithSource();
    const features = buildGraphFeatures(ORS_JSON_RESPONSE, 'json');

    GraphMapLayers.update(map, features);

    const edgesCall = calls.find((c) => c.sourceId === EDGES_SOURCE_ID);
    const nodesCall = calls.find((c) => c.sourceId === NODES_SOURCE_ID);
    expect((edgesCall?.data as any).features).toHaveLength(2);
    expect((nodesCall?.data as any).features).toHaveLength(3);
    expect((MapRegistry.getSource(EDGES_SOURCE_ID)?.definition as any).data.features).toHaveLength(2);
  });
});

describe('GraphMapLayers.setNodesVisible', () => {
  it('sets the node layer visibility property when the layer exists', () => {
    const { map, layoutProps } = mockMapWithSource();
    map._registerLayer(NODES_LAYER_ID);

    GraphMapLayers.setNodesVisible(map, false);

    expect(layoutProps).toContainEqual({ layerId: NODES_LAYER_ID, prop: 'visibility', value: 'none' });
  });

  it('does nothing when the layer does not exist yet', () => {
    const { map, layoutProps } = mockMapWithSource();
    GraphMapLayers.setNodesVisible(map, true);
    expect(layoutProps).toHaveLength(0);
  });
});
