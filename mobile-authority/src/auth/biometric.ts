import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  faceId: boolean;
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return {
      available: hasHardware,
      enrolled,
      faceId: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
    };
  } catch {
    return { available: false, enrolled: false, faceId: false };
  }
}

/**
 * Prompt biométrique — Face ID / Touch ID / empreinte (F1).
 * Le fallback code PIN à 6 chiffres est géré à part (écran verrouillage),
 * pas via le fallback système, pour garder le contrôle de l'UX.
 */
export async function promptBiometric(reason: string): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      disableDeviceFallback: true,
      cancelLabel: undefined,
    });
    return res.success;
  } catch {
    return false;
  }
}
