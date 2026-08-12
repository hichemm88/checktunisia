import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Camera, Check, RefreshCw, Smartphone, Upload, X, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Capture du document — caméra intégrée (`getUserMedia`, `facingMode:
 * environment`) avec cadre de visée : ratio ID-1 (1.586) pour la CIN, TD-3 pour
 * la page de données du passeport, plus la bande MRZ en pointillés. La photo est
 * recadrée sur le cadre, ce qui donne à l'OCR exactement la zone visée.
 *
 * L'appareil photo natif avait remplacé ce cadre (commit 5cecf51) pour profiter
 * du flash et du traitement basse lumière de l'OS. Décision produit du
 * 2026-08-12 : le cadre de visée revient, parce qu'il guide mieux la réception.
 * Les garde-fous de la version native sont conservés pour compenser :
 *   - torche, quand la piste vidéo l'expose ;
 *   - avertissement non bloquant si la photo est sombre ;
 *   - repli sur l'appareil photo natif si `getUserMedia` échoue (permission
 *     refusée, pas de caméra, desktop) — et lien discret pour y basculer à la
 *     main quand la lumière est vraiment mauvaise.
 *
 * Flux secondaires : import fichier, glisser-déposer, collage Ctrl+V.
 *
 * Ne fait aucun traitement lourd : produit un `Blob` brut via `onCapture` ; la
 * conversion HEIC / compression / envoi est gérée par l'appelant. L'image reste
 * en mémoire uniquement (pas de localStorage/IndexedDB — conformité INPDP).
 */

const ID1_RATIO = 1.586; // largeur / hauteur d'une carte ID-1
const TD3_RATIO = 1.42;  // page de données passeport (TD-3)

// Luminance moyenne (0-255) sous laquelle la photo est jugée sombre.
// Seuil initial : 60 — à ajuster selon les retours terrain.
const DARK_THRESHOLD = 60;

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
  guideRatio,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  /** 'cin' = carte d'identité (défaut) · 'mrz' = passeport (bande MRZ). */
  variant?: 'cin' | 'mrz';
  /** Ratio largeur/hauteur du cadre de visée. Défaut : ID-1 (cin) ou TD-3 (mrz). */
  guideRatio?: number;
}) => {
  const { t } = useTranslation();
  const ratio = guideRatio ?? (variant === 'mrz' ? TD3_RATIO : ID1_RATIO);
  const isMrz = variant === 'mrz';

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCamRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'camera' | 'fallback' | 'preview'>('camera');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const capturedRef = useRef<Blob | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ── Caméra ──────────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('fallback');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Résolution vidéo la plus haute possible : indispensable pour le MRZ
        // (texte OCR-B minuscule) et bénéfique pour la CIN.
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
      setTorchSupported(!!caps.torch);
      setMode('camera');
    } catch {
      // Permission refusée ou pas de caméra → repli sur l'appareil photo natif,
      // sans blocage.
      setMode('fallback');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      /* torche non applicable */
    }
  };

  // ── Capture depuis le flux vidéo (recadrage centré sur le cadre) ─────────────
  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // Rectangle centré au ratio du cadre, à ~92 % de la dimension limitante —
    // miroir exact du cadre affiché à l'écran.
    let cropW = vw * 0.92;
    let cropH = cropW / ratio;
    if (cropH > vh * 0.92) {
      cropH = vh * 0.92;
      cropW = cropH * ratio;
    }
    const sx = (vw - cropW) / 2;
    const sy = (vh - cropH) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => { if (blob) showPreview(blob); },
      'image/jpeg',
      0.92,
    );
  };

  const showPreview = (blob: Blob) => {
    stopCamera();
    setTorchOn(false);
    capturedRef.current = blob;
    setIsDark(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setMode('preview');
    measureLuminance(blob).then((lum) => {
      if (capturedRef.current === blob) setIsDark(lum !== null && lum < DARK_THRESHOLD);
    });
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    capturedRef.current = null;
    setIsDark(false);
    startCamera();
  };

  const usePhoto = () => {
    if (capturedRef.current) onCapture(capturedRef.current);
  };

  /** Bascule volontaire vers l'appareil photo du téléphone (flash de l'OS). */
  const openNativeCamera = () => {
    stopCamera();
    nativeCamRef.current?.click();
  };

  // ── Import fichier / collage ─────────────────────────────────────────────────
  const acceptImage = (file?: File | null) => {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) return;
    showPreview(file);
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Réinitialisation immédiate : aucune référence au fichier ne subsiste dans
    // le DOM, et re-photographier le même document redéclenche `change`.
    e.target.value = '';
    acceptImage(file);
  };

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
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-qayed-encre/95 on-encre" role="dialog" aria-modal="true">
      {/* Barre haut */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">{isMrz ? t('cinScan.titleMrz') : t('cinScan.title')}</span>
        <button
          type="button"
          onClick={close}
          aria-label={t('common.close')}
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Zone caméra / aperçu / repli */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {/* Caméra en direct */}
        {mode === 'camera' && (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

            {/* Cadre de visée : ID-1 pour la CIN, TD-3 + bande MRZ pour le passeport */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="relative flex w-[88%] max-w-[560px] items-end rounded-2xl border-[3px] border-qayed-cachet-sombre"
                style={{ aspectRatio: String(ratio), boxShadow: '0 0 0 9999px rgba(16,34,46,0.55)' }}
              >
                {/* Bande MRZ : les deux lignes OCR-B en bas de la page passeport */}
                {isMrz && (
                  <div className="m-2 flex h-[22%] w-[calc(100%-16px)] items-center justify-center rounded-md border-2 border-dashed border-qayed-cachet-sombre">
                    <span className="text-xs font-bold tracking-widest text-white/90">MRZ</span>
                  </div>
                )}
              </div>
            </div>

            <p className="absolute inset-x-0 top-3 text-center text-xs text-white/90">
              {isMrz ? t('cinScan.mrzHint') : t('cinScan.cameraHint')}
            </p>

            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-label={torchOn ? t('cinScan.torchOff') : t('cinScan.torchOn')}
                aria-pressed={torchOn}
                className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
              >
                {torchOn
                  ? <ZapOff className="h-5 w-5" aria-hidden="true" />
                  : <Zap className="h-5 w-5" aria-hidden="true" />}
              </button>
            )}
          </>
        )}

        {/* Aperçu après capture */}
        {mode === 'preview' && previewUrl && (
          <img src={previewUrl} alt={t('cinScan.cardImage')} className="max-h-full max-w-full object-contain" />
        )}

        {/* Repli : permission refusée / pas de caméra / desktop */}
        {mode === 'fallback' && (
          <div className="flex max-w-sm flex-col items-center gap-5 px-6 text-center text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-qayed-cachet" aria-hidden="true">
              <Camera className="h-8 w-8" />
            </div>
            <p className="text-sm text-white/90">{t('cinScan.permissionDenied')}</p>
            <Button onClick={() => nativeCamRef.current?.click()}>
              <Camera className="h-4 w-4" aria-hidden="true" /> {t('cinScan.openCamera')}
            </Button>
          </div>
        )}

        {dragOver && (
          <div className="absolute inset-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/70 bg-qayed-encre/60 text-sm text-white">
            {t('cinScan.dropHint')}
          </div>
        )}
      </div>

      {/* Contrôles bas */}
      <div className="flex flex-col items-center gap-3 px-4 pb-8 pt-4 pb-safe">
        {mode === 'camera' && (
          <button
            type="button"
            onClick={captureFromVideo}
            aria-label={t('cinScan.capture')}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/80"
          >
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
        )}

        {mode === 'preview' && (
          <>
            {isDark && (
              <div
                role="alert"
                className="flex w-full max-w-sm items-start gap-2 rounded-xl border border-qayed-vigilance bg-qayed-vigilance-fond px-3 py-2.5"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-qayed-vigilance-texte" aria-hidden="true" />
                <p className="text-xs font-semibold text-qayed-vigilance-texte">{t('cinScan.darkWarning')}</p>
              </div>
            )}
            <div className="flex w-full max-w-sm gap-3">
              <Button variant="secondary" fullWidth onClick={retake} className="!border-white/40 !text-white">
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> {t('cinScan.retake')}
              </Button>
              <Button fullWidth onClick={usePhoto}>
                <Check className="h-4 w-4" aria-hidden="true" /> {t('cinScan.usePhoto')}
              </Button>
            </div>
          </>
        )}

        {/* Flux secondaires — toujours accessibles sous la caméra. Le passage à
            l'appareil photo du téléphone est la porte de sortie quand la lumière
            du comptoir ne suffit pas : lui seul a le flash de l'OS. */}
        {mode !== 'preview' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="link" size="sm" className="text-white/80 hover:text-white" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden="true" /> {t('cinScan.importImage')}
            </Button>
            {mode === 'camera' && (
              <>
                <span className="h-3 w-px bg-white/30" aria-hidden="true" />
                <Button variant="link" size="sm" className="text-white/80 hover:text-white" onClick={openNativeCamera}>
                  <Smartphone className="h-4 w-4" aria-hidden="true" /> {t('cinScan.useNativeCamera')}
                </Button>
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-white/70">{isMrz ? t('cinScan.mrzNote') : t('cinScan.privacyNote')}</p>
      </div>

      {/* Inputs cachés */}
      <input ref={nativeCamRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileInput} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="hidden" onChange={onFileInput} />
    </div>
  );
};
