import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  // Tauri erwartet relativen Asset-Pfad; schadet der PWA nicht.
  base: './',
});
