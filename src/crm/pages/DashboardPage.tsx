import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmApi } from '@/crm/lib/api';
import { STATUS_LABELS, ZONE_LABELS } from '@/crm/lib/labels';
import type { DashboardData } from '@/crm/types';

/**
 * Écran 6 — tableau de bord. Barres en CSS pur (pas de librairie de graphes,
 * voir vite.crm.config.ts : ce build reste volontairement léger) plutôt
 * qu'une dépendance supplémentaire pour quelques barres horizontales.
 */
export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['prospection', 'dashboard'],
    queryFn: async () => {
      const res = await crmApi.get<{ data: DashboardData }>('/dashboard');

      return res.data.data;
    },
  });

  if (isLoading || !data) return <p className="px-4 pt-6 text-qayed-fiche">Chargement…</p>;

  const funnelMax = Math.max(1, ...data.funnel.map((f) => f.count));
  const zoneMax = Math.max(1, ...data.by_zone.map((z) => z.count));
  const objectionMax = Math.max(1, ...data.top_objections.map((o) => o.count));

  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="mb-1 font-display text-2xl text-qayed-encre">Dashboard</h1>
      <p className="mb-6 text-sm text-qayed-fiche">{data.total} prospect{data.total > 1 ? 's' : ''} actif{data.total > 1 ? 's' : ''}</p>

      <Section title="Entonnoir du pipeline">
        <div className="space-y-2">
          {data.funnel.map((f) => (
            <BarRow key={f.status} label={STATUS_LABELS[f.status]} count={f.count} max={funnelMax} color="bg-qayed-cachet" />
          ))}
        </div>
      </Section>

      <Section title="Taux de réponse">
        <div className="rounded-card border border-qayed-ligne bg-white p-4">
          <p className="font-display text-3xl text-qayed-conforme-texte">
            {Math.round(data.response_rate.rate * 100)}%
          </p>
          <p className="mt-1 text-sm text-qayed-fiche">
            {data.response_rate.responded} réponse{data.response_rate.responded > 1 ? 's' : ''} sur{' '}
            {data.response_rate.contacted} prospect{data.response_rate.contacted > 1 ? 's' : ''} contacté
            {data.response_rate.contacted > 1 ? 's' : ''}
          </p>
        </div>
      </Section>

      <Section title="Par zone">
        <div className="space-y-2">
          {data.by_zone.map((z) => (
            <BarRow key={z.zone} label={ZONE_LABELS[z.zone]} count={z.count} max={zoneMax} color="bg-qayed-cachet-sombre" />
          ))}
          {data.by_zone.length === 0 && <p className="text-sm text-qayed-fiche">Aucune donnée pour le moment.</p>}
        </div>
      </Section>

      <Section title="Par priorité">
        <div className="flex gap-3">
          {data.by_priority.map((p) => (
            <div key={p.priority} className="flex-1 rounded-card border border-qayed-ligne bg-white p-4 text-center">
              <p className="font-display text-2xl text-qayed-encre">{p.count}</p>
              <p className="text-xs text-qayed-fiche">{p.priority}</p>
            </div>
          ))}
          {data.by_priority.length === 0 && <p className="text-sm text-qayed-fiche">Aucune donnée pour le moment.</p>}
        </div>
      </Section>

      <Section title="Objections les plus fréquentes">
        {data.top_objections.length === 0 ? (
          <p className="text-sm text-qayed-fiche">Aucune objection journalisée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {data.top_objections.map((o) => (
              <BarRow key={o.label} label={o.label} count={o.count} max={objectionMax} color="bg-qayed-vigilance" />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-qayed-fiche">{title}</h2>
      {children}
    </section>
  );
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const width = Math.max(4, Math.round((count / max) * 100));

  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between text-sm">
        <span className="text-qayed-encre">{label}</span>
        <span className="font-semibold text-qayed-encre">{count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-qayed-cachet-dilue">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
