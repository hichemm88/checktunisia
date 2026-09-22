import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { crmApi } from '@/crm/lib/api';
import { ACTION_CHANNELS, ACTION_TYPE_LABELS, CHANNEL_RELEVANT_TYPES, QUICK_ACTION_TYPES } from '@/crm/lib/actionTypes';
import type { ActionType } from '@/crm/types';

/**
 * Ajout rapide d'une action (§ Fiche prospect, "2 taps max") : un tap sur le
 * type journalise immédiatement (occurred_at = maintenant, sans contenu) ;
 * un second tap optionnel ouvre une note libre avant validation, pour qui
 * veut préciser sans que ce soit le chemin par défaut.
 *
 * Le canal (WhatsApp/Messenger/téléphone/sur place) est optionnel et ne
 * s'affiche que pour les types où il a un sens (message envoyé, appel,
 * réponse reçue) — c'est le seul moyen de noter un contact pris ailleurs
 * que par le bouton WhatsApp (qui journalise déjà le sien automatiquement).
 */
export function QuickActionForm({ establishmentId }: { establishmentId: string }) {
  const queryClient = useQueryClient();
  const [pendingType, setPendingType] = useState<ActionType | null>(null);
  const [channel, setChannel] = useState('');
  const [content, setContent] = useState('');

  const addAction = useMutation({
    mutationFn: async (payload: { type: ActionType; channel?: string; content?: string }) => {
      await crmApi.post(`/establishments/${establishmentId}/actions`, payload);
    },
    onSuccess: () => {
      setPendingType(null);
      setChannel('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['prospection', 'actions', establishmentId] });
      queryClient.invalidateQueries({ queryKey: ['prospection', 'establishment', establishmentId] });
      queryClient.invalidateQueries({ queryKey: ['prospection', 'today'] });
    },
  });

  function submit(type: ActionType) {
    addAction.mutate({
      type,
      channel: CHANNEL_RELEVANT_TYPES.includes(type) && channel ? channel : undefined,
      content: content || undefined,
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            disabled={addAction.isPending}
            onClick={() => {
              if (pendingType === type) {
                submit(type);
              } else {
                setPendingType(type);
              }
            }}
            className={clsx(
              'h-btn-md rounded-btn border text-sm font-semibold',
              pendingType === type
                ? 'border-qayed-cachet bg-qayed-cachet-dilue text-qayed-cachet-fonce'
                : 'border-qayed-ligne bg-white text-qayed-encre',
            )}
          >
            {ACTION_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {pendingType && (
        <div className="rounded-card border border-qayed-ligne bg-white p-3">
          {CHANNEL_RELEVANT_TYPES.includes(pendingType) && (
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="mb-2 h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
            >
              <option value="">Canal (facultatif)</option>
              {ACTION_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Note (facultatif)"
            rows={2}
            className="w-full rounded-input border border-qayed-ligne px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={addAction.isPending}
              onClick={() => submit(pendingType)}
              className="h-btn-sm flex-1 rounded-btn bg-qayed-cachet font-semibold text-white disabled:opacity-60"
            >
              Valider « {ACTION_TYPE_LABELS[pendingType]} »
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingType(null);
                setChannel('');
                setContent('');
              }}
              className="h-btn-sm rounded-btn border border-qayed-ligne px-3 font-semibold text-qayed-fiche"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
