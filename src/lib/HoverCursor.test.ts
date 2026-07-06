import { describe, it, expect } from 'vitest';
import { attachHoverCursor } from './HoverCursor';

function mockMap() {
  const calls: { type: string; layerId: string }[] = [];
  const map = {
    on: (type: string, layerId: string, _cb: () => void) => { calls.push({ type, layerId }); },
  } as any;
  return { map, calls };
}

describe('attachHoverCursor', () => {
  it('registers a mouseenter and mouseleave listener per layer', () => {
    const { map, calls } = mockMap();
    attachHoverCursor(map, ['layer-a', 'layer-b']);
    expect(calls).toEqual([
      { type: 'mouseenter', layerId: 'layer-a' },
      { type: 'mouseleave', layerId: 'layer-a' },
      { type: 'mouseenter', layerId: 'layer-b' },
      { type: 'mouseleave', layerId: 'layer-b' },
    ]);
  });

  it('does not re-register listeners on a second call for the same map instance', () => {
    const { map, calls } = mockMap();
    attachHoverCursor(map, ['layer-a']);
    attachHoverCursor(map, ['layer-a']);
    expect(calls).toHaveLength(2);
  });

  it('registers independently for two different map instances', () => {
    const { map: mapA, calls: callsA } = mockMap();
    const { map: mapB, calls: callsB } = mockMap();
    attachHoverCursor(mapA, ['layer-a']);
    attachHoverCursor(mapB, ['layer-a']);
    expect(callsA).toHaveLength(2);
    expect(callsB).toHaveLength(2);
  });
});
