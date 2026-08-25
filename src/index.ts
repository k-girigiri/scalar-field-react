export { ScalarFieldCanvas } from './react/ScalarFieldCanvas';
export type { ScalarFieldCanvasProps } from './react/ScalarFieldCanvas';

export { buildScalarGrid } from './core/scalarField';
export type { BuildScalarGridOptions } from './core/scalarField';

export { renderScalarGrid } from './core/render';
export type { ColorMappingOptions, RenderResult } from './core/render';

export { GridGeometry } from './core/geometry';
export { pointInPolygon } from './core/polygon';
export { interpolateGaussian, defaultSigma, DEFAULT_NEIGHBORS } from './core/interpolation';

export {
  jet,
  builtInColorMaps,
  createLinearColorMap,
  resolveColorMap,
} from './core/colormap';
export type { BuiltInColorMapName, ColorStop } from './core/colormap';

export type {
  Point2D,
  DataPoint,
  Bounds,
  GridSize,
  Polygon,
  ColorTuple,
  ColorMap,
  GaussianInterpolationOptions,
  InterpolationOptions,
  ScalarGrid,
} from './core/types';
