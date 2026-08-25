import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Alias the package name to the library source so the demo always reflects the
// latest local changes without a build step.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'scalar-field-react': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
});
