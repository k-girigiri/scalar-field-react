import type { Bounds, DataPoint, GridSize } from './types';

const PREFIX = '[scalar-field-react]';

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`${PREFIX} ${message}`);
  }
}

/** Clamps a scalar to the `[0, 1]` interval. */
export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function validateDataPoints(data: readonly DataPoint[]): void {
  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    invariant(
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.value),
      `data[${i}] must have finite x, y, and value (received x=${String(p.x)}, y=${String(p.y)}, value=${String(p.value)})`,
    );
  }
}

export function validateColorRange(min?: number, max?: number): void {
  if (min === undefined || max === undefined) return;
  invariant(
    Number.isFinite(min) && Number.isFinite(max),
    `min and max must be finite numbers, received min=${String(min)}, max=${String(max)}`,
  );
  invariant(min <= max, `min (${min}) must be less than or equal to max (${max})`);
}

export function validateGridSize({ width, height }: GridSize): void {
  invariant(
    Number.isInteger(width) && width > 0,
    `grid.width must be a positive integer, received ${String(width)}`,
  );
  invariant(
    Number.isInteger(height) && height > 0,
    `grid.height must be a positive integer, received ${String(height)}`,
  );
}

export function validateBounds({ minX, maxX, minY, maxY }: Bounds): void {
  invariant(
    Number.isFinite(minX) && Number.isFinite(maxX) && Number.isFinite(minY) && Number.isFinite(maxY),
    'bounds must contain finite numbers',
  );
  invariant(maxX > minX, `bounds.maxX (${maxX}) must be greater than bounds.minX (${minX})`);
  invariant(maxY > minY, `bounds.maxY (${maxY}) must be greater than bounds.minY (${minY})`);
}
