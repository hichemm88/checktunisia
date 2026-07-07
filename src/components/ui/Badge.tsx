import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BadgeVariant = 'active' | 'draft' | 'completed' | 'suspended' | 'expired' | 'cancelled' | 'no_show' | 'default';

const variantMap: Record<BadgeVariant, string> = {
  active:    'bg-[--qayed-conforme-fond] text-[--qayed-conforme-texte]',
  draft:     'bg-[--qayed-cachet-dilue] text-[--qayed-cachet]',
  completed: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  expired:   'bg-[--qayed-vigilance-fond] text-[--qayed-vigilance-texte]',
  cancelled: 'bg-gray-100 text-gray-500',
  no_show:   'bg-[--qayed-vigilance-fond] text-[--qayed-vigilance-texte]',
  default:   'bg-gray-100 text-gray-600',
};

const labelMap: Record<string, string> = {
  active:    'Actif',
  draft:     'Brouillon',
  completed: 'Terminé',
  suspended: 'Suspendu',
  expired:   'Expiré',
  cancelled: 'Annulé',
  no_show:   'No-show',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ className, variant = 'default', children, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide',
      variantMap[variant],
      className,
    )}
    {...props}
  >
    {children ?? (variant !== 'default' ? (labelMap[variant] ?? variant) : '')}
  </span>
);

export const statusBadge = (status: string) => {
  const variant = (status as BadgeVariant) in variantMap ? (status as BadgeVariant) : 'default';
  return <Badge variant={variant} />;
};
