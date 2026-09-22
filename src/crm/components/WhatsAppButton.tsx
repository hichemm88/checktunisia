import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/crm/lib/api';
import { activeTemplatesForSegment, buildWaMeUrl, renderTemplate, templateVariablesFor } from '@/crm/lib/whatsapp';
import type { Establishment, MessageTemplate } from '@/crm/types';

interface WhatsAppButtonProps {
  establishment: Establishment;
  templates: MessageTemplate[];
  /** Carte "Aujourd'hui"/Pipeline : icône seule, pas de sélecteur de modèle (le premier actif s'applique). */
  compact?: boolean;
}

/**
 * Bouton WhatsApp (§ Écran 4) : ouvre un lien wa.me pré-rempli, N'ENVOIE
 * JAMAIS RIEN AUTOMATIQUEMENT — c'est l'agent qui, dans WhatsApp, relit puis
 * appuie sur envoyer. Après ouverture, on propose de journaliser l'action
 * (au lieu de le déduire silencieusement : on ne peut pas savoir depuis le
 * navigateur si le message a réellement été envoyé dans l'app WhatsApp).
 */
export function WhatsAppButton({ establishment, templates, compact = false }: WhatsAppButtonProps) {
  const queryClient = useQueryClient();
  const available = activeTemplatesForSegment(templates, establishment.segment ?? null);
  const [templateId, setTemplateId] = useState<string>(available[0]?.id ?? '');
  const [opened, setOpened] = useState(false);

  const logMessage = useMutation({
    mutationFn: async (content: string) => {
      await crmApi.post(`/establishments/${establishment.id}/actions`, {
        type: 'message_envoye',
        channel: 'WhatsApp',
        content,
      });
    },
    onSuccess: () => {
      setOpened(false);
      queryClient.invalidateQueries({ queryKey: ['prospection', 'actions', establishment.id] });
      queryClient.invalidateQueries({ queryKey: ['prospection', 'today'] });
    },
  });

  if (!establishment.whatsapp_phone) {
    return compact ? null : <p className="text-sm text-qayed-fiche">Aucun numéro WhatsApp renseigné.</p>;
  }

  if (available.length === 0) {
    return compact ? null : <p className="text-sm text-qayed-fiche">Aucun modèle de message actif.</p>;
  }

  const selected = available.find((t) => t.id === templateId) ?? available[0];
  const message = renderTemplate(selected.body, templateVariablesFor(establishment));
  const waUrl = buildWaMeUrl(establishment.whatsapp_phone, message);

  if (compact) {
    return (
      <div className="relative">
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            setOpened(true);
          }}
          title="Ouvrir WhatsApp"
          className="flex h-btn-sm w-10 items-center justify-center rounded-btn bg-qayed-conforme text-white active:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
        </a>

        {opened && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute right-0 z-10 mt-1 w-56 rounded-card border border-qayed-ligne bg-white p-3 text-sm shadow-card-hover"
          >
            <p className="mb-2 text-qayed-encre">Message ouvert. Marquer comme envoyé ?</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={logMessage.isPending}
                onClick={() => logMessage.mutate(message)}
                className="h-btn-sm flex-1 rounded-btn bg-qayed-cachet font-semibold text-white disabled:opacity-60"
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => setOpened(false)}
                className="h-btn-sm flex-1 rounded-btn border border-qayed-ligne font-semibold text-qayed-fiche"
              >
                Non
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {available.length > 1 && (
        <select
          className="h-input w-full rounded-input border border-qayed-ligne bg-white px-3 text-sm"
          value={selected.id}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          {available.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => setOpened(true)}
        className="flex h-btn-lg w-full items-center justify-center gap-2 rounded-btn bg-qayed-conforme text-base font-semibold text-white shadow-btn active:opacity-90"
      >
        <MessageCircle className="h-5 w-5" />
        Ouvrir WhatsApp
      </a>

      {opened && (
        <div className="rounded-card border border-qayed-ligne bg-white p-3 text-sm">
          <p className="mb-2 text-qayed-encre">Message ouvert dans WhatsApp. Marquer comme envoyé ?</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={logMessage.isPending}
              onClick={() => logMessage.mutate(message)}
              className="h-btn-sm flex-1 rounded-btn bg-qayed-cachet font-semibold text-white disabled:opacity-60"
            >
              Oui, journaliser
            </button>
            <button
              type="button"
              onClick={() => setOpened(false)}
              className="h-btn-sm flex-1 rounded-btn border border-qayed-ligne font-semibold text-qayed-fiche"
            >
              Non
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
