import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { Plus, Search } from 'lucide-react';
import { crmApi } from '@/crm/lib/api';
import type { Establishment, MessageTemplate, PipelineStatus, Zone } from '@/crm/types';
import { EstablishmentCard } from '@/crm/components/EstablishmentCard';

const STATUS_CHIPS: { value: PipelineStatus | null; label: string }[] = [
  { value: null, label: 'Tous' },
  { value: 'a_contacter', label: 'À contacter' },
  { value: 'contacte', label: 'Contacté' },
  { value: 'relance', label: 'Relancé' },
  { value: 'demo_planifiee', label: 'Démo planifiée' },
  { value: 'demo_faite', label: 'Démo faite' },
  { value: 'essai_en_cours', label: 'Essai en cours' },
  { value: 'client', label: 'Client' },
  { value: 'refus', label: 'Refus' },
  { value: 'sans_reponse', label: 'Sans réponse' },
  { value: 'hors_perimetre', label: 'Hors périmètre' },
];

const ZONES: { value: Zone | ''; label: string }[] = [
  { value: '', label: 'Toutes zones' },
  { value: 'grand_tunis', label: 'Grand Tunis' },
  { value: 'banlieue_nord', label: 'Banlieue nord' },
  { value: 'cap_bon', label: 'Cap Bon' },
  { value: 'sud', label: 'Sud' },
  { value: 'autre', label: 'Autre' },
];

/**
 * Pipeline filtrable (§ Écran 2). Statut/zone/priorité/recherche : zone,
 * priorité et recherche partent au serveur (`EstablishmentController::index`
 * filtre déjà dessus) ; le statut reste côté client pour que les compteurs
 * par statut restent cohérents avec les autres filtres actifs sans
 * multiplier les appels réseau.
 */
export function PipelinePage() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [zone, setZone] = useState<Zone | ''>('');
  const [priority, setPriority] = useState<'' | 'P1' | 'P2' | 'P3'>('');
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['prospection', 'establishments', { zone, priority, q }],
    queryFn: async () => {
      const res = await crmApi.get<{ data: Establishment[] }>('/establishments', {
        params: { zone: zone || undefined, priority: priority || undefined, q: q || undefined },
      });

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

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: data?.length ?? 0 };
    for (const e of data ?? []) result[e.status] = (result[e.status] ?? 0) + 1;

    return result;
  }, [data]);

  const filtered = useMemo(() => (status ? (data ?? []).filter((e) => e.status === status) : data ?? []), [data, status]);

  return (
    <div className="px-4 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-qayed-encre">Pipeline</h1>
        <Link
          to="/etablissements/nouveau"
          className="flex h-btn-sm items-center gap-1 rounded-btn bg-qayed-cachet px-3 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Nouveau
        </Link>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-qayed-fiche" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un établissement…"
          className="h-input w-full rounded-input border border-qayed-ligne bg-white pl-9 pr-3 text-sm"
        />
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value as Zone | '')}
          className="h-btn-sm shrink-0 rounded-btn border border-qayed-ligne bg-white px-2 text-sm"
        >
          {ZONES.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as '' | 'P1' | 'P2' | 'P3')}
          className="h-btn-sm shrink-0 rounded-btn border border-qayed-ligne bg-white px-2 text-sm"
        >
          <option value="">Toutes priorités</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
        </select>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setStatus(chip.value)}
            className={clsx(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold',
              status === chip.value
                ? 'border-qayed-cachet bg-qayed-cachet text-white'
                : 'border-qayed-ligne bg-white text-qayed-fiche',
            )}
          >
            {chip.label} ({chip.value === null ? counts.all : (counts[chip.value] ?? 0)})
          </button>
        ))}
      </div>

      {isLoading && <p className="text-qayed-fiche">Chargement…</p>}

      <ul className="space-y-2">
        {filtered.map((e) => (
          <EstablishmentCard key={e.id} establishment={e} templates={templates ?? []} />
        ))}
      </ul>

      {!isLoading && filtered.length === 0 && <p className="text-qayed-fiche">Aucun prospect pour le moment.</p>}
    </div>
  );
}
