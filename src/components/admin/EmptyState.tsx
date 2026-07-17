import { ReactNode } from 'react';
import { QayedStamp } from '@/components/ui/QayedStamp';

/**
 * Chantier D — état vide utile : le sceau قيد en filigrane discret, un
 * message qui explique POURQUOI c'est vide et, si possible, l'action qui
 * remplira la liste.
 */
export const EmptyState = ({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) => (
  <div className="relative flex flex-col items-center gap-1.5 py-10 text-center">
    <div className="opacity-[0.08] pointer-events-none select-none mb-1">
      <QayedStamp size={64} />
    </div>
    <p className="text-sm font-semibold text-gray-500">{title}</p>
    {hint && <p className="text-xs text-gray-400 max-w-sm">{hint}</p>}
    {children}
  </div>
);
