import type { ColorMap, ColorTuple } from './types';

/**
 * A color stop for {@link createLinearColorMap}: a normalized position `t` in
 * `[0, 1]` and the color at that position.
 */
export interface ColorStop {
  t: number;
  color: ColorTuple;
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/**
 * Builds a {@link ColorMap} that linearly interpolates between the given color
 * stops. Stops are sorted by position; inputs are clamped to `[0, 1]`.
 *
 * This is the recommended way to define custom, TypeScript-friendly color maps:
 *
 * ```ts
 * const grayscale = createLinearColorMap([
 *   { t: 0, color: [0, 0, 0] },
 *   { t: 1, color: [255, 255, 255] },
 * ]);
 * ```
 */
export function createLinearColorMap(stops: readonly ColorStop[]): ColorMap {
  if (stops.length === 0) {
    throw new Error('[scalar-field-react] createLinearColorMap requires at least one stop');
  }
  const sorted = [...stops].sort((a, b) => a.t - b.t);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return (t: number): ColorTuple => {
    const clamped = clamp01(t);
    if (clamped <= first.t) return first.color;
    if (clamped >= last.t) return last.color;

    for (let i = 1; i < sorted.length; i++) {
      const hi = sorted[i];
      if (clamped <= hi.t) {
        const lo = sorted[i - 1];
        const span = hi.t - lo.t;
        const f = span <= 0 ? 0 : (clamped - lo.t) / span;
        return [
          Math.round(lerp(lo.color[0], hi.color[0], f)),
          Math.round(lerp(lo.color[1], hi.color[1], f)),
          Math.round(lerp(lo.color[2], hi.color[2], f)),
        ];
      }
    }
    return last.color;
  };
}

/**
 * Per-channel segment data for Matplotlib's `jet` color map. Each entry is
 * `[position, channelValue]` with both in `[0, 1]`.
 */
const JET_RED: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.0],
  [0.35, 0.0],
  [0.66, 1.0],
  [0.89, 1.0],
  [1.0, 0.5],
];
const JET_GREEN: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.0],
  [0.125, 0.0],
  [0.375, 1.0],
  [0.64, 1.0],
  [0.91, 0.0],
  [1.0, 0.0],
];
const JET_BLUE: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.5],
  [0.11, 1.0],
  [0.34, 1.0],
  [0.65, 0.0],
  [1.0, 0.0],
];

function sampleChannel(segments: ReadonlyArray<readonly [number, number]>, t: number): number {
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < segments.length; i++) {
    const hi = segments[i];
    if (t <= hi[0]) {
      const lo = segments[i - 1];
      const span = hi[0] - lo[0];
      const f = span <= 0 ? 0 : (t - lo[0]) / span;
      return lerp(lo[1], hi[1], f);
    }
  }
  return last[1];
}

/**
 * A close approximation of Matplotlib's `jet` color map, implemented as
 * per-channel piecewise-linear interpolation over the original segment data.
 */
export const jet: ColorMap = (t: number): ColorTuple => {
  const c = clamp01(t);
  return [
    Math.round(sampleChannel(JET_RED, c) * 255),
    Math.round(sampleChannel(JET_GREEN, c) * 255),
    Math.round(sampleChannel(JET_BLUE, c) * 255),
  ];
};

/**
 * The set of color maps addressable by name via the `colorMap` prop.
 */
export const builtInColorMaps = {
  jet,
} satisfies Record<string, ColorMap>;

/** Names of the built-in color maps. */
export type BuiltInColorMapName = keyof typeof builtInColorMaps;

/**
 * Resolves a color map that may be given either by name or as a function.
 */
export function resolveColorMap(colorMap: ColorMap | BuiltInColorMapName): ColorMap {
  if (typeof colorMap === 'function') return colorMap;
  const resolved = builtInColorMaps[colorMap];
  if (!resolved) {
    throw new Error(`[scalar-field-react] unknown color map "${String(colorMap)}"`);
  }
  return resolved;
}
