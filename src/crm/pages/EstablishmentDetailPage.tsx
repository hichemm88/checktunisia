import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { crmApi } from '@/crm/lib/api';
import type { Establishment } from '@/crm/types';
import { StatusBadge } from '@/crm/components/StatusBadge';

/**
 * Fiche prospect — version scaffold : champs principaux uniquement.
 * Timeline, ajout d'action rapide et bouton WhatsApp arrivent avec l'écran
 * complet (voir suite du prompt).
 */
export function EstablishmentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['prospection', 'establishment', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await crmApi.get<{ data: Establishment }>(`/establishments/${id}`);

      return res.data.data;
    },
  });

  if (isLoading) return <p className="px-4 pt-6 text-qayed-fiche">Chargement…</p>;
  if (!data) return null;

  return (
    <div className="px-4 pt-6">
      <h1 className="font-display text-2xl text-qayed-encre">{data.name}</h1>
      <StatusBadge status={data.status} />

      <dl className="mt-6 space-y-3 text-sm">
        {data.whatsapp_phone && (
          <Field label="WhatsApp" value={data.whatsapp_phone} />
        )}
        {data.address && <Field label="Adresse / Repère" value={data.address} />}
        {data.decision_maker_name && <Field label="Décideur" value={data.decision_maker_name} />}
        {data.qualification_notes && <Field label="Notes" value={data.qualification_notes} />}
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-qayed-fiche">{label}</dt>
      <dd className="text-qayed-encre">{value}</dd>
    </div>
  );
}
