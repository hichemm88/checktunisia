import { api } from '@/lib/api';
import { type LoginResult } from '@/api/auth';

/**
 * Connexion par code reçu sur WhatsApp.
 *
 * Deux appels, et une propriété à ne pas casser : `request` répond la MÊME
 * chose que le numéro soit enregistré ou non. Le frontend ne peut donc pas
 * afficher « numéro inconnu » — il ne le sait pas, et c'est voulu : cette page
 * est publique, et un message qui distinguerait les deux cas en ferait
 * l'annuaire des agents de police.
 *
 * `verify` renvoie exactement le même payload que /auth/login et la connexion
 * par passkey : le frontend traite les trois de la même façon.
 */
export const whatsappOtpApi = {
  /** 202 dans tous les cas. Il n'y a rien à lire dans la réponse. */
  request: (phone: string) =>
    api.post<{ ok: true }>('/auth/otp/request', { phone }).then(() => undefined),

  verify: (phone: string, code: string) =>
    api
      .post<{ data: LoginResult }>('/auth/otp/verify', { phone, code })
      .then((r) => r.data.data),
};
