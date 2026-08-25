import { describe, expect, it } from 'vitest';
import {
  builtInColorMaps,
  createLinearColorMap,
  jet,
  resolveColorMap,
} from './colormap';

describe('jet color map', () => {
  it('clamps out-of-range inputs to the endpoints', () => {
    expect(jet(-1)).toEqual(jet(0));
    expect(jet(2)).toEqual(jet(1));
  });

  it('starts in dark blue and ends in dark red', () => {
    const low = jet(0);
    const high = jet(1);
    expect(low[2]).toBeGreaterThan(low[0]); // more blue than red at the bottom
    expect(high[0]).toBeGreaterThan(high[2]); // more red than blue at the top
  });

  it('is green-dominant in the middle', () => {
    const mid = jet(0.5);
    expect(mid[1]).toBeGreaterThan(mid[0]);
    expect(mid[1]).toBeGreaterThan(mid[2]);
  });

  it('matches known Matplotlib jet reference values', () => {
    // Reference channel values derived from Matplotlib's jet segment data.
    expect(jet(0)).toEqual([0, 0, 128]);
    expect(jet(1)).toEqual([128, 0, 0]);
  });

  it('produces 0..255 integer channels across the range', () => {
    for (let i = 0; i <= 20; i++) {
      const c = jet(i / 20);
      for (const channel of c) {
        expect(Number.isInteger(channel)).toBe(true);
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('createLinearColorMap', () => {
  it('interpolates linearly between stops', () => {
    const map = createLinearColorMap([
      { t: 0, color: [0, 0, 0] },
      { t: 1, color: [255, 255, 255] },
    ]);
    expect(map(0)).toEqual([0, 0, 0]);
    expect(map(1)).toEqual([255, 255, 255]);
    expect(map(0.5)).toEqual([128, 128, 128]);
  });

  it('clamps and honors out-of-order stops', () => {
    const map = createLinearColorMap([
      { t: 1, color: [255, 0, 0] },
      { t: 0, color: [0, 0, 255] },
    ]);
    expect(map(-5)).toEqual([0, 0, 255]);
    expect(map(5)).toEqual([255, 0, 0]);
  });

  it('supports multi-stop gradients', () => {
    const map = createLinearColorMap([
      { t: 0, color: [0, 0, 0] },
      { t: 0.5, color: [10, 20, 30] },
      { t: 1, color: [255, 255, 255] },
    ]);
    expect(map(0.25)).toEqual([5, 10, 15]);
  });

  it('throws on empty stops', () => {
    expect(() => createLinearColorMap([])).toThrow();
  });
});

describe('resolveColorMap', () => {
  it('resolves built-in names', () => {
    expect(resolveColorMap('jet')).toBe(builtInColorMaps.jet);
  });

  it('passes through functions', () => {
    const custom = createLinearColorMap([
      { t: 0, color: [1, 2, 3] },
      { t: 1, color: [4, 5, 6] },
    ]);
    expect(resolveColorMap(custom)).toBe(custom);
  });
});
