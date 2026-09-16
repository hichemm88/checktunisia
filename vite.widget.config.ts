import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Build SÉPARÉ du widget embarqué (§3, API-V1-DECISIONS.md D5) : la page
 * /widget/fiche est servie par une vue Blade Laravel (backend/resources/views/
 * widget-shell.blade.php) qui référence des noms de fichiers FIXES — ce build
 * ne doit donc jamais produire de noms hashés, contrairement au build
 * principal (vite.config.ts).
 *
 * npm run build:widget  →  dist-widget/widget-main.js + widget-main.css
 * Déploiement : copier dist-widget/* dans backend/public/widget-assets/.
 */
export default defineConfig({
  plugins: [react()],
  // Le widget n'a besoin d'aucun asset statique de l'app principale
  // (favicons, manifest PWA, données tesseract…) : sans ceci, Vite copie tout
  // le dossier public/ partagé dans dist-widget/ pour rien.
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/widget-main.tsx'),
      output: {
        entryFileNames: 'widget-main.js',
        assetFileNames: 'widget-main[extname]',
        chunkFileNames: 'widget-main-chunk-[hash].js',
      },
    },
  },
});
