/**
 * Release-candidate check: build the library, pack it, install the tarball into
 * a minimal consumer app, and verify the published entry points resolve.
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, cwd = root) {
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

console.log('==> Building library');
run('npm run build');

console.log('==> Creating tarball');
run('npm pack --silent');
const pkg = readJson(join(root, 'package.json'));
const tarballName = `scalar-field-react-${pkg.version}.tgz`;
const tarballPath = join(root, tarballName);

const workDir = mkdtempSync(join(tmpdir(), 'scalar-field-react-consumer-'));
const consumerDir = join(workDir, 'consumer');

try {
  console.log('==> Setting up consumer at', consumerDir);
  cpSync(join(root, 'integration/consumer'), consumerDir, { recursive: true });

  console.log('==> Installing tarball');
  run(`npm install "${tarballPath}" react react-dom`, consumerDir);

  console.log('==> Verifying package exports');
  const installedPkg = readJson(
    join(consumerDir, 'node_modules/scalar-field-react/package.json'),
  );
  if (!installedPkg.exports?.['.']?.import) {
    throw new Error('Installed package is missing ESM export map');
  }

  console.log('==> Running consumer smoke test');
  run(
    'node --input-type=module -e "import { ScalarFieldCanvas, buildScalarGrid, renderScalarGrid, jet } from \'scalar-field-react\'; import assert from \'node:assert\'; assert.equal(typeof ScalarFieldCanvas, \'object\'); assert.equal(typeof buildScalarGrid, \'function\'); assert.equal(typeof jet, \'function\'); const grid = buildScalarGrid({ data: [{ x: 1, y: 1, value: 10 }, { x: 9, y: 9, value: 20 }], bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 }, grid: { width: 8, height: 8 } }); const rendered = renderScalarGrid(grid, { colorMap: jet }); assert.equal(rendered.rgba.length, 8 * 8 * 4); console.log(\'consumer smoke test passed\');"',
    consumerDir,
  );

  console.log('==> Tarball integration passed');
} finally {
  rmSync(workDir, { recursive: true, force: true });
  rmSync(tarballPath, { force: true });
}
