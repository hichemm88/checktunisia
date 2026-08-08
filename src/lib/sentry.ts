import * as Sentry from '@sentry/react';

/**
 * Suivi des erreurs navigateur.
 *
 * Inerte sans VITE_SENTRY_DSN : c'est l'état par défaut en local et sur toute
 * préproduction où la variable n'est pas posée.
 *
 * Ce produit manipule un registre d'identité. La règle est la même que côté
 * backend : on envoie de quoi diagnostiquer (route, rôle, établissement),
 * jamais de quoi identifier une personne. Les écrans de saisie de voyageur
 * sont précisément ceux qui plantent le plus — ce sont aussi ceux dont il ne
 * faut surtout rien laisser filtrer.
 */

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Retire d'un événement tout ce qui pourrait identifier une personne.
 * Exporté séparément pour être testable sans initialiser le SDK — c'est la
 * garantie la plus importante du fichier, elle mérite un test direct.
 */
export const scrubEvent = <T extends { request?: unknown; extra?: unknown }>(event: T): T => {
  const request = event.request as
    | { url?: string; query_string?: unknown; data?: unknown; cookies?: unknown }
    | undefined;

  if (request) {
    // Une URL peut porter des critères de recherche autorité (nom, numéro de
    // document) ; on ne garde jamais la query string.
    if (typeof request.url === 'string') request.url = request.url.split('?')[0];
    delete request.query_string;
    delete request.data;
    delete request.cookies;
  }

  // La casse d'un composant peut embarquer des props dans les extras.
  delete event.extra;

  return event;
};

/**
 * Filtre les fils d'Ariane : les saisies clavier et les corps de requête
 * contiendraient les valeurs tapées pendant un check-in.
 */
export const scrubBreadcrumb = <T extends { category?: string; data?: unknown }>(
  breadcrumb: T,
): T | null => {
  if (breadcrumb.category === 'ui.input') return null;

  if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
    const data = breadcrumb.data as Record<string, unknown> | undefined;
    if (data) {
      delete data.body;
      // On conserve la méthode, l'URL sans paramètres et le code de statut.
      if (typeof data.url === 'string') data.url = data.url.split('?')[0];
    }
  }

  return breadcrumb;
};

export const initSentry = (): void => {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,

    // Pas d'IP, pas de cookies, pas d'en-têtes.
    sendDefaultPii: false,

    /*
     * Aucune session replay ni trace de performance : le replay REJOUE l'écran
     * de l'utilisateur, ce qui capturerait littéralement les documents
     * d'identité affichés pendant un check-in.
     *
     * ⚠️ On FILTRE les intégrations par défaut, on ne les remplace pas par une
     * liste vide : `integrations: []` désactiverait aussi `globalHandlers` et
     * `browserApiErrors`, c'est-à-dire la capture automatique des erreurs — le
     * SDK ne remonterait plus que les appels manuels à captureError(), et les
     * filtres de fils d'Ariane ci-dessous ne serviraient à rien.
     */
    integrations: (defaults) =>
      defaults.filter((integration) => !/Replay|BrowserTracing/i.test(integration.name)),
    tracesSampleRate: 0,

    // Derniers filets avant envoi (fonctions pures, testées isolément).
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
};

/**
 * Contexte non identifiant, posé après authentification.
 * Identifiant opaque uniquement — jamais l'email ni le nom.
 */
export const setSentryUser = (user: { id: string; role: string } | null): void => {
  if (!DSN) return;

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({ id: user.id });
  Sentry.setTag('role', user.role);
};

/** Remonte une erreur applicative attrapée manuellement. */
export const captureError = (error: unknown, context?: Record<string, string>): void => {
  if (!DSN) return;
  Sentry.captureException(error, context ? { tags: context } : undefined);
};
