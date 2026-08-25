import { createRef } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScalarFieldCanvas } from './ScalarFieldCanvas';
import type { DataPoint } from '../core/types';

interface CanvasCallCounters {
  putImageData: number;
  drawImage: number;
  clearRect: number;
  createImageData: number;
}
declare const __canvasCalls: CanvasCallCounters;

const data: DataPoint[] = [
  { x: 1, y: 1, value: 10 },
  { x: 9, y: 9, value: 40 },
  { x: 1, y: 9, value: 20 },
  { x: 9, y: 1, value: 30 },
];
const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
const grid = { width: 20, height: 20 };

afterEach(() => {
  cleanup();
});

describe('ScalarFieldCanvas', () => {
  it('renders a canvas element', () => {
    const { container } = render(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} width={100} height={100} />,
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.style.width).toBe('100px');
  });

  it('draws on initial render', () => {
    render(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} width={100} height={100} />,
    );
    expect(__canvasCalls.putImageData).toBeGreaterThan(0);
    expect(__canvasCalls.drawImage).toBeGreaterThan(0);
  });

  it('sizes the backing store using devicePixelRatio', () => {
    window.devicePixelRatio = 2;
    const { container } = render(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} width={100} height={80} />,
    );
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(200); // 100 * 2
    expect(canvas.height).toBe(160); // 80 * 2
    window.devicePixelRatio = 1;
  });

  it('sizes the backing store at DPR 3', () => {
    window.devicePixelRatio = 3;
    const { container } = render(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} width={50} height={50} />,
    );
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(150);
    expect(canvas.height).toBe(150);
    window.devicePixelRatio = 1;
  });

  it('redraws on resize without recomputing the raster', () => {
    const { rerender } = render(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} width={100} height={100} />,
    );
    const rasterBuilds = __canvasCalls.putImageData;
    const drawsBefore = __canvasCalls.drawImage;

    rerender(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} width={200} height={100} />,
    );

    expect(__canvasCalls.putImageData).toBe(rasterBuilds);
    expect(__canvasCalls.drawImage).toBeGreaterThan(drawsBefore);
  });

  it('rebuilds the raster when data changes', () => {
    const { rerender } = render(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} width={100} height={100} />,
    );
    const rasterBuilds = __canvasCalls.putImageData;

    rerender(
      <ScalarFieldCanvas
        data={[...data, { x: 5, y: 5, value: 99 }]}
        bounds={bounds}
        grid={grid}
        width={100}
        height={100}
      />,
    );

    expect(__canvasCalls.putImageData).toBeGreaterThan(rasterBuilds);
  });

  it('rebuilds the raster when color options change', () => {
    const { rerender } = render(
      <ScalarFieldCanvas
        data={data}
        bounds={bounds}
        grid={grid}
        width={100}
        height={100}
        opacity={1}
      />,
    );
    const rasterBuilds = __canvasCalls.putImageData;

    rerender(
      <ScalarFieldCanvas
        data={data}
        bounds={bounds}
        grid={grid}
        width={100}
        height={100}
        opacity={0.5}
      />,
    );

    expect(__canvasCalls.putImageData).toBeGreaterThan(rasterBuilds);
  });

  it('exposes the canvas element through a forwarded ref', () => {
    const ref = createRef<HTMLCanvasElement>();
    render(
      <ScalarFieldCanvas
        ref={ref}
        data={data}
        bounds={bounds}
        grid={grid}
        width={100}
        height={100}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLCanvasElement);
  });

  it('forwards passthrough props like className and aria-label', () => {
    const { container } = render(
      <ScalarFieldCanvas
        data={data}
        bounds={bounds}
        grid={grid}
        width={100}
        height={100}
        className="field"
        aria-label="scalar field"
      />,
    );
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.className).toBe('field');
    expect(canvas.getAttribute('aria-label')).toBe('scalar field');
  });

  it('uses 100% CSS size in responsive mode', () => {
    const { container } = render(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} responsive />,
    );
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('100%');
  });

  it('unmounts cleanly', () => {
    const { unmount } = render(
      <ScalarFieldCanvas data={data} bounds={bounds} grid={grid} width={100} height={100} />,
    );
    expect(() => unmount()).not.toThrow();
  });
});
