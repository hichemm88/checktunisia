import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Camera, Check, HelpCircle, RectangleHorizontal, RefreshCw,
  Scan, Upload, X, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Capture de la CIN — appareil photo NATIF via `<input capture="environment">`.
 * Sur mobile (Android/iOS) : caméra arrière avec le bouton flash et le
 * traitement basse lumière de l'OS ; la photo n'est PAS enregistrée dans la
 * galerie. Sur desktop l'attribut `capture` est ignoré → sélecteur de fichiers.
 *
 * Écran de consignes affiché une fois par session (puis via l'icône aide),
 * aperçu « Reprendre / Utiliser » avec avertissement non bloquant si la photo
 * est sombre. Flux secondaires : import fichier, drag & drop, collage Ctrl+V.
 *
 * Ne fait aucun traitement lourd : produit un `Blob` brut via `onCapture` ; la
 * conversion HEIC / compression / envoi est gérée par l'appelant. L'image reste
 * en mémoire uniquement (pas de localStorage/IndexedDB — conformité INPDP).
 */

// Drapeau « consignes déjà vues » — simple booléen, aucune donnée personnelle.
const INTRO_SEEN_KEY = 'qayed.cin-intro-seen';

// Luminance moyenne (0-255) sous laquelle la photo est jugée sombre.
// Seuil initial : 60 — à ajuster selon les retours terrain.
const DARK_THRESHOLD = 60;

const introSeen = () => {
  try { return sessionStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch { return false; }
};
const markIntroSeen = () => {
  try { sessionStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* navigation privée */ }
};

/**
 * Luminance moyenne (0.299R + 0.587G + 0.114B) mesurée sur un canvas hors DOM,
 * en mémoire uniquement. `null` si l'image n'est pas décodable (ex. HEIC hors
 * Safari) — dans ce cas aucun avertissement.
 */
const measureLuminance = (blob: Blob): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const w = 64;
        const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        resolve(sum / (data.length / 4));
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });

export const CINCapture = ({
  onCapture,
  onClose,
  variant = 'cin',
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  /** 'cin' = carte d'identité (défaut) · 'mrz' = passeport (bande MRZ). */
  variant?: 'cin' | 'mrz';
}) => {
  const { t } = useTranslation();
  const isMrz = variant === 'mrz';
  const camRef = useRef<HTMLInputElement>(null);  // capture=environment (appareil photo natif)
  const fileRef = useRef<HTMLInputElement>(null); // galerie / fichier existant

  const [screen, setScreen] = useState<'intro' | 'launch' | 'preview'>(() => (introSeen() ? 'launch' : 'intro'));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const capturedRef = useRef<Blob | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Consignes déjà vues → ouverture directe de l'appareil photo natif, encore
  // dans la fenêtre d'activation utilisateur du tap « Scanner la CIN ». Si le
  // navigateur la refuse, l'écran de lancement avec son bouton reste visible.
  useEffect(() => {
    if (introSeen()) camRef.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showPreview = (blob: Blob) => {
    capturedRef.current = blob;
    setIsDark(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setScreen('preview');
    measureLuminance(blob).then((lum) => {
      if (capturedRef.current === blob) setIsDark(lum !== null && lum < DARK_THRESHOLD);
    });
  };

  const acceptImage = (file?: File | null) => {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) return;
    showPreview(file);
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Réinitialisation immédiate : aucune référence au fichier ne subsiste
    // dans le DOM, et re-photographier le même document redéclenche `change`.
    e.target.value = '';
    acceptImage(file);
  };

  const openNativeCamera = () => {
    markIntroSeen();
    setScreen('launch');
    camRef.current?.click();
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    capturedRef.current = null;
    setScreen('launch');
    camRef.current?.click();
  };

  const usePhoto = () => {
    if (capturedRef.current) onCapture(capturedRef.current);
  };

  // Collage Ctrl+V (desktop) — flux secondaire.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) acceptImage(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    acceptImage(e.dataTransfer.files?.[0]);
  };

  const close = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  const introSteps = [
    { icon: RectangleHorizontal, text: t('cinScan.introFlat') },
    { icon: Zap, text: t('cinScan.introFlash') },
    { icon: Scan, text: isMrz ? t('cinScan.introFrameMrz') : t('cinScan.introFrame') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true">
      {/* Barre haut */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">{isMrz ? t('cinScan.titleMrz') : t('cinScan.title')}</span>
        <div className="flex items-center gap-1">
          {screen === 'launch' && (
            <button
              onClick={() => setScreen('intro')}
              aria-label={t('cinScan.showIntro')}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          )}
          <button onClick={close} aria-label={t('common.close')} className="rounded-full p-2 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Zone centrale : consignes / lancement / aperçu */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {/* Écran de consignes (une fois par session, puis via l'icône aide) */}
        {screen === 'intro' && (
          <div className="flex w-full max-w-sm flex-col gap-5 px-6 text-white">
            <p className="text-base font-bold">{t('cinScan.introTitle')}</p>
            <div className="flex flex-col gap-3">
              {introSteps.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: '#5346A8' }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-white/90">{text}</p>
                </div>
              ))}
            </div>
            <Button size="lg" fullWidth onClick={openNativeCamera}>
              <Camera className="h-5 w-5" /> {t('cinScan.openCamera')}
            </Button>
          </div>
        )}

        {/* Écran de lancement (appareil photo natif ouvert ou refermé) */}
        {screen === 'launch' && (
          <div className="flex max-w-sm flex-col items-center gap-5 px-6 text-center text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: '#5346A8' }}>
              <Camera className="h-8 w-8" />
            </div>
            <p className="text-sm text-white/80">{t('cinScan.launchHint')}</p>
            <Button size="lg" onClick={() => camRef.current?.click()}>
              <Camera className="h-5 w-5" /> {t('cinScan.openCamera')}
            </Button>
          </div>
        )}

        {/* Aperçu après capture */}
        {screen === 'preview' && previewUrl && (
          <img src={previewUrl} alt={t('cinScan.cardImage')} className="max-h-full max-w-full object-contain" />
        )}

        {dragOver && (
          <div className="absolute inset-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/70 bg-black/40 text-sm text-white">
            {t('cinScan.dropHint')}
          </div>
        )}
      </div>

      {/* Contrôles bas */}
      <div className="flex flex-col items-center gap-3 px-4 pb-8 pt-4 pb-safe">
        {screen === 'preview' && (
          <>
            {isDark && (
              <div
                className="flex w-full max-w-sm items-start gap-2 rounded-xl px-3 py-2.5"
                style={{ background: '#FBF0D7', border: '1px solid #E3A008' }}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#8A6206' }} />
                <p className="text-xs font-semibold" style={{ color: '#8A6206' }}>
                  {t('cinScan.darkWarning')}
                </p>
              </div>
            )}
            <div className="flex w-full max-w-sm gap-3">
              <Button variant="secondary" fullWidth onClick={retake} className="!border-white/40 !text-white">
                <RefreshCw className="h-4 w-4" /> {t('cinScan.retake')}
              </Button>
              <Button fullWidth onClick={usePhoto}>
                <Check className="h-4 w-4" /> {t('cinScan.usePhoto')}
              </Button>
            </div>
          </>
        )}

        {/* Import (flux secondaire) — galerie ou fichier existant */}
        {screen !== 'preview' && (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white"
          >
            <Upload className="h-4 w-4" /> {t('cinScan.importImage')}
          </button>
        )}

        <p className="text-center text-[11px] text-white/50">{isMrz ? t('cinScan.mrzNote') : t('cinScan.privacyNote')}</p>
      </div>

      {/* Inputs cachés */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileInput} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="hidden" onChange={onFileInput} />
    </div>
  );
};
