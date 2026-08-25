import { describe, expect, it } from 'vitest';
import { pointInPolygon } from './polygon';
import type { Polygon } from './types';

const square: Polygon = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe('pointInPolygon', () => {
  it('detects interior points', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 1, y: 9 }, square)).toBe(true);
  });

  it('detects exterior points', () => {
    expect(pointInPolygon({ x: -1, y: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: 11, y: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: 5, y: 20 }, square)).toBe(false);
  });

  it('treats boundary edges and vertices as inside', () => {
    expect(pointInPolygon({ x: 0, y: 5 }, square)).toBe(true); // on left edge
    expect(pointInPolygon({ x: 5, y: 0 }, square)).toBe(true); // on bottom edge
    expect(pointInPolygon({ x: 0, y: 0 }, square)).toBe(true); // vertex
    expect(pointInPolygon({ x: 10, y: 10 }, square)).toBe(true); // vertex
  });

  it('handles concave polygons (left-facing notch)', () => {
    // A rightward triangle with its left edge pushed in to (3, 5), carving a
    // concave notch on the left around x < 3, y = 5.
    const concave: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 10 },
      { x: 3, y: 5 },
    ];
    expect(pointInPolygon({ x: 1, y: 5 }, concave)).toBe(false); // inside the notch (excluded)
    expect(pointInPolygon({ x: 5, y: 5 }, concave)).toBe(true); // main body
    expect(pointInPolygon({ x: 8, y: 5 }, concave)).toBe(true); // right tip
  });

  it('returns false for degenerate polygons', () => {
    expect(pointInPolygon({ x: 0, y: 0 }, [])).toBe(false);
    expect(pointInPolygon({ x: 0, y: 0 }, [{ x: 0, y: 0 }])).toBe(false);
    expect(
      pointInPolygon({ x: 0, y: 0 }, [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(false);
  });

  it('handles clockwise and counter-clockwise winding equally', () => {
    const ccw: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const cw: Polygon = [...ccw].reverse();
    expect(pointInPolygon({ x: 5, y: 5 }, ccw)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 5 }, cw)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, ccw)).toBe(false);
    expect(pointInPolygon({ x: 15, y: 5 }, cw)).toBe(false);
  });
});
