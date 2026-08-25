import { describe, expect, it } from 'vitest';
import { GridGeometry } from './geometry';

const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 50 };

describe('GridGeometry', () => {
  it('computes cell sizes from bounds and resolution', () => {
    const g = new GridGeometry(bounds, 10, 5);
    expect(g.cellWidth).toBe(10);
    expect(g.cellHeight).toBe(10);
    expect(g.size).toBe(50);
  });

  it('samples cell centers, not edges', () => {
    const g = new GridGeometry(bounds, 10, 5);
    expect(g.colToX(0)).toBe(5); // center of first 10-wide cell
    expect(g.colToX(9)).toBe(95);
    expect(g.rowToY(0)).toBe(5);
    expect(g.rowToY(4)).toBe(45);
  });

  it('inverts world <-> grid conversions at cell centers', () => {
    const g = new GridGeometry(bounds, 10, 5);
    for (let col = 0; col < 10; col++) {
      expect(g.xToCol(g.colToX(col))).toBeCloseTo(col, 10);
    }
    for (let row = 0; row < 5; row++) {
      expect(g.yToRow(g.rowToY(row))).toBeCloseTo(row, 10);
    }
  });

  it('is y-up: row 0 maps to minY', () => {
    const g = new GridGeometry(bounds, 10, 5);
    expect(g.rowToY(0)).toBeLessThan(g.rowToY(4));
  });

  it('computes row-major flat indices', () => {
    const g = new GridGeometry(bounds, 10, 5);
    expect(g.index(0, 0)).toBe(0);
    expect(g.index(3, 2)).toBe(2 * 10 + 3);
    expect(g.index(9, 4)).toBe(49);
  });

  it('rejects invalid grid sizes', () => {
    expect(() => new GridGeometry(bounds, 0, 5)).toThrow(/width/);
    expect(() => new GridGeometry(bounds, 10, -1)).toThrow(/height/);
    expect(() => new GridGeometry(bounds, 1.5, 5)).toThrow(/width/);
  });

  it('rejects invalid bounds', () => {
    expect(() => new GridGeometry({ minX: 10, maxX: 0, minY: 0, maxY: 1 }, 4, 4)).toThrow(/maxX/);
    expect(() => new GridGeometry({ minX: 0, maxX: 1, minY: 5, maxY: 5 }, 4, 4)).toThrow(/maxY/);
  });
});
