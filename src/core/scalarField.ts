import { GridGeometry } from './geometry';
import { interpolateGaussian } from './interpolation';
import { pointInPolygon } from './polygon';
import type {
  Bounds,
  DataPoint,
  GridSize,
  InterpolationOptions,
  Polygon,
  ScalarGrid,
} from './types';
import { invariant, validateDataPoints } from './validate';

/**
 * Inputs for {@link buildScalarGrid}.
 */
export interface BuildScalarGridOptions {
  data: readonly DataPoint[];
  bounds: Bounds;
  grid: GridSize;
  /** Interpolation configuration. Defaults to Gaussian with sensible settings. */
  interpolation?: InterpolationOptions;
  /** Optional polygon; cells whose centers fall outside are masked out. */
  mask?: Polygon;
}

/**
 * Builds a {@link ScalarGrid} from scattered data: interpolates values onto the
 * grid and applies an optional polygon mask.
 *
 * This is the headless heart of the library — it has no canvas or React
 * dependency and can be used directly for offscreen or server-side computation.
 */
export function buildScalarGrid(options: BuildScalarGridOptions): ScalarGrid {
  const { data, bounds, grid, interpolation, mask } = options;

  validateDataPoints(data);
  const geometry = new GridGeometry(bounds, grid.width, grid.height);

  const type = interpolation?.type ?? 'gaussian';
  invariant(type === 'gaussian', `unsupported interpolation type "${String(type)}"`);

  const values = interpolateGaussian(data, geometry, interpolation);
  const maskArray = new Uint8Array(values.length);

  const hasPolygon = mask !== undefined && mask.length >= 3;
  invariant(
    mask === undefined || mask.length === 0 || mask.length >= 3,
    `mask polygon must have at least 3 vertices, received ${mask?.length ?? 0}`,
  );

  for (let row = 0; row < geometry.height; row++) {
    const cy = hasPolygon ? geometry.rowToY(row) : 0;
    for (let col = 0; col < geometry.width; col++) {
      const idx = geometry.index(col, row);
      if (Number.isNaN(values[idx])) continue;
      if (hasPolygon) {
        const cx = geometry.colToX(col);
        if (!pointInPolygon({ x: cx, y: cy }, mask)) {
          values[idx] = NaN;
          continue;
        }
      }
      maskArray[idx] = 1;
    }
  }

  return {
    width: geometry.width,
    height: geometry.height,
    bounds,
    values,
    mask: maskArray,
  };
}
