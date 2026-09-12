import { useState, useEffect, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  onSignedUrlExpired?: () => void;
}

export const AuthenticatedThumbnail = memo(function AuthenticatedThumbnail({
  directUrl,
  comicId,
  pageNumber,
  className = 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-200',
  alt,
  onSignedUrlExpired,
}: AuthenticatedThumbnailProps) {
  const isDirect = isDirectImageUrl(directUrl);
  const [directError, setDirectError] = useState(false);
  const [authThumbError, setAuthThumbError] = useState(false);
  const [authFullError, setAuthFullError] = useState(false);
  const [authBlobUrl, setAuthBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset direct error state if directUrl changes (e.g. fresh signed URL from polling)
  const prevDirectUrlRef = useRef<string | null | undefined>(directUrl);
  useEffect(() => {
    if (prevDirectUrlRef.current !== directUrl) {
      prevDirectUrlRef.current = directUrl;
      setDirectError(false);
      setAuthThumbError(false);
      setAuthFullError(false);
    }
  }, [directUrl]);

  const canUseDirect = isDirect && Boolean(directUrl) && !directError;

  useEffect(() => {
    if (canUseDirect) {
      setLoading(false);
      return;
    }

    if (!comicId || !pageNumber) {
      setLoading(false);
      return;
    }

    // Check in-memory image cache first
    const cachedThumb = getCachedImageUrl(comicId, pageNumber, true);
    if (cachedThumb && !authThumbError) {
      setAuthBlobUrl(cachedThumb);
      setLoading(false);
      return;
    }

    const cachedFull = getCachedImageUrl(comicId, pageNumber, false);
    if (cachedFull && !authFullError) {
      setAuthBlobUrl(cachedFull);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    if (!authThumbError) {
      getAuthenticatedImageUrl(comicId, pageNumber, true)
        .then((url) => {
          if (isMounted) {
            setAuthBlobUrl(url);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setAuthThumbError(true);
            // Fallback to full page image if thumbnail fails
            getAuthenticatedImageUrl(comicId, pageNumber, false)
              .then((fullUrl) => {
                if (isMounted) {
                  setAuthBlobUrl(fullUrl);
                  setLoading(false);
                }
              })
              .catch(() => {
                if (isMounted) {
                  setAuthFullError(true);
                  setLoading(false);
                }
              });
          }
        });
    } else if (!authFullError) {
      getAuthenticatedImageUrl(comicId, pageNumber, false)
        .then((fullUrl) => {
          if (isMounted) {
            setAuthBlobUrl(fullUrl);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setAuthFullError(true);
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [comicId, pageNumber, canUseDirect, authThumbError, authFullError]);

  const handleImgError = () => {
    if (canUseDirect) {
      setDirectError(true);
      onSignedUrlExpired?.();
    } else if (authBlobUrl && !authFullError) {
      setAuthThumbError(true);
    } else {
      setAuthFullError(true);
    }
  };

  const activeSrc = canUseDirect ? directUrl! : authBlobUrl;
  const isFailed = !activeSrc || (directError && authThumbError && authFullError);

  if (loading && !activeSrc) {
    return (
      <div className="w-full h-full bg-[#161622] flex flex-col items-center justify-center animate-pulse">
        <FileText className="w-3.5 h-3.5 text-[#ffd23f]/50 animate-bounce" />
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="w-full h-full bg-[#14141c] flex flex-col items-center justify-center p-1 text-center border border-[#22222d] select-none">
        <BookOpen className="w-3.5 h-3.5 text-[#ffd23f]/40 mb-0.5" />
        <span className="text-[8.5px] font-mono font-bold text-[#ffd23f]/60 leading-none">
          P.{pageNumber}
        </span>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt || `Page ${pageNumber}`}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleImgError}
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
  onSignedUrlExpired,
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
          onSignedUrlExpired={onSignedUrlExpired}
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
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88, // 80px button height + 8px row gap
    overscan: 4,
  });

  // Auto-scroll active thumbnail into view with virtualizer
  const activeIndex = pages.findIndex((p) => (p.page_number ?? 1) === currentPage);
  useEffect(() => {
    if (activeIndex >= 0) {
      virtualizer.scrollToIndex(activeIndex, {
        align: 'auto',
        behavior: 'smooth',
      });
    }
  }, [activeIndex, virtualizer]);

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
      <nav
        ref={parentRef}
        className="flex-1 overflow-y-auto p-2"
        aria-label="Page thumbnails"
      >
        {pages.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-[#ffd23f]/40" />
            No pages found
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const page = pages[virtualRow.index];
              const pageNum = page.page_number ?? virtualRow.index + 1;
              const isActive = pageNum === currentPage;

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '8px',
                  }}
                >
                  <PageThumbnailItem
                    comicId={comicId}
                    pageNum={pageNum}
                    isActive={isActive}
                    page={page}
                    onSelect={onPageSelect}
                    onSignedUrlExpired={onSignedUrlExpired}
                  />
                </div>
              );
            })}
          </div>
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
