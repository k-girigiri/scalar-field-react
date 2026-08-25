import { describe, expect, it } from 'vitest';
import { GridGeometry } from './geometry';
import { defaultSigma, interpolateGaussian } from './interpolation';
import type { Bounds, DataPoint } from './types';

const bounds: Bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };

function geom(w = 10, h = 10): GridGeometry {
  return new GridGeometry(bounds, w, h);
}

describe('interpolateGaussian', () => {
  it('returns all-NaN for empty data', () => {
    const values = interpolateGaussian([], geom());
    expect(values).toHaveLength(100);
    expect(values.every((v) => Number.isNaN(v))).toBe(true);
  });

  it('reproduces a single point value everywhere it has weight', () => {
    const data: DataPoint[] = [{ x: 5, y: 5, value: 42 }];
    const values = interpolateGaussian(data, geom(), { sigma: 3 });
    // With a single neighbor the weighted average is exactly that value.
    for (const v of values) {
      expect(v).toBeCloseTo(42, 6);
    }
  });

  it('produces a symmetric field for symmetric data', () => {
    const data: DataPoint[] = [
      { x: 2, y: 5, value: 0 },
      { x: 8, y: 5, value: 10 },
    ];
    const g = geom();
    const values = interpolateGaussian(data, g, { sigma: 3, neighbors: 2 });
    // The value at the center column should be the midpoint by symmetry.
    const centerCol = 5; // x ~ 5.5, but check mirror symmetry instead
    void centerCol;
    for (let row = 0; row < g.height; row++) {
      for (let col = 0; col < g.width; col++) {
        const mirrored = g.width - 1 - col;
        const a = values[g.index(col, row)];
        const b = values[g.index(mirrored, row)];
        // value field is antisymmetric about center: a + b == 10
        expect(a + b).toBeCloseTo(10, 5);
      }
    }
  });

  it('weights nearer points more heavily', () => {
    const data: DataPoint[] = [
      { x: 1, y: 5, value: 0 },
      { x: 9, y: 5, value: 100 },
    ];
    const g = geom();
    const values = interpolateGaussian(data, g, { sigma: 4, neighbors: 2 });
    const near0 = values[g.index(0, 5)];
    const near100 = values[g.index(9, 5)];
    expect(near0).toBeLessThan(50);
    expect(near100).toBeGreaterThan(50);
  });

  it('respects the neighbors limit', () => {
    // Three points; with neighbors=1 the nearest one dominates exactly.
    const data: DataPoint[] = [
      { x: 0, y: 0, value: 1 },
      { x: 10, y: 0, value: 2 },
      { x: 0, y: 10, value: 3 },
    ];
    const g = geom();
    const oneNeighbor = interpolateGaussian(data, g, { sigma: 2, neighbors: 1 });
    // near (0,0) cell -> only value 1 contributes
    expect(oneNeighbor[g.index(0, 0)]).toBeCloseTo(1, 6);
  });

  it('smaller sigma makes interpolation more local', () => {
    const data: DataPoint[] = [
      { x: 0, y: 5, value: 0 },
      { x: 10, y: 5, value: 100 },
    ];
    const g = geom();
    const idx = g.index(2, 5);
    const tight = interpolateGaussian(data, g, { sigma: 1, neighbors: 2 })[idx];
    const loose = interpolateGaussian(data, g, { sigma: 8, neighbors: 2 })[idx];
    // With a tight kernel the near (value 0) point dominates more strongly.
    expect(tight).toBeLessThan(loose);
  });

  it('validates neighbors and sigma', () => {
    const data: DataPoint[] = [{ x: 1, y: 1, value: 1 }];
    expect(() => interpolateGaussian(data, geom(), { neighbors: 0 })).toThrow(/neighbors/);
    expect(() => interpolateGaussian(data, geom(), { neighbors: 2.5 })).toThrow(/neighbors/);
    expect(() => interpolateGaussian(data, geom(), { sigma: 0 })).toThrow(/sigma/);
    expect(() => interpolateGaussian(data, geom(), { sigma: -1 })).toThrow(/sigma/);
  });
});

describe('defaultSigma', () => {
  it('scales with domain and shrinks with density', () => {
    const sparse = defaultSigma(4, bounds);
    const dense = defaultSigma(400, bounds);
    expect(dense).toBeLessThan(sparse);
    expect(sparse).toBeGreaterThan(0);
  });

  it('falls back for too few points', () => {
    expect(defaultSigma(0, bounds)).toBeGreaterThan(0);
    expect(defaultSigma(1, bounds)).toBeGreaterThan(0);
  });

  it('returns the exact value when a cell center coincides with a data point', () => {
    const g = new GridGeometry(bounds, 10, 10);
    const cx = g.colToX(3);
    const cy = g.rowToY(4);
    const data: DataPoint[] = [{ x: cx, y: cy, value: 99 }];
    const values = interpolateGaussian(data, g, { sigma: 2, neighbors: 1 });
    expect(values[g.index(3, 4)]).toBeCloseTo(99, 5);
  });

  it('matches brute-force Gaussian interpolation on a small grid', () => {
    const data: DataPoint[] = [
      { x: 2, y: 2, value: 0 },
      { x: 8, y: 8, value: 100 },
      { x: 2, y: 8, value: 50 },
    ];
    const g = geom(12, 12);
    const sigma = 3;
    const neighbors = 3;
    const fast = interpolateGaussian(data, g, { sigma, neighbors });

    const twoSigmaSq = 2 * sigma * sigma;
    for (let row = 0; row < g.height; row++) {
      const cy = g.rowToY(row);
      for (let col = 0; col < g.width; col++) {
        const cx = g.colToX(col);
        const dists = data
          .map((p, index) => ({
            index,
            d: (p.x - cx) ** 2 + (p.y - cy) ** 2,
          }))
          .sort((a, b) => a.d - b.d)
          .slice(0, neighbors);
        let wSum = 0;
        let vSum = 0;
        for (const n of dists) {
          const w = Math.exp(-n.d / twoSigmaSq);
          wSum += w;
          vSum += w * data[n.index].value;
        }
        const expected = wSum > 0 ? vSum / wSum : NaN;
        const idx = g.index(col, row);
        if (Number.isNaN(expected)) {
          expect(Number.isNaN(fast[idx])).toBe(true);
        } else {
          expect(fast[idx]).toBeCloseTo(expected, 5);
        }
      }
    }
  });
});
