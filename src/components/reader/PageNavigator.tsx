import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PageNavigator({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: PageNavigatorProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-4 border-t border-base-border">
      <button
        onClick={onPrev}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-base-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Prev
      </button>

      <span className="text-xs text-text-muted tabular-nums">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-base-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
