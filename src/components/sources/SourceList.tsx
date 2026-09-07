import { ChevronDown, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { SourceItem } from '../../types/comic';
import { SourceCard } from './SourceCard';

interface SourceListProps {
  sources: SourceItem[];
  onNavigate?: (pageNumber: number) => void;
}

export function SourceList({ sources, onNavigate }: SourceListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181822] hover:bg-[#20202c] border border-[#282836] text-[11px] font-mono uppercase font-semibold text-text-secondary hover:text-[#ffd23f] transition-colors"
      >
        <Sparkles className="w-3 h-3 text-[#ffd23f]" />
        <span>Grounded Sources ({sources.length})</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2 animate-fade-in">
          {sources.map((source) => (
            <SourceCard
              key={source.chunk_id}
              source={source}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
