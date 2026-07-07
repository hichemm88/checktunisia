import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'AR', name: 'العربية' },
];

interface LanguageSwitcherProps {
  onDark?: boolean;
  className?: string;
}

export const LanguageSwitcher = ({ onDark = false, className = '' }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          onDark ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-qayed-papier hover:text-gray-800'
        }`}
        aria-label="Choisir la langue"
      >
        <Globe className="h-3.5 w-3.5" />
        {current.label}
      </button>
      {open && (
        <div className="absolute end-0 mt-1 z-50 w-32 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { i18n.changeLanguage(l.code); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-start text-sm hover:bg-qayed-papier ${
                l.code === current.code ? 'font-bold text-qayed-cachet' : 'text-gray-700'
              }`}
            >
              <span>{l.name}</span>
              <span className="text-xs text-gray-400">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
