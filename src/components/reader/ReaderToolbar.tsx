import { ArrowLeft, ChevronLeft, ChevronRight, PanelLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  type ComicDetailResponse,
  getComicFormat,
  getComicName,
  getComicTotalPages,
} from '../../types/comic';

interface ReaderToolbarProps {
  comic: ComicDetailResponse;
  currentPage: number;
  onPrev: () => void;
  onNext: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  aiOpen: boolean;
  onToggleAI: () => void;
}

export function ReaderToolbar({
  comic,
  currentPage,
  onPrev,
  onNext,
  sidebarOpen,
  onToggleSidebar,
  aiOpen,
  onToggleAI,
}: ReaderToolbarProps) {
  const total = getComicTotalPages(comic);
  const name = getComicName(comic);
  const format = getComicFormat(comic);
  const canPrev = currentPage > 1;
  const canNext = currentPage < total;

  return (
    <header className="h-13 min-h-[52px] flex items-center justify-between px-3.5 bg-[#121217] border-b-2 border-[#1a1a22] shrink-0 select-none z-30 shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
      {/* Left section: Back + Sidebar Toggle + Comic Title */}
      <div className="flex items-center gap-2 min-w-0">
        <Link
          to="/library"
          aria-label="Back to Library"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-white hover:bg-[#1d1d26] transition-colors shrink-0 border border-transparent hover:border-[#282836]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline uppercase tracking-wider font-mono text-[11px]">Vault</span>
        </Link>

        <div className="w-px h-4 bg-[#23232e] mx-0.5" />

        {/* Toggle Page Rail Sidebar */}
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Hide Page Rail' : 'Show Page Rail'}
          title={sidebarOpen ? 'Hide Page Rail' : 'Show Page Rail'}
          className={`p-1.5 rounded-lg transition-all border ${
            sidebarOpen
              ? 'bg-[#ffd23f]/15 border-[#ffd23f]/40 text-[#ffd23f]'
              : 'text-text-muted hover:text-text-primary hover:bg-[#1d1d26] border-transparent'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Comic Title & Issue Format Badge */}
        <div className="flex items-center gap-2 min-w-0 pl-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#ffd23f] hidden md:inline">
            Reading:
          </span>
          <h1
            className="text-xs sm:text-sm font-semibold text-text-primary truncate max-w-[160px] sm:max-w-[240px] md:max-w-xs"
            title={name}
          >
            {name}
          </h1>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1c1c24] text-[#ffd23f] border border-[#2a2a38] uppercase shrink-0">
            {format}
          </span>
          {(comic.comic?.status === 'processing' || comic.status === 'processing') && (
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#08d9d6]/20 text-[#08d9d6] border border-[#08d9d6]/40 uppercase shadow-sm flex items-center gap-1 animate-pulse shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#08d9d6]" />
              ANALYZING {comic.comic?.analyzed_pages ?? comic.analyzed_pages ?? 0}/{total}
            </span>
          )}
        </div>
      </div>

      {/* Center section: Page Navigation Arrows */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous Page"
          className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-[#1c1c26] disabled:opacity-20 disabled:cursor-not-allowed transition-colors comic-btn-tactile border border-transparent hover:border-[#2c2c3a]"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next Page"
          className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-[#1c1c26] disabled:opacity-20 disabled:cursor-not-allowed transition-colors comic-btn-tactile border border-transparent hover:border-[#2c2c3a]"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Right section: AI Companion Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAI}
          aria-label={aiOpen ? 'Hide Comic Companion' : 'Open Comic Companion'}
          title={aiOpen ? 'Hide Comic Companion' : 'Open Comic Companion'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all comic-btn-tactile border ${
            aiOpen
              ? 'bg-[#182028] text-[#08d9d6] border-[#08d9d6]/50 shadow-[0_0_10px_rgba(8,217,214,0.2)]'
              : 'bg-[#16161d] text-text-secondary hover:text-text-primary hover:bg-[#1c1c26] border-[#252532]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#08d9d6]" />
          <span className="hidden sm:inline">Ask Comic</span>
          {aiOpen && <span className="w-1.5 h-1.5 rounded-full bg-[#08d9d6] animate-pulse" />}
        </button>
      </div>
    </header>
  );
}
