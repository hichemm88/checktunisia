import { describe, it, expect } from 'vitest';
import { homePathForRole, isPathAllowedForRole } from './roleRoutes';

/**
 * `isPathAllowedForRole` protège la destination visée (`?next=`) portée
 * dans l'URL de connexion : ce paramètre survit à une déconnexion (il vit
 * dans l'URL, pas dans le store d'authentification) et peut donc viser une
 * route d'un rôle qui n'est plus celui qui vient de se connecter — par
 * exemple `/hotel/dashboard` resté dans l'URL après une déconnexion,
 * suivie d'une connexion en admin plateforme. Honorer aveuglément ce `next`
 * envoyait alors l'admin plateforme sur une route que `RequireRole` lui
 * refuse aussitôt, qui renvoie vers ce même `/login?next=...` : la connexion
 * semblait ne jamais aboutir.
 */
describe('isPathAllowedForRole', () => {
  it('autorise /hotel/* pour hotel_admin et receptionist uniquement', () => {
    expect(isPathAllowedForRole('/hotel/dashboard', 'hotel_admin')).toBe(true);
    expect(isPathAllowedForRole('/hotel/dashboard', 'receptionist')).toBe(true);
    expect(isPathAllowedForRole('/hotel/dashboard', 'platform_admin')).toBe(false);
    expect(isPathAllowedForRole('/hotel/dashboard', 'authority_user')).toBe(false);
  });

  it('autorise /authority/* pour authority_user uniquement', () => {
    expect(isPathAllowedForRole('/authority/guests/abc', 'authority_user')).toBe(true);
    expect(isPathAllowedForRole('/authority/guests/abc', 'hotel_admin')).toBe(false);
    expect(isPathAllowedForRole('/authority/guests/abc', 'platform_admin')).toBe(false);
  });

  it('autorise /admin/* pour platform_admin uniquement', () => {
    expect(isPathAllowedForRole('/admin/dashboard', 'platform_admin')).toBe(true);
    expect(isPathAllowedForRole('/admin/dashboard', 'hotel_admin')).toBe(false);
    expect(isPathAllowedForRole('/admin/dashboard', 'authority_user')).toBe(false);
  });

  it('autorise les routes communes (ex. /profile) pour tout rôle authentifié', () => {
    expect(isPathAllowedForRole('/profile', 'hotel_admin')).toBe(true);
    expect(isPathAllowedForRole('/profile', 'platform_admin')).toBe(true);
    expect(isPathAllowedForRole('/profile', 'authority_user')).toBe(true);
  });
});

describe('homePathForRole — repli utilisé quand `next` est refusé', () => {
  it('reste cohérent avec isPathAllowedForRole pour chaque rôle', () => {
    (['hotel_admin', 'receptionist', 'authority_user', 'platform_admin'] as const).forEach((role) => {
      expect(isPathAllowedForRole(homePathForRole(role), role)).toBe(true);
    });
  });
});
