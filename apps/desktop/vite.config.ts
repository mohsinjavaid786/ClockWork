import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
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
