import { ArrowLeft, ChevronLeft, ChevronRight, FileText, PanelLeft, Sparkles } from 'lucide-react';
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
  ocrOpen?: boolean;
  onToggleOcr?: () => void;
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
  ocrOpen,
  onToggleOcr,
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-white hover:bg-[#1d1d26] transition-colors shrink-0 border border-transparent hover:border-[#282836] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline uppercase tracking-wider font-mono text-[11px]">Vault</span>
        </Link>

        <div className="hidden md:block w-px h-4 bg-[#23232e] mx-0.5" />

        {/* Toggle Page Rail Sidebar (Desktop only, mobile uses bottom bar) */}
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Hide Page Rail' : 'Show Page Rail'}
          title={sidebarOpen ? 'Hide Page Rail' : 'Show Page Rail'}
          className={`hidden md:flex p-1.5 rounded-lg transition-all border cursor-pointer ${
            sidebarOpen
              ? 'bg-[#ffd23f]/15 border-[#ffd23f]/40 text-[#ffd23f]'
              : 'text-text-muted hover:text-text-primary hover:bg-[#1d1d26] border-transparent'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Comic Title & Format Badge */}
        <div className="flex items-center gap-2 min-w-0 pl-0.5 sm:pl-1 flex-1 sm:flex-initial">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#ffd23f] hidden md:inline">
            Reading:
          </span>
          <h1
            className="text-xs sm:text-sm font-semibold text-text-primary truncate max-w-[200px] sm:max-w-[280px] md:max-w-md"
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

      {/* Center section: Page Navigation Arrows (tablet/desktop) */}
      <div className="hidden sm:flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous Page"
          className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-[#1c1c26] disabled:opacity-20 disabled:cursor-not-allowed transition-colors comic-btn-tactile border border-transparent hover:border-[#2c2c3a] cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next Page"
          className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-[#1c1c26] disabled:opacity-20 disabled:cursor-not-allowed transition-colors comic-btn-tactile border border-transparent hover:border-[#2c2c3a] cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Right section: Transcript Toggle + Desktop AI Companion */}
      <div className="flex items-center gap-2">
        {onToggleOcr && (
          <button
            onClick={onToggleOcr}
            aria-label={ocrOpen ? 'Hide Transcript' : 'Inspect Transcript'}
            title={ocrOpen ? 'Hide Transcript' : 'Inspect Transcript'}
            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
              ocrOpen
                ? 'bg-[#ffd23f] text-black border-black shadow-comic-sm'
                : 'text-text-secondary hover:text-white hover:bg-[#1c1c26] border-[#252532]'
            }`}
          >
            <FileText className="w-4 h-4" />
          </button>
        )}

        {/* Desktop AI Companion Toggle (mobile uses bottom bar) */}
        <button
          onClick={onToggleAI}
          aria-label={aiOpen ? 'Hide Comic Companion' : 'Open Comic Companion'}
          title={aiOpen ? 'Hide Comic Companion' : 'Open Comic Companion'}
          className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all comic-btn-tactile border cursor-pointer ${
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
