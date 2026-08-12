/** Squelette de chargement partage par toutes les listes (admin, autorite,
 *  portail etablissement). */
export const ListSkeleton = ({ rows = 3, height = 'h-14' }: { rows?: number; height?: string }) => (
  <div aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`${height} animate-pulse rounded-lg bg-qayed-gris-100 my-1`} />
    ))}
  </div>
);
