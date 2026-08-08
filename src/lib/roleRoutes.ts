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
