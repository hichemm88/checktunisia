import { useQuery } from '@tanstack/react-query';
import { crmApi } from '@/crm/lib/api';
import type { Establishment, MessageTemplate } from '@/crm/types';
import { EstablishmentCard } from '@/crm/components/EstablishmentCard';

/** Écran d'accueil "Aujourd'hui" (§ Écran 1) : relances dues/en retard puis démos du jour, actions rapides à un pouce. */
export function TodayPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['prospection', 'today'],
    queryFn: async () => {
      const res = await crmApi.get<{ data: { relances: Establishment[]; demos: Establishment[] } }>(
        '/establishments/today',
      );

      return res.data.data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['prospection', 'message-templates'],
    queryFn: async () => {
      const res = await crmApi.get<{ data: MessageTemplate[] }>('/message-templates');

      return res.data.data;
    },
  });

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 font-display text-2xl text-qayed-encre">Aujourd'hui</h1>

      {isLoading && <p className="text-qayed-fiche">Chargement…</p>}

      {data && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-qayed-fiche">
              Relances ({data.relances.length})
            </h2>
            {data.relances.length === 0 ? (
              <p className="text-qayed-fiche">Rien à relancer aujourd'hui.</p>
            ) : (
              <ul className="space-y-2">
                {data.relances.map((e) => (
                  <EstablishmentCard key={e.id} establishment={e} templates={templates ?? []} quickActions />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-qayed-fiche">
              Démos du jour ({data.demos.length})
            </h2>
            {data.demos.length === 0 ? (
              <p className="text-qayed-fiche">Aucune démo planifiée aujourd'hui.</p>
            ) : (
              <ul className="space-y-2">
                {data.demos.map((e) => (
                  <EstablishmentCard key={e.id} establishment={e} templates={templates ?? []} quickActions />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
