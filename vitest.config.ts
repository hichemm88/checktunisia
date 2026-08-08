import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    // src/ ajouté : la couche React n'avait aucun test. On commence par la
    // logique pure et vérifiable — le filtrage des données personnelles avant
    // envoi au suivi d'erreurs.
    include: ['api/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
