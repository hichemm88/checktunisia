import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GuestForm } from '@/components/widget/GuestForm';
import { ficheWidgetApi, setWidgetToken, extractWidgetError } from '@/api/widget/ficheWidget';
import type { BootstrapResponse, GuestInput } from '@/api/widget/ficheWidget';

interface AddedGuest {
  id: string;
  first_name: string;
  last_name: string;
  nationality_code: string;
  removable: boolean;
}

/** Session mise en cache le temps de l'onglet — un rechargement ne redemande jamais le JWT (usage unique, §8). */
const sessionCacheKey = (jwt: string) => `qayed-widget-session:${jwt}`;

const postToParent = (message: Record<string, unknown>) => {
  try {
    window.parent.postMessage(message, '*');
  } catch {
    /* pas de parent (widget ouvert seul, développement) */
  }
};

export const FicheWidgetPage = ({ token }: { token: string }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'submitted'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [guests, setGuests] = useState<AddedGuest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ fiche_id: string; guest_count: number } | null>(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage(t('widget.genericError'));
      return;
    }

    const cacheKey = sessionCacheKey(token);
    const cached = sessionStorage.getItem(cacheKey);

    const boot = async () => {
      try {
        let data: BootstrapResponse;
        if (cached) {
          data = JSON.parse(cached) as BootstrapResponse;
        } else {
          data = await ficheWidgetApi.bootstrap(token);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
        setWidgetToken(data.widget_token);
        setBootstrap(data);
        setGuests(
          data.mode === 'amend'
            ? data.existing_guests.map((g) => ({ ...g, removable: false }))
            : [],
        );
        setState('ready');
      } catch (err) {
        const { message } = extractWidgetError(err);
        setErrorMessage(message);
        setState('error');
        postToParent({ type: 'qayed:error', code: extractWidgetError(err).code });
      }
    };

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAddGuest = async (guest: GuestInput) => {
    const added = await ficheWidgetApi.addGuest(guest);
    setGuests((g) => [...g, { ...added, removable: true }]);
    setShowForm(false);
  };

  const handleRemoveGuest = async (guestId: string) => {
    await ficheWidgetApi.removeGuest(guestId);
    setGuests((g) => g.filter((x) => x.id !== guestId));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await ficheWidgetApi.submit();
      setSubmitResult(result);
      setState('submitted');
      if (bootstrap) sessionStorage.removeItem(sessionCacheKey(token));
      postToParent({
        type: 'qayed:submitted',
        session_id: result.session_id,
        fiche_id: result.fiche_id,
        guest_count: result.guest_count,
      });
    } catch (err) {
      const { message } = extractWidgetError(err);
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    postToParent({ type: 'qayed:closed', session_id: bootstrap?.session_id });
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-qayed-papier">
        <p className="text-sm text-qayed-fiche">{t('widget.loading')}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-qayed-papier px-6 text-center">
        <h1 className="font-display text-lg font-bold text-qayed-encre">{t('widget.errorTitle')}</h1>
        <p className="text-sm text-qayed-fiche">{errorMessage}</p>
      </div>
    );
  }

  if (state === 'submitted' && submitResult) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-qayed-papier px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-qayed-conforme-fond">
          <Check className="h-7 w-7 text-qayed-conforme-texte" aria-hidden="true" />
        </div>
        <h1 className="font-display text-lg font-bold text-qayed-encre">{t('widget.submitted')}</h1>
        <p className="text-sm text-qayed-fiche">{t('widget.submittedBody')}</p>
        <Button variant="secondary" onClick={handleClose}>{t('widget.close')}</Button>
      </div>
    );
  }

  if (!bootstrap) return null;

  return (
    <div className="min-h-screen bg-qayed-papier pb-28">
      <header className="border-b border-qayed-ligne bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-qayed-fiche">{bootstrap.establishment_name}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-qayed-encre">
          <span>{t('widget.bookingRef')} : <strong>{bootstrap.booking_ref}</strong></span>
          {bootstrap.room && <span>{t('widget.room')} : <strong>{bootstrap.room}</strong></span>}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {bootstrap.mode === 'amend' && (
          <div className="rounded-xl border border-qayed-vigilance bg-qayed-vigilance-fond px-3 py-2.5 text-sm font-medium text-qayed-vigilance-texte">
            {t('widget.amendBanner')}
          </div>
        )}

        <section className="space-y-2">
          <h2 className="font-display text-sm font-bold text-qayed-encre">{t('widget.guests')}</h2>
          {guests.length === 0 && <p className="text-sm text-qayed-fiche">{t('widget.noGuests')}</p>}
          {guests.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-xl border border-qayed-ligne bg-white px-3 py-2.5">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-qayed-fiche-faible" aria-hidden="true" />
                <span className="text-sm font-medium text-qayed-encre">{g.first_name} {g.last_name}</span>
                <span className="text-xs text-qayed-fiche">{g.nationality_code}</span>
              </div>
              {g.removable && (
                <button type="button" onClick={() => handleRemoveGuest(g.id)} aria-label={t('widget.remove')} className="text-qayed-erreur-texte">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </section>

        {showForm ? (
          <GuestForm onAdd={handleAddGuest} onCancel={() => setShowForm(false)} />
        ) : (
          <Button variant="secondary" fullWidth onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> {t('widget.addGuestButton')}
          </Button>
        )}

        {errorMessage && <p className="text-sm text-qayed-erreur-texte">{errorMessage}</p>}
        {guests.length === 0 && <p className="text-xs text-qayed-fiche">{t('widget.atLeastOneGuest')}</p>}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-qayed-ligne bg-white p-4 pb-safe">
        <Button fullWidth disabled={guests.length === 0} loading={submitting} onClick={handleSubmit}>
          {submitting ? t('widget.submitting') : t('widget.submit')}
        </Button>
      </div>
    </div>
  );
};
