interface QayedStampProps {
  size?: number;
  onDark?: boolean;
  className?: string;
}

/** Sceau قيد — always tilted −6°, per BRAND.md. Never straighten, stretch, or recolor. */
export const QayedStamp = ({ size = 32, onDark = false, className = '' }: QayedStampProps) => (
  <div
    className={`qayed-stamp ${onDark ? 'qayed-stamp--on-dark' : ''} ${className}`}
    style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), borderWidth: Math.max(1.5, size / 13) }}
  >
    <span style={{ fontSize: size * 0.5 }}>قيد</span>
  </div>
);

interface QayedLogoProps {
  size?: number;
  onDark?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
}

/** Full lockup: sceau + QAYED wordmark, horizontal. */
export const QayedLogo = ({ size = 32, onDark = false, showWordmark = true, wordmarkClassName = '', className = '' }: QayedLogoProps) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <QayedStamp size={size} onDark={onDark} />
    {showWordmark && (
      <span
        className={`qayed-display ${wordmarkClassName}`}
        style={{ fontSize: size * 0.7, color: onDark ? '#F6F5F1' : 'var(--qayed-encre)' }}
      >
        QAYED
      </span>
    )}
  </div>
);
