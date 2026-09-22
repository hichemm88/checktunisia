import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { crmApi, firstApiErrorMessage } from '@/crm/lib/api';
import type { Establishment, MessageTemplate, PipelineStatus, ProspectionAction } from '@/crm/types';
import { StatusBadge } from '@/crm/components/StatusBadge';
import { WhatsAppButton } from '@/crm/components/WhatsAppButton';
import { QuickActionForm } from '@/crm/components/QuickActionForm';
import { ActionTimeline } from '@/crm/components/ActionTimeline';
import { useCrmAuthStore } from '@/crm/stores/authStore';

const STATUS_OPTIONS: { value: PipelineStatus; label: string }[] = [
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

type FormState = {
  name: string;
  zone: Establishment['zone'];
  locality: string;
  address: string;
  size: NonNullable<Establishment['size']> | '';
  segment: NonNullable<Establishment['segment']> | '';
  priority: Establishment['priority'];
  status: PipelineStatus;
  decision_maker_name: string;
  decision_maker_role: string;
  whatsapp_phone: string;
  origin_channel: string;
  qualification_notes: string;
  target_plan: NonNullable<Establishment['target_plan']> | '';
  next_action_at: string;
  out_of_scope: boolean;
};

function toFormState(e: Establishment): FormState {
  return {
    name: e.name,
    zone: e.zone,
    locality: e.locality ?? '',
    address: e.address ?? '',
    size: e.size ?? '',
    segment: e.segment ?? '',
    priority: e.priority,
    status: e.status,
    decision_maker_name: e.decision_maker_name ?? '',
    decision_maker_role: e.decision_maker_role ?? '',
    whatsapp_phone: e.whatsapp_phone ?? '',
    origin_channel: e.origin_channel ?? '',
    qualification_notes: e.qualification_notes ?? '',
    target_plan: e.target_plan ?? '',
    // input[type=datetime-local] veut "YYYY-MM-DDTHH:mm", sans fuseau.
    next_action_at: e.next_action_at ? e.next_action_at.slice(0, 16) : '',
    out_of_scope: e.out_of_scope,
  };
}

/**
 * Fiche prospect (§ Écran 3) : édition complète, changement de statut (avec
 * la même contrainte que le backend — une date est requise pour "démo
 * planifiée"), bouton WhatsApp, ajout rapide d'action et journal.
 */
export function EstablishmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCrmAuthStore();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['prospection', 'establishment', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await crmApi.get<{ data: Establishment }>(`/establishments/${id}`);

      return res.data.data;
    },
  });

  const { data: actions } = useQuery({
    queryKey: ['prospection', 'actions', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await crmApi.get<{ data: ProspectionAction[] }>(`/establishments/${id}/actions`);

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

  useEffect(() => {
    if (data) setForm(toFormState(data));
  }, [data]);

  const save = useMutation({
    mutationFn: async (payload: Partial<Establishment>) => {
      const res = await crmApi.patch<{ data: Establishment }>(`/establishments/${id}`, payload);

      return res.data.data;
    },
    onSuccess: (updated) => {
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.setQueryData(['prospection', 'establishment', id], updated);
      queryClient.invalidateQueries({ queryKey: ['prospection', 'establishments'] });
      queryClient.invalidateQueries({ queryKey: ['prospection', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['prospection', 'actions', id] });
    },
    onError: (err) => setError(firstApiErrorMessage(err, 'Impossible d\'enregistrer la fiche.')),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await crmApi.delete(`/establishments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospection', 'establishments'] });
      navigate('/pipeline');
    },
    onError: (err) => setError(firstApiErrorMessage(err, 'Suppression impossible.')),
  });

  if (isLoading || !form || !data) return <p className="px-4 pt-6 text-qayed-fiche">Chargement…</p>;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    if (form.status === 'demo_planifiee' && !form.next_action_at) {
      setError('La date et l\'heure de la démo sont requises pour ce statut.');
      return;
    }

    save.mutate({
      name: form.name,
      zone: form.zone,
      locality: form.locality || null,
      address: form.address || null,
      size: form.size || null,
      segment: form.segment || null,
      priority: form.priority,
      status: form.status,
      decision_maker_name: form.decision_maker_name || null,
      decision_maker_role: form.decision_maker_role || null,
      whatsapp_phone: form.whatsapp_phone || null,
      origin_channel: form.origin_channel || null,
      qualification_notes: form.qualification_notes || null,
      target_plan: form.target_plan || undefined,
      next_action_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : null,
      out_of_scope: form.out_of_scope,
    });
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-qayed-encre">{data.name}</h1>
          <StatusBadge status={data.status} />
        </div>
        <span className="rounded-full bg-qayed-cachet-dilue px-2 py-1 text-xs font-semibold text-qayed-cachet-fonce">
          {data.priority}
        </span>
      </div>

      <section className="mb-6">
        <WhatsAppButton establishment={data} templates={templates ?? []} />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-qayed-fiche">Ajouter une action</h2>
        {id && <QuickActionForm establishmentId={id} />}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-qayed-fiche">Journal</h2>
        <ActionTimeline actions={actions ?? []} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-qayed-fiche">Fiche</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Nom">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Statut">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PipelineStatus })}
                className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priorité">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Establishment['priority'] })}
                className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </Field>
          </div>

          <Field
            label={form.status === 'demo_planifiee' ? 'Date de la démo (requise)' : 'Prochaine action'}
          >
            <input
              type="datetime-local"
              value={form.next_action_at}
              onChange={(e) => setForm({ ...form, next_action_at: e.target.value })}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Zone">
              <select
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value as Establishment['zone'] })}
                className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
              >
                <option value="grand_tunis">Grand Tunis</option>
                <option value="banlieue_nord">Banlieue nord</option>
                <option value="cap_bon">Cap Bon</option>
                <option value="sud">Sud</option>
                <option value="autre">Autre</option>
              </select>
            </Field>

            <Field label="Localité">
              <input
                value={form.locality}
                onChange={(e) => setForm({ ...form, locality: e.target.value })}
                className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
              />
            </Field>
          </div>

          <Field label="Adresse / repère">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Taille">
              <select
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value as FormState['size'] })}
                className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
              >
                <option value="">—</option>
                <option value="petite">Petite</option>
                <option value="moyenne">Moyenne</option>
                <option value="grande">Grande</option>
              </select>
            </Field>

            <Field label="Segment">
              <select
                value={form.segment}
                onChange={(e) => setForm({ ...form, segment: e.target.value as FormState['segment'] })}
                className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
              >
                <option value="">—</option>
                <option value="maison_hotes">Maison d'hôtes</option>
                <option value="guesthouse">Guesthouse</option>
                <option value="boutique_hotel">Boutique hôtel</option>
                <option value="hotel">Hôtel</option>
                <option value="location_entiere">Location entière</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Décideur — nom">
              <input
                value={form.decision_maker_name}
                onChange={(e) => setForm({ ...form, decision_maker_name: e.target.value })}
                className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
              />
            </Field>

            <Field label="Décideur — rôle">
              <input
                value={form.decision_maker_role}
                onChange={(e) => setForm({ ...form, decision_maker_role: e.target.value })}
                className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
              />
            </Field>
          </div>

          <Field label="Téléphone WhatsApp">
            <input
              value={form.whatsapp_phone}
              onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })}
              placeholder="+216 XX XXX XXX"
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            />
          </Field>

          <Field label="Canal d'origine">
            <input
              value={form.origin_channel}
              onChange={(e) => setForm({ ...form, origin_channel: e.target.value })}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            />
          </Field>

          <Field label="Plan visé">
            <select
              value={form.target_plan}
              onChange={(e) => setForm({ ...form, target_plan: e.target.value as FormState['target_plan'] })}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            >
              <option value="">—</option>
              <option value="essentiel">Essentiel</option>
              <option value="pro">Pro</option>
              <option value="hotel">Hôtel</option>
              <option value="inconnu">Inconnu</option>
            </select>
          </Field>

          <Field label="Notes de qualification">
            <textarea
              value={form.qualification_notes}
              onChange={(e) => setForm({ ...form, qualification_notes: e.target.value })}
              rows={3}
              className="w-full rounded-input border border-qayed-ligne bg-white px-3 py-2 text-sm"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-qayed-encre">
            <input
              type="checkbox"
              checked={form.out_of_scope}
              onChange={(e) => setForm({ ...form, out_of_scope: e.target.checked })}
            />
            Hors périmètre (zone/segment non ciblé)
          </label>

          {error && (
            <p role="alert" className="rounded-input bg-qayed-erreur-fond px-4 py-2 text-sm text-qayed-erreur-texte">
              {error}
            </p>
          )}

          {saved && (
            <p className="rounded-input bg-qayed-conforme-fond px-4 py-2 text-sm text-qayed-conforme-texte">
              Fiche enregistrée.
            </p>
          )}

          <button
            type="submit"
            disabled={save.isPending}
            className="h-btn-lg w-full rounded-btn bg-qayed-cachet text-base font-semibold text-white disabled:opacity-60"
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        {user?.role === 'admin' && (
          <div className="mt-8 rounded-card border border-qayed-erreur-fond bg-qayed-erreur-fond p-4">
            <p className="mb-2 text-sm text-qayed-erreur-texte">
              Suppression définitive du prospect et de son journal (RGPD-like, irréversible).
            </p>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Supprimer définitivement « ${data.name} » et tout son journal ?`)) {
                  remove.mutate();
                }
              }}
              className="h-btn-md rounded-btn bg-qayed-erreur px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              Supprimer définitivement
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-qayed-fiche">{label}</span>
      {children}
    </label>
  );
}
