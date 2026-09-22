import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { crmApi, firstApiErrorMessage } from '@/crm/lib/api';
import { useCrmAuthStore } from '@/crm/stores/authStore';
import type { MessageTemplate, Segment } from '@/crm/types';

const SEGMENTS: { value: Segment | ''; label: string }[] = [
  { value: '', label: 'Tous segments' },
  { value: 'maison_hotes', label: "Maison d'hôtes" },
  { value: 'guesthouse', label: 'Guesthouse' },
  { value: 'boutique_hotel', label: 'Boutique hôtel' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'location_entiere', label: 'Location entière' },
  { value: 'autre', label: 'Autre' },
];

type FormState = { name: string; body: string; segment: Segment | '' };
const EMPTY_FORM: FormState = { name: '', body: '', segment: '' };

/**
 * Écran 5 — CRUD des modèles de message. Réservé en écriture aux admins
 * (voir MessageTemplateController côté backend) ; un membre peut consulter
 * mais pas modifier, pour éviter qu'un texte de prospection change sous les
 * pieds de toute l'équipe sans validation.
 */
export function TemplatesPage() {
  const { user } = useCrmAuthStore();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['prospection', 'message-templates', 'all'],
    queryFn: async () => {
      const res = await crmApi.get<{ data: MessageTemplate[] }>('/message-templates', { params: { all: 1 } });

      return res.data.data;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['prospection', 'message-templates'] });
  }

  const create = useMutation({
    mutationFn: async (payload: FormState) => {
      await crmApi.post('/message-templates', { ...payload, segment: payload.segment || null });
    },
    onSuccess: () => {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(firstApiErrorMessage(err, 'Impossible de créer le modèle.')),
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: FormState }) => {
      await crmApi.patch(`/message-templates/${id}`, { ...payload, segment: payload.segment || null });
    },
    onSuccess: () => {
      setEditingId(null);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(firstApiErrorMessage(err, 'Impossible d\'enregistrer le modèle.')),
  });

  const toggleActive = useMutation({
    mutationFn: async (t: MessageTemplate) => {
      await crmApi.patch(`/message-templates/${t.id}`, { active: !t.active });
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await crmApi.delete(`/message-templates/${id}`);
    },
    onSuccess: invalidate,
  });

  function startEdit(t: MessageTemplate) {
    setEditingId(t.id);
    setForm({ name: t.name, body: t.body, segment: t.segment ?? '' });
    setError(null);
  }

  function startCreate() {
    setEditingId('new');
    setForm(EMPTY_FORM);
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (editingId === 'new') {
      create.mutate(form);
    } else if (editingId) {
      update.mutate({ id: editingId, payload: form });
    }
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/reglages" className="text-qayed-fiche">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl text-qayed-encre">Modèles de message</h1>
      </div>

      {isAdmin && editingId === null && (
        <button
          type="button"
          onClick={startCreate}
          className="mb-4 h-btn-md w-full rounded-btn bg-qayed-cachet text-sm font-semibold text-white"
        >
          + Nouveau modèle
        </button>
      )}

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-card border border-qayed-ligne bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-qayed-fiche">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-input w-full rounded-input border border-qayed-ligne px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-qayed-fiche">
              Segment ciblé
            </label>
            <select
              value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value as Segment | '' })}
              className="h-input w-full rounded-input border border-qayed-ligne px-3 text-sm"
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-qayed-fiche">
              Message — variables {'{prenom}'} et {'{etablissement}'}
            </label>
            <textarea
              required
              rows={6}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full rounded-input border border-qayed-ligne px-3 py-2 text-sm"
            />
            {/* Rappel RÈGLE MÉTIER (voir ProspectionMessageTemplateSeeder /
                MessageTemplateController côté backend) : ne jamais laisser un
                modèle sous-entendre une transmission automatique des fiches
                aux autorités — Qayed archive et exporte, la retransmission
                reste un geste de l'exploitant. */}
            <p className="mt-1 text-xs text-qayed-fiche">
              Ne jamais mentionner de transmission automatique des fiches aux autorités.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-input bg-qayed-erreur-fond px-4 py-2 text-sm text-qayed-erreur-texte">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="h-btn-md flex-1 rounded-btn bg-qayed-cachet text-sm font-semibold text-white disabled:opacity-60"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="h-btn-md rounded-btn border border-qayed-ligne px-4 text-sm font-semibold text-qayed-fiche"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-qayed-fiche">Chargement…</p>}

      <ul className="space-y-2">
        {templates?.map((t) => (
          <li key={t.id} className="rounded-card border border-qayed-ligne bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-qayed-encre">{t.name}</p>
                <p className="text-xs text-qayed-fiche">
                  {SEGMENTS.find((s) => s.value === (t.segment ?? ''))?.label ?? t.segment}
                  {!t.active && ' · désactivé'}
                </p>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-qayed-encre">{t.body}</p>

            {isAdmin && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="h-btn-sm rounded-btn border border-qayed-ligne px-3 text-xs font-semibold text-qayed-encre"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive.mutate(t)}
                  className="h-btn-sm rounded-btn border border-qayed-ligne px-3 text-xs font-semibold text-qayed-encre"
                >
                  {t.active ? 'Désactiver' : 'Réactiver'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer définitivement « ${t.name} » ?`)) remove.mutate(t.id);
                  }}
                  className="h-btn-sm rounded-btn border border-qayed-erreur px-3 text-xs font-semibold text-qayed-erreur-texte"
                >
                  Supprimer
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!isLoading && templates?.length === 0 && <p className="text-qayed-fiche">Aucun modèle pour le moment.</p>}
    </div>
  );
}
