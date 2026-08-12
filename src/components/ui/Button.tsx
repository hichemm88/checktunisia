import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `link` : action textuelle (« Passer », « Retour », « Annuler »). Elle garde
   * l'apparence d'un lien mais conserve une cible tactile de 44 px — ces
   * actions étaient auparavant des <button> nus, hauts comme leur texte.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Le survol et l'état désactivé passent par des classes CSS, plus par des
 * gestionnaires `onMouseEnter`/`onMouseLeave` qui écrivaient dans `style` :
 * cette mécanique ne se déclenchait jamais au clavier et empêchait toute
 * surcharge via `className`.
 */
const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:   'bg-qayed-cachet text-white hover:bg-qayed-cachet-fonce active:scale-[0.98] disabled:bg-qayed-desactive disabled:text-white',
  secondary: 'bg-transparent border-[1.5px] border-qayed-encre text-qayed-encre hover:bg-qayed-papier active:scale-[0.98] disabled:opacity-50',
  ghost:     'bg-qayed-cachet-dilue text-qayed-cachet hover:bg-qayed-cachet-dilue/70 active:scale-[0.98] disabled:opacity-50',
  danger:    'bg-qayed-erreur text-white hover:bg-qayed-erreur-texte active:scale-[0.98] disabled:bg-qayed-desactive disabled:text-white',
  link:      'bg-transparent text-qayed-cachet hover:underline underline-offset-4 disabled:opacity-50',
  icon:      'bg-transparent text-qayed-fiche hover:bg-qayed-papier hover:text-qayed-encre active:scale-[0.95] disabled:opacity-40',
};

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-btn-sm px-4 text-sm rounded-btn',
  md: 'h-btn-md px-5 text-sm rounded-btn',
  lg: 'h-btn-lg px-6 text-base rounded-btn',
};

/** `link` et `icon` ne sont pas des blocs : leur gabarit ne suit pas l'échelle
 *  de hauteur, mais garde le plancher tactile de 44 px. */
const looseSizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-[44px] px-2 text-sm rounded-btn',
  md: 'min-h-[44px] px-3 text-sm rounded-btn',
  lg: 'min-h-[48px] px-3 text-base rounded-btn',
};

const iconSizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-11 w-11 rounded-btn',
  md: 'h-11 w-11 rounded-btn',
  lg: 'h-12 w-12 rounded-btn',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, type, ...props }, ref) => {
    const isDisabled = disabled || loading;
    const sizeClass =
      variant === 'icon' ? iconSizes[size]
      : variant === 'link' ? looseSizes[size]
      : sizes[size];

    return (
      <button
        ref={ref}
        // Sans `type`, un bouton placé dans un <form> vaut `submit` et envoie
        // le formulaire au premier clic.
        type={type ?? 'button'}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 disabled:pointer-events-none',
          variants[variant],
          sizeClass,
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
