import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // Le greffon React n'est pas décoratif : sans lui, un fichier de test `.tsx`
  // n'est pas transformé et échoue au premier `<`.
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    /*
     * `node` par défaut, `jsdom` à la demande.
     *
     * La suite est surtout faite de logique pure, qui tourne plus vite sans
     * DOM. Les écrans de connexion par code WhatsApp, eux, ne se testent pas
     * autrement : ce qu'il faut vérifier — que le message reste neutre, que le
     * collage du presse-papiers fonctionne, que le succès remonte bien au
     * parent — n'existe qu'au rendu. Ces fichiers-là portent
     * `@vitest-environment jsdom` en première ligne.
     */
    environment: 'node',
    // `.tsx` accepté : les tests de composants ne peuvent pas s'en passer.
    include: ['api/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
