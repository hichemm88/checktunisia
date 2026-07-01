import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6', none: '' };

export const Card = ({ className, hoverable, padding = 'md', children, ...props }: CardProps) => (
  <div
    className={cn(
      'card',
      paddings[padding],
      hoverable && 'cursor-pointer transition-shadow hover:shadow-card-hover',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-base font-semibold text-gray-900', className)} {...props}>
    {children}
  </h3>
);
