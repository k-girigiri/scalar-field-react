import type { ColorMap, ScalarGrid } from './types';
import { clamp01, invariant, validateColorRange } from './validate';

/**
 * Options controlling how scalar values are mapped to colors.
 */
export interface ColorMappingOptions {
  colorMap: ColorMap;
  /**
   * Value mapped to the low end of the color map. Defaults to the minimum valid
   * value in the grid. Provide explicitly to compare grids on the same scale.
   */
  min?: number;
  /** Value mapped to the high end of the color map. Defaults to the grid maximum. */
  max?: number;
  /** Uniform opacity in `[0, 1]`. Defaults to `1`. */
  opacity?: number;
}

/**
 * The result of rasterizing a {@link ScalarGrid} into RGBA pixels.
 *
 * The buffer is oriented for direct use as canvas `ImageData`: the top row
 * (pixel y = 0) corresponds to `bounds.maxY`, matching screen coordinates.
 */
export interface RenderResult {
  /** RGBA pixels, length `width * height * 4`, top-to-bottom, left-to-right. */
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  /** The resolved lower bound used for color mapping. */
  min: number;
  /** The resolved upper bound used for color mapping. */
  max: number;
}

function resolveRange(grid: ScalarGrid, min?: number, max?: number): { min: number; max: number } {
  if (min !== undefined && max !== undefined) return { min, max };

  let lo = Infinity;
  let hi = -Infinity;
  const { values, mask } = grid;
  for (let i = 0; i < values.length; i++) {
    if (mask[i] === 0) continue;
    const v = values[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    // No valid cells: any range works since nothing will be drawn.
    lo = 0;
    hi = 1;
  }
  return { min: min ?? lo, max: max ?? hi };
}

/**
 * Rasterizes a {@link ScalarGrid} to an RGBA buffer using a color map.
 *
 * Masked and `NaN` cells become fully transparent. Values are normalized into
 * `[0, 1]` using the resolved (or provided) `min`/`max` and clamped, so
 * out-of-range values saturate to the color map endpoints. When `min === max`
 * the mid color is used.
 *
 * Pure logic — no canvas or React dependency, safe to run anywhere.
 */
export function renderScalarGrid(grid: ScalarGrid, options: ColorMappingOptions): RenderResult {
  const opacity = options.opacity ?? 1;
  invariant(
    Number.isFinite(opacity) && opacity >= 0 && opacity <= 1,
    `opacity must be within [0, 1], received ${String(opacity)}`,
  );

  validateColorRange(options.min, options.max);
  const { min, max } = resolveRange(grid, options.min, options.max);
  const range = max - min;
  const alpha = Math.round(opacity * 255);

  const { width, height, values, mask } = grid;
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let py = 0; py < height; py++) {
    // Flip vertically: grid row 0 is minY (bottom), canvas y = 0 is top (maxY).
    const gridRow = height - 1 - py;
    for (let px = 0; px < width; px++) {
      const gridIdx = gridRow * width + px;
      const out = (py * width + px) * 4;
      if (mask[gridIdx] === 0) {
        rgba[out + 3] = 0;
        continue;
      }
      const rawT = range <= 0 ? 0.5 : (values[gridIdx] - min) / range;
      const [r, g, b] = options.colorMap(clamp01(rawT));
      rgba[out] = r;
      rgba[out + 1] = g;
      rgba[out + 2] = b;
      rgba[out + 3] = alpha;
    }
  }

  return { rgba, width, height, min, max };
}
