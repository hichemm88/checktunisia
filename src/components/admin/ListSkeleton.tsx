/** Shared loading placeholder for admin lists — replaces the plain "Chargement…" text. */
export const ListSkeleton = ({ rows = 3, height = 'h-14' }: { rows?: number; height?: string }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`${height} animate-pulse rounded-lg bg-gray-100 my-1`} />
    ))}
  </>
);
