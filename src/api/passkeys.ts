import { api } from '@/lib/api';
import { type AuthUser } from '@/stores/authStore';
import {
  createPasskey,
  getPasskeyAssertion,
  type PublicKeyOptionsJSON,
} from '@/lib/webauthn';

export interface Passkey {
  id: string;
  device_name: string;
  transports: string[];
  backed_up: boolean | null;
  created_at: string | null;
  last_used_at: string | null;
}

export interface PasskeyListResponse {
  passkeys: Passkey[];
  max_allowed: number;
  recovery_codes_remaining: number;
}

export interface SecurityState {
  two_factor_enabled: boolean;
  passkeys_count: number;
  recovery_codes_remaining: number;
  auth_method: 'password' | 'totp' | 'recovery_code' | 'passkey' | 'whatsapp_otp' | null;
}

export interface PasskeySessionResult {
  token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
}

interface CeremonyOptions {
  challenge_id: string;
  public_key: PublicKeyOptionsJSON;
}

export const passkeysApi = {
  list: () =>
    api.get<{ data: PasskeyListResponse }>('/auth/passkeys').then((r) => r.data.data),

  rename: (id: string, name: string) =>
    api.patch<{ data: Passkey }>(`/auth/passkeys/${id}`, { name }).then((r) => r.data.data),

  revoke: (id: string) =>
    api
      .delete<{ data: { security: SecurityState } }>(`/auth/passkeys/${id}`)
      .then((r) => r.data.data),

  /**
   * Enregistre une passkey pour le compte connecté.
   *
   * Le serveur émet un challenge, le système affiche Face ID / Touch ID /
   * Windows Hello / empreinte / code, puis le credential PUBLIC est renvoyé.
   * La clé privée reste dans l'enclave sécurisée de l'appareil : elle n'est
   * jamais lisible, ni par ce code, ni par le serveur.
   */
  register: async (name?: string) => {
    const { challenge_id, public_key } = await api
      .post<{ data: CeremonyOptions }>('/auth/passkeys/options')
      .then((r) => r.data.data);

    const credential = await createPasskey(public_key);

    return api
      .post<{
        data: { passkey: Passkey; recovery_codes: string[] | null; security: SecurityState };
      }>('/auth/passkeys', { challenge_id, name, credential })
      .then((r) => r.data.data);
  },

  /**
   * Connexion par passkey.
   *
   * Aucun e-mail n'est transmis : la cérémonie repose sur les passkeys
   * découvrables, et l'appareil propose lui-même les comptes qu'il détient
   * pour ce domaine.
   *
   * `mediation: 'conditional'` sert le remplissage par autocomplétion ; passer
   * `signal` permet alors d'interrompre l'attente si l'utilisateur choisit
   * finalement le mot de passe.
   */
  login: async (opts: { mediation?: CredentialMediationRequirement; signal?: AbortSignal } = {}) => {
    const { challenge_id, public_key } = await api
      .post<{ data: CeremonyOptions }>('/auth/passkey/options')
      .then((r) => r.data.data);

    const credential = await getPasskeyAssertion(public_key, opts);

    return api
      .post<{ data: PasskeySessionResult }>('/auth/passkey/verify', { challenge_id, credential })
      .then((r) => r.data.data);
  },
};

export const recoveryCodesApi = {
  status: () =>
    api.get<{ data: { remaining: number } }>('/auth/recovery-codes').then((r) => r.data.data),

  regenerate: (currentPassword: string) =>
    api
      .post<{ data: { recovery_codes: string[] } }>('/auth/recovery-codes', {
        current_password: currentPassword,
      })
      .then((r) => r.data.data),

  /** Termine une connexion avec un code de récupération, à la place du TOTP. */
  verify: (partialToken: string, code: string) =>
    api
      .post<{ data: PasskeySessionResult }>(
        '/auth/2fa/recovery',
        { code },
        { headers: { Authorization: `Bearer ${partialToken}` } },
      )
      .then((r) => r.data.data),
};
