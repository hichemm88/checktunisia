import { useCallback, useEffect, useRef, useState, ChangeEvent, DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, Zap, ZapOff, Upload, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Capture de la CIN — caméra ouverte par défaut (getUserMedia, `facingMode:
 * environment`), cadre guide ratio ID-1 (1.586), torche si supportée, aperçu
 * « Reprendre / Utiliser cette photo ».
 *
 * Flux secondaire : import fichier (drag & drop / parcourir) + collage Ctrl+V.
 * Fallback si getUserMedia indisponible/refusé : `<input capture=environment>`
 * (appareil photo natif) sans blocage.
 *
 * Ne fait aucun traitement lourd : produit un `Blob` brut via `onCapture` ; la
 * conversion HEIC / compression / envoi est gérée par l'appelant.
 */

const ID1_RATIO = 1.586; // largeur / hauteur d'une carte ID-1
const TD3_RATIO = 1.42;  // page de données passeport (TD-3)

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
  /** Ratio largeur/hauteur du cadre guide. Défaut : ID-1 (cin) ou TD-3 (mrz). */
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
      // Permission refusée ou pas de caméra → fallback input capture, sans blocage.
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

  // ── Capture depuis le flux vidéo (recadrage centré ratio ID-1) ────────────────
  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // Rectangle centré au ratio du guide, à ~92 % de la dimension limitante —
    // miroir du cadre guide affiché à l'écran.
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
      (blob) => {
        if (blob) showPreview(blob);
      },
      'image/jpeg',
      0.92,
    );
  };

  const showPreview = (blob: Blob) => {
    stopCamera();
    setTorchOn(false);
    capturedRef.current = blob;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    setMode('preview');
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    capturedRef.current = null;
    startCamera();
  };

  const usePhoto = () => {
    if (capturedRef.current) onCapture(capturedRef.current);
  };

  // ── Import fichier / collage ─────────────────────────────────────────────────
  const acceptImage = (file?: File | null) => {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) return;
    showPreview(file);
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => acceptImage(e.target.files?.[0]);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true">
      {/* Barre haut */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">{isMrz ? t('cinScan.titleMrz') : t('cinScan.title')}</span>
        <button onClick={close} aria-label={t('common.close')} className="rounded-full p-2 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Zone caméra / aperçu / fallback */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {/* Caméra en direct */}
        {mode === 'camera' && (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {/* Cadre guide (ID-1 pour la CIN, TD-3 + bande MRZ pour le passeport) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="relative flex w-[88%] max-w-[560px] items-end rounded-2xl"
                style={{ aspectRatio: String(ratio), border: '3px solid #5346A8', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
              >
                {/* Bande MRZ : les 2 lignes OCR-B en bas de la page passeport */}
                {isMrz && (
                  <div className="m-2 flex h-[22%] w-[calc(100%-16px)] items-center justify-center rounded-md" style={{ border: '2px dashed #8B7FE0' }}>
                    <span className="text-[10px] font-bold tracking-widest text-white/80">MRZ</span>
                  </div>
                )}
              </div>
            </div>
            <p className="absolute top-3 left-0 right-0 text-center text-xs text-white/80">
              {isMrz ? t('cinScan.mrzHint') : t('cinScan.cameraHint')}
            </p>
            {torchSupported && (
              <button
                onClick={toggleTorch}
                aria-label={torchOn ? t('cinScan.torchOff') : t('cinScan.torchOn')}
                className="absolute right-4 top-4 rounded-full bg-white/15 p-3 text-white backdrop-blur"
              >
                {torchOn ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
              </button>
            )}
          </>
        )}

        {/* Aperçu après capture */}
        {mode === 'preview' && previewUrl && (
          <img src={previewUrl} alt={t('cinScan.cardImage')} className="max-h-full max-w-full object-contain" />
        )}

        {/* Fallback : permission refusée / pas de caméra */}
        {mode === 'fallback' && (
          <div className="flex max-w-sm flex-col items-center gap-5 px-6 text-center text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: '#5346A8' }}>
              <Camera className="h-8 w-8" />
            </div>
            <p className="text-sm text-white/80">{t('cinScan.permissionDenied')}</p>
            <Button onClick={() => nativeCamRef.current?.click()}>
              <Camera className="h-4 w-4" /> {t('cinScan.openCamera')}
            </Button>
          </div>
        )}

        {dragOver && (
          <div className="absolute inset-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/70 bg-black/40 text-sm text-white">
            {t('cinScan.dropHint')}
          </div>
        )}
      </div>

      {/* Contrôles bas */}
      <div className="flex flex-col items-center gap-3 px-4 pb-8 pt-4 pb-safe">
        {mode === 'camera' && (
          <button
            onClick={captureFromVideo}
            aria-label={t('cinScan.capture')}
            className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white/80"
            style={{ height: 72, width: 72 }}
          >
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
        )}

        {mode === 'preview' && (
          <div className="flex w-full max-w-sm gap-3">
            <Button variant="secondary" fullWidth onClick={retake} className="!border-white/40 !text-white">
              <RefreshCw className="h-4 w-4" /> {t('cinScan.retake')}
            </Button>
            <Button fullWidth onClick={usePhoto}>
              <Check className="h-4 w-4" /> {t('cinScan.usePhoto')}
            </Button>
          </div>
        )}

        {/* Import (flux secondaire) — toujours accessible sous la caméra */}
        {mode !== 'preview' && (
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
      <input ref={nativeCamRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileInput} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="hidden" onChange={onFileInput} />
    </div>
  );
};
