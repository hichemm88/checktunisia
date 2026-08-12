import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** `sheet` : feuille remontant du bas sur mobile, carte centrée au-delà. */
  variant?: 'dialog' | 'sheet';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Boîte de dialogue accessible.
 *
 * Les cinq modales du portail étaient des <div> nues : ni `role="dialog"`, ni
 * `aria-modal`, ni piège de focus, ni fermeture à Échap. Au clavier ou au
 * lecteur d'écran, le focus continuait de parcourir la page derrière.
 */
export const Modal = ({ open, onClose, title, children, variant = 'dialog', size = 'md', className }: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    if (firstFocusable) firstFocusable.focus();
    else panel?.focus();

    // La page derrière ne doit pas défiler pendant qu'une modale est ouverte.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex bg-qayed-encre/60 p-0 sm:p-4',
        variant === 'sheet' ? 'items-end sm:items-center' : 'items-center',
        'justify-center',
      )}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-y-auto bg-white p-5 shadow-float',
          variant === 'sheet' ? 'rounded-t-3xl sm:rounded-3xl' : 'rounded-3xl',
          sizes[size],
          className,
        )}
      >
        {title && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={titleId} className="qayed-display text-lg text-qayed-encre">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="-me-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-qayed-fiche hover:bg-qayed-papier hover:text-qayed-encre"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
};
