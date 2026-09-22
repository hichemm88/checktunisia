import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { crmApi, firstApiErrorMessage } from '@/crm/lib/api';
import type { ImportCommitResult, ImportPreview, ImportResolution } from '@/crm/types';

/**
 * Écran 7 — import du fichier existant (CSV/XLSX). Deux passes, comme côté
 * backend (ImportService) : preview() ne persiste rien, commit() applique la
 * décision retenue par ligne (create/merge/skip) — jamais d'écriture avant
 * validation humaine explicite des doublons détectés.
 */
export function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [resolutions, setResolutions] = useState<Record<number, ImportResolution>>({});
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const formData = new FormData();
      formData.append('file', f);
      const res = await crmApi.post<{ data: ImportPreview }>('/import/preview', formData, {
        // Sans ça, l'en-tête par défaut de crmApi ('Content-Type':
        // 'application/json') fait croire à axios qu'il doit sérialiser ce
        // FormData en JSON (voir defaults/transformRequest) au lieu de
        // l'envoyer tel quel — le fichier n'arrive alors jamais au backend
        // ("file field is required"). `undefined` supprime l'en-tête pour
        // cet appel et laisse le navigateur poser lui-même le bon
        // Content-Type multipart avec sa boundary.
        headers: { 'Content-Type': undefined },
      });

      return res.data.data;
    },
    onSuccess: (data) => {
      setError(null);
      setPreview(data);
      setResult(null);
      const initial: Record<number, ImportResolution> = {};
      for (const row of data.rows) initial[row.row_number] = row.is_duplicate ? 'skip' : 'create';
      setResolutions(initial);
    },
    onError: (err) => setError(firstApiErrorMessage(err, "Impossible de lire ce fichier.")),
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      for (const [rowNumber, resolution] of Object.entries(resolutions)) {
        formData.append(`resolutions[${rowNumber}]`, resolution);
      }
      const res = await crmApi.post<{ data: ImportCommitResult }>('/import/commit', formData, {
        headers: { 'Content-Type': undefined },
      });

      return res.data.data;
    },
    onSuccess: (data) => {
      if (!data) return;
      setError(null);
      setResult(data);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => setError(firstApiErrorMessage(err, "Impossible d'importer ce fichier.")),
  });

  function handleFileChange(f: File | null) {
    setFile(f);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="px-4 pt-6 pb-10">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/reglages" className="text-qayed-fiche">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl text-qayed-encre">Import du fichier existant</h1>
      </div>

      <div className="mb-4 rounded-card border border-qayed-ligne bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-qayed-encre">Fichier CSV ou Excel</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-qayed-encre file:mr-3 file:h-btn-sm file:rounded-btn file:border-0 file:bg-qayed-cachet-dilue file:px-3 file:text-sm file:font-semibold file:text-qayed-cachet-fonce"
        />

        <button
          type="button"
          disabled={!file || previewMutation.isPending}
          onClick={() => file && previewMutation.mutate(file)}
          className="mt-3 h-btn-md w-full rounded-btn bg-qayed-cachet text-sm font-semibold text-white disabled:opacity-60"
        >
          {previewMutation.isPending ? 'Lecture…' : 'Aperçu'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-input bg-qayed-erreur-fond px-4 py-2 text-sm text-qayed-erreur-texte">
          {error}
        </p>
      )}

      {result && (
        <div className="mb-4 rounded-card border border-qayed-conforme-fond bg-qayed-conforme-fond p-4 text-sm text-qayed-conforme-texte">
          <p className="font-semibold">Import terminé.</p>
          <p>
            {result.created} créé{result.created > 1 ? 's' : ''}, {result.merged} fusionné{result.merged > 1 ? 's' : ''},{' '}
            {result.skipped} ignoré{result.skipped > 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {preview && (
        <>
          {preview.unmapped_columns.length > 0 && (
            <p className="mb-3 rounded-input bg-qayed-vigilance-fond px-4 py-2 text-sm text-qayed-vigilance-texte">
              Colonnes non reconnues, ignorées : {preview.unmapped_columns.join(', ')}
            </p>
          )}

          <p className="mb-3 text-sm text-qayed-fiche">
            {preview.total} ligne{preview.total > 1 ? 's' : ''}, dont {preview.duplicates} doublon
            {preview.duplicates > 1 ? 's' : ''} détecté{preview.duplicates > 1 ? 's' : ''} par nom.
          </p>

          <ul className="mb-4 space-y-2">
            {preview.rows.map((row) => (
              <li key={row.row_number} className="rounded-card border border-qayed-ligne bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-qayed-encre">
                      Ligne {row.row_number} — {row.fields.name || <em className="text-qayed-fiche">(sans nom)</em>}
                    </p>
                    {row.is_duplicate && row.duplicate_of && (
                      <p className="text-xs text-qayed-vigilance-texte">
                        Doublon possible de « {row.duplicate_of.name} »
                      </p>
                    )}
                    {row.issues.map((issue, i) => (
                      <p key={i} className="text-xs text-qayed-erreur-texte">
                        {issue}
                      </p>
                    ))}
                  </div>

                  <select
                    value={resolutions[row.row_number] ?? 'create'}
                    onChange={(e) =>
                      setResolutions({ ...resolutions, [row.row_number]: e.target.value as ImportResolution })
                    }
                    className="h-btn-sm shrink-0 rounded-btn border border-qayed-ligne bg-white px-2 text-xs"
                  >
                    <option value="create">Créer</option>
                    {row.is_duplicate && <option value="merge">Fusionner</option>}
                    <option value="skip">Ignorer</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={commitMutation.isPending}
            onClick={() => commitMutation.mutate()}
            className="h-btn-lg w-full rounded-btn bg-qayed-conforme text-base font-semibold text-white disabled:opacity-60"
          >
            {commitMutation.isPending ? 'Import en cours…' : "Confirmer l'import"}
          </button>
        </>
      )}
    </div>
  );
}
