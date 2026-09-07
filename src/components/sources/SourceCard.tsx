import { ArrowRight, BookOpen } from 'lucide-react';
import type { SourceItem } from '../../types/comic';
import { distanceToRelevance } from '../../utils/formatting';

interface SourceCardProps {
  source: SourceItem;
  onNavigate?: (pageNumber: number) => void;
}

export function SourceCard({ source, onNavigate }: SourceCardProps) {
  const relevance = distanceToRelevance(source.distance);

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(source.page_number);
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className="group bg-[#15151d] hover:bg-[#1a1a24] border-2 border-[#20202c] hover:border-[#ffd23f] rounded-xl p-2.5 text-xs transition-all duration-150 cursor-pointer select-none shadow-comic-sm hover:shadow-comic"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-text-secondary group-hover:text-white">
          <BookOpen className="w-3.5 h-3.5 text-[#ffd23f] shrink-0" aria-hidden="true" />
          <span className="font-comic tracking-wider text-xs uppercase text-[#ffd23f]">
            PAGE {source.page_number} · PANEL/CHUNK {source.chunk_index}
          </span>
        </div>

        {/* Relevance Badge */}
        <span
          className="shrink-0 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-[#ff2e63]/15 text-[#ff2e63] border border-[#ff2e63]/30 uppercase"
          title="Relevance score (cosine similarity derived)"
        >
          {relevance}% MATCH
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between pt-1 border-t border-[#1f1f2a]">
        <span className="text-[10px] font-mono text-text-muted">
          Grounded comic source
        </span>
        <span className="flex items-center gap-1 font-comic text-xs text-[#ffd23f] group-hover:translate-x-0.5 transition-transform">
          READ PAGE
          <ArrowRight className="w-3 h-3 stroke-[3]" />
        </span>
      </div>
    </div>
  );
}
