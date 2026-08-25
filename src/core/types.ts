/**
 * A point in 2D space.
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * A scattered sample: a 2D position with an associated scalar value.
 *
 * The meaning of `value` is intentionally domain-agnostic — it may be a
 * temperature, humidity, pressure, elevation, sensor reading, etc.
 */
export interface DataPoint {
  x: number;
  y: number;
  value: number;
}

/**
 * The world-coordinate rectangle covered by a grid.
 */
export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * The resolution of a scalar grid, in cells.
 */
export interface GridSize {
  /** Number of columns (cells along the x axis). */
  width: number;
  /** Number of rows (cells along the y axis). */
  height: number;
}

/**
 * A polygon, expressed as an ordered ring of vertices. The ring is treated as
 * implicitly closed (the last vertex connects back to the first).
 */
export type Polygon = readonly Point2D[];

/**
 * An RGB color with each channel in the `0..255` range.
 */
export type ColorTuple = readonly [r: number, g: number, b: number];

/**
 * Maps a normalized scalar `t` in the `[0, 1]` range to an RGB color.
 *
 * Implementations should clamp out-of-range inputs and must not depend on any
 * browser or canvas API, so they remain pure and SSR-safe.
 */
export type ColorMap = (t: number) => ColorTuple;

/**
 * Options for Gaussian-weighted interpolation.
 *
 * ```text
 * weight = exp(-(distance^2) / (2 * sigma^2))
 * value  = Σ(value * weight) / Σ(weight)
 * ```
 */
export interface GaussianInterpolationOptions {
  type?: 'gaussian';
  /**
   * The standard deviation of the Gaussian kernel, in world units. Larger
   * values produce smoother fields. When omitted, a value derived from the
   * data density and bounds is used.
   */
  sigma?: number;
  /**
   * How many nearest data points contribute to each grid cell. Defaults to `4`.
   */
  neighbors?: number;
}

/**
 * Interpolation options. Currently only Gaussian interpolation is supported,
 * but this union is the extension point for future methods.
 */
export type InterpolationOptions = GaussianInterpolationOptions;

/**
 * A regularly-spaced scalar grid produced by interpolating scattered data.
 *
 * Values are stored row-major in a {@link Float32Array}. Row `0` corresponds to
 * `bounds.minY` and the last row to `bounds.maxY` (i.e. the grid is stored
 * "y-up"). Cells that carry no valid value (empty data, or masked out) hold
 * `NaN` in {@link values} and `0` in {@link mask}.
 */
export interface ScalarGrid {
  width: number;
  height: number;
  bounds: Bounds;
  /** Row-major values, length `width * height`. `NaN` where invalid. */
  values: Float32Array;
  /** Row-major validity flags, length `width * height`. `1` valid, `0` invalid. */
  mask: Uint8Array;
}
