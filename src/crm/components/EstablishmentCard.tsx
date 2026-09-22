import { Link } from 'react-router-dom';
import { StatusBadge } from '@/crm/components/StatusBadge';
import { WhatsAppButton } from '@/crm/components/WhatsAppButton';
import { MarkDoneButton, RescheduleButton } from '@/crm/components/QuickActions';
import type { Establishment, MessageTemplate } from '@/crm/types';

interface EstablishmentCardProps {
  establishment: Establishment;
  templates: MessageTemplate[];
  /** Actions rapides à un pouce (WhatsApp/Fait/Reporter) — écran "Aujourd'hui" uniquement. */
  quickActions?: boolean;
}

export function EstablishmentCard({ establishment, templates, quickActions = false }: EstablishmentCardProps) {
  return (
    <li className="rounded-card border border-qayed-ligne bg-white shadow-card">
      {/* Un <a> (bouton WhatsApp) imbriqué dans ce Link casserait le HTML — les
          actions rapides vivent donc dans une ligne séparée, hors du Link. */}
      <Link to={`/etablissements/${establishment.id}`} className="block p-4 active:bg-qayed-cachet-dilue">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-qayed-encre">{establishment.name}</p>
            <StatusBadge status={establishment.status} />
          </div>

          <div className="flex items-center gap-2">
            {establishment.is_overdue && (
              <span className="rounded-full bg-qayed-vigilance-fond px-2 py-1 text-xs font-semibold text-qayed-vigilance-texte">
                Retard
              </span>
            )}
            <span className="text-sm text-qayed-fiche">{establishment.priority}</span>
          </div>
        </div>
      </Link>

      {quickActions && (
        <div className="flex items-center gap-2 border-t border-qayed-ligne px-4 py-2.5">
          <WhatsAppButton establishment={establishment} templates={templates} compact />
          <MarkDoneButton establishment={establishment} />
          <RescheduleButton establishment={establishment} />
        </div>
      )}
    </li>
  );
}
