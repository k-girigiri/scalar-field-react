import { describe, expect, it } from 'vitest';
import { buildScalarGrid } from './scalarField';
import type { DataPoint, Polygon } from './types';

const data: DataPoint[] = [
  { x: 2, y: 2, value: 10 },
  { x: 8, y: 8, value: 20 },
];
const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };

describe('buildScalarGrid', () => {
  it('produces a grid of the requested size', () => {
    const g = buildScalarGrid({ data, bounds, grid: { width: 5, height: 4 } });
    expect(g.width).toBe(5);
    expect(g.height).toBe(4);
    expect(g.values).toHaveLength(20);
    expect(g.mask).toHaveLength(20);
  });

  it('marks all cells valid when data is present and no mask is given', () => {
    const g = buildScalarGrid({ data, bounds, grid: { width: 5, height: 5 } });
    expect(Array.from(g.mask).every((m) => m === 1)).toBe(true);
  });

  it('marks all cells invalid for empty data', () => {
    const g = buildScalarGrid({ data: [], bounds, grid: { width: 4, height: 4 } });
    expect(Array.from(g.mask).every((m) => m === 0)).toBe(true);
    expect(Array.from(g.values).every((v) => Number.isNaN(v))).toBe(true);
  });

  it('applies a polygon mask, excluding outside cells', () => {
    const mask: Polygon = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
    ];
    const g = buildScalarGrid({ data, bounds, grid: { width: 10, height: 10 }, mask });
    // A cell clearly inside the mask (x~2.5, y~2.5)
    const insideIdx = 2 * 10 + 2;
    // A cell clearly outside the mask (x~7.5, y~7.5)
    const outsideIdx = 7 * 10 + 7;
    expect(g.mask[insideIdx]).toBe(1);
    expect(g.mask[outsideIdx]).toBe(0);
    expect(Number.isNaN(g.values[outsideIdx])).toBe(true);
  });

  it('ignores an empty polygon (treated as no mask)', () => {
    const g = buildScalarGrid({ data, bounds, grid: { width: 4, height: 4 }, mask: [] });
    expect(Array.from(g.mask).every((m) => m === 1)).toBe(true);
  });

  it('rejects malformed polygons', () => {
    const bad: Polygon = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(() => buildScalarGrid({ data, bounds, grid: { width: 4, height: 4 }, mask: bad })).toThrow(
      /at least 3/,
    );
  });

  it('rejects unsupported interpolation types', () => {
    expect(() =>
      buildScalarGrid({
        data,
        bounds,
        grid: { width: 4, height: 4 },
        // @ts-expect-error intentionally invalid type for the runtime guard
        interpolation: { type: 'linear' },
      }),
    ).toThrow(/unsupported interpolation/);
  });

  it('rejects non-finite data points', () => {
    expect(() =>
      buildScalarGrid({
        data: [{ x: NaN, y: 1, value: 1 }],
        bounds,
        grid: { width: 4, height: 4 },
      }),
    ).toThrow(/finite/);
  });
});
