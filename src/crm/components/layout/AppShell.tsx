import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, ClipboardList, Home, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const TABS = [
  { to: '/', label: 'Aujourd\'hui', icon: Home, end: true },
  { to: '/pipeline', label: 'Pipeline', icon: ClipboardList, end: false },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3, end: false },
  { to: '/reglages', label: 'Réglages', icon: Settings, end: false },
] as const;

/**
 * Coquille mobile-first : navigation basse à 4 onglets, cibles tactiles
 * larges (§ prompt "actions clés à un pouce"). Le contenu défile
 * indépendamment de la barre, fixée en bas de l'écran (pouce).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-qayed-papier">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-qayed-ligne bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                isActive ? 'text-qayed-cachet' : 'text-qayed-fiche',
              )
            }
          >
            <Icon className="h-6 w-6" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
