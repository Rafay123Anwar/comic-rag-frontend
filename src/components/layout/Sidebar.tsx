import { useState, useEffect, useRef, memo } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import {
  type ComicDetailResponse,
  type ComicPage,
  getComicFormat,
  getComicId,
  getComicTotalPages,
} from '../../types/comic';
import { getAuthenticatedImageUrl, getCachedImageUrl } from '../../services/imageCache';
import { isDirectImageUrl } from '../../services/api';

export interface SidebarProps {
  comic: ComicDetailResponse;
  currentPage: number;
  onPageSelect: (page: number) => void;
  className?: string;
  onSignedUrlExpired?: () => void;
}

export interface AuthenticatedThumbnailProps {
  directUrl?: string | null;
  comicId: string;
  pageNumber: number;
  className?: string;
  alt?: string;
}

export const AuthenticatedThumbnail = memo(function AuthenticatedThumbnail({
  directUrl,
  comicId,
  pageNumber,
  className = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-200',
  alt,
}: AuthenticatedThumbnailProps) {
  const isDirect = isDirectImageUrl(directUrl);
  const cachedUrl = !isDirect && comicId && pageNumber ? getCachedImageUrl(comicId, pageNumber, true) : null;
  const initialSrc = isDirect ? (directUrl ?? null) : cachedUrl;

  const [imgSrc, setImgSrc] = useState<string | null>(initialSrc);
  const [loading, setLoading] = useState(!initialSrc);

  useEffect(() => {
    // 1. If imgSrc is already a valid blob URL or data URL, do NOT run fetch again!
    if (imgSrc && (imgSrc.startsWith('blob:') || imgSrc.startsWith('data:'))) {
      setLoading(false);
      return;
    }

    // 2. If direct CDN URL is provided, use it directly without re-fetching
    if (isDirect && directUrl) {
      if (imgSrc !== directUrl) {
        setImgSrc(directUrl);
      }
      setLoading(false);
      return;
    }

    // 3. Check memory cache first
    const memoryCached = comicId && pageNumber ? getCachedImageUrl(comicId, pageNumber, true) : null;
    if (memoryCached) {
      if (imgSrc !== memoryCached) {
        setImgSrc(memoryCached);
      }
      setLoading(false);
      return;
    }

    // 4. If already populated, do not re-fetch
    if (imgSrc) {
      setLoading(false);
      return;
    }

    if (!comicId || !pageNumber) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getAuthenticatedImageUrl(comicId, pageNumber, true)
      .then((objectUrl) => {
        if (isMounted) {
          setImgSrc(objectUrl);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Sidebar Thumb Error:', error);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [directUrl, isDirect, comicId, pageNumber, imgSrc]);

  if (loading) {
    return (
      <div className="w-full h-full bg-[#161622] flex items-center justify-center animate-pulse">
        <FileText className="w-4 h-4 text-[#ffd23f]/50 animate-bounce" />
      </div>
    );
  }

  if (!imgSrc) {
    return <FileText className="w-4 h-4 text-text-muted opacity-40" />;
  }

  return (
    <img
      src={imgSrc}
      alt={alt || `Page ${pageNumber} thumbnail`}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
});

export interface PageThumbnailItemProps {
  comicId: string;
  pageNum: number;
  isActive: boolean;
  page: ComicPage;
  onSelect: (pageNum: number) => void;
  activeThumbnailRef?: React.RefObject<HTMLButtonElement | null> | null;
  onSignedUrlExpired?: () => void;
}

export const PageThumbnailItem = memo(function PageThumbnailItem({
  comicId,
  pageNum,
  isActive,
  page,
  onSelect,
  activeThumbnailRef,
}: PageThumbnailItemProps) {
  const isProcessing = page.status === 'processing';

  return (
    <button
      ref={
        isActive && activeThumbnailRef
          ? (el) => {
              (activeThumbnailRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
            }
          : null
      }
      onClick={() => onSelect(pageNum)}
      aria-label={`Go to page ${pageNum}`}
      aria-current={isActive ? 'page' : undefined}
      className={`w-full group text-left rounded-xl p-1.5 transition-all duration-150 relative flex items-center gap-2.5 border cursor-pointer ${
        isActive
          ? 'bg-[#201d14] border-[#ffd23f] shadow-comic-sm'
          : 'bg-[#15151b] border-[#22222d] hover:border-[#ffd23f]/40 hover:bg-[#1a1a22]'
      }`}
    >
      {/* Thumbnail container */}
      <div
        className={`w-11 aspect-[2/3] rounded-lg bg-[#0a0a0d] border overflow-hidden shrink-0 relative flex items-center justify-center ${
          isActive ? 'border-[#ffd23f]/60' : 'border-[#22222d]'
        }`}
      >
        <AuthenticatedThumbnail
          directUrl={page.thumbnail_url || page.image_url}
          comicId={comicId}
          pageNumber={pageNum}
        />

        {/* Non-blocking subtle AI analyzing indicator dot on the thumbnail */}
        {isProcessing && (
          <div
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ffd23f] shadow-[0_0_6px_#ffd23f] animate-pulse z-10"
            title="AI analyzing page in background..."
          />
        )}
      </div>

      {/* Page info */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <span
            className={`text-xs font-semibold font-comic tracking-wider truncate ${
              isActive ? 'text-[#ffd23f]' : 'text-text-primary group-hover:text-white'
            }`}
          >
            PAGE {pageNum}
          </span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffd23f] shadow-[0_0_6px_#ffd23f] shrink-0" />
          )}
        </div>
        <p className="text-[10px] font-mono mt-0.5 flex items-center gap-1 min-w-0">
          {page.status === 'success' ? (
            <span className="text-[#08d9d6] truncate">Analyzed</span>
          ) : page.status === 'processing' ? (
            <span className="text-[#ffd23f] flex items-center gap-1 animate-pulse min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffd23f] shrink-0" />
              <span className="truncate">Analyzing…</span>
            </span>
          ) : page.status === 'error' ? (
            <span className="text-[#ff2e63] truncate">Error</span>
          ) : (
            <span className="text-text-muted truncate">Ready</span>
          )}
        </p>
      </div>
    </button>
  );
});

export function Sidebar({
  comic,
  currentPage,
  onPageSelect,
  className = '',
  onSignedUrlExpired,
}: SidebarProps) {
  const pages = Array.isArray(comic?.pages) ? comic.pages : [];
  const comicId = getComicId(comic) || (comic as { id?: string })?.id || '';
  const format = getComicFormat(comic);
  const total = getComicTotalPages(comic);
  const activeThumbnailRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPage]);

  return (
    <aside
      className={`flex flex-col bg-[#111116] border-r-2 border-[#1a1a22] h-full overflow-hidden select-none ${className}`}
      aria-label="Comic Pages Rail"
    >
      {/* Rail Header */}
      <div className="px-3.5 py-2.5 border-b border-[#1f1f2a] shrink-0 bg-[#14141a]">
        <div className="flex items-center justify-between">
          <p className="font-comic text-xs text-[#ffd23f] tracking-wider uppercase">
            PAGE RAIL
          </p>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0d0d12] text-text-secondary border border-[#23232f]">
            {total} {total === 1 ? 'PAGE' : 'PAGES'}
          </span>
        </div>
      </div>

      {/* Page Thumbnails List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-2" aria-label="Page thumbnails">
        {pages.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-[#ffd23f]/40" />
            No pages found
          </div>
        ) : (
          pages.map((page) => {
            const pageNum = page.page_number ?? 1;
            const isActive = pageNum === currentPage;

            return (
              <PageThumbnailItem
                key={pageNum}
                comicId={comicId}
                pageNum={pageNum}
                isActive={isActive}
                page={page}
                onSelect={onPageSelect}
                activeThumbnailRef={activeThumbnailRef}
                onSignedUrlExpired={onSignedUrlExpired}
              />
            );
          })
        )}
      </nav>

      {/* Rail Footer */}
      <div className="px-3.5 py-2 border-t border-[#1f1f2a] bg-[#14141a] shrink-0 text-center">
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          Format: <span className="text-[#ffd23f] font-bold">{format}</span>
        </p>
      </div>
    </aside>
  );
}
