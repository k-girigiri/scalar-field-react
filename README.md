# scalar-field-react

Render 2D **scalar fields** from scattered data points to an HTML canvas — with
Gaussian interpolation, polygon masking, and color maps. A small, strongly-typed
React library with predictable rendering behavior.

`scalar-field-react` takes discrete samples of the form `(x, y, value)`,
interpolates them onto a regular grid, applies an optional polygon mask, maps the
values to colors, and draws the result to a `<canvas>`. The `value` is
intentionally **domain-agnostic** — it can be temperature, humidity, pressure,
elevation, density, a sensor reading, or any other 2D numeric field.

## Features

- **Gaussian interpolation** from scattered points, with configurable `sigma`
  and `neighbors`.
- **Polygon mask** to restrict the drawn region (supports concave polygons and
  boundary cells).
- **Color maps**: a Matplotlib-accurate built-in `jet`, plus first-class support
  for custom, type-safe color maps.
- **Explicit `min`/`max`** so multiple fields can share one color scale.
- **Retina / High-DPI** aware — sharp on any `devicePixelRatio`.
- **Responsive** sizing via `ResizeObserver`, or fixed pixel sizes.
- **SSR-safe** — no browser globals are touched at import time (Next.js friendly).
- **Efficient by construction** — interpolation, color mapping, and drawing are
  independently memoized; resizing only re-blits the cached raster.
- **Tree-shakeable ESM**, TypeScript declarations, zero runtime dependencies.

## Installation

```bash
npm install scalar-field-react
```

React 18 or 19 is required as a peer dependency.

## Quick Start

```tsx
import { ScalarFieldCanvas, type DataPoint } from 'scalar-field-react';

const data: DataPoint[] = [
  { x: 10, y: 10, value: 22 },
  { x: 80, y: 20, value: 31 },
  { x: 50, y: 70, value: 27 },
  { x: 20, y: 90, value: 19 },
];

export function Example() {
  return (
    <ScalarFieldCanvas
      data={data}
      bounds={{ minX: 0, maxX: 100, minY: 0, maxY: 100 }}
      grid={{ width: 200, height: 200 }}
      interpolation={{ type: 'gaussian', sigma: 12, neighbors: 4 }}
      colorMap="jet"
      min={15}
      max={35}
      opacity={0.9}
      width={480}
      height={480}
    />
  );
}
```

## API

### `<ScalarFieldCanvas />`

| Prop            | Type                                   | Default     | Description |
| --------------- | -------------------------------------- | ----------- | ----------- |
| `data`          | `readonly DataPoint[]`                 | —           | Scattered samples to interpolate. |
| `bounds`        | `Bounds`                               | —           | World rectangle covered by the grid. |
| `grid`          | `GridSize`                             | —           | Interpolation resolution in cells. |
| `interpolation` | `GaussianInterpolationOptions`         | Gaussian    | `{ type?, sigma?, neighbors? }`. |
| `mask`          | `Polygon`                              | —           | Optional polygon; outside cells are not drawn. |
| `colorMap`      | `ColorMap \| 'jet'`                    | `'jet'`     | Built-in name or a custom function. |
| `min`           | `number`                               | data min    | Value mapped to the low color. |
| `max`           | `number`                               | data max    | Value mapped to the high color. |
| `opacity`       | `number` (0–1)                         | `1`         | Uniform layer opacity. |
| `width`         | `number` (CSS px)                      | `300`       | Fixed width (ignored when `responsive`). |
| `height`        | `number` (CSS px)                      | `150`       | Fixed height (ignored when `responsive`). |
| `responsive`    | `boolean`                              | `false`     | Fill the parent and follow its size. |
| `smoothing`     | `boolean`                              | `true`      | Smooth scaling from grid to canvas. |

All other standard `<canvas>` attributes (`className`, `style`, `aria-label`, …)
are forwarded to the underlying element. The forwarded `ref` points at the
`<canvas>` DOM node.

### Headless / exported utilities

The color-independent computation is available without React, which is handy for
offscreen or server-side use:

```ts
import { buildScalarGrid, renderScalarGrid, jet } from 'scalar-field-react';

const grid = buildScalarGrid({ data, bounds, grid: { width: 200, height: 200 } });
const { rgba, min, max } = renderScalarGrid(grid, { colorMap: jet });
// rgba is a Uint8ClampedArray ready for `new ImageData(rgba, width, height)`
```

Also exported: `GridGeometry`, `pointInPolygon`, `interpolateGaussian`,
`defaultSigma`, `DEFAULT_NEIGHBORS`, `createLinearColorMap`, `resolveColorMap`,
`builtInColorMaps`, and the types `Point2D`, `DataPoint`, `Bounds`, `GridSize`,
`Polygon`, `ColorTuple`, `ColorMap`, `GaussianInterpolationOptions`,
`InterpolationOptions`, `ScalarGrid`, `ColorStop`, `BuiltInColorMapName`,
`ColorMappingOptions`, `RenderResult`, `BuildScalarGridOptions`.

## Data format

```ts
interface DataPoint {
  x: number;
  y: number;
  value: number;
}
```

Points may be anywhere in world coordinates; they do not need to lie inside
`bounds` (nearby out-of-bounds points still influence edge cells). Each point
must have finite `x`, `y`, and `value` — non-finite numbers throw a descriptive
error at build time. The grid is **y-up**: `bounds.minY` maps to the bottom of
the canvas and `bounds.maxY` to the top.

## Gaussian interpolation

Each grid cell center is interpolated from its `neighbors` nearest data points
using Gaussian weights:

```text
weight = exp(-(distance²) / (2 · sigma²))
value  = Σ(value · weight) / Σ(weight)
```

- **`sigma`** (world units) controls smoothness. Larger is smoother. When
  omitted, a data-aware default is used: the characteristic spacing
  `sqrt(area / n)` of the samples over `bounds`.
- **`neighbors`** limits how many nearest points contribute to each cell
  (default `4`), keeping large fields fast. Nearest-neighbor lookup uses an
  internal uniform spatial index, so cost scales with grid size rather than
  `cells × points`.

Only Gaussian interpolation ships in v0.1; the `interpolation.type` field is the
extension point for future methods.

## Polygon mask

```tsx
const mask = [
  { x: 10, y: 10 },
  { x: 90, y: 10 },
  { x: 80, y: 80 },
  { x: 20, y: 80 },
];

<ScalarFieldCanvas /* … */ mask={mask} />;
```

Cells whose centers fall outside the polygon are left transparent. The
point-in-polygon test uses the even-odd rule, handles **concave** polygons, and
treats boundary points as inside. A polygon must have at least 3 vertices (an
empty array means "no mask"). The `pointInPolygon` helper is exported for reuse.

## ColorMap

A `ColorMap` maps a normalized `t ∈ [0, 1]` to an RGB triple:

```ts
type ColorTuple = readonly [r: number, g: number, b: number]; // 0..255
type ColorMap = (t: number) => ColorTuple;
```

The built-in `jet` closely follows Matplotlib's `jet` (per-channel piecewise
segments), e.g. `jet(0) === [0, 0, 128]` and `jet(1) === [128, 0, 0]`.

### Customization

Build a gradient color map from stops:

```ts
import { createLinearColorMap } from 'scalar-field-react';

const viridis = createLinearColorMap([
  { t: 0, color: [68, 1, 84] },
  { t: 0.5, color: [33, 145, 140] },
  { t: 1, color: [253, 231, 37] },
]);

<ScalarFieldCanvas /* … */ colorMap={viridis} />;
```

Or pass any function directly — `colorMap={(t) => [t * 255, 0, (1 - t) * 255]}`.

Provide explicit `min`/`max` to lock the scale so several canvases can be
compared on identical footing. When both are provided, `min` must be less than
or equal to `max`.

## Responsive Canvas

Set `responsive` to make the canvas fill its parent and track size changes via
`ResizeObserver`:

```tsx
<div style={{ width: '100%', height: '60vh' }}>
  <ScalarFieldCanvas data={data} bounds={bounds} grid={{ width: 200, height: 200 }} responsive />
</div>
```

Resizing only re-blits the already-computed raster — it does **not** re-run
interpolation or color mapping.

## Retina / DPR

The canvas backing store is sized to `cssSize × devicePixelRatio`, so output is
crisp on Retina and other high-DPI displays. Changes to `devicePixelRatio`
(moving windows between monitors, browser zoom) are observed and redrawn
automatically.

## Ref

The forwarded ref is the `<canvas>` element itself — no custom imperative API:

```tsx
const ref = useRef<HTMLCanvasElement>(null);

<ScalarFieldCanvas ref={ref} /* … */ />;

// e.g. export the current view
const url = ref.current?.toDataURL('image/png');
```

## SSR / Next.js

The package accesses no browser globals at import time, so importing it in a
server component or during SSR is safe. Browser APIs (`document`, `window`,
canvas contexts, `ResizeObserver`) are only touched inside client effects. The
headless helpers (`buildScalarGrid`, `renderScalarGrid`, …) run anywhere,
including Node.

## Performance considerations

- **Memoize `data` and `mask`.** Interpolation re-runs when the `data` or `mask`
  reference changes. Keep them stable (`useMemo`) unless they truly change.
  Scalar props (`bounds`, `grid`, `sigma`, `neighbors`) are compared by value, so
  inline `bounds={{ … }}` objects are fine.
- The pipeline is staged so unrelated changes stay cheap:

  ```text
  data / bounds / grid / interpolation / mask   →  scalar grid   (interpolate + mask)
  scalar grid / colorMap / min / max / opacity  →  raster (RGBA)
  raster / canvas size / dpr                     →  draw
  ```

- Cost is dominated by interpolation: roughly `O(gridCells × neighbors)` with the
  spatial index. Prefer a grid resolution near your display size rather than far
  above it.

## Development

```bash
npm install      # install dependencies
npm run dev      # build the library in watch mode

# run the interactive demo
cd demo
npm install
npm run dev
```

The `demo/` app (Vite + React) exercises Gaussian interpolation, the polygon
mask, `jet` and a custom color map, `min`/`max`, opacity, responsive sizing, and
PNG export via `ref`.

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
npm run test:tarball # pack + install + smoke test
npm run build       # tsup (ESM + d.ts)
```

Tests cover the geometry math, spatial index (validated against brute-force
k-NN), Gaussian interpolation, polygon logic, color mapping, rasterization, and
the React component (rendering, prop changes, redraw-without-recompute, DPR,
ref, unmount, and SSR-safe module loading).

## License

MIT © k-girigiri
