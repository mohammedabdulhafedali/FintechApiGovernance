import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'platform-1-documentation/frontend'),
  publicDir: path.resolve(__dirname, 'platform-1-documentation/frontend/public'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'platform-1-documentation/frontend/src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/platform-1-documentation'),
    emptyOutDir: true,
  },
});
