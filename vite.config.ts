import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fix for react-router 6.x + Node 22 / rollup 4.x CJS/ESM resolution
      'react-router': path.resolve(__dirname, 'node_modules/react-router/dist/index.js'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom/dist/index.js'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    // Output assets at root (no /assets/ subfolder) for simpler Vercel deployment
    assetsDir: '',
    rollupOptions: {
      output: {
        assetFileNames: '[name]-[hash][extname]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
      },
    },
  },
});
