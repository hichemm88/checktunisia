import { afterEach } from 'vitest';

/**
 * Préparation commune des tests.
 *
 * Chargée pour TOUS les fichiers de test, y compris ceux qui tournent sans DOM
 * (la grande majorité : la suite est surtout faite de logique pure). D'où la
 * garde ci-dessous — rien de ce qui suit n'a de sens sans `document`, et
 * l'importer inconditionnellement ferait échouer au chargement les tests qui
 * n'en ont pas.
 */
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');

  const { cleanup } = await import('@testing-library/react');

  /*
   * Démontage entre deux tests.
   *
   * Testing Library le fait tout seul quand `globals: true` — ce n'est pas le
   * cas ici, les tests existants importent `describe`/`it` explicitement. Sans
   * ce nettoyage, chaque `render()` EMPILE un composant de plus dans le même
   * document : les requêtes `getBy*` trouvent alors plusieurs correspondances
   * et échouent, mais seulement quand plusieurs tests tournent ensemble. Le
   * fichier passe donc en isolation et tombe en suite — le pire mode de panne
   * pour un test.
   */
  afterEach(cleanup);
}

export {};
