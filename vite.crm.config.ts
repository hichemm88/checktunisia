import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Build SÉPARÉ du mini-CRM de prospection interne (crm.qayed.tn), déployé
 * comme un service Railway distinct de l'app principale (Vercel) — voir
 * README pour l'architecture retenue.
 *
 * `publicDir` pointe sur public-crm/ (pas le public/ partagé) : cet outil
 * interne n'a besoin d'aucun des gros assets de l'app principale (opencv-js,
 * données tesseract…), qui gonfleraient pour rien l'image Railway. Seules
 * les polices de marque réellement utilisées ici (Archivo, IBM Plex Sans —
 * pas l'arabe ni le monospace) y sont dupliquées.
 *
 * npm run build:crm  →  dist-crm/ (crm.html + assets)
 */
export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, 'public-crm'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-router': path.resolve(__dirname, 'node_modules/react-router/dist/index.js'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom/dist/index.js'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist-crm',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'crm.html'),
    },
  },
});
