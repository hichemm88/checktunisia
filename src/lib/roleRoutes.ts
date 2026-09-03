import type { Role } from '@/stores/authStore';

/**
 * Destinations post-authentification, par rôle.
 *
 * Centralisé parce que la 2FA est désormais exigée pour les comptes autorité
 * ET les administrateurs plateforme : plusieurs écrans doivent router vers le
 * bon tableau de bord ou la bonne page de configuration, et une redirection
 * codée en dur vers /authority/* envoyait un admin sur un portail interdit.
 */

export const homePathForRole = (role?: Role | null): string => {
  if (role === 'authority_user') return '/authority/dashboard';
  if (role === 'platform_admin') return '/admin/dashboard';
  return '/hotel/dashboard';
};

export const twoFactorSetupPathForRole = (role?: Role | null): string =>
  role === 'platform_admin' ? '/admin/2fa/setup' : '/authority/2fa/setup';

/**
 * La destination visée (`?next=`) survit à la déconnexion : elle vit dans
 * l'URL, pas dans le store. Un utilisateur redirigé vers
 * `/login?next=%2Fhotel%2Fdashboard` (parce qu'un onglet ou l'historique du
 * navigateur pointait encore sur l'ancien rôle) puis authentifié avec un
 * AUTRE rôle atterrissait sur cette destination sans que personne ne
 * vérifie qu'elle lui était accessible. `RequireRole` la renvoyait aussitôt
 * vers ce même `/login?next=...` — l'écran de connexion semblait figé,
 * puisqu'on y revenait exactement.
 *
 * Reflète le découpage des routes de `App.tsx` (RequireRole par préfixe) :
 * à mettre à jour avec lui si un rôle change de préfixe.
 */
export const isPathAllowedForRole = (path: string, role?: Role | null): boolean => {
  if (path.startsWith('/hotel'))     return role === 'hotel_admin' || role === 'receptionist';
  if (path.startsWith('/authority')) return role === 'authority_user';
  if (path.startsWith('/admin'))     return role === 'platform_admin';
  return true; // routes communes à tous les rôles authentifiés (ex. /profile)
};
