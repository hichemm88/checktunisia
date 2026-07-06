interface PaginationMeta {
  total: number;
  current_page: number;
  per_page: number;
}

interface PaginationProps {
  meta: PaginationMeta;
  currentCount: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Shared pagination control — used across all paginated lists (admin, authority, hotel). */
export const Pagination = ({ meta, currentCount, onPrev, onNext }: PaginationProps) => {
  if (meta.total <= meta.per_page) return null;

  const totalPages = Math.ceil(meta.total / meta.per_page);

  return (
    <div className="flex justify-center items-center gap-3">
      <button
        disabled={meta.current_page === 1}
        onClick={onPrev}
        className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40"
      >
        ← Préc.
      </button>
      <span className="text-xs text-gray-500 font-medium">{meta.current_page} / {totalPages}</span>
      <button
        disabled={currentCount < meta.per_page}
        onClick={onNext}
        className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40"
      >
        Suiv. →
      </button>
    </div>
  );
};
