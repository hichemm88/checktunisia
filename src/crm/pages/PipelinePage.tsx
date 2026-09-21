import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { crmApi } from '@/crm/lib/api';
import type { Establishment } from '@/crm/types';
import { StatusBadge } from '@/crm/components/StatusBadge';

/**
 * Écran scaffold : liste simple, sans filtres ni vue tableau desktop pour
 * l'instant (écran complet avec filtres/compteurs/recherche à suivre).
 */
export function PipelinePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['prospection', 'establishments'],
    queryFn: async () => {
      const res = await crmApi.get<{ data: Establishment[] }>('/establishments');

      return res.data.data;
    },
  });

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-4 font-display text-2xl text-qayed-encre">Pipeline</h1>

      {isLoading && <p className="text-qayed-fiche">Chargement…</p>}

      <ul className="space-y-2">
        {data?.map((e) => (
          <li key={e.id}>
            <Link
              to={`/etablissements/${e.id}`}
              className="flex items-center justify-between rounded-card border border-qayed-ligne bg-white p-4 shadow-sm active:bg-qayed-cachet-dilue"
            >
              <div>
                <p className="font-medium text-qayed-encre">{e.name}</p>
                <StatusBadge status={e.status} />
              </div>
              <span className="text-sm text-qayed-fiche">{e.priority}</span>
            </Link>
          </li>
        ))}
      </ul>

      {data?.length === 0 && <p className="text-qayed-fiche">Aucun prospect pour le moment.</p>}
    </div>
  );
}
