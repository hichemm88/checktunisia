import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

type ToastType = 'success' | 'error' | 'warning';

interface Toast { id: string; type: ToastType; message: string }

interface ToastContextValue { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const icons = { success: CheckCircle, error: XCircle, warning: AlertCircle };

/** Couples fond/bordure/texte de la charte — les classes `green-*`, `red-*` et
 *  `yellow-*` de Tailwind n'avaient aucun équivalent dans la palette. */
const styles = {
  success: 'bg-qayed-conforme-fond border-qayed-conforme text-qayed-conforme-texte',
  error:   'bg-qayed-erreur-fond border-qayed-erreur text-qayed-erreur-texte',
  warning: 'bg-qayed-vigilance-fond border-qayed-vigilance text-qayed-vigilance-texte',
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/*
        `role="status"` + `aria-live` : le toast est le seul retour d'action de
        l'application, et il n'était jamais annoncé.
        Centrage : `start-1/2` est une propriété logique mais `translate-x` ne
        l'est pas — en arabe, le toast partait hors axe. Un conteneur pleine
        largeur qui centre en flex se comporte correctement dans les deux sens.
      */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-24 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((item) => {
          const Icon = icons[item.type];
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-float',
                styles[item.type],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">{item.message}</p>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={t('common.close')}
                className="ms-auto shrink-0 opacity-60 hover:opacity-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
