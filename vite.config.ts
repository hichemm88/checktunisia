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
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        assetFileNames: '[name]-[hash][extname]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        // Isole les grosses librairies dans des chunks stables : elles changent
        // rarement, donc restent en cache d'un déploiement à l'autre au lieu
        // d'être ré-téléchargées à chaque mise à jour du code applicatif. Le
        // chunk applicatif principal en ressort nettement plus léger.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router', 'react-router-dom'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          puck: ['@measured/puck'],
          anthropic: ['@anthropic-ai/sdk'],
          tesseract: ['tesseract.js'],
          mrz: ['mrz'],
        },
      },
    },
  },
});
