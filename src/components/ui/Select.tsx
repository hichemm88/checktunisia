import { type SelectHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, id, ...props }, ref) => {
    // Voir Input.tsx : `useId()` évite les collisions d'identifiants entre deux
    // champs de même libellé.
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="label">{label}</label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'input-field appearance-none bg-white pe-10',
            error && 'border-qayed-erreur focus:border-qayed-erreur focus:ring-qayed-erreur/10',
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p id={errorId} className="text-xs font-medium text-qayed-erreur-texte">{error}</p>}
        {hint && !error && <p id={hintId} className="text-xs text-qayed-fiche">{hint}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
