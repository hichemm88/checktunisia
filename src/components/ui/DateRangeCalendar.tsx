import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Sélecteur de PÉRIODE inline, sans dépendance : on clique le jour de début,
 * puis directement le jour de fin (aucun bouton OK). Survol = aperçu de la plage.
 * Dates au format 'yyyy-mm-dd' (locales, pas de décalage UTC).
 */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m ?? 1) - 1, d ?? 1); };
const sameOrBetween = (day: string, a: string, b: string) => day >= a && day <= b;

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  max?: string;              // jour max sélectionnable (ex. aujourd'hui)
  locale?: string;
}

export const DateRangeCalendar = ({ from, to, onChange, max, locale = 'fr-FR' }: Props) => {
  const [view, setView] = useState(() => parse(to || from || ymd(new Date())));
  const [hover, setHover] = useState<string | null>(null);

  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  // Semaine commençant lundi (getDay: 0=dim → 6).
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)), // 2024-01-01 = lundi
  );

  const pickDay = (dayStr: string) => {
    // Rien ou plage complète → on (re)commence une sélection.
    if (!from || (from && to)) { onChange(dayStr, ''); return; }
    // Début posé, on choisit la fin.
    if (dayStr >= from) onChange(from, dayStr);
    else onChange(dayStr, ''); // clic avant le début → nouveau début
  };

  const cells: (string | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(year, month, i + 1))),
  ];

  // Plage à afficher (réelle, ou aperçu au survol pendant la sélection de fin).
  const previewEnd = from && !to && hover && hover >= from ? hover : to;

  return (
    <div className="w-full max-w-[320px] select-none">
      {/* En-tête mois */}
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setView(new Date(year, month - 1, 1))}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold capitalize text-gray-800">
          {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(first)}
        </span>
        <button type="button" onClick={() => setView(new Date(year, month + 1, 1))}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Jours de semaine */}
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
        {weekdays.map((w, i) => <div key={i} className="py-1">{w}</div>)}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const disabled = max ? day > max : false;
          const isStart = day === from;
          const isEnd = day === (to || previewEnd);
          const inRange = from && previewEnd && sameOrBetween(day, from, previewEnd);
          const isEdge = isStart || isEnd;

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => pickDay(day)}
              onMouseEnter={() => setHover(day)}
              onMouseLeave={() => setHover(null)}
              className="relative py-1.5 disabled:opacity-30"
              style={inRange && !isEdge ? { background: '#EEEBFA' } : undefined}
            >
              <span
                className="mx-auto flex h-8 w-8 items-center justify-center rounded-full"
                style={isEdge
                  ? { background: '#5346A8', color: '#fff', fontWeight: 700 }
                  : { color: disabled ? '#9ca3af' : '#374151' }}
              >
                {Number(day.slice(-2))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
