import { useState } from 'react';
import { BookOpen, Clock, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LocalComicEntry } from '../../types/comic';
import { formatRelativeDate } from '../../utils/formatting';
import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage';
import { isDirectImageUrl } from '../../services/api';

interface ComicCardProps {
  comic: LocalComicEntry;
  onDelete?: (comicId: string) => void;
  isDeleting?: boolean;
}

export function ComicCard({ comic, onDelete, isDeleting = false }: ComicCardProps) {
  const navigate = useNavigate();
  const [directError, setDirectError] = useState(false);
  const directCoverUrl = comic.cover_thumbnail_url;
  const isProcessing = comic.status === 'processing';

  const isDirectCover = isDirectImageUrl(directCoverUrl);
  // Enable authenticated thumbnail fetch if direct cover URL is missing, not a public CDN, or errored
  const fallbackEnabled = !isDirectCover || directError;
  const { src: fallbackCoverUrl, error: fallbackCoverError } = useAuthenticatedImage(
    comic.comic_id,
    1,
    { isThumbnail: true, enabled: fallbackEnabled }
  );

  const hasDirectCover = isDirectCover && !directError;
  const hasFallbackCover = !fallbackCoverError && !!fallbackCoverUrl;
  const effectiveCoverUrl = hasDirectCover ? directCoverUrl : hasFallbackCover ? fallbackCoverUrl : null;

  const handleOpen = () => {
    navigate(`/comics/${comic.comic_id}`);
  };

  return (
    <div className="group bg-[#15151c] border-2 border-black rounded-2xl overflow-hidden hover:border-[#ffd23f] transition-all duration-200 shadow-comic hover:shadow-[5px_5px_0px_#000] hover:-translate-y-1 flex flex-col select-none cursor-pointer">
      {/* Comic Cover Area */}
      <div
        className="h-56 bg-[#0c0c10] flex items-center justify-center border-b-2 border-black relative overflow-hidden cursor-pointer"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        aria-label={`Open ${comic.title}`}
        onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
      >
        {effectiveCoverUrl ? (
          <img
            src={effectiveCoverUrl}
            alt={`${comic.title} cover`}
            loading="lazy"
            decoding="async"
            onError={hasDirectCover ? () => setDirectError(true) : undefined}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          /* Vintage Comic Paper Fallback Cover */
          <div className="w-full h-full bg-[#f3e7cf] text-[#121216] bg-halftone-paper p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-comic text-xs uppercase bg-black text-[#ffd23f] px-2 py-0.5 rounded shadow-sm">
                ISSUE #{comic.comic_id.slice(0, 4).toUpperCase()}
              </span>
              <span className="font-mono text-[10px] font-bold uppercase text-black/70">
                {comic.source_format}
              </span>
            </div>
            <div className="text-center my-auto">
              {isProcessing ? (
                <RefreshCw className="w-8 h-8 mx-auto mb-1 text-black/50 animate-spin" />
              ) : (
                <BookOpen className="w-8 h-8 mx-auto mb-1 text-black/50" />
              )}
              <p className="font-comic text-base leading-tight uppercase line-clamp-2">
                {comic.title}
              </p>
            </div>
            <p className="text-[10px] font-mono font-bold text-center text-black/60">
              {comic.total_pages} PAGES
            </p>
          </div>
        )}

        {/* Format Badge overlay on real images */}
        {effectiveCoverUrl && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-black/80 text-[#ffd23f] border border-[#ffd23f]/40 uppercase shadow-sm">
              {comic.source_format}
            </span>
            {comic.status === 'processing' && (
              <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#08d9d6]/20 text-[#08d9d6] border border-[#08d9d6]/40 uppercase shadow-sm flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#08d9d6]" />
                ANALYZING {comic.analyzed_pages ?? 0}/{comic.total_pages}
              </span>
            )}
          </div>
        )}

        {/* Progress bar on bottom of cover if processing */}
        {comic.status === 'processing' && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#08d9d6] to-[#ffd23f] transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(5, Math.min(100, (((comic.analyzed_pages ?? 0) / (comic.total_pages || 1)) * 100)))}%`,
              }}
            />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
      </div>

      {/* Comic Metadata & Details */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-[#15151c]">
        <div className="flex-1 min-w-0">
          <h3
            className="font-comic text-base text-white tracking-wide leading-tight truncate cursor-pointer group-hover:text-[#ffd23f] transition-colors"
            onClick={handleOpen}
            title={comic.title}
          >
            {comic.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs font-mono text-text-muted">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#ffd23f]" aria-hidden="true" />
              {comic.status === 'processing'
                ? `${comic.analyzed_pages ?? 0}/${comic.total_pages} analyzed`
                : `${comic.total_pages} pages`}
            </span>
            {comic.last_opened_at && (
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {formatRelativeDate(comic.last_opened_at)}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 pt-2 border-t border-[#20202c]">
          <button
            onClick={handleOpen}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#ffd23f] hover:bg-[#e6bd35] text-black font-comic text-xs font-bold tracking-wider py-2 px-3 rounded-xl shadow-comic-sm border border-black comic-btn-tactile uppercase cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
            {comic.status === 'processing' ? 'READ WHILE PROCESSING' : 'LAUNCH VIEWER'}
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isDeleting) {
                  onDelete(comic.comic_id);
                }
              }}
              disabled={isDeleting}
              aria-label={`Remove ${comic.title} from vault`}
              title={isDeleting ? 'Deleting issue…' : 'Remove from vault'}
              className="p-2 rounded-xl text-text-muted hover:text-[#ff2e63] hover:bg-[#ff2e63]/10 border border-transparent hover:border-[#ff2e63]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              {isDeleting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff2e63]" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
