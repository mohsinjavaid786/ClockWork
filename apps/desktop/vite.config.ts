import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  // Relative asset paths: the packaged app loads index.html over file://, where an
  // absolute "/assets/..." path resolves to the filesystem root and 404s (black screen).
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@clockwork/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist-renderer'),
    emptyOutDir: true,
  },
});
