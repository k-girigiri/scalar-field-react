import { describe, expect, it } from 'vitest';
import { jet } from './colormap';
import { renderScalarGrid } from './render';
import type { ColorMap, ScalarGrid } from './types';

const identity: ColorMap = (t) => [Math.round(t * 255), 0, 0];

function grid(values: number[], mask: number[], width: number, height: number): ScalarGrid {
  return {
    width,
    height,
    bounds: { minX: 0, maxX: width, minY: 0, maxY: height },
    values: Float32Array.from(values),
    mask: Uint8Array.from(mask),
  };
}

describe('renderScalarGrid', () => {
  it('resolves min/max from valid cells when not provided', () => {
    const g = grid([0, 10, 20, 30], [1, 1, 1, 1], 2, 2);
    const result = renderScalarGrid(g, { colorMap: identity });
    expect(result.min).toBe(0);
    expect(result.max).toBe(30);
  });

  it('honors explicit min/max for consistent scales', () => {
    const g = grid([0, 10, 20, 30], [1, 1, 1, 1], 2, 2);
    const result = renderScalarGrid(g, { colorMap: identity, min: 0, max: 100 });
    expect(result.min).toBe(0);
    expect(result.max).toBe(100);
  });

  it('maps min -> t=0 and max -> t=1', () => {
    // Single row so orientation flip does not reshuffle pixels.
    const g = grid([0, 100], [1, 1], 2, 1);
    const result = renderScalarGrid(g, { colorMap: identity, min: 0, max: 100 });
    expect(result.rgba[0]).toBe(0); // value 0 -> red channel 0
    expect(result.rgba[4]).toBe(255); // value 100 -> red channel 255
  });

  it('clamps out-of-range values to endpoints', () => {
    const g = grid([-50, 150], [1, 1], 2, 1);
    const result = renderScalarGrid(g, { colorMap: identity, min: 0, max: 100 });
    expect(result.rgba[0]).toBe(0);
    expect(result.rgba[4]).toBe(255);
  });

  it('uses the mid color when min === max', () => {
    const g = grid([5, 5], [1, 1], 2, 1);
    const result = renderScalarGrid(g, { colorMap: identity, min: 5, max: 5 });
    expect(result.rgba[0]).toBe(128); // t = 0.5
  });

  it('makes masked cells fully transparent', () => {
    const g = grid([0, 100], [0, 1], 2, 1);
    const result = renderScalarGrid(g, { colorMap: identity, min: 0, max: 100 });
    expect(result.rgba[3]).toBe(0); // masked
    expect(result.rgba[7]).toBe(255); // valid, opaque
  });

  it('applies opacity to the alpha channel', () => {
    const g = grid([50], [1], 1, 1);
    const result = renderScalarGrid(g, { colorMap: identity, min: 0, max: 100, opacity: 0.5 });
    expect(result.rgba[3]).toBe(Math.round(0.5 * 255));
  });

  it('flips vertically so the top row corresponds to maxY', () => {
    // 1x2 grid: row 0 (minY) value 0, row 1 (maxY) value 100.
    const g = grid([0, 100], [1, 1], 1, 2);
    const result = renderScalarGrid(g, { colorMap: identity, min: 0, max: 100 });
    // Top pixel (y=0) should be the maxY row -> value 100 -> red 255.
    expect(result.rgba[0]).toBe(255);
    // Bottom pixel (y=1) -> value 0 -> red 0.
    expect(result.rgba[4]).toBe(0);
  });

  it('validates opacity', () => {
    const g = grid([1], [1], 1, 1);
    expect(() => renderScalarGrid(g, { colorMap: jet, opacity: -0.1 })).toThrow(/opacity/);
    expect(() => renderScalarGrid(g, { colorMap: jet, opacity: 1.5 })).toThrow(/opacity/);
  });

  it('clamps normalized t passed to the color map', () => {
    const spy: ColorMap = (t) => {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
      return [Math.round(t * 255), 0, 0];
    };
    const g = grid([-999, 999], [1, 1], 2, 1);
    renderScalarGrid(g, { colorMap: spy, min: 0, max: 100 });
  });

  it('rejects min greater than max', () => {
    const g = grid([1], [1], 1, 1);
    expect(() => renderScalarGrid(g, { colorMap: jet, min: 10, max: 5 })).toThrow(/min/);
  });

  it('supports opacity of 0', () => {
    const g = grid([50], [1], 1, 1);
    const result = renderScalarGrid(g, { colorMap: identity, min: 0, max: 100, opacity: 0 });
    expect(result.rgba[3]).toBe(0);
  });
});
