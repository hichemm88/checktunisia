import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { crmApi, firstApiErrorMessage } from '@/crm/lib/api';
import { useCrmAuthStore } from '@/crm/stores/authStore';
import type { CrmRole, TeamMember } from '@/crm/types';

type FormState = { name: string; email: string; password: string; role: CrmRole };
const EMPTY_FORM: FormState = { name: '', email: '', password: '', role: 'membre' };

/**
 * § Authentification : "Prévois la création d'autres comptes membres depuis
 * le compte admin" — pas d'inscription publique, cette page (et
 * UserController côté backend, déjà admin-only) est le SEUL autre chemin
 * que les 2 comptes seedés au déploiement.
 */
export function MembersPage() {
  const { user: me } = useCrmAuthStore();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['prospection', 'users'],
    queryFn: async () => {
      const res = await crmApi.get<{ data: TeamMember[] }>('/users');

      return res.data.data;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['prospection', 'users'] });
  }

  const create = useMutation({
    mutationFn: async (payload: FormState) => {
      await crmApi.post('/users', payload);
    },
    onSuccess: () => {
      setCreating(false);
      setForm(EMPTY_FORM);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(firstApiErrorMessage(err, 'Impossible de créer ce compte.')),
  });

  const toggleActive = useMutation({
    mutationFn: async (member: TeamMember) => {
      await crmApi.patch(`/users/${member.id}`, { active: !member.active });
    },
    onSuccess: invalidate,
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: CrmRole }) => {
      await crmApi.patch(`/users/${id}`, { role });
    },
    onSuccess: invalidate,
  });

  if (me?.role !== 'admin') {
    return <p className="px-4 pt-6 text-qayed-fiche">Réservé aux administrateurs.</p>;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form);
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/reglages" className="text-qayed-fiche">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl text-qayed-encre">Membres de l'équipe</h1>
      </div>

      {!creating && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-4 h-btn-md w-full rounded-btn bg-qayed-cachet text-sm font-semibold text-white"
        >
          + Nouveau membre
        </button>
      )}

      {creating && (
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-qayed-fiche">E-mail</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-input w-full rounded-input border border-qayed-ligne px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-qayed-fiche">
              Mot de passe provisoire
            </label>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="h-input w-full rounded-input border border-qayed-ligne px-3 text-sm"
            />
            <p className="mt-1 text-xs text-qayed-fiche">8 caractères minimum — changeable ensuite par le membre.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-qayed-fiche">Rôle</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as CrmRole })}
              className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            >
              <option value="membre">Membre</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          {error && (
            <p role="alert" className="rounded-input bg-qayed-erreur-fond px-4 py-2 text-sm text-qayed-erreur-texte">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={create.isPending}
              className="h-btn-md flex-1 rounded-btn bg-qayed-cachet text-sm font-semibold text-white disabled:opacity-60"
            >
              Créer le compte
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className="h-btn-md rounded-btn border border-qayed-ligne px-4 text-sm font-semibold text-qayed-fiche"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-qayed-fiche">Chargement…</p>}

      <ul className="space-y-2">
        {members?.map((member) => (
          <li key={member.id} className="rounded-card border border-qayed-ligne bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-qayed-encre">{member.name}</p>
                <p className="text-sm text-qayed-fiche">{member.email}</p>
                {!member.active && <p className="text-xs text-qayed-erreur-texte">Compte désactivé</p>}
              </div>
              <select
                value={member.role}
                disabled={member.id === me.id}
                onChange={(e) => changeRole.mutate({ id: member.id, role: e.target.value as CrmRole })}
                className="h-btn-sm shrink-0 rounded-btn border border-qayed-ligne bg-white px-2 text-xs disabled:opacity-60"
              >
                <option value="membre">Membre</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            {member.id !== me.id && (
              <button
                type="button"
                onClick={() => toggleActive.mutate(member)}
                className="mt-3 h-btn-sm rounded-btn border border-qayed-ligne px-3 text-xs font-semibold text-qayed-encre"
              >
                {member.active ? 'Désactiver' : 'Réactiver'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
