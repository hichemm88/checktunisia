import { Image } from 'react-native';

// The real قيد brand logo (violet seal on transparent).
const LOGO = require('../../assets/logo-source.png');

/**
 * The قيد seal mark — "l'encre du cachet officiel", rendered from the brand logo asset.
 * `onDark` is accepted for API compatibility; the violet mark reads on light surfaces.
 */
export function QayedSeal({ size = 32 }: { size?: number; onDark?: boolean }) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Qayed"
    />
  );
}
