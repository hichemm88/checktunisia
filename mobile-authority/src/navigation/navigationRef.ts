import { createNavigationContainerRef } from '@react-navigation/native';
import { MainTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<MainTabParamList>();

/**
 * Deep-link vers le détail d'une alerte depuis une push (F5).
 * Robuste au bug connu de l'app hébergeur : si la navigation n'est pas prête
 * ou si l'alerte concerne un autre contexte, l'écran cible gère lui-même le
 * cas « introuvable » — jamais de « Ressource not found » brut (§9.1).
 */
export function openAlertFromPush(alertId: string): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('HomeTab', {
    screen: 'AlertDetail',
    params: { alertId },
  } as never);
}
