import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/cn';

const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'AR', name: 'العربية' },
];

interface LanguageSwitcherProps {
  onDark?: boolean;
  className?: string;
  /** Remplace le comportement par défaut (i18n.changeLanguage) — utilisé par
      le site public pour aussi synchroniser l'URL (/fr ↔ /en ↔ /ar). */
  onSelect?: (code: string) => void;
}

export const LanguageSwitcher = ({ onDark = false, className = '', onSelect }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* h-11 : le déclencheur faisait ~30px de haut. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-11 items-center gap-1.5 rounded-btn px-2.5 text-xs font-semibold transition-colors',
          onDark
            ? 'text-white/80 hover:bg-white/10 hover:text-white'
            : 'text-qayed-fiche hover:bg-qayed-papier hover:text-qayed-encre',
        )}
        aria-label="Choisir la langue"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {current.label}
      </button>
      {open && (
        <div role="listbox" className="absolute end-0 mt-1 z-50 w-36 rounded-xl border border-qayed-gris-200 bg-white py-1 shadow-float">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === current.code}
              onClick={() => {
                if (onSelect) onSelect(l.code);
                else i18n.changeLanguage(l.code);
                setOpen(false);
              }}
              className={cn(
                'flex min-h-[44px] w-full items-center justify-between px-3 text-start text-sm hover:bg-qayed-papier',
                l.code === current.code ? 'font-bold text-qayed-cachet' : 'text-qayed-gris-700',
              )}
            >
              <span>{l.name}</span>
              <span className="text-xs text-qayed-fiche">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
