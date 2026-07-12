import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachLongPress } from './LongPressGesture';

function mockMap(unprojectResult: any = { lat: 47.1, lng: 14.2 }) {
  const listeners: Record<string, ((e: any) => void)[]> = {};
  const addEventListener = vi.fn((type: string, cb: (e: any) => void) => {
    (listeners[type] ??= []).push(cb);
  });
  const canvas = {
    addEventListener,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const map = {
    getCanvas: () => canvas,
    unproject: vi.fn(() => unprojectResult),
  } as any;
  const fire = (type: string, e: any) => listeners[type]?.forEach((cb) => cb(e));
  return { map, fire, addEventListener };
}

function touch(x: number, y: number) {
  return { touches: [{ clientX: x, clientY: y }] } as any;
}

describe('attachLongPress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires after the hold duration on a stationary single touch', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledWith({ lngLat: { lat: 47.1, lng: 14.2 }, clientX: 100, clientY: 200 });
  });

  it('does not fire before the hold duration elapses', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    vi.advanceTimersByTime(499);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels the hold when the touch moves beyond the tolerance', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    fire('touchmove', touch(120, 200));
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('does not cancel the hold for movement within tolerance', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    fire('touchmove', touch(105, 200));
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('ignores multi-touch (pinch) gestures', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', { touches: [{ clientX: 100, clientY: 200 }, { clientX: 150, clientY: 200 }] });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('cancels a pending hold on touchend before the duration elapses', () => {
    const { map, fire } = mockMap();
    const onLongPress = vi.fn();
    attachLongPress(map, onLongPress);

    fire('touchstart', touch(100, 200));
    fire('touchend', { preventDefault: vi.fn() });
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('calls preventDefault on the touchend that follows a fired long-press', () => {
    const { map, fire } = mockMap();
    attachLongPress(map, vi.fn());

    fire('touchstart', touch(100, 200));
    vi.advanceTimersByTime(500);

    const preventDefault = vi.fn();
    fire('touchend', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not call preventDefault on a touchend from an ordinary tap', () => {
    const { map, fire } = mockMap();
    attachLongPress(map, vi.fn());

    fire('touchstart', touch(100, 200));
    const preventDefault = vi.fn();
    fire('touchend', { preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('does not re-register listeners on a second call for the same map instance', () => {
    const { map, addEventListener } = mockMap();
    attachLongPress(map, vi.fn());
    attachLongPress(map, vi.fn());
    expect(addEventListener).toHaveBeenCalledTimes(4);
  });

  it('registers independently for two different map instances', () => {
    const { map: mapA, addEventListener: addA } = mockMap();
    const { map: mapB, addEventListener: addB } = mockMap();
    attachLongPress(mapA, vi.fn());
    attachLongPress(mapB, vi.fn());
    expect(addA).toHaveBeenCalledTimes(4);
    expect(addB).toHaveBeenCalledTimes(4);
  });
});
