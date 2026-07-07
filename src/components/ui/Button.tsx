import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary:   'text-white active:scale-[0.98]',
  gold:      'text-white active:scale-[0.98]', // deprecated alias — renders identically to primary
  secondary: 'bg-transparent border-[1.5px] border-qayed-encre text-qayed-encre hover:bg-qayed-papier active:scale-[0.98]',
  ghost:     'bg-qayed-cachet-dilue text-qayed-cachet hover:bg-qayed-cachet-dilue/70 active:scale-[0.98]',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
};

const sizes = {
  sm: 'h-10 px-4 text-sm rounded-btn',
  md: 'h-btn-md px-5 text-sm rounded-btn',
  lg: 'h-btn-lg px-6 text-base rounded-btn',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, style, ...props }, ref) => {
    const isPrimary = variant === 'primary' || variant === 'gold';

    const inlineStyle = isPrimary
      ? { background: 'var(--qayed-cachet)', ...style }
      : style;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={inlineStyle}
        onMouseEnter={isPrimary ? (e) => { e.currentTarget.style.background = 'var(--qayed-cachet-fonce)'; } : undefined}
        onMouseLeave={isPrimary ? (e) => { e.currentTarget.style.background = 'var(--qayed-cachet)'; } : undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qayed-cachet focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
