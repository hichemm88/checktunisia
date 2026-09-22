import { useEffect, useState } from 'react';
import { crmApi, firstApiErrorMessage } from '@/crm/lib/api';
import { currentPushEndpoint, isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/crm/lib/push';
import { useCrmAuthStore } from '@/crm/stores/authStore';
import type { CrmUser } from '@/crm/types';

/** Heures proposées pour le récap du matin — voir SendDigestCommand côté backend : la commande tourne toutes les 15 minutes, une heure hors de cette grille ne serait donc jamais atteinte exactement. */
const DIGEST_HOURS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0');
  const m = String((i % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
});

/**
 * § Écran Réglages : activer/désactiver les notifications sur cet appareil,
 * régler les 3 déclencheurs, tester. Ne notifie jamais silencieusement — la
 * permission navigateur est toujours demandée par un geste explicite
 * (bouton), jamais au chargement de la page.
 */
export function NotificationSettings() {
  const { user, setUser } = useCrmAuthStore();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setSubscribed(false);
      return;
    }
    currentPushEndpoint().then((endpoint) => setSubscribed(!!endpoint));
  }, []);

  if (!user) return null;

  async function handleEnable() {
    setBusy(true);
    setMessage(null);
    try {
      const payload = await subscribeToPush();
      await crmApi.post('/push-subscriptions', payload);
      setSubscribed(true);
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : "Impossible d'activer les notifications." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setMessage(null);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await crmApi.delete('/push-subscriptions', { data: { endpoint } });
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setMessage(null);
    try {
      await crmApi.post('/push-subscriptions/test');
      setMessage({ kind: 'ok', text: 'Notification envoyée — vérifiez votre appareil.' });
    } catch (err) {
      setMessage({ kind: 'error', text: firstApiErrorMessage(err, "Impossible d'envoyer la notification de test.") });
    }
  }

  async function updatePref(patch: Partial<CrmUser['notifications']>) {
    const apiPatch = {
      ...(patch.digest_enabled !== undefined && { notif_digest_enabled: patch.digest_enabled }),
      ...(patch.digest_hour !== undefined && { notif_digest_hour: patch.digest_hour }),
      ...(patch.demo_reminder_enabled !== undefined && { notif_demo_reminder_enabled: patch.demo_reminder_enabled }),
      ...(patch.activity_enabled !== undefined && { notif_activity_enabled: patch.activity_enabled }),
    };

    const res = await crmApi.patch<{ data: CrmUser }>('/auth/me', apiPatch);
    setUser(res.data.data);
  }

  return (
    <div className="mb-6 rounded-card border border-qayed-ligne bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-qayed-encre">Notifications</h2>

      {!isPushSupported() ? (
        <p className="text-sm text-qayed-fiche">Ce navigateur ne prend pas en charge les notifications.</p>
      ) : (
        <>
          <button
            type="button"
            disabled={busy || subscribed === null}
            onClick={subscribed ? handleDisable : handleEnable}
            className="h-btn-md w-full rounded-btn bg-qayed-cachet text-sm font-semibold text-white disabled:opacity-60"
          >
            {subscribed ? 'Désactiver sur cet appareil' : 'Activer les notifications'}
          </button>

          {subscribed && (
            <button
              type="button"
              onClick={handleTest}
              className="mt-2 h-btn-sm w-full rounded-btn border border-qayed-ligne text-sm font-semibold text-qayed-encre"
            >
              Tester les notifications
            </button>
          )}

          {message && (
            <p className={`mt-2 text-sm ${message.kind === 'error' ? 'text-qayed-erreur-texte' : 'text-qayed-conforme-texte'}`}>
              {message.text}
            </p>
          )}

          <div className="mt-4 space-y-3 border-t border-qayed-ligne pt-4">
            <label className="flex items-center justify-between text-sm text-qayed-encre">
              Récap du matin
              <input
                type="checkbox"
                checked={user.notifications.digest_enabled}
                onChange={(e) => updatePref({ digest_enabled: e.target.checked })}
              />
            </label>

            {user.notifications.digest_enabled && (
              <label className="flex items-center justify-between text-sm text-qayed-encre">
                Heure du récap
                <select
                  value={user.notifications.digest_hour}
                  onChange={(e) => updatePref({ digest_hour: e.target.value })}
                  className="h-btn-sm rounded-btn border border-qayed-ligne bg-white px-2 text-sm"
                >
                  {DIGEST_HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex items-center justify-between text-sm text-qayed-encre">
              Rappels de démo
              <input
                type="checkbox"
                checked={user.notifications.demo_reminder_enabled}
                onChange={(e) => updatePref({ demo_reminder_enabled: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between text-sm text-qayed-encre">
              Activité de l'équipe
              <input
                type="checkbox"
                checked={user.notifications.activity_enabled}
                onChange={(e) => updatePref({ activity_enabled: e.target.checked })}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
