/**
 * Destination visée, préservée à travers l'authentification.
 *
 * ── Le problème concret ──────────────────────────────────────────────────────
 *
 * Les fiches de police partent aux agents par WhatsApp, avec un bouton
 * « Consulter la fiche » qui pointe sur /authority/guests/{id}. Les agents ont
 * un compte, mais n'ouvrent pas encore le portail au quotidien : le clic tombe
 * donc presque toujours sur un navigateur non connecté.
 *
 * Sans mémoire de la destination, l'agent se connectait et atterrissait sur le
 * tableau de bord — il ne voyait jamais la fiche pour laquelle il avait cliqué,
 * et devait la retrouver à la main. Le bouton est le levier d'adoption du
 * portail : le premier clic doit aboutir, sinon il n'y en a pas de second.
 *
 * ── Pourquoi un paramètre d'URL et non l'état du routeur ─────────────────────
 *
 * Le parcours peut passer par une étape de vérification 2FA, une actualisation
 * de page, ou un gestionnaire de mots de passe qui rouvre l'onglet. L'état du
 * routeur ne survit à aucun des trois ; l'URL, si.
 */

const PARAM = 'next';

/**
 * Chemin interne sûr, ou null.
 *
 * Le paramètre vient de l'URL : n'importe qui peut fabriquer un lien
 * « /login?next=https://exemple.invalid ». Sans ce filtre, la page de connexion
 * du portail des forces de l'ordre deviendrait un tremplin de hameçonnage
 * parfaitement crédible — le domaine affiché serait le bon.
 *
 * On n'accepte donc qu'un chemin absolu du même site : commence par un seul
 * « / », et jamais « // » (URL protocol-relative, qui pointe ailleurs).
 */
export const safeIntendedPath = (raw: string | null | undefined): string | null => {
  if (!raw) return null;

  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // Séquence d'échappement invalide : on ne devine pas.
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//')) return null;

  // « \ » est traité comme « / » par certains navigateurs : /\exemple.invalid
  // se résout hors du site.
  if (value.startsWith('/\\')) return null;

  return value;
};

/** Chemin de connexion portant la destination visée. */
export const loginPathFor = (pathname: string, search = ''): string =>
  `/login?${PARAM}=${encodeURIComponent(pathname + search)}`;

/** Destination visée présente dans l'URL courante, si elle est sûre. */
export const readIntendedPath = (search: string): string | null =>
  safeIntendedPath(new URLSearchParams(search).get(PARAM));
