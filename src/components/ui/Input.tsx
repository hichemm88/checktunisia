import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
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
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute start-3.5 text-gray-400">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input-field',
              leftIcon && 'ps-10',
              rightElement && 'pe-12',
              error && 'border-red-400 focus:ring-red-100 focus:border-red-500',
              className,
            )}
            {...props}
          />
          {rightElement && (
            <span className="absolute end-3.5">{rightElement}</span>
          )}
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

