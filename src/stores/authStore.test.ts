// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';

/**
 * Changer de rôle dans le même onglet (admin plateforme → admin hôtel, ou
 * l'inverse) semblait échouer « du premier coup ».
 *
 * ── La cause ────────────────────────────────────────────────────────────
 *
 * `logout()` vidait bien le store d'authentification, mais jamais le cache
 * React Query. Une clé non scopée par compte comme `['onboarding-status']`
 * (App.tsx) pouvait donc survivre à la déconnexion et être resservie, pour
 * un rendu, à la session suivante : un guard basé dessus redirigeait alors
 * vers un mauvais écran avant que la requête fraîche n'arrive. Il fallait
 * modifier l'URL pour forcer un remontage propre — exactement le symptôme
 * rapporté.
 *
 * Ce test verrouille le correctif au niveau où il doit vivre : une
 * déconnexion ne doit jamais laisser derrière elle une donnée mise en cache
 * sous le compte précédent.
 */
describe('authStore.logout — pas de donnée résiduelle entre deux comptes', () => {
  it('vide le cache React Query partagé à la déconnexion', () => {
    queryClient.setQueryData(['onboarding-status'], { has_property: false, role_org: 'owner' });
    expect(queryClient.getQueryData(['onboarding-status'])).toBeDefined();

    useAuthStore.getState().logout();

    expect(queryClient.getQueryData(['onboarding-status'])).toBeUndefined();
  });
});
