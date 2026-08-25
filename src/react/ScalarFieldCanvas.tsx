import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type CanvasHTMLAttributes,
} from 'react';
import {
  resolveColorMap,
  type BuiltInColorMapName,
} from '../core/colormap';
import { renderScalarGrid } from '../core/render';
import { buildScalarGrid } from '../core/scalarField';
import type {
  Bounds,
  ColorMap,
  DataPoint,
  GaussianInterpolationOptions,
  GridSize,
  Polygon,
} from '../core/types';
import {
  mergeRefs,
  useDevicePixelRatio,
  useElementSize,
  useIsomorphicLayoutEffect,
} from './hooks';

type CanvasPassthroughProps = Omit<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  'width' | 'height'
>;

/**
 * Props for {@link ScalarFieldCanvas}.
 */
export interface ScalarFieldCanvasProps extends CanvasPassthroughProps {
  /** Scattered scalar samples to interpolate. */
  data: readonly DataPoint[];
  /** World-coordinate rectangle covered by the grid. */
  bounds: Bounds;
  /** Interpolation grid resolution, in cells. */
  grid: GridSize;
  /** Interpolation configuration. Defaults to Gaussian (`neighbors: 4`). */
  interpolation?: GaussianInterpolationOptions;
  /** Optional polygon; cells outside it are not drawn. */
  mask?: Polygon;
  /** Built-in color map name or a custom function. Defaults to `"jet"`. */
  colorMap?: ColorMap | BuiltInColorMapName;
  /** Value mapped to the low end of the color map. Defaults to the data minimum. */
  min?: number;
  /** Value mapped to the high end of the color map. Defaults to the data maximum. */
  max?: number;
  /** Uniform opacity in `[0, 1]`. Defaults to `1`. */
  opacity?: number;
  /** Fixed CSS width in pixels. Ignored when `responsive` is set. */
  width?: number;
  /** Fixed CSS height in pixels. Ignored when `responsive` is set. */
  height?: number;
  /** Fill the parent element and follow its size via `ResizeObserver`. */
  responsive?: boolean;
  /** Enable smoothing when scaling the grid to the canvas. Defaults to `true`. */
  smoothing?: boolean;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 150;

/**
 * Renders a 2D scalar field to an HTML canvas.
 *
 * The heavy work is split into independently-memoized stages so that changing,
 * say, opacity does not re-run interpolation, and resizing only re-blits the
 * cached raster:
 *
 * ```text
 * data / bounds / grid / interpolation / mask  ->  scalar grid
 * scalar grid / color map / min / max / opacity ->  raster (RGBA)
 * raster / canvas size / dpr                    ->  draw
 * ```
 *
 * The forwarded ref points at the underlying `<canvas>` element.
 */
export const ScalarFieldCanvas = forwardRef<HTMLCanvasElement, ScalarFieldCanvasProps>(
  function ScalarFieldCanvas(props, forwardedRef) {
    const {
      data,
      bounds,
      grid,
      interpolation,
      mask,
      colorMap = 'jet',
      min,
      max,
      opacity = 1,
      width,
      height,
      responsive = false,
      smoothing = true,
      style,
      ...rest
    } = props;

    const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
    const setRef = useMemo(
      () => mergeRefs<HTMLCanvasElement>(setCanvasEl, forwardedRef),
      [forwardedRef],
    );

    const dpr = useDevicePixelRatio();
    const measured = useElementSize(canvasEl, responsive);

    const { minX, maxX, minY, maxY } = bounds;
    const { width: gridWidth, height: gridHeight } = grid;
    const sigma = interpolation?.sigma;
    const neighbors = interpolation?.neighbors;
    const interpType = interpolation?.type;

    // Stage 1: interpolate + mask. Depends only on the field-defining inputs.
    const scalarGrid = useMemo(
      () =>
        buildScalarGrid({
          data,
          bounds: { minX, maxX, minY, maxY },
          grid: { width: gridWidth, height: gridHeight },
          interpolation: { type: interpType, sigma, neighbors },
          mask,
        }),
      [data, minX, maxX, minY, maxY, gridWidth, gridHeight, interpType, sigma, neighbors, mask],
    );

    const resolvedColorMap = useMemo(() => resolveColorMap(colorMap), [colorMap]);

    // Stage 2: rasterize to RGBA. Independent of canvas pixel size.
    const renderResult = useMemo(
      () => renderScalarGrid(scalarGrid, { colorMap: resolvedColorMap, min, max, opacity }),
      [scalarGrid, resolvedColorMap, min, max, opacity],
    );

    // Cached offscreen canvas holding the grid-resolution raster; rebuilt only
    // when the RGBA buffer changes, reused across resizes.
    const offscreenRef = useRef<{ rgba: Uint8ClampedArray; canvas: HTMLCanvasElement } | null>(
      null,
    );

    const cssWidth = responsive ? (measured?.width ?? 0) : (width ?? DEFAULT_WIDTH);
    const cssHeight = responsive ? (measured?.height ?? 0) : (height ?? DEFAULT_HEIGHT);

    // Stage 3: blit the raster onto the visible canvas at device resolution.
    const draw = useCallback(() => {
      const canvas = canvasEl;
      if (!canvas) return;
      if (cssWidth <= 0 || cssHeight <= 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let offscreen = offscreenRef.current;
      if (!offscreen || offscreen.rgba !== renderResult.rgba) {
        const oc = document.createElement('canvas');
        oc.width = Math.max(1, renderResult.width);
        oc.height = Math.max(1, renderResult.height);
        const octx = oc.getContext('2d');
        if (octx && renderResult.width > 0 && renderResult.height > 0) {
          const image = octx.createImageData(renderResult.width, renderResult.height);
          image.data.set(renderResult.rgba);
          octx.putImageData(image, 0, 0);
        }
        offscreen = { rgba: renderResult.rgba, canvas: oc };
        offscreenRef.current = offscreen;
      }

      const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
      const backingHeight = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;

      ctx.imageSmoothingEnabled = smoothing;
      ctx.clearRect(0, 0, backingWidth, backingHeight);
      if (renderResult.width > 0 && renderResult.height > 0) {
        ctx.drawImage(
          offscreen.canvas,
          0,
          0,
          renderResult.width,
          renderResult.height,
          0,
          0,
          backingWidth,
          backingHeight,
        );
      }
    }, [canvasEl, renderResult, cssWidth, cssHeight, dpr, smoothing]);

    useIsomorphicLayoutEffect(() => {
      draw();
    }, [draw]);

    const resolvedStyle: CSSProperties = responsive
      ? { display: 'block', width: '100%', height: '100%', ...style }
      : { display: 'block', width: `${cssWidth}px`, height: `${cssHeight}px`, ...style };

    return <canvas ref={setRef} style={resolvedStyle} {...rest} />;
  },
);

ScalarFieldCanvas.displayName = 'ScalarFieldCanvas';
