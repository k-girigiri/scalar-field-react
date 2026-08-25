// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('SSR safety', () => {
  it('has no browser globals in this environment', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('imports the package without touching browser APIs', async () => {
    const mod = await import('./index');
    expect(typeof mod.ScalarFieldCanvas).toBe('object'); // forwardRef object
    expect(typeof mod.buildScalarGrid).toBe('function');
    expect(typeof mod.jet).toBe('function');
  });

  it('runs the headless pipeline server-side', async () => {
    const { buildScalarGrid, renderScalarGrid, jet } = await import('./index');
    const grid = buildScalarGrid({
      data: [
        { x: 1, y: 1, value: 0 },
        { x: 9, y: 9, value: 100 },
      ],
      bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
      grid: { width: 8, height: 8 },
    });
    const result = renderScalarGrid(grid, { colorMap: jet });
    expect(result.rgba).toHaveLength(8 * 8 * 4);
    expect(result.min).toBeLessThan(result.max);
  });
});
