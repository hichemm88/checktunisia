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
  gold:      'text-white active:scale-[0.98]',
  secondary: 'bg-white border border-gray-200 text-gray-800 hover:bg-warm-100 active:scale-[0.98]',
  ghost:     'bg-transparent text-gray-600 hover:bg-warm-100 active:scale-[0.98]',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
};

const sizes = {
  sm: 'h-10 px-4 text-sm rounded-btn',
  md: 'h-btn-md px-5 text-sm rounded-btn',
  lg: 'h-btn-lg px-6 text-base rounded-btn',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, style, ...props }, ref) => {
    const isPrimary = variant === 'primary';
    const isGold    = variant === 'gold';

    const inlineStyle = isPrimary
      ? { background: 'linear-gradient(135deg, #1B3A5F 0%, #2A5090 100%)', boxShadow: '0 4px 14px rgba(27,54,84,0.35)', ...style }
      : isGold
      ? { background: 'linear-gradient(135deg, #C8943A 0%, #E0A040 100%)', boxShadow: '0 4px 14px rgba(200,148,58,0.40)', ...style }
      : style;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={inlineStyle}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
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
