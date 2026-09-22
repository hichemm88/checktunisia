import { ACTION_TYPE_LABELS } from '@/crm/lib/actionTypes';
import type { ProspectionAction } from '@/crm/types';

/** Journal antichronologique (§ Fiche prospect) — le tri vient déjà du backend (orderByDesc occurred_at). */
export function ActionTimeline({ actions }: { actions: ProspectionAction[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-qayed-fiche">Aucune action enregistrée pour le moment.</p>;
  }

  return (
    <ol className="space-y-3">
      {actions.map((a) => (
        <li key={a.id} className="rounded-card border border-qayed-ligne bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-qayed-encre">{ACTION_TYPE_LABELS[a.type]}</span>
            <time className="text-xs text-qayed-fiche">
              {new Date(a.occurred_at).toLocaleString('fr-TN', { dateStyle: 'medium', timeStyle: 'short' })}
            </time>
          </div>
          {a.channel && <p className="mt-0.5 text-xs text-qayed-fiche">{a.channel}</p>}
          {a.content && <p className="mt-1 whitespace-pre-wrap text-sm text-qayed-encre">{a.content}</p>}
          {a.objections && a.objections.length > 0 && (
            <p className="mt-1 text-xs text-qayed-vigilance-texte">Objections : {a.objections.join(', ')}</p>
          )}
          {a.created_by && <p className="mt-1 text-xs text-qayed-fiche">par {a.created_by}</p>}
        </li>
      ))}
    </ol>
  );
}
