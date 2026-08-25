import type { Point2D, Polygon } from './types';

const ON_EDGE_EPSILON = 1e-9;

function isOnSegment(p: Point2D, a: Point2D, b: Point2D): boolean {
  // Collinearity via cross product, then a bounding-box containment check.
  const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > ON_EDGE_EPSILON) return false;

  const withinX = p.x >= Math.min(a.x, b.x) - ON_EDGE_EPSILON && p.x <= Math.max(a.x, b.x) + ON_EDGE_EPSILON;
  const withinY = p.y >= Math.min(a.y, b.y) - ON_EDGE_EPSILON && p.y <= Math.max(a.y, b.y) + ON_EDGE_EPSILON;
  return withinX && withinY;
}

/**
 * Tests whether a point lies inside a polygon.
 *
 * Uses the even-odd (ray casting) rule, which handles convex and concave
 * polygons alike. Points exactly on an edge or vertex are treated as inside, so
 * the result is stable for grid cells that fall on the boundary.
 *
 * Pure geometry — independent of canvas and React.
 */
export function pointInPolygon(point: Point2D, polygon: Polygon): boolean {
  const n = polygon.length;
  if (n < 3) return false;

  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[i];
    const b = polygon[j];

    if (isOnSegment(point, a, b)) return true;

    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }

  return inside;
}
