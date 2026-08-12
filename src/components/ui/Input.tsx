import { type InputHTMLAttributes, forwardRef, useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightElement, id, ...props }, ref) => {
    // `useId()` et non le libellé translittéré : deux champs de même libellé
    // produisaient le même `id`, donc un <label for> pointant vers le mauvais
    // champ ; un libellé accentué ou arabe produisait un `id` non ASCII.
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute start-3.5 text-qayed-fiche-faible" aria-hidden="true">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            // Sans ces deux attributs, le message d'erreur était affiché mais
            // jamais annoncé : un lecteur d'écran ne le reliait pas au champ.
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'input-field',
              leftIcon && 'ps-10',
              rightElement && 'pe-12',
              error && 'border-qayed-erreur focus:border-qayed-erreur focus:ring-qayed-erreur/10',
              className,
            )}
            {...props}
          />
          {rightElement && (
            <span className="absolute end-3.5">{rightElement}</span>
          )}
        </div>
        {error && <p id={errorId} className="text-xs font-medium text-qayed-erreur-texte">{error}</p>}
        {hint && !error && <p id={hintId} className="text-xs text-qayed-fiche">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
