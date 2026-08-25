import type { Bounds } from './types';
import { validateBounds, validateGridSize } from './validate';

/**
 * Maps between world coordinates and grid cell indices for a regular grid.
 *
 * The grid samples each cell at its center: column `c` (0-based) has its center
 * at world x `minX + (c + 0.5) * cellWidth`, and row `r` at world y
 * `minY + (r + 0.5) * cellHeight`. Row `0` is at `minY` (the grid is "y-up").
 *
 * This class contains only coordinate math and is independent of interpolation,
 * canvas, and React.
 */
export class GridGeometry {
  readonly bounds: Bounds;
  readonly width: number;
  readonly height: number;
  /** World-space width of a single cell. */
  readonly cellWidth: number;
  /** World-space height of a single cell. */
  readonly cellHeight: number;

  constructor(bounds: Bounds, width: number, height: number) {
    validateBounds(bounds);
    validateGridSize({ width, height });
    this.bounds = bounds;
    this.width = width;
    this.height = height;
    this.cellWidth = (bounds.maxX - bounds.minX) / width;
    this.cellHeight = (bounds.maxY - bounds.minY) / height;
  }

  /** Number of cells in the grid. */
  get size(): number {
    return this.width * this.height;
  }

  /** World x coordinate of the center of column `col`. */
  colToX(col: number): number {
    return this.bounds.minX + (col + 0.5) * this.cellWidth;
  }

  /** World y coordinate of the center of row `row`. */
  rowToY(row: number): number {
    return this.bounds.minY + (row + 0.5) * this.cellHeight;
  }

  /** Fractional column for a world x coordinate (cell centers land on integers). */
  xToCol(x: number): number {
    return (x - this.bounds.minX) / this.cellWidth - 0.5;
  }

  /** Fractional row for a world y coordinate (cell centers land on integers). */
  yToRow(y: number): number {
    return (y - this.bounds.minY) / this.cellHeight - 0.5;
  }

  /** Row-major flat index for a `(col, row)` cell. */
  index(col: number, row: number): number {
    return row * this.width + col;
  }
}
