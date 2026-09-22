import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { crmApi } from '@/crm/lib/api';
import type { Establishment } from '@/crm/types';
import { StatusBadge } from '@/crm/components/StatusBadge';

/**
 * Écran d'accueil "Aujourd'hui" — version scaffold : liste les relances
 * dues/en retard et les démos du jour. Les actions rapides (WhatsApp, Fait,
 * Reporter) arrivent avec l'écran complet (voir suite du prompt).
 */
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
                  <EstablishmentCard key={e.id} establishment={e} />
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
                  <EstablishmentCard key={e.id} establishment={e} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function EstablishmentCard({ establishment }: { establishment: Establishment }) {
  return (
    <li>
      <Link
        to={`/etablissements/${establishment.id}`}
        className="flex items-center justify-between rounded-card border border-qayed-ligne bg-white p-4 shadow-sm active:bg-qayed-cachet-dilue"
      >
        <div>
          <p className="font-medium text-qayed-encre">{establishment.name}</p>
          <StatusBadge status={establishment.status} />
        </div>
        {establishment.is_overdue && (
          <span className="rounded-full bg-qayed-vigilance-fond px-2 py-1 text-xs font-semibold text-qayed-vigilance-texte">
            Retard
          </span>
        )}
      </Link>
    </li>
  );
}
