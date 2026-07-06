import { describe, it, expect } from 'vitest';
import { addSourceIfMissing, addLayerIfMissing } from './MapDefinitionOps';

describe('addSourceIfMissing', () => {
  it('adds a cloned copy of the definition when the source does not exist', () => {
    const calls: { id: string; definition: any }[] = [];
    const definition = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } };
    const map = {
      getSource: () => undefined,
      addSource: (id: string, def: any) => calls.push({ id, definition: def }),
    } as any;

    addSourceIfMissing(map, 'my-source', definition);

    expect(calls).toHaveLength(1);
    expect(calls[0].id).toBe('my-source');
    expect(calls[0].definition).toEqual(definition);
    expect(calls[0].definition).not.toBe(definition);
  });

  it('does nothing if the source already exists', () => {
    const calls: unknown[] = [];
    const map = {
      getSource: () => ({}),
      addSource: (...args: unknown[]) => calls.push(args),
    } as any;

    addSourceIfMissing(map, 'my-source', { type: 'geojson' });

    expect(calls).toHaveLength(0);
  });

  it('logs a warning instead of throwing if addSource fails', () => {
    const map = {
      getSource: () => undefined,
      addSource: () => { throw new Error('boom'); },
    } as any;

    expect(() => addSourceIfMissing(map, 'my-source', { type: 'geojson' })).not.toThrow();
  });
});

describe('addLayerIfMissing', () => {
  it('adds a cloned copy of the definition when the layer does not exist', () => {
    const calls: { definition: any; beforeId: string | undefined }[] = [];
    const definition = { id: 'my-layer', type: 'line', source: 'my-source' };
    const map = {
      getLayer: () => undefined,
      addLayer: (def: any, beforeId?: string) => calls.push({ definition: def, beforeId }),
    } as any;

    addLayerIfMissing(map, definition, 'some-other-layer');

    expect(calls).toHaveLength(1);
    expect(calls[0].definition).toEqual(definition);
    expect(calls[0].definition).not.toBe(definition);
    expect(calls[0].beforeId).toBe('some-other-layer');
  });

  it('does nothing if the layer already exists', () => {
    const calls: unknown[] = [];
    const map = {
      getLayer: () => ({}),
      addLayer: (...args: unknown[]) => calls.push(args),
    } as any;

    addLayerIfMissing(map, { id: 'my-layer', type: 'line' });

    expect(calls).toHaveLength(0);
  });

  it('logs a warning instead of throwing if addLayer fails', () => {
    const map = {
      getLayer: () => undefined,
      addLayer: () => { throw new Error('boom'); },
    } as any;

    expect(() => addLayerIfMissing(map, { id: 'my-layer', type: 'line' })).not.toThrow();
  });
});
