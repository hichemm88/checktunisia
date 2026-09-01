import { describe, it, expect } from 'vitest';
import {
  base64UrlToBuffer,
  bufferToBase64Url,
  classifyPasskeyError,
  detectPasskeyFlavor,
  passkeyLabelKey,
} from './webauthn';

const bytes = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer));

/**
 * L'encodage est la seule frontière entre l'API du navigateur (ArrayBuffer) et
 * le réseau (base64url). Une erreur ici ne casse pas la compilation : elle
 * produit une signature invalide, refusée par le serveur, sans indice utile
 * pour l'utilisateur.
 */
describe('encodage base64url', () => {
  it('fait l’aller-retour sur des octets arbitraires', () => {
    const original = new Uint8Array([0, 1, 62, 63, 127, 128, 250, 255]);
    const roundTripped = base64UrlToBuffer(bufferToBase64Url(original.buffer));

    expect(bytes(roundTripped)).toEqual(Array.from(original));
  });

  it("n'émet ni +, ni /, ni = — ces caractères cassent une URL et un JSON de challenge", () => {
    // 0xFB 0xFF produit « ++ » et « / » en base64 standard.
    const encoded = bufferToBase64Url(new Uint8Array([251, 255, 254, 63, 191]).buffer);

    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('décode une valeur sans remplissage, telle que la renvoie le backend', () => {
    // 32 octets = 43 caractères base64url sans « = » : le format exact des
    // challenges et des identifiants de credential côté serveur.
    const raw = new Uint8Array(32).fill(7);
    const encoded = bufferToBase64Url(raw.buffer);

    expect(encoded).toHaveLength(43);
    expect(bytes(base64UrlToBuffer(encoded))).toEqual(Array.from(raw));
  });

  it('accepte aussi une valeur avec remplissage', () => {
    expect(bytes(base64UrlToBuffer('AQID'))).toEqual([1, 2, 3]);
    expect(bytes(base64UrlToBuffer('AQI='))).toEqual([1, 2]);
  });
});

/**
 * Le libellé « Face ID » est une promesse faite à l'utilisateur. Ces tests
 * protègent la règle : on ne l'affiche que là où le geste existe vraiment.
 */
describe('libellé selon la plateforme', () => {
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
  const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
  const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120';
  const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120';

  it('sans authentificateur intégré, ne parle jamais de biométrie', () => {
    // Poste de bureau sans capteur : une clé de sécurité reste possible, mais
    // annoncer Face ID serait faux.
    expect(detectPasskeyFlavor(false, IPHONE)).toBe('passkey');
    expect(detectPasskeyFlavor(false, WINDOWS)).toBe('passkey');
  });

  it('reconnaît iPhone, Mac, Windows et Android', () => {
    expect(detectPasskeyFlavor(true, IPHONE)).toBe('faceid');
    expect(detectPasskeyFlavor(true, MAC)).toBe('touchid');
    expect(detectPasskeyFlavor(true, WINDOWS)).toBe('hello');
    expect(detectPasskeyFlavor(true, ANDROID)).toBe('biometric');
  });

  it("distingue l'iPad d'un Mac par l'écran tactile", () => {
    // iPadOS se déclare « Macintosh » depuis iPadOS 13 : sans maxTouchPoints,
    // un iPad Face ID afficherait « Touch ID ».
    expect(detectPasskeyFlavor(true, IPAD, 5)).toBe('faceid');
    expect(detectPasskeyFlavor(true, IPAD, 0)).toBe('touchid');
  });

  it('retombe sur « passkey » pour une plateforme inconnue', () => {
    expect(detectPasskeyFlavor(true, 'Mozilla/5.0 (SomeFutureOS)')).toBe('passkey');
  });

  it('produit une clé de traduction par saveur', () => {
    expect(passkeyLabelKey('faceid')).toBe('passkeys.continueWith.faceid');
    expect(passkeyLabelKey('passkey')).toBe('passkeys.continueWith.passkey');
  });
});

describe('classification des erreurs', () => {
  const ok = { supported: true, secure: true };
  const err = (name: string) => Object.assign(new Error(name), { name });

  it("traite l'annulation et l'expiration comme une annulation, pas comme une panne", () => {
    // La spec impose NotAllowedError dans les deux cas, pour ne pas révéler à
    // une page hostile ce que l'utilisateur a fait.
    expect(classifyPasskeyError(err('NotAllowedError'), ok)).toBe('cancelled');
    expect(classifyPasskeyError(err('AbortError'), ok)).toBe('cancelled');
  });

  it('reconnaît un appareil déjà enregistré', () => {
    expect(classifyPasskeyError(err('InvalidStateError'), ok)).toBe('duplicate');
  });

  it('signale une page non sécurisée avant tout le reste', () => {
    expect(classifyPasskeyError(err('SecurityError'), { supported: true, secure: false })).toBe('insecure');
  });

  it('signale un navigateur sans WebAuthn', () => {
    expect(classifyPasskeyError(err('NotSupportedError'), { supported: false, secure: true })).toBe('unsupported');
  });

  it("n'inventera pas de cause pour une erreur inconnue", () => {
    expect(classifyPasskeyError(new Error('boom'), ok)).toBe('unknown');
  });

  it("une annulation reste une annulation même sur un navigateur jugé incompatible", () => {
    expect(classifyPasskeyError(err('NotAllowedError'), { supported: false, secure: true })).toBe('cancelled');
  });
});
