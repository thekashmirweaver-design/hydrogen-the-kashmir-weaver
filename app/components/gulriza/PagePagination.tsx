import {ChevronLeft, ChevronRight, Loader2} from 'lucide-react';

export function PagePagination({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
  isLoading,
}: {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
  isLoading: boolean;
}) {
  return (
    <nav className="flex items-center justify-center gap-3 py-12 sm:gap-6" aria-label="Pagination">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPreviousPage || isLoading}
        className="tracked inline-flex min-h-11 items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-[0.25em] transition hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30 sm:gap-2 sm:px-5"
        style={{background: 'var(--surface)', color: 'var(--foreground)'}}
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        Previous
      </button>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.25} />
      ) : (
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          Page {currentPage}
        </span>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!hasNextPage || isLoading}
        className="tracked inline-flex min-h-11 items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-[0.25em] transition hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-30 sm:gap-2 sm:px-5"
        style={{background: 'var(--surface)', color: 'var(--foreground)'}}
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </nav>
  );
}
