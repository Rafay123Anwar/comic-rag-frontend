import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import {
  type ComicDetailResponse,
  type ComicPage,
  getComicId,
  getComicTotalPages,
} from '../../types/comic';
import { prefetchPageWindow, getAuthenticatedImageUrl } from '../../services/imageCache';
import { isDirectImageUrl } from '../../services/api';
import { ZoomControls } from './ZoomControls';

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
 * Resolves the appropriate image asset (high-res with thumbnail fallback)
 * and preloads it into browser cache before resolving.
 */
async function resolveAndPreloadPageImage(
  comicId: string,
  pageNum: number,
  pages: ComicPage[],
  signal?: AbortSignal
): Promise<{ highResSrc: string | null; thumbSrc: string | null }> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const pageObj = pages.find((p) => (p.page_number ?? 1) === pageNum);
  const directHigh = pageObj?.image_url;
  const directThumb = pageObj?.thumbnail_url;

  let highResSrc: string | null = null;
  let thumbSrc: string | null = null;

  // 1. Try High-Res Image first
  if (directHigh && isDirectImageUrl(directHigh)) {
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

  if (highResSrc) {
    try {
      await preloadImageSource(highResSrc, signal);
      return { highResSrc, thumbSrc: null };
    } catch (err: unknown) {
      if (signal?.aborted || (err as { name?: string })?.name === 'AbortError' || axios.isCancel(err)) {
        throw err;
      }
      // If direct high-res CDN failed, try authenticated backend route
      if (directHigh && isDirectImageUrl(directHigh) && comicId) {
        try {
          const authFallback = await getAuthenticatedImageUrl(comicId, pageNum, false, signal);
          await preloadImageSource(authFallback, signal);
          return { highResSrc: authFallback, thumbSrc: null };
        } catch (fallbackErr: unknown) {
          if (signal?.aborted || (fallbackErr as { name?: string })?.name === 'AbortError' || axios.isCancel(fallbackErr)) {
            throw fallbackErr;
          }
          highResSrc = null;
        }
      } else {
        highResSrc = null;
      }
    }
  }

  // 2. Fallback to Thumbnail preview if High-Res is not available or failed
  if (directThumb && isDirectImageUrl(directThumb)) {
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

  if (thumbSrc) {
    try {
      await preloadImageSource(thumbSrc, signal);
      return { highResSrc: null, thumbSrc };
    } catch (err: unknown) {
      if (signal?.aborted || (err as { name?: string })?.name === 'AbortError' || axios.isCancel(err)) {
        throw err;
      }
      thumbSrc = null;
    }
  }

  return { highResSrc: null, thumbSrc: null };
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

  // 2. Smooth Image Preload Transition:
  // When currentPage changes, previous image stays visible (frozen) on screen.
  // New image is preloaded in the background and only swapped once fully loaded (onLoad/decode).
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
    if (displayedPage === targetPage && (displayedHighResSrc || displayedThumbSrc)) {
      setIsTransitioning(false);
      setIsInitialLoading(false);
      return;
    }

    // Freeze existing image and activate subtle loading transition
    const hasCurrentVisibleImage = Boolean(displayedHighResSrc || displayedThumbSrc);
    if (hasCurrentVisibleImage) {
      setIsTransitioning(true);
    } else {
      setIsInitialLoading(true);
    }
    setLoadFailed(false);

    const controller = new AbortController();

    resolveAndPreloadPageImage(comicId, targetPage, pages, controller.signal)
      .then((asset) => {
        if (!isMounted || controller.signal.aborted) return;

        if (asset.highResSrc || asset.thumbSrc) {
          // SWAP IMAGE ONLY ONCE FULLY PRELOADED!
          setDisplayedPage(targetPage);
          setDisplayedHighResSrc(asset.highResSrc);
          setDisplayedThumbSrc(asset.thumbSrc);
          setHighResLoaded(Boolean(asset.highResSrc));
          setThumbLoaded(Boolean(asset.thumbSrc));
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
        } else {
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
  }, [comicId, currentPage, pages, comicOverallStatus, displayedPage, displayedHighResSrc, displayedThumbSrc]);

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

  // Single authoritative mobile touch swipe listener on container
  useEffect(() => {
    const container = readerContainerRef.current;
    if (!container) return;

    let startX: number | null = null;
    let startY: number | null = null;
    let startTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      // Only track single-finger gestures (multi-finger is for pinch zoom)
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      } else {
        startX = null;
        startY = null;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (startX === null || startY === null) return;
      if (e.changedTouches.length > 0) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = startY - endY;
        const elapsed = Date.now() - startTime;

        // When zoomed in, user is panning the comic; do not swipe pages
        if (scaleRef.current <= 1.05 && elapsed < 800) {
          // Horizontal gesture must dominate and exceed 40px threshold
          if (Math.abs(diffX) > Math.abs(diffY) * 1.2 && Math.abs(diffX) > 40) {
            if (diffX > 0 && currentPage < totalPages) {
              onPageChange(currentPage + 1);
            } else if (diffX < 0 && currentPage > 1) {
              onPageChange(currentPage - 1);
            }
          }
        }
      }
      startX = null;
      startY = null;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [currentPage, totalPages, onPageChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
        if (currentPage > 1) onPageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'KeyD') {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
      } else if (e.key === 'Home') {
        onPageChange(1);
      } else if (e.key === 'End') {
        onPageChange(totalPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onPageChange]);

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

  // Close OCR modal when Escape key is pressed
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOcrOpen) {
        handleCloseOcr();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOcrOpen, handleCloseOcr]);

  // Format OCR content for inspection
  const getPageText = (page?: ComicPage): string => {
    if (!page) return '';
    const parts: string[] = [];
    const textAnalysis = page.analysis?.text;
    if (textAnalysis?.full_text) {
      parts.push(textAnalysis.full_text.trim());
    } else if (
      Array.isArray(textAnalysis?.dialogue_and_narration) &&
      textAnalysis.dialogue_and_narration.length > 0
    ) {
      const dialogueLines = textAnalysis.dialogue_and_narration.map((item: unknown) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return String(obj.text || obj.dialogue || obj.content || obj.description || JSON.stringify(item));
        }
        return String(item);
      });
      parts.push(dialogueLines.join('\n\n').trim());
    }

    if (Array.isArray(textAnalysis?.signs_and_labels) && textAnalysis.signs_and_labels.length > 0) {
      const labels = textAnalysis.signs_and_labels.map((s) => `- ${String(s)}`).join('\n');
      parts.push(`SIGNS & LABELS:\n${labels}`);
    }

    if (Array.isArray(textAnalysis?.sound_effects) && textAnalysis.sound_effects.length > 0) {
      const sfx = textAnalysis.sound_effects.map((s) => `*${String(s)}*`).join(', ');
      parts.push(`SFX: ${sfx}`);
    }

    if (page.analysis?.page_summary) {
      parts.push(`SUMMARY:\n${page.analysis.page_summary.trim()}`);
    }

    // Visual description fallback if no text found
    const vis = page.analysis?.visual_description;
    if (parts.length === 0 && vis) {
      const visParts: string[] = [];
      if (vis.environment) visParts.push(`ENVIRONMENT: ${vis.environment}`);
      if (Array.isArray(vis.actions) && vis.actions.length > 0) {
        visParts.push(`ACTIONS:\n${vis.actions.map((a) => `- ${String(a)}`).join('\n')}`);
      }
      if (visParts.length > 0) {
        parts.push(visParts.join('\n\n'));
      }
    }

    // Direct fallback properties on page object
    if (parts.length === 0) {
      if (page.content) parts.push(String(page.content).trim());
      else if (page.summary) parts.push(`SUMMARY:\n${String(page.summary).trim()}`);
      else if (page.description) parts.push(String(page.description).trim());
      else if (typeof page.full_text === 'string' && page.full_text) parts.push(page.full_text.trim());
      else if (typeof page.dialogue === 'string' && page.dialogue) parts.push(page.dialogue.trim());
    }

    return parts.join('\n\n────────────────────\n\n');
  };

  const formatCharacterLabel = (char: unknown): string => {
    if (typeof char === 'string') return char;
    if (char && typeof char === 'object') {
      const obj = char as Record<string, unknown>;
      return String(obj.name || obj.character || obj.label || JSON.stringify(char));
    }
    return String(char);
  };

  const characters =
    targetPageObj?.analysis?.visual_description?.characters ||
    activePageObj?.analysis?.visual_description?.characters ||
    (Array.isArray(targetPageObj?.characters)
      ? targetPageObj.characters
      : Array.isArray(activePageObj?.characters)
      ? activePageObj.characters
      : []);
  const isHighResLoading = !highResLoaded && Boolean(displayedThumbSrc);
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
      <div className="relative flex-1 flex items-center justify-center p-0 sm:p-2 md:p-4 overflow-hidden touch-pan-y w-full h-full">
        {/* Subtle loading spinner overlay on top of old frozen image during transition */}
        {isTransitioning && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 pointer-events-none animate-fade-in">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-[#121218]/95 border-2 border-[#ffd23f]/70 rounded-full shadow-comic text-xs font-comic text-[#ffd23f] tracking-wider uppercase animate-pulse">
              <RefreshCw className="w-4 h-4 text-[#ffd23f] animate-spin shrink-0" />
              <span>LOADING PAGE {currentPage}…</span>
            </div>
          </div>
        )}

        {/* Initial Loading Spinner ONLY on first boot if no page image is ready yet */}
        {!isPageProcessing && !displayedThumbSrc && !displayedHighResSrc && !isCompleteFailure && isInitialLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#08080a]/80 backdrop-blur-sm z-10">
            <RefreshCw className="w-7 h-7 text-[#ffd23f] animate-spin" />
            <span className="font-comic text-xs tracking-wider text-[#ffd23f]">
              LOADING PAGE {currentPage}…
            </span>
          </div>
        )}

        {/* Processing State with Animated Skeleton & Spinner: ONLY if page is processing AND no image available */}
        {isPageProcessing && !displayedThumbSrc && !displayedHighResSrc && (
          <div className="flex flex-col items-center justify-center gap-4 bg-[#0e0e14] border-2 border-[#1f1f2e] p-8 rounded-2xl shadow-comic max-w-sm w-full text-center">
            <RefreshCw className="w-8 h-8 text-[#ffd23f] animate-spin" />
            <div>
              <h4 className="font-comic text-base text-white tracking-wider uppercase">
                PROCESSING PAGE {currentPage}
              </h4>
              <p className="text-xs text-text-muted mt-1 font-mono">
                Extracting assets & analyzing panels…
              </p>
            </div>
            <div className="w-full bg-[#181824] rounded-full h-2 overflow-hidden border border-[#2b2b3c] mt-2">
              <div className="h-full bg-gradient-to-r from-[#08d9d6] to-[#ffd23f] w-full animate-pulse" />
            </div>
          </div>
        )}

        {/* Non-blocking Floating Background AI Indicator when image is rendering */}
        {isPageProcessing && (displayedThumbSrc || displayedHighResSrc) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#121218]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#ffd23f]/40 shadow-comic text-xs font-mono text-[#ffd23f] pointer-events-none animate-pulse">
            <span className="text-sm">⚡</span>
            <span>AI analyzing page in background...</span>
          </div>
        )}

        {/* Two-Stage Progressive Rendering Container with Zoom & Pan */}
        {!isCompleteFailure && (displayedThumbSrc || displayedHighResSrc) ? (
          <TransformWrapper
            key={`zoom-${comicId}-${displayedPage}`}
            ref={transformComponentRef}
            initialScale={1}
            minScale={1}
            maxScale={4}
            centerOnInit={true}
            centerZoomedOut={true}
            limitToBounds={true}
            smooth={true}
            doubleClick={{
              disabled: false,
              mode: 'toggle',
              step: 0.7,
              animationTime: 250,
            }}
            panning={{
              disabled: !isZoomed,
              velocityDisabled: false,
            }}
            wheel={{
              step: 0.1,
              ...({ smoothStep: 0.005 } as Record<string, unknown>),
              disabled: false,
            }}
            onTransform={handleTransform}
            onInit={handleTransform}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperClass="!w-full !h-full select-none"
                  contentClass={`transition-cursor ${
                    isZoomed
                      ? 'cursor-grab active:cursor-grabbing'
                      : 'cursor-default'
                  }`}
                >
                  <div className="relative inline-block">
                    {/* Stage 1: Low-Resolution Placeholder (renders instantly) */}
                    {displayedThumbSrc && !highResLoaded && (
                      <img
                        key={`thumb-${comicId}-${displayedPage}`}
                        src={displayedThumbSrc}
                        alt={`Page ${displayedPage} Preview`}
                        loading="eager"
                        decoding="async"
                        onLoad={() => {
                          setThumbLoaded(true);
                          requestAnimationFrame(() => {
                            transformComponentRef.current?.centerView(1, 0);
                          });
                        }}
                        onError={handleDirectThumbError}
                        className={`max-h-[calc(100dvh-7.5rem)] md:max-h-[calc(100vh-6.5rem)] w-auto max-w-full object-contain mx-auto block rounded-none sm:rounded-xl border-0 sm:border-2 border-[#15151c] shadow-[0_4px_30px_rgba(0,0,0,0.9)] transition-opacity duration-200 ${
                          thumbLoaded ? 'opacity-90 blur-[0.5px]' : 'opacity-0'
                        }`}
                      />
                    )}

                    {/* Stage 2: High-Resolution Final Image (streams & smoothly overlays on top) */}
                    {displayedHighResSrc && (
                      <img
                        key={`full-${comicId}-${displayedPage}`}
                        src={displayedHighResSrc}
                        alt={`Comic Page ${displayedPage}`}
                        loading="eager"
                        decoding="async"
                        onLoad={() => {
                          setHighResLoaded(true);
                          requestAnimationFrame(() => {
                            transformComponentRef.current?.centerView(1, 0);
                          });
                        }}
                        onError={handleDirectHighResError}
                        className={`max-h-[calc(100dvh-7.5rem)] md:max-h-[calc(100vh-6.5rem)] w-auto max-w-full object-contain mx-auto block rounded-none sm:rounded-xl border-0 sm:border-2 border-[#15151c] shadow-[0_4px_30px_rgba(0,0,0,0.9)] transition-opacity duration-300 ${
                          highResLoaded
                            ? 'opacity-100'
                            : displayedThumbSrc && thumbLoaded
                            ? 'opacity-0 absolute inset-0 m-auto'
                            : 'opacity-100'
                        }`}
                      />
                    )}
                  </div>
                </TransformComponent>

                {/* Subtle high-res background streaming indicator pill */}
                {isHighResLoading && thumbLoaded && !highResLoaded && (
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-[#ffd23f] border border-[#ffd23f]/30 flex items-center gap-1.5 shadow-sm pointer-events-none z-30">
                    <span className="w-2 h-2 rounded-full bg-[#ffd23f] animate-ping" />
                    STREAMING HD QUALITY…
                  </div>
                )}

                <ZoomControls
                  scaleRef={scaleRef}
                  onScaleChangeRef={onScaleChangeRef}
                  zoomIn={zoomIn}
                  zoomOut={zoomOut}
                  resetTransform={resetTransform}
                />
              </>
            )}
          </TransformWrapper>
        ) : isCompleteFailure ? (
          /* Error / OCR Fallback when image cannot be loaded */
          <div className="max-w-xl w-full p-6 bg-[#f3e7cf] text-[#121216] border-2 border-black rounded-2xl shadow-comic text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#121216] text-[#ffd23f] flex items-center justify-center mx-auto shadow-comic-sm">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-comic text-lg text-[#121216] tracking-wide uppercase">
              PAGE {currentPage} · TRANSCRIPT VIEW
            </h3>
            <p className="text-xs text-[#444] leading-relaxed">
              Visual page image could not be loaded. Showing extracted transcript:
            </p>
            <div className="text-left bg-[#ffffff] p-4 rounded-xl border border-black/30 text-xs font-mono text-[#1a1a20] whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed shadow-inner">
              {getPageText(activePageObj) || 'No text extracted for this page.'}
            </div>
          </div>
        ) : null}

        {/* Previous Page navigation button (hidden on mobile & tablet, visible on desktop) */}
        <button
          type="button"
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
          className={`hidden lg:flex items-center justify-center absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/85 text-[#ffd23f] border border-[#ffd23f]/40 shadow-comic-sm transition-opacity cursor-pointer ${
            currentPage <= 1
              ? 'opacity-20 cursor-not-allowed pointer-events-none'
              : 'opacity-50 hover:opacity-100'
          } ${isZoomed ? 'pointer-events-none !opacity-0' : 'pointer-events-auto'}`}
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
        </button>

        {/* Next Page navigation button (hidden on mobile & tablet, visible on desktop) */}
        <button
          type="button"
          onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
          className={`hidden lg:flex items-center justify-center absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/85 text-[#ffd23f] border border-[#ffd23f]/40 shadow-comic-sm transition-opacity cursor-pointer ${
            currentPage >= totalPages
              ? 'opacity-20 cursor-not-allowed pointer-events-none'
              : 'opacity-50 hover:opacity-100'
          } ${isZoomed ? 'pointer-events-none !opacity-0' : 'pointer-events-auto'}`}
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
        </button>
      </div>

      {/* OCR & AI Analysis Backdrop + Drawer Overlay */}
      {isOcrOpen && (
        <>
          {/* Backdrop overlay - click to dismiss */}
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
            onClick={handleCloseOcr}
            aria-hidden="true"
          />

          {/* Bottom Drawer container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ocr-drawer-title"
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[82dvh] sm:max-h-[68vh] bg-[#121217] border-t-2 border-[#28283a] shadow-[0_-8px_32px_rgba(0,0,0,0.85)] rounded-t-2xl overflow-hidden animate-slide-up"
          >
            {/* Grab handle bar */}
            <div className="w-12 h-1 bg-[#2e2e40] rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Pinned Sticky Header - NEVER scrolls away */}
            <header className="sticky top-0 z-10 shrink-0 bg-[#121217] px-4 py-2.5 border-b border-[#20202a] flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-[#ffd23f] shrink-0" />
                <h4
                  id="ocr-drawer-title"
                  className="font-comic text-xs sm:text-sm tracking-wider text-[#ffd23f] uppercase truncate"
                >
                  PAGE {currentPage} · TRANSCRIPTION & VISUAL EXTRACTION
                </h4>
              </div>
              <button
                onClick={handleCloseOcr}
                aria-label="Close Transcript"
                className="text-xs font-mono font-bold text-text-muted hover:text-white px-3 py-1 rounded-lg bg-[#1e1e28] hover:bg-[#282838] border border-[#2b2b38] cursor-pointer transition-colors shrink-0"
              >
                CLOSE
              </button>
            </header>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left">
              {characters.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1.5 font-bold">
                    DETECTED CHARACTERS / FIGURES
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {characters.map((char, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#ffd23f]/15 text-[#ffd23f] border border-[#ffd23f]/30"
                      >
                        {formatCharacterLabel(char)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1.5 font-bold">
                  TRANSCRIPTION & DIALOGUE
                </p>
                <div className="p-3.5 bg-[#f3e7cf] text-[#121216] border-2 border-black rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap shadow-comic-sm">
                  {isPageProcessing
                    ? '⚡ Visual AI analysis is currently processing this page in the background... You can continue reading the visual comic pages while text is indexed.'
                    : (getPageText(activePageObj) || 'No transcription extracted.')}
                </div>
              </div>
            </div>

            {/* Pinned Sticky Footer - user never has to scroll back to top to close! */}
            <footer className="sticky bottom-0 z-10 shrink-0 bg-[#121217] px-4 py-2.5 border-t border-[#20202a] flex items-center justify-between gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.5)]">
              <span className="text-[11px] font-mono text-text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleCloseOcr}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-comic text-xs tracking-wider text-black bg-[#ffd23f] hover:bg-[#e6bd35] border border-black shadow-comic-sm comic-btn-tactile cursor-pointer active:scale-95 transition-all"
              >
                <span>CLOSE TRANSCRIPT</span>
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
