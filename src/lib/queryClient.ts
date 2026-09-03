import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Instance partagée : `main.tsx` la fournit au provider, `authStore.logout()`
// vide son cache. Sans un module séparé, le client React Query resterait
// piégé dans `main.tsx` et hors de portée du store d'authentification.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Une 4xx est une réponse du serveur : la retenter ne changera rien.
      // Seules les pannes réseau/timeout (pas de réponse) ou 5xx méritent un
      // nouvel essai — avec le backoff exponentiel par défaut de React Query.
      retry: (failureCount, error) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status !== undefined && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
