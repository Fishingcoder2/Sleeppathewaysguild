import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Explicitly build into an isolated case-review route. The legacy static V3
// experience is not rewritten or removed by this prototype.
export default defineConfig({
  base: '/case-review/',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../case-review', emptyOutDir: true, sourcemap: false },
});
