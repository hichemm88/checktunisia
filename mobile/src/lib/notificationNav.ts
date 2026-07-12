import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/lib/toast';
import { fr, interp } from '@/i18n/fr';

/**
 * Open the stay a notification points at (§0 fix). Notifications can reference a stay in a
 * DIFFERENT establishment than the active one; since every API request is scoped to the
 * active property via X-Property-Id, opening it as-is would 404 ("Ressource not found").
 *
 * So: if the notification carries a property that isn't the active one, switch the active
 * establishment first (with a discreet toast so the user understands the context change),
 * THEN navigate. Works for both the in-app centre and a tapped push. If there's no
 * check-in target, fall back to the notification centre.
 */
export async function openCheckInFromNotification(opts: {
  checkInId?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
}): Promise<void> {
  const { checkInId, propertyId, propertyName } = opts;
  const { activePropertyId, setActiveProperty } = useAuthStore.getState();

  if (propertyId && propertyId !== activePropertyId) {
    await setActiveProperty(propertyId, propertyName ?? '');
    if (propertyName) showToast(interp(fr.notifications.contextSwitch, { name: propertyName }));
  }

  if (checkInId) router.push(`/fiche/${checkInId}`);
  else router.push('/notifications');
}
