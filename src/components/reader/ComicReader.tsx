import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  FileText,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import {
  type ComicDetailResponse,
  type ComicPage,
  getComicId,
  getComicTotalPages,
} from '../../types/comic';
import {
  prefetchPageWindow,
  getAuthenticatedImageUrl,
  getCachedImageUrl,
} from '../../services/imageCache';
import { isDirectImageUrl } from '../../services/api';
import { ComicCanvas } from './ComicCanvas';
import { OcrTranscriptModal } from './OcrTranscriptModal';
import { useReaderGestures } from './useReaderGestures';

/**
 * Preload and decode an image in the browser image pipeline.
 * Resolves as soon as the image is decoded and ready to paint without blank frames.
 */
function preloadImageSource(src: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const img = new Image();

    const onAbort = () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      cleanup();
      if ('decode' in img && typeof img.decode === 'function') {
        img.decode().then(resolve).catch(() => resolve());
      } else {
        resolve();
      }
      return;
    }
    img.onload = () => {
      cleanup();
      if ('decode' in img && typeof img.decode === 'function') {
        img.decode().then(resolve).catch(() => resolve());
      } else {
        resolve();
      }
    };
    img.onerror = (err) => {
      cleanup();
      reject(err);
    };
    img.src = src;
  });
}

/**
 * Resolves the appropriate image assets (thumbnail first, high-res in background)
 * and preloads the lightweight thumbnail (~55KB) immediately so the UI can paint it.
 */
async function resolveAndPreloadPageImage(
  comicId: string,
  pageNum: number,
  pages: ComicPage[],
  signal?: AbortSignal
): Promise<{ thumbSrc: string | null; highResSrc: string | null }> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const pageObj = pages.find((p) => (p.page_number ?? 1) === pageNum);
  const directHigh = pageObj?.image_url;
  const directThumb = pageObj?.thumbnail_url;

  let thumbSrc: string | null = null;
  let highResSrc: string | null = null;

  // 1. Resolve Thumbnail URL (Check in-memory cache, direct CDN URL, then auth endpoint)
  const cachedThumb = getCachedImageUrl(comicId, pageNum, true);
  if (cachedThumb) {
    thumbSrc = cachedThumb;
  } else if (directThumb && isDirectImageUrl(directThumb)) {
    thumbSrc = directThumb;
  } else if (comicId) {
    try {
      thumbSrc = await getAuthenticatedImageUrl(comicId, pageNum, true, signal);
    } catch (err: unknown) {
      if (signal?.aborted || (err as { name?: string })?.name === 'AbortError' || axios.isCancel(err)) {
        throw err;
      }
      thumbSrc = null;
    }
  }

  // Preload and decode thumbnail if available (fast: ~55KB / instant if cached)
  if (thumbSrc) {
    try {
      await preloadImageSource(thumbSrc, signal);
    } catch (err: unknown) {
      if (signal?.aborted || (err as { name?: string })?.name === 'AbortError' || axios.isCancel(err)) {
        throw err;
      }
      // If direct thumb CDN failed, try authenticated fallback
      if (directThumb && isDirectImageUrl(directThumb) && comicId) {
        try {
          const authFallback = await getAuthenticatedImageUrl(comicId, pageNum, true, signal);
          await preloadImageSource(authFallback, signal);
          thumbSrc = authFallback;
        } catch {
          thumbSrc = null;
        }
      } else {
        thumbSrc = null;
      }
    }
  }

  // 2. Resolve High-Res URL (Check in-memory cache, direct CDN URL, then auth endpoint)
  const cachedHigh = getCachedImageUrl(comicId, pageNum, false);
  if (cachedHigh) {
    highResSrc = cachedHigh;
  } else if (directHigh && isDirectImageUrl(directHigh)) {
    highResSrc = directHigh;
  } else if (comicId) {
    try {
      highResSrc = await getAuthenticatedImageUrl(comicId, pageNum, false, signal);
    } catch (err: unknown) {
      if (signal?.aborted || (err as { name?: string })?.name === 'AbortError' || axios.isCancel(err)) {
        throw err;
      }
      highResSrc = null;
    }
  }

  return { thumbSrc, highResSrc };
}

interface ComicReaderProps {
  comic: ComicDetailResponse;
  currentPage: number;
  onPageChange: (page: number) => void;
  highlightedPage?: number | null;
  onSignedUrlExpired?: () => void;
  ocrOpen?: boolean;
  onToggleOcr?: () => void;
}

export function ComicReader({
  comic,
  currentPage,
  onPageChange,
  highlightedPage,
  onSignedUrlExpired,
  ocrOpen: externalOcrOpen,
  onToggleOcr: externalToggleOcr,
}: ComicReaderProps) {
  const [internalOcrOpen, setInternalOcrOpen] = useState(false);
  const isOcrOpen = externalOcrOpen !== undefined ? externalOcrOpen : internalOcrOpen;
  const handleToggleOcr = externalToggleOcr || (() => setInternalOcrOpen((v) => !v));
  const handleCloseOcr = useCallback(() => {
    if (externalToggleOcr && externalOcrOpen) {
      externalToggleOcr();
    } else {
      setInternalOcrOpen(false);
    }
  }, [externalToggleOcr, externalOcrOpen]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const scaleRef = useRef(1);
  const isZoomedRef = useRef(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const onScaleChangeRef = useRef<((scale: number) => void) | null>(null);

  // Smooth image transition state: keeps the previous page frozen on screen while new page preloads in background
  const [displayedPage, setDisplayedPage] = useState<number>(currentPage);
  const [displayedHighResSrc, setDisplayedHighResSrc] = useState<string | null>(null);
  const [displayedThumbSrc, setDisplayedThumbSrc] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);

  // High-resolution image state for currently displayed page
  const [highResLoaded, setHighResLoaded] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement | null>(null);
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);

  const comicId = getComicId(comic);
  const totalPages = getComicTotalPages(comic);
  const pages = Array.isArray(comic.pages) ? comic.pages : [];

  // Active page object for currently displayed page vs target page
  const activePageObj = pages.find((p) => (p.page_number ?? 1) === displayedPage) || pages[0];
  const targetPageObj = pages.find((p) => (p.page_number ?? 1) === currentPage) || pages[0];

  const comicOverallStatus = comic.comic?.status || comic.status;
  const isPageProcessing =
    targetPageObj?.status === 'processing' ||
    (comicOverallStatus === 'processing' &&
      targetPageObj?.status !== 'success' &&
      targetPageObj?.status !== 'completed');

  // Track ready pages so prefetching does not trigger premature fetch errors
  const readyPages = useMemo(() => {
    if (comicOverallStatus === 'completed') {
      return null; // All pages ready
    }
    const set = new Set<number>();
    pages.forEach((p) => {
      if (p.status === 'success' || p.status === 'completed') {
        set.add(p.page_number);
      }
    });
    return set;
  }, [comicOverallStatus, pages]);

  // 1. Prefetch window of surrounding ready pages (±2-3 pages)
  useEffect(() => {
    if (comicId && totalPages > 0) {
      prefetchPageWindow(comicId, currentPage, totalPages, readyPages ?? undefined);
    }
  }, [comicId, currentPage, totalPages, readyPages]);

  // Reset displayed state when switching to a completely different comic
  const lastComicIdRef = useRef<string>(comicId);
  useEffect(() => {
    if (lastComicIdRef.current !== comicId) {
      lastComicIdRef.current = comicId;
      setDisplayedPage(currentPage);
      setDisplayedHighResSrc(null);
      setDisplayedThumbSrc(null);
      setIsTransitioning(false);
      setIsInitialLoading(true);
      setLoadFailed(false);
      setHighResLoaded(false);
      setThumbLoaded(false);
      scaleRef.current = 1;
      isZoomedRef.current = false;
      setIsZoomed(false);
      onScaleChangeRef.current?.(1);
    }
  }, [comicId, currentPage]);

  const displayedPageRef = useRef(displayedPage);
  displayedPageRef.current = displayedPage;
  const hasVisibleImageRef = useRef(false);
  hasVisibleImageRef.current = Boolean(displayedHighResSrc || displayedThumbSrc);

  // 2. Smooth Image Preload Transition:
  // When currentPage changes, thumbnail is resolved and rendered immediately (~20ms).
  // High-res image is preloaded in the background and smoothly swapped once fully loaded.
  useEffect(() => {
    if (!comicId) return;

    let isMounted = true;
    const targetPage = currentPage;

    const targetObj = pages.find((p) => (p.page_number ?? 1) === targetPage);
    const isTargetStillProcessing =
      targetObj?.status === 'processing' ||
      (comicOverallStatus === 'processing' &&
        targetObj?.status !== 'success' &&
        targetObj?.status !== 'completed');

    // If target page is processing and has no image assets at all, transition immediately to show processing UI
    if (isTargetStillProcessing && !targetObj?.image_url && !targetObj?.thumbnail_url) {
      setDisplayedPage(targetPage);
      setDisplayedHighResSrc(null);
      setDisplayedThumbSrc(null);
      setIsTransitioning(false);
      setIsInitialLoading(false);
      return;
    }

    // If already showing target page with an image loaded, no transition needed
    if (displayedPageRef.current === targetPage && hasVisibleImageRef.current) {
      setIsTransitioning(false);
      setIsInitialLoading(false);
      return;
    }

    // Freeze existing image and activate subtle loading transition only until thumbnail is ready
    if (hasVisibleImageRef.current) {
      setIsTransitioning(true);
    } else {
      setIsInitialLoading(true);
    }
    setLoadFailed(false);

    const controller = new AbortController();

    resolveAndPreloadPageImage(comicId, targetPage, pages, controller.signal)
      .then((asset) => {
        if (!isMounted || controller.signal.aborted) return;

        const { thumbSrc, highResSrc } = asset;

        if (thumbSrc) {
          // 1. Show thumbnail immediately (fast ~55KB, zero screen freeze)
          setDisplayedPage(targetPage);
          setDisplayedThumbSrc(thumbSrc);
          setThumbLoaded(true);
          setDisplayedHighResSrc(null);
          setHighResLoaded(false);
          setLoadFailed(false);
          setIsTransitioning(false);
          setIsInitialLoading(false);

          // Reset zoom & center for the newly displayed page
          scaleRef.current = 1;
          isZoomedRef.current = false;
          setIsZoomed(false);
          onScaleChangeRef.current?.(1);
          transformComponentRef.current?.resetTransform(0);
          requestAnimationFrame(() => {
            transformComponentRef.current?.centerView(1, 0);
          });

          // 2. Kick off non-blocking background high-res preload
          if (highResSrc) {
            preloadImageSource(highResSrc, controller.signal)
              .then(() => {
                if (!isMounted || controller.signal.aborted) return;
                // High-res finished loading: trigger smooth overlay in ComicCanvas
                setDisplayedHighResSrc(highResSrc);
              })
              .catch((highErr: unknown) => {
                if (!isMounted || controller.signal.aborted || axios.isCancel(highErr)) return;
                // If direct CDN failed, try authenticated backend route
                const pageObj = pages.find((p) => (p.page_number ?? 1) === targetPage);
                const directHigh = pageObj?.image_url;
                if (directHigh && isDirectImageUrl(directHigh) && comicId && highResSrc === directHigh) {
                  getAuthenticatedImageUrl(comicId, targetPage, false, controller.signal)
                    .then((authFallback) =>
                      preloadImageSource(authFallback, controller.signal).then(() => authFallback)
                    )
                    .then((authFallback) => {
                      if (!isMounted || controller.signal.aborted) return;
                      setDisplayedHighResSrc(authFallback);
                    })
                    .catch(() => {
                      // Thumbnail is already visible, non-fatal
                    });
                }
              });
          }
        } else if (highResSrc) {
          // Fallback if no thumbnail available: wait for high-res before swapping
          preloadImageSource(highResSrc, controller.signal)
            .then(() => {
              if (!isMounted || controller.signal.aborted) return;
              setDisplayedPage(targetPage);
              setDisplayedHighResSrc(highResSrc);
              setDisplayedThumbSrc(null);
              setHighResLoaded(true);
              setThumbLoaded(false);
              setLoadFailed(false);
              setIsTransitioning(false);
              setIsInitialLoading(false);

              scaleRef.current = 1;
              isZoomedRef.current = false;
              setIsZoomed(false);
              onScaleChangeRef.current?.(1);
              transformComponentRef.current?.resetTransform(0);
              requestAnimationFrame(() => {
                transformComponentRef.current?.centerView(1, 0);
              });
            })
            .catch((highErr: unknown) => {
              if (!isMounted || controller.signal.aborted || axios.isCancel(highErr)) return;
              setDisplayedPage(targetPage);
              setDisplayedHighResSrc(null);
              setDisplayedThumbSrc(null);
              setLoadFailed(true);
              setIsTransitioning(false);
              setIsInitialLoading(false);
            });
        } else {
          // Neither image nor thumbnail could be resolved
          setDisplayedPage(targetPage);
          setDisplayedHighResSrc(null);
          setDisplayedThumbSrc(null);
          setLoadFailed(true);
          setIsTransitioning(false);
          setIsInitialLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted || controller.signal.aborted || (err as { name?: string })?.name === 'AbortError' || axios.isCancel(err)) {
          return;
        }
        setDisplayedPage(targetPage);
        setDisplayedHighResSrc(null);
        setDisplayedThumbSrc(null);
        setLoadFailed(true);
        setIsTransitioning(false);
        setIsInitialLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [comicId, currentPage, pages, comicOverallStatus]);

  const handleDirectHighResError = () => {
    if (onSignedUrlExpired) {
      onSignedUrlExpired();
    }
  };

  const handleDirectThumbError = () => {
    if (onSignedUrlExpired) {
      onSignedUrlExpired();
    }
  };

  // Authoritative mobile touch swipe and keyboard navigation gestures
  useReaderGestures({
    containerRef: readerContainerRef,
    scaleRef,
    currentPage,
    totalPages,
    onPageChange,
  });

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      readerContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const isCompleteFailure =
    !displayedHighResSrc &&
    !displayedThumbSrc &&
    !isInitialLoading &&
    !isPageProcessing &&
    loadFailed;

  const handleTransform = useCallback((ref: ReactZoomPanPinchRef) => {
    const newScale = ref.state.scale;
    scaleRef.current = newScale;
    onScaleChangeRef.current?.(newScale);

    const zoomed = newScale > 1.05;
    if (isZoomedRef.current !== zoomed) {
      isZoomedRef.current = zoomed;
      setIsZoomed(zoomed);
    }
  }, []);

  return (
    <div
      ref={readerContainerRef}
      className={`relative flex-1 flex flex-col bg-[#070709] overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''
      }`}
    >
      {/* Mobile-only Source Citation Highlight (centered at top, away from corner art) */}
      {highlightedPage === currentPage && (
        <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 text-[11px] font-mono text-[#ffd23f] bg-[#121218]/95 backdrop-blur-md px-3 py-1 rounded-full animate-pulse border border-[#ffd23f]/30 shadow-comic-sm">
          <Sparkles className="w-3 h-3 text-[#ff2e63]" />
          CITING PAGE {currentPage}
        </div>
      )}

      {/* Top Floating Mini Bar (hidden on mobile to prevent blocking comic text/dialogue; mobile uses top toolbar) */}
      <div className="hidden sm:flex absolute top-3 right-4 z-30 items-center gap-2 bg-[#121218]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#20202e] shadow-comic-sm">
        {/* Source citation highlight pulse (tablet/desktop) */}
        {highlightedPage === currentPage && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#ffd23f] bg-[#ffd23f]/15 px-2 py-0.5 rounded-full animate-pulse border border-[#ffd23f]/30">
            <Sparkles className="w-3 h-3 text-[#ff2e63]" />
            CITING PAGE {currentPage}
          </div>
        )}

        {/* Page progress badge */}
        <span className="text-xs font-mono font-bold text-text-primary px-1">
          {currentPage} <span className="text-text-muted">/</span> {totalPages}
        </span>

        {/* OCR text inspection toggle */}
        <button
          onClick={handleToggleOcr}
          title={isOcrOpen ? 'Hide Transcript' : 'Inspect OCR & Transcript'}
          aria-label="Toggle OCR text inspection"
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isOcrOpen
              ? 'bg-[#ffd23f] text-black shadow-comic-sm'
              : 'text-text-secondary hover:text-white hover:bg-[#22222e]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Reader'}
          aria-label="Toggle Fullscreen"
          className="p-1.5 rounded-full text-text-secondary hover:text-white hover:bg-[#22222e] transition-colors cursor-pointer"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Main Comic Canvas with Progressive Two-Stage Rendering & Frozen Preload Transition */}
      <ComicCanvas
        comicId={comicId}
        currentPage={currentPage}
        totalPages={totalPages}
        displayedPage={displayedPage}
        displayedHighResSrc={displayedHighResSrc}
        displayedThumbSrc={displayedThumbSrc}
        isTransitioning={isTransitioning}
        isInitialLoading={isInitialLoading}
        isPageProcessing={isPageProcessing}
        isCompleteFailure={isCompleteFailure}
        highResLoaded={highResLoaded}
        thumbLoaded={thumbLoaded}
        isZoomed={isZoomed}
        scaleRef={scaleRef}
        onScaleChangeRef={onScaleChangeRef}
        transformComponentRef={transformComponentRef}
        activePageObj={activePageObj}
        onPageChange={onPageChange}
        onTransform={handleTransform}
        onThumbLoad={() => {
          setThumbLoaded(true);
          requestAnimationFrame(() => {
            transformComponentRef.current?.centerView(1, 0);
          });
        }}
        onHighResLoad={() => {
          setHighResLoaded(true);
          requestAnimationFrame(() => {
            if (scaleRef.current <= 1.05) {
              transformComponentRef.current?.centerView(1, 0);
            }
          });
        }}
        onThumbError={handleDirectThumbError}
        onHighResError={handleDirectHighResError}
      />

      {/* OCR & AI Analysis Backdrop + Drawer Overlay */}
      <OcrTranscriptModal
        isOpen={isOcrOpen}
        onClose={handleCloseOcr}
        page={activePageObj}
        targetPage={targetPageObj}
        currentPage={currentPage}
        totalPages={totalPages}
        isPageProcessing={isPageProcessing}
      />
    </div>
  );
}
