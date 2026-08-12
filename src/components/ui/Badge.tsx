import { type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

type BadgeVariant = 'active' | 'draft' | 'completed' | 'suspended' | 'expired' | 'cancelled' | 'no_show' | 'default';

/**
 * Unique implémentation des badges de statut.
 *
 * Il en existait trois — ce composant, les classes `.badge-*` de index.css et
 * `.badge` du site public — avec des paddings et des tailles de texte
 * différents. Les deux autres ont été supprimées.
 *
 * Chaque variante utilise un couple fond/texte de la charte : la teinte pleine
 * (`--qayed-conforme`, `--qayed-vigilance`) ne sert que pour la pastille, jamais
 * pour le texte, qu'elle rendrait illisible.
 */
const variantMap: Record<BadgeVariant, string> = {
  active:    'bg-qayed-conforme-fond text-qayed-conforme-texte',
  draft:     'bg-qayed-cachet-dilue text-qayed-cachet',
  completed: 'bg-qayed-papier text-qayed-fiche',
  suspended: 'bg-qayed-erreur-fond text-qayed-erreur-texte',
  expired:   'bg-qayed-vigilance-fond text-qayed-vigilance-texte',
  cancelled: 'bg-qayed-papier text-qayed-fiche',
  no_show:   'bg-qayed-vigilance-fond text-qayed-vigilance-texte',
  default:   'bg-qayed-papier text-qayed-fiche',
};

/** Couleur de la pastille — teinte pleine, lisible car non textuelle. */
const dotMap: Record<BadgeVariant, string> = {
  active:    'bg-qayed-conforme',
  draft:     'bg-qayed-cachet',
  completed: 'bg-qayed-fiche',
  suspended: 'bg-qayed-erreur',
  expired:   'bg-qayed-vigilance',
  cancelled: 'bg-qayed-fiche',
  no_show:   'bg-qayed-vigilance',
  default:   'bg-qayed-fiche',
};

const labelKeyMap: Record<string, string> = {
  active:    'checkinStatus.active',
  draft:     'checkinStatus.draft',
  completed: 'checkinStatus.completed',
  suspended: 'checkinStatus.suspended',
  expired:   'checkinStatus.expired',
  cancelled: 'checkinStatus.cancelled',
  no_show:   'checkinStatus.noShow',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Pastille de couleur devant le libellé. */
  dot?: boolean;
}

export const Badge = ({ className, variant = 'default', dot = false, children, ...props }: BadgeProps) => {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        variantMap[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotMap[variant])} aria-hidden="true" />}
      {children ?? (variant !== 'default' ? t(labelKeyMap[variant] ?? variant) : '')}
    </span>
  );
};

export const statusBadge = (status: string) => {
  const variant = (status as BadgeVariant) in variantMap ? (status as BadgeVariant) : 'default';
  return <Badge variant={variant} />;
};
