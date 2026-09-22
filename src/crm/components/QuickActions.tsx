import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Clock } from 'lucide-react';
import { crmApi } from '@/crm/lib/api';
import type { Establishment } from '@/crm/types';

function invalidateEstablishment(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ['prospection', 'today'] });
  queryClient.invalidateQueries({ queryKey: ['prospection', 'establishments'] });
  queryClient.invalidateQueries({ queryKey: ['prospection', 'establishment', id] });
}

/**
 * "Fait" (§ Aujourd'hui, actions à un pouce) : une démo planifiée passe en
 * "démo faite" ; une relance simplement due journalise qu'elle a été traitée
 * aujourd'hui et sort de la liste (pas de nouvelle date automatique — si une
 * autre relance est nécessaire, l'agent utilise "Reporter" explicitement).
 */
export function MarkDoneButton({ establishment }: { establishment: Establishment }) {
  const queryClient = useQueryClient();
  const isDemo = establishment.status === 'demo_planifiee';

  const markDone = useMutation({
    mutationFn: async () => {
      if (isDemo) {
        await crmApi.patch(`/establishments/${establishment.id}`, { status: 'demo_faite' });
      } else {
        await crmApi.post(`/establishments/${establishment.id}/actions`, {
          type: 'relance',
          content: 'Relance effectuée',
        });
        await crmApi.patch(`/establishments/${establishment.id}`, { next_action_at: null });
      }
    },
    onSuccess: () => invalidateEstablishment(queryClient, establishment.id),
  });

  return (
    <button
      type="button"
      disabled={markDone.isPending}
      onClick={(e) => {
        e.preventDefault();
        markDone.mutate();
      }}
      className="flex h-btn-sm items-center gap-1 rounded-btn bg-qayed-conforme px-3 text-sm font-semibold text-white disabled:opacity-60"
    >
      <Check className="h-4 w-4" />
      Fait
    </button>
  );
}

/** "Reporter" : +1 jour / +3 jours / choisir une date, sans changer le statut ni journaliser. */
export function RescheduleButton({ establishment }: { establishment: Establishment }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const reschedule = useMutation({
    mutationFn: async (nextActionAt: string) => {
      await crmApi.patch(`/establishments/${establishment.id}`, { next_action_at: nextActionAt });
    },
    onSuccess: () => {
      setOpen(false);
      invalidateEstablishment(queryClient, establishment.id);
    },
  });

  function addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    reschedule.mutate(date.toISOString());
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-btn-sm items-center gap-1 rounded-btn border border-qayed-ligne px-3 text-sm font-semibold text-qayed-encre"
      >
        <Clock className="h-4 w-4" />
        Reporter
      </button>

      {open && (
        <div
          onClick={(e) => e.preventDefault()}
          className="absolute right-0 z-10 mt-1 w-48 space-y-1 rounded-card border border-qayed-ligne bg-white p-2 shadow-card-hover"
        >
          <button
            type="button"
            disabled={reschedule.isPending}
            onClick={() => addDays(1)}
            className="w-full rounded-input px-2 py-1.5 text-left text-sm text-qayed-encre active:bg-qayed-cachet-dilue"
          >
            + 1 jour
          </button>
          <button
            type="button"
            disabled={reschedule.isPending}
            onClick={() => addDays(3)}
            className="w-full rounded-input px-2 py-1.5 text-left text-sm text-qayed-encre active:bg-qayed-cachet-dilue"
          >
            + 3 jours
          </button>
          <label className="block px-2 py-1.5 text-sm text-qayed-encre">
            Choisir une date
            <input
              type="date"
              className="mt-1 h-input w-full rounded-input border border-qayed-ligne px-2 text-sm"
              onChange={(e) => {
                if (e.target.value) reschedule.mutate(new Date(e.target.value).toISOString());
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
