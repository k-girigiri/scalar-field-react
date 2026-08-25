import type { GridGeometry } from './geometry';
import { SpatialPointGrid } from './spatialGrid';
import type { Bounds, DataPoint, GaussianInterpolationOptions } from './types';
import { invariant, validateDataPoints } from './validate';

/** Default number of nearest neighbors used per grid cell. */
export const DEFAULT_NEIGHBORS = 4;

/**
 * Derives a sensible Gaussian `sigma` (in world units) from the data density.
 *
 * The heuristic uses the characteristic spacing of a uniform grid that would
 * hold `n` points over the given bounds: `sqrt(area / n)`. This scales with the
 * domain and gently smooths typical scattered data. Falls back to a fraction of
 * the domain diagonal when there are too few points to estimate spacing.
 */
export function defaultSigma(pointCount: number, bounds: Bounds): number {
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  if (pointCount >= 2) {
    const spacing = Math.sqrt((spanX * spanY) / pointCount);
    if (spacing > 0) return spacing;
  }
  return Math.hypot(spanX, spanY) / 10;
}

/**
 * Interpolates scattered data onto a regular grid using Gaussian weighting.
 *
 * For every grid cell center, the `neighbors` nearest data points are combined
 * with weights `exp(-(d^2) / (2 * sigma^2))`. Cells whose neighbors all carry
 * negligible weight (extremely far relative to `sigma`) are left as `NaN`.
 *
 * Pure logic — independent of canvas and React.
 *
 * @returns A row-major {@link Float32Array} of length `geometry.size`, with
 * `NaN` for cells that could not be resolved.
 */
export function interpolateGaussian(
  data: readonly DataPoint[],
  geometry: GridGeometry,
  options: GaussianInterpolationOptions = {},
): Float32Array {
  const neighbors = options.neighbors ?? DEFAULT_NEIGHBORS;
  const sigma = options.sigma ?? defaultSigma(data.length, geometry.bounds);

  validateDataPoints(data);

  invariant(
    Number.isInteger(neighbors) && neighbors > 0,
    `interpolation.neighbors must be a positive integer, received ${String(neighbors)}`,
  );
  invariant(
    Number.isFinite(sigma) && sigma > 0,
    `interpolation.sigma must be a positive number, received ${String(sigma)}`,
  );

  const { width, height } = geometry;
  const values = new Float32Array(width * height).fill(NaN);

  if (data.length === 0) {
    return values;
  }

  const spatial = new SpatialPointGrid(data, geometry.bounds);
  const twoSigmaSq = 2 * sigma * sigma;

  for (let row = 0; row < height; row++) {
    const cy = geometry.rowToY(row);
    for (let col = 0; col < width; col++) {
      const cx = geometry.colToX(col);
      const found = spatial.kNearest(cx, cy, neighbors);

      let weightSum = 0;
      let valueSum = 0;
      for (let i = 0; i < found.length; i++) {
        const neighbor = found[i];
        const weight = Math.exp(-neighbor.distanceSq / twoSigmaSq);
        weightSum += weight;
        valueSum += weight * data[neighbor.index].value;
      }

      if (weightSum > 0) {
        values[geometry.index(col, row)] = valueSum / weightSum;
      }
    }
  }

  return values;
}
