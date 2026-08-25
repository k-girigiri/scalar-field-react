import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ScalarFieldCanvas,
  createLinearColorMap,
  type ColorMap,
  type DataPoint,
  type Polygon,
} from 'scalar-field-react';

const BOUNDS = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

// Deterministic pseudo-random sample data so the demo is stable across reloads.
function makeData(count: number, seed: number): DataPoint[] {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length: count }, () => {
    const x = rand() * 100;
    const y = rand() * 100;
    // A couple of smooth "hot spots" plus noise, purely for visual interest.
    const value =
      60 * Math.exp(-((x - 30) ** 2 + (y - 70) ** 2) / 500) +
      40 * Math.exp(-((x - 75) ** 2 + (y - 25) ** 2) / 800) +
      rand() * 8;
    return { x, y, value };
  });
}

const MASK: Polygon = [
  { x: 10, y: 10 },
  { x: 90, y: 15 },
  { x: 80, y: 80 },
  { x: 45, y: 60 },
  { x: 20, y: 85 },
];

const viridis: ColorMap = createLinearColorMap([
  { t: 0, color: [68, 1, 84] },
  { t: 0.25, color: [59, 82, 139] },
  { t: 0.5, color: [33, 145, 140] },
  { t: 0.75, color: [94, 201, 98] },
  { t: 1, color: [253, 231, 37] },
]);

export function App() {
  const [pointCount, setPointCount] = useState(120);
  const [seed, setSeed] = useState(7);
  const [sigma, setSigma] = useState(10);
  const [neighbors, setNeighbors] = useState(4);
  const [opacity, setOpacity] = useState(0.9);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(80);
  const [useMask, setUseMask] = useState(true);
  const [responsive, setResponsive] = useState(false);
  const [colorMapName, setColorMapName] = useState<'jet' | 'viridis'>('jet');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Memoize data so that unrelated control changes (opacity, min/max) do not
  // rebuild the sample set and re-run interpolation unnecessarily.
  const data = useMemo(() => makeData(pointCount, seed), [pointCount, seed]);
  const colorMap = colorMapName === 'jet' ? 'jet' : viridis;

  const savePng = () => {
    const url = canvasRef.current?.toDataURL('image/png');
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scalar-field.png';
    a.click();
  };

  return (
    <div className="app">
      <header>
        <h1>scalar-field-react</h1>
        <p>Gaussian interpolation · polygon mask · color maps · Retina · responsive</p>
      </header>

      <div className="layout">
        <aside className="controls">
          <Field label={`Points: ${pointCount}`}>
            <input type="range" min={4} max={600} value={pointCount}
              onChange={(e) => setPointCount(Number(e.target.value))} />
          </Field>
          <Field label={`Seed: ${seed}`}>
            <input type="range" min={1} max={50} value={seed}
              onChange={(e) => setSeed(Number(e.target.value))} />
          </Field>
          <Field label={`Sigma: ${sigma}`}>
            <input type="range" min={1} max={40} value={sigma}
              onChange={(e) => setSigma(Number(e.target.value))} />
          </Field>
          <Field label={`Neighbors: ${neighbors}`}>
            <input type="range" min={1} max={16} value={neighbors}
              onChange={(e) => setNeighbors(Number(e.target.value))} />
          </Field>
          <Field label={`Opacity: ${opacity.toFixed(2)}`}>
            <input type="range" min={0} max={1} step={0.05} value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))} />
          </Field>
          <Field label={`Min: ${min}`}>
            <input type="range" min={0} max={100} value={min}
              onChange={(e) => setMin(Number(e.target.value))} />
          </Field>
          <Field label={`Max: ${max}`}>
            <input type="range" min={0} max={100} value={max}
              onChange={(e) => setMax(Number(e.target.value))} />
          </Field>

          <label className="checkbox">
            <input type="checkbox" checked={useMask}
              onChange={(e) => setUseMask(e.target.checked)} />
            Polygon mask
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={responsive}
              onChange={(e) => setResponsive(e.target.checked)} />
            Responsive (fill container)
          </label>

          <Field label="Color map">
            <select value={colorMapName}
              onChange={(e) => setColorMapName(e.target.value as 'jet' | 'viridis')}>
              <option value="jet">jet (built-in)</option>
              <option value="viridis">viridis (custom)</option>
            </select>
          </Field>

          <button type="button" onClick={savePng}>Save PNG (via ref)</button>
        </aside>

        <main className={responsive ? 'stage responsive' : 'stage'}>
          <ScalarFieldCanvas
            ref={canvasRef}
            data={data}
            bounds={BOUNDS}
            grid={{ width: 220, height: 220 }}
            interpolation={{ type: 'gaussian', sigma, neighbors }}
            mask={useMask ? MASK : undefined}
            colorMap={colorMap}
            min={min}
            max={max}
            opacity={opacity}
            {...(responsive ? { responsive: true } : { width: 480, height: 480 })}
            style={{ border: '1px solid #2a2a35', borderRadius: 8, background: '#0e0e14' }}
          />
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="control">
      <span>{label}</span>
      {children}
    </div>
  );
}
