import type { Bounds, DataPoint } from './types';

/**
 * A single nearest-neighbor query result: the index of a data point and its
 * squared distance to the query location.
 */
export interface Neighbor {
  index: number;
  distanceSq: number;
}

/**
 * A uniform bucket grid over a set of data points, providing exact k-nearest
 * neighbor queries via expanding-ring search.
 *
 * This accelerates interpolation for large data sets: instead of scanning every
 * point for every grid cell (`O(cells * points)`), each query only visits the
 * buckets near the query location. Correctness is guaranteed by continuing to
 * expand rings until no unvisited bucket could contain a closer point.
 *
 * Pure logic — no canvas or React dependency.
 */
export class SpatialPointGrid {
  private readonly points: readonly DataPoint[];
  private readonly minX: number;
  private readonly minY: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly cellSize: number;
  /** For each bucket, the list of point indices it contains. */
  private readonly buckets: number[][];

  constructor(points: readonly DataPoint[], bounds: Bounds) {
    this.points = points;
    this.minX = bounds.minX;
    this.minY = bounds.minY;

    const spanX = Math.max(bounds.maxX - bounds.minX, Number.EPSILON);
    const spanY = Math.max(bounds.maxY - bounds.minY, Number.EPSILON);

    // Aim for roughly one point per bucket on average, which keeps ring search
    // cheap without wasting memory on empty buckets.
    const n = Math.max(points.length, 1);
    const area = spanX * spanY;
    this.cellSize = Math.max(Math.sqrt(area / n), Number.EPSILON);

    this.cols = Math.max(1, Math.ceil(spanX / this.cellSize));
    this.rows = Math.max(1, Math.ceil(spanY / this.cellSize));

    this.buckets = Array.from({ length: this.cols * this.rows }, () => []);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const b = this.bucketIndex(this.clampCol(p.x), this.clampRow(p.y));
      this.buckets[b].push(i);
    }
  }

  private clampCol(x: number): number {
    const c = Math.floor((x - this.minX) / this.cellSize);
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  private clampRow(y: number): number {
    const r = Math.floor((y - this.minY) / this.cellSize);
    return r < 0 ? 0 : r >= this.rows ? this.rows - 1 : r;
  }

  private bucketIndex(col: number, row: number): number {
    return row * this.cols + col;
  }

  /**
   * Returns up to `k` nearest points to `(x, y)`, sorted by increasing
   * distance. If fewer than `k` points exist, all of them are returned.
   */
  kNearest(x: number, y: number, k: number): Neighbor[] {
    const total = this.points.length;
    if (total === 0 || k <= 0) return [];

    const found: Neighbor[] = [];
    const centerCol = this.clampCol(x);
    const centerRow = this.clampRow(y);
    const maxRing = Math.max(this.cols, this.rows);

    for (let ring = 0; ring <= maxRing; ring++) {
      this.collectRing(centerCol, centerRow, ring, x, y, found);

      if (found.length >= k) {
        // After finishing ring `ring`, every unvisited bucket is at Chebyshev
        // distance >= ring + 1, so its closest possible point is at least
        // `ring * cellSize` away. Once the current k-th neighbor is nearer than
        // that, no farther ring can improve the result.
        found.sort(byDistance);
        const kth = found[k - 1]?.distanceSq ?? Infinity;
        const guaranteed = ring * this.cellSize;
        if (kth <= guaranteed * guaranteed) break;
      }
    }

    found.sort(byDistance);
    return found.length > k ? found.slice(0, k) : found;
  }

  private collectRing(
    centerCol: number,
    centerRow: number,
    ring: number,
    x: number,
    y: number,
    out: Neighbor[],
  ): void {
    const colLo = centerCol - ring;
    const colHi = centerCol + ring;
    const rowLo = centerRow - ring;
    const rowHi = centerRow + ring;

    for (let row = rowLo; row <= rowHi; row++) {
      if (row < 0 || row >= this.rows) continue;
      const onHorizontalEdge = row === rowLo || row === rowHi;
      for (let col = colLo; col <= colHi; col++) {
        if (col < 0 || col >= this.cols) continue;
        // Only the outer border of the (2*ring+1) square is new for this ring.
        if (!onHorizontalEdge && col !== colLo && col !== colHi) continue;
        const bucket = this.buckets[this.bucketIndex(col, row)];
        for (let i = 0; i < bucket.length; i++) {
          const idx = bucket[i];
          const p = this.points[idx];
          const dx = p.x - x;
          const dy = p.y - y;
          out.push({ index: idx, distanceSq: dx * dx + dy * dy });
        }
      }
    }
  }
}

function byDistance(a: Neighbor, b: Neighbor): number {
  return a.distanceSq - b.distanceSq;
}
