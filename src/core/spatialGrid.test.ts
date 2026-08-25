import { describe, expect, it } from 'vitest';
import { SpatialPointGrid } from './spatialGrid';
import type { Bounds, DataPoint } from './types';

const bounds: Bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

function bruteForce(points: DataPoint[], x: number, y: number, k: number): number[] {
  return points
    .map((p, index) => ({ index, d: (p.x - x) ** 2 + (p.y - y) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((e) => e.index);
}

describe('SpatialPointGrid', () => {
  it('returns empty results for empty data or non-positive k', () => {
    const grid = new SpatialPointGrid([], bounds);
    expect(grid.kNearest(1, 1, 4)).toEqual([]);

    const one = new SpatialPointGrid([{ x: 1, y: 1, value: 0 }], bounds);
    expect(one.kNearest(1, 1, 0)).toEqual([]);
  });

  it('returns all points sorted when k exceeds the count', () => {
    const points: DataPoint[] = [
      { x: 10, y: 10, value: 0 },
      { x: 90, y: 90, value: 0 },
      { x: 50, y: 50, value: 0 },
    ];
    const grid = new SpatialPointGrid(points, bounds);
    const result = grid.kNearest(0, 0, 10);
    expect(result.map((n) => n.index)).toEqual([0, 2, 1]);
    expect(result[0].distanceSq).toBeLessThanOrEqual(result[1].distanceSq);
  });

  it('matches brute-force k-NN on random data (exactness property)', () => {
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const points: DataPoint[] = Array.from({ length: 500 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      value: rand(),
    }));
    const grid = new SpatialPointGrid(points, bounds);

    for (let t = 0; t < 50; t++) {
      const qx = rand() * 100;
      const qy = rand() * 100;
      const k = 1 + Math.floor(rand() * 8);
      const got = grid.kNearest(qx, qy, k).map((n) => n.index);
      const expected = bruteForce(points, qx, qy, k);
      // Compare by resulting distances to be robust to ties.
      const gotD = got.map((i) => (points[i].x - qx) ** 2 + (points[i].y - qy) ** 2);
      const expD = expected.map((i) => (points[i].x - qx) ** 2 + (points[i].y - qy) ** 2);
      expect(gotD).toEqual(expD);
    }
  });

  it('handles points sharing a location', () => {
    const points: DataPoint[] = [
      { x: 5, y: 5, value: 1 },
      { x: 5, y: 5, value: 2 },
      { x: 5, y: 5, value: 3 },
    ];
    const grid = new SpatialPointGrid(points, bounds);
    const result = grid.kNearest(5, 5, 2);
    expect(result).toHaveLength(2);
    for (const n of result) expect(n.distanceSq).toBe(0);
  });

  it('matches brute-force k-NN near bucket boundaries', () => {
    const tightBounds: Bounds = { minX: 0, maxX: 30, minY: 0, maxY: 30 };
    const points: DataPoint[] = [
      { x: 10.01, y: 15, value: 1 },
      { x: 19.99, y: 15, value: 2 },
      { x: 15, y: 10.01, value: 3 },
      { x: 15, y: 19.99, value: 4 },
      { x: 25, y: 25, value: 5 },
    ];
    const grid = new SpatialPointGrid(points, tightBounds);
    const queries = [
      { x: 9.99, y: 15 },
      { x: 20.01, y: 15 },
      { x: 15, y: 9.99 },
      { x: 15, y: 20.01 },
      { x: 14.99, y: 14.99 },
    ];
    for (const q of queries) {
      for (const k of [1, 2, 3, 4]) {
        const got = grid.kNearest(q.x, q.y, k).map((n) => n.distanceSq);
        const expected = bruteForce(points, q.x, q.y, k).map(
          (i) => (points[i].x - q.x) ** 2 + (points[i].y - q.y) ** 2,
        );
        expect(got).toEqual(expected);
      }
    }
  });
});
