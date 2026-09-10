import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminWhatsappInboxApi } from '@/api/admin/whatsappInbox';

/**
 * Source unique du compteur de non-lus des réponses d'autorités.
 *
 * Consommé à la fois par le badge de la sidebar (visible depuis n'importe
 * quel écran admin) et par le pill du header de `AdminWhatsappInboxPage` :
 * une seule clé de requête, pour qu'ils ne puissent jamais afficher deux
 * chiffres différents.
 *
 * 30 s : le même rythme que le reste de cet écran (voir
 * `AdminWhatsappInboxPage`). React Query suspend le rythme quand l'onglet
 * n'est pas au premier plan.
 */
export const UNREAD_AUTHORITY_REPLIES_QUERY_KEY = ['admin-whatsapp-unread-count'];
const POLL_MS = 30_000;

export const useUnreadAuthorityReplies = (): number => {
  const { data } = useQuery({
    queryKey: UNREAD_AUTHORITY_REPLIES_QUERY_KEY,
    queryFn: () => adminWhatsappInboxApi.unreadCount(),
    refetchInterval: POLL_MS,
    staleTime: POLL_MS,
  });

  return data ?? 0;
};

/**
 * Décrément optimiste : appelé quand l'administrateur ouvre un fil qui
 * portait `amount` messages non lus, AVANT même que la réponse serveur ne
 * revienne. Le prochain sondage à 30 s resynchronise si besoin.
 */
export const useDecrementUnreadAuthorityReplies = () => {
  const queryClient = useQueryClient();

  return (amount: number) => {
    if (amount <= 0) return;
    queryClient.setQueryData<number>(UNREAD_AUTHORITY_REPLIES_QUERY_KEY, (prev) => Math.max(0, (prev ?? 0) - amount));
  };
};
