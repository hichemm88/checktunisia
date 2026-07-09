import { useRef, useState, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, ScanLine, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { scanMrz, MrzData } from '@/lib/mrzScanner';

/**
 * Reusable "Scan MRZ" control: opens the camera (or file picker), runs the MRZ
 * scanner and hands the parsed data back via `onResult`. Unlike GuestScanPanel
 * it carries no form/mutation — callers decide what to do with the result
 * (e.g. the authority search fills the document number and looks the guest up).
 */
export const MrzScanButton = ({
  onResult,
  label,
  size = 'md',
}: {
  onResult: (data: MrzData) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setProgress(0);
    try {
      const mrz = await scanMrz(file, setProgress);
      onResult(mrz);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : t('guestScan.scanFailed'), 'error');
    } finally {
      setScanning(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <Button
        type="button"
        variant="secondary"
        size={size}
        disabled={scanning}
        onClick={() => cameraRef.current?.click()}
        className="gap-2"
      >
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        {scanning ? t('guestScan.readingMrz') : (label ?? t('authoritySearch.scanMrz'))}
      </Button>

      {!scanning && (
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
          title={t('guestScan.importPhoto')}
        >
          <Upload className="h-3.5 w-3.5" />
        </button>
      )}

      {scanning && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-24 rounded-full bg-gray-100 h-1.5">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--qayed-cachet)' }} />
          </div>
          <span>{progress}%</span>
        </div>
      )}
    </div>
  );
};
