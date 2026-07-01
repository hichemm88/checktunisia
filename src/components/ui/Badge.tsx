import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BadgeVariant = 'active' | 'draft' | 'completed' | 'suspended' | 'expired' | 'cancelled' | 'no_show' | 'default';

const variantMap: Record<BadgeVariant, string> = {
  active: 'badge-active',
  draft: 'badge-draft',
  completed: 'badge-completed',
  suspended: 'badge-suspended',
  expired: 'badge-expired',
  cancelled: 'bg-gray-100 text-gray-700',
  no_show: 'bg-orange-100 text-orange-700',
  default: 'bg-gray-100 text-gray-700',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ className, variant = 'default', children, ...props }: BadgeProps) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variantMap[variant], className)} {...props}>
    {children}
  </span>
);

export const statusBadge = (status: string) => {
  const label = status.replace(/_/g, ' ');
  const variant = (status as BadgeVariant) in variantMap ? (status as BadgeVariant) : 'default';
  return <Badge variant={variant}>{label}</Badge>;
};
