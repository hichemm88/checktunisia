import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { crmApi, firstApiErrorMessage } from '@/crm/lib/api';
import type { Establishment, Priority, Segment, Size, Zone } from '@/crm/types';

type FormState = {
  name: string;
  zone: Zone;
  locality: string;
  address: string;
  size: Size | '';
  segment: Segment | '';
  priority: Priority;
  decision_maker_name: string;
  decision_maker_role: string;
  whatsapp_phone: string;
  origin_channel: string;
  qualification_notes: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  zone: 'grand_tunis',
  locality: '',
  address: '',
  size: '',
  segment: '',
  priority: 'P2',
  decision_maker_name: '',
  decision_maker_role: '',
  whatsapp_phone: '',
  origin_channel: '',
  qualification_notes: '',
};

/**
 * Saisie manuelle d'un nouveau prospect (§ Modèle de données) — jusqu'ici
 * la seule façon de peupler le pipeline était l'import CSV/XLSX. Un
 * commercial qui repère une maison d'hôtes en tournée doit pouvoir la
 * saisir sur place, sans attendre un fichier. Statut de départ toujours
 * "à contacter" (défaut backend) — pas de champ ici, il se change depuis
 * la fiche une fois créée.
 */
export function NewEstablishmentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (payload: FormState) => {
      const res = await crmApi.post<{ data: Establishment }>('/establishments', {
        name: payload.name,
        zone: payload.zone,
        locality: payload.locality || null,
        address: payload.address || null,
        size: payload.size || null,
        segment: payload.segment || null,
        priority: payload.priority,
        decision_maker_name: payload.decision_maker_name || null,
        decision_maker_role: payload.decision_maker_role || null,
        whatsapp_phone: payload.whatsapp_phone || null,
        origin_channel: payload.origin_channel || null,
        qualification_notes: payload.qualification_notes || null,
      });

      return res.data.data;
    },
    onSuccess: (establishment) => navigate(`/etablissements/${establishment.id}`),
    onError: (err) => setError(firstApiErrorMessage(err, 'Impossible de créer ce prospect.')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form);
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/pipeline" className="text-qayed-fiche">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl text-qayed-encre">Nouveau prospect</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom">
          <input
            required
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Zone">
            <select
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value as Zone })}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            >
              <option value="grand_tunis">Grand Tunis</option>
              <option value="banlieue_nord">Banlieue nord</option>
              <option value="cap_bon">Cap Bon</option>
              <option value="sud">Sud</option>
              <option value="autre">Autre</option>
            </select>
          </Field>

          <Field label="Priorité">
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </Field>
        </div>

        <Field label="Localité">
          <input
            value={form.locality}
            onChange={(e) => setForm({ ...form, locality: e.target.value })}
            placeholder="ex. Médina de Tunis"
            className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
          />
        </Field>

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
            placeholder="ex. tournée à pied, Google Maps, bouche à oreille"
            className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
          />
        </Field>

        <Field label="Notes de qualification">
          <textarea
            value={form.qualification_notes}
            onChange={(e) => setForm({ ...form, qualification_notes: e.target.value })}
            rows={3}
            className="w-full rounded-input border border-qayed-ligne bg-white px-3 py-2 text-sm"
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-input bg-qayed-erreur-fond px-4 py-2 text-sm text-qayed-erreur-texte">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={create.isPending}
          className="h-btn-lg w-full rounded-btn bg-qayed-cachet text-base font-semibold text-white disabled:opacity-60"
        >
          {create.isPending ? 'Création…' : 'Créer le prospect'}
        </button>
      </form>
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
