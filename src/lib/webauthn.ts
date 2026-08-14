/**
 * Couche WebAuthn du navigateur.
 *
 * Deux principes tiennent tout ce fichier :
 *
 * 1. On n'implémente PAS Face ID. On appelle `navigator.credentials.*`, et
 *    c'est le système d'exploitation qui choisit ce qu'il présente : Face ID
 *    ou Touch ID sur iPhone et Mac, Windows Hello sur PC, empreinte ou code
 *    sur Android, code PIN sur une clé de sécurité. Aucune API propriétaire
 *    n'est touchée, et aucune donnée biométrique ne traverse ce code.
 *
 * 2. Le libellé « Face ID » n'est affiché que si l'environnement le justifie
 *    réellement. Ailleurs, on dit « passkey ». Promettre Face ID à un
 *    utilisateur d'Android ou d'un PC de bureau serait un mensonge d'interface.
 */

// ── Encodage ────────────────────────────────────────────────────────────────
//
// L'API WebAuthn parle ArrayBuffer, le réseau parle base64url. Ces quatre
// fonctions sont la seule frontière entre les deux.

export const base64UrlToBuffer = (value: string): ArrayBuffer => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

export const bufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// ── Types d'échange avec l'API ──────────────────────────────────────────────

/** Options telles que renvoyées par le backend (challenge et ids en base64url). */
export interface PublicKeyOptionsJSON {
  challenge: string;
  rp?: { id: string; name: string };
  user?: { id: string; name: string; displayName: string };
  pubKeyCredParams?: Array<{ type: string; alg: number }>;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  excludeCredentials?: Array<{ type: string; id: string; transports?: string[] }>;
  allowCredentials?: Array<{ type: string; id: string; transports?: string[] }>;
  rpId?: string;
  userVerification?: UserVerificationRequirement;
  timeout?: number;
}

export interface RegistrationCredentialJSON {
  id: string;
  rawId: string;
  type: string;
  response: { clientDataJSON: string; attestationObject: string; transports: string[] };
}

export interface AuthenticationCredentialJSON {
  id: string;
  rawId: string;
  type: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string | null;
  };
}

// ── Détection des capacités ─────────────────────────────────────────────────

export const isWebAuthnSupported = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined' &&
  typeof navigator?.credentials?.create === 'function';

/**
 * L'appareil possède-t-il un authentificateur intégré (Face ID, Touch ID,
 * Windows Hello, capteur d'empreinte) ? Faux sur un poste sans biométrie :
 * une clé de sécurité USB reste alors possible, mais on n'affiche plus
 * « Face ID ».
 */
export const hasPlatformAuthenticator = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

/**
 * Remplissage conditionnel : le navigateur propose la passkey dans la liste
 * d'autocomplétion du champ e-mail, sans que l'utilisateur ait à cliquer.
 * Absent de Firefox sur plusieurs plateformes et des anciens Safari — d'où la
 * détection plutôt qu'une hypothèse.
 */
export const isConditionalMediationAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return (await window.PublicKeyCredential.isConditionalMediationAvailable?.()) ?? false;
  } catch {
    return false;
  }
};

// ── Libellés selon la plateforme ────────────────────────────────────────────

export type PasskeyFlavor = 'faceid' | 'touchid' | 'hello' | 'biometric' | 'passkey';

/**
 * Quel nom donner au geste que l'utilisateur va faire ?
 *
 * Volontairement prudent : on ne distingue pas Face ID de Touch ID sur iPhone
 * (le navigateur ne le dit pas, et l'iPhone SE utilise Touch ID). « Face ID /
 * Touch ID » couvre les deux sans mentir. Sur un Mac ou un PC sans capteur,
 * `hasPlatform` est faux et l'on retombe sur « passkey ».
 */
export const detectPasskeyFlavor = (
  hasPlatform: boolean,
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints: number = typeof navigator === 'undefined' ? 0 : (navigator.maxTouchPoints ?? 0),
): PasskeyFlavor => {
  if (!hasPlatform) return 'passkey';

  const ua = userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  // iPadOS se présente comme un Mac depuis iPadOS 13 : seul l'écran tactile
  // les sépare. Sans ce test, un iPad annoncerait « Touch ID » au lieu de
  // « Face ID / Touch ID ».
  const isIPadOS = /Macintosh/.test(ua) && maxTouchPoints > 1;

  if (isIOS || isIPadOS) return 'faceid';
  if (/Macintosh|Mac OS X/.test(ua)) return 'touchid';
  if (/Windows/.test(ua)) return 'hello';
  if (/Android/.test(ua)) return 'biometric';
  return 'passkey';
};

/** Clé i18n du bouton principal, pour la saveur détectée. */
export const passkeyLabelKey = (flavor: PasskeyFlavor): string =>
  `passkeys.continueWith.${flavor}`;

// ── Erreurs ─────────────────────────────────────────────────────────────────

export type PasskeyErrorKind =
  | 'cancelled'      // l'utilisateur a annulé, ou le délai a expiré
  | 'unsupported'    // navigateur ou contexte sans WebAuthn
  | 'insecure'       // page non HTTPS
  | 'duplicate'      // cet appareil a déjà une passkey pour ce compte
  | 'unknown';

/**
 * Traduit une exception de l'API en cause exploitable.
 *
 * `NotAllowedError` recouvre l'annulation ET l'expiration : la spec l'exige
 * pour ne pas révéler à une page hostile ce que l'utilisateur a fait. On la
 * traite donc comme une annulation, sans message alarmant.
 *
 * Le nom de l'erreur est examiné AVANT l'environnement : une annulation reste
 * une annulation, et l'afficher comme « navigateur non compatible » enverrait
 * l'utilisateur chercher un problème qui n'existe pas.
 *
 * `env` n'est là que pour les tests ; en production, la détection réelle sert.
 */
export const classifyPasskeyError = (
  error: unknown,
  env?: { supported: boolean; secure: boolean },
): PasskeyErrorKind => {
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') return 'cancelled';
  if (name === 'InvalidStateError') return 'duplicate';

  const secure = env?.secure ?? (typeof window === 'undefined' || window.isSecureContext);
  const supported = env?.supported ?? isWebAuthnSupported();

  if (!secure) return 'insecure';
  if (!supported) return 'unsupported';
  if (name === 'NotSupportedError' || name === 'SecurityError') return 'unsupported';
  return 'unknown';
};

/** Clé i18n du message d'erreur affiché. */
export const passkeyErrorKey = (kind: PasskeyErrorKind): string => `passkeys.errors.${kind}`;

// ── Cérémonies ──────────────────────────────────────────────────────────────

/**
 * Enregistrement : `navigator.credentials.create()`. C'est cet appel qui
 * déclenche Face ID / Touch ID / Windows Hello / empreinte / PIN.
 */
export const createPasskey = async (options: PublicKeyOptionsJSON): Promise<RegistrationCredentialJSON> => {
  const publicKey: PublicKeyCredentialCreationOptions = {
    ...(options as unknown as PublicKeyCredentialCreationOptions),
    challenge: base64UrlToBuffer(options.challenge),
    user: {
      ...options.user!,
      id: base64UrlToBuffer(options.user!.id),
    },
    excludeCredentials: (options.excludeCredentials ?? []).map((c) => ({
      type: 'public-key' as const,
      id: base64UrlToBuffer(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error('EMPTY_CREDENTIAL');

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      // Indice conservé côté serveur pour les connexions suivantes (clé
      // interne, téléphone en relais, USB…). Absent des vieux navigateurs.
      transports: response.getTransports?.() ?? [],
    },
  };
};

/**
 * Connexion : `navigator.credentials.get()`.
 *
 * `conditional` active le remplissage par autocomplétion — l'appel reste alors
 * en attente jusqu'à ce que l'utilisateur choisisse une passkey dans le champ
 * e-mail, et doit être interrompu (`AbortController`) si l'on bascule sur le
 * mot de passe.
 */
export const getPasskeyAssertion = async (
  options: PublicKeyOptionsJSON,
  { mediation, signal }: { mediation?: CredentialMediationRequirement; signal?: AbortSignal } = {},
): Promise<AuthenticationCredentialJSON> => {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: options.userVerification,
    allowCredentials: (options.allowCredentials ?? []).map((c) => ({
      type: 'public-key' as const,
      id: base64UrlToBuffer(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };

  const credential = (await navigator.credentials.get({ publicKey, mediation, signal })) as PublicKeyCredential | null;
  if (!credential) throw new Error('EMPTY_CREDENTIAL');

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
    },
  };
};
