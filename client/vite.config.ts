import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration.
 *
 * The /api proxy rewrites API calls to the backend during local development
 * so the frontend can use relative paths (/api/...) without CORS issues in
 * the dev environment. In production, a real reverse proxy (nginx / Vercel
 * rewrites) handles this.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Proxy WebSocket upgrades for Socket.io
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Warn if any individual chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,
  },
});
