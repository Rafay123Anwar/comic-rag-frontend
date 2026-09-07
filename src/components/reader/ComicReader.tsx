import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
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
import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage';
import { prefetchPageWindow, getCachedImageUrl } from '../../services/imageCache';
import { isDirectImageUrl } from '../../services/api';

interface ComicReaderProps {
  comic: ComicDetailResponse;
  currentPage: number;
  onPageChange: (page: number) => void;
  highlightedPage?: number | null;
  onSignedUrlExpired?: () => void;
}

export function ComicReader({
  comic,
  currentPage,
  onPageChange,
  highlightedPage,
  onSignedUrlExpired,
}: ComicReaderProps) {
  const [showOcrOverlay, setShowOcrOverlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);

  // High-resolution image state
  const [highResLoaded, setHighResLoaded] = useState(false);
  const [directHighResError, setDirectHighResError] = useState(false);

  // Low-resolution preview/thumbnail state
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [directThumbError, setDirectThumbError] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement | null>(null);
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);

  const comicId = getComicId(comic);
  const totalPages = getComicTotalPages(comic);
  const pages = Array.isArray(comic.pages) ? comic.pages : [];
  const activePageObj = pages.find((p) => (p.page_number ?? 1) === currentPage) || pages[0];

  const directHighResUrl = activePageObj?.image_url;
  const directThumbUrl = activePageObj?.thumbnail_url;
  const comicOverallStatus = comic.comic?.status || comic.status;
  const isPageProcessing =
    activePageObj?.status === 'processing' ||
    (comicOverallStatus === 'processing' &&
      activePageObj?.status !== 'success' &&
      activePageObj?.status !== 'completed');

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

  // 2. Reset loading, error, and zoom states on page / URL change
  // If images are already cached (blob: or direct CDN URL), skip the loading flash.
  useEffect(() => {
    const highResAlreadyCached =
      (isDirectImageUrl(directHighResUrl) && !!directHighResUrl) ||
      !!(comicId && getCachedImageUrl(comicId, currentPage, false));
    const thumbAlreadyCached =
      (isDirectImageUrl(directThumbUrl) && !!directThumbUrl) ||
      !!(comicId && getCachedImageUrl(comicId, currentPage, true));

    setHighResLoaded(highResAlreadyCached);
    setDirectHighResError(false);
    setThumbLoaded(thumbAlreadyCached);
    setDirectThumbError(false);
    setCurrentScale(1);
    transformComponentRef.current?.resetTransform();
  }, [comicId, currentPage, directHighResUrl, directThumbUrl]);

  const isDirectHighRes = isDirectImageUrl(directHighResUrl);
  const isDirectThumb = isDirectImageUrl(directThumbUrl);

  // 3. Authenticated Images (enabled if not a direct external CDN URL or if direct loading errored)
  const needFallbackHighRes = !isDirectHighRes || directHighResError;
  const { src: fallbackHighResUrl, loading: fallbackHighResLoading, error: fallbackHighResError } =
    useAuthenticatedImage(comicId, currentPage, {
      isThumbnail: false,
      enabled: needFallbackHighRes,
    });

  const needFallbackThumb = !isDirectThumb || directThumbError;
  const { src: fallbackThumbUrl } = useAuthenticatedImage(comicId, currentPage, {
    isThumbnail: true,
    enabled: needFallbackThumb,
  });

  // Effective Image Sources: use direct CDN URL only if valid and un-errored, otherwise use authenticated blob URL
  const effectiveHighResSrc = (isDirectHighRes && !directHighResError && directHighResUrl) || fallbackHighResUrl;
  const effectiveThumbSrc = (isDirectThumb && !directThumbError && directThumbUrl) || fallbackThumbUrl;

  const handleDirectHighResError = () => {
    setDirectHighResError(true);
    if (onSignedUrlExpired) {
      onSignedUrlExpired();
    }
  };

  const handleDirectThumbError = () => {
    setDirectThumbError(true);
    if (onSignedUrlExpired) {
      onSignedUrlExpired();
    }
  };

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
    activePageObj?.analysis?.visual_description?.characters ||
    (Array.isArray(activePageObj?.characters) ? activePageObj.characters : []);
  const isHighResLoading = !highResLoaded && (needFallbackHighRes ? fallbackHighResLoading : true);
  const isCompleteFailure = !effectiveHighResSrc && !effectiveThumbSrc && fallbackHighResError;

  return (
    <div
      ref={readerContainerRef}
      className={`relative flex-1 flex flex-col bg-[#070709] overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''
      }`}
    >
      {/* Top Floating Mini Bar */}
      <div className="absolute top-3 right-4 z-30 flex items-center gap-2 bg-[#121218]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#20202e] shadow-comic-sm">
        {/* Source citation highlight pulse */}
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
          onClick={() => setShowOcrOverlay((v) => !v)}
          title={showOcrOverlay ? 'Hide Transcript' : 'Inspect OCR & Transcript'}
          aria-label="Toggle OCR text inspection"
          className={`p-1.5 rounded-full transition-colors ${
            showOcrOverlay
              ? 'bg-[#ffd23f] text-black'
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
          className="p-1.5 rounded-full text-text-secondary hover:text-white hover:bg-[#22222e] transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Main Comic Canvas with Progressive Two-Stage Rendering */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Loading Spinner for Ready Pages Still Fetching */}
        {!isPageProcessing && !effectiveThumbSrc && !effectiveHighResSrc && !isCompleteFailure && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#08080a]/80 backdrop-blur-sm z-10">
            <RefreshCw className="w-7 h-7 text-[#ffd23f] animate-spin" />
            <span className="font-comic text-xs tracking-wider text-[#ffd23f]">
              LOADING PAGE {currentPage}…
            </span>
          </div>
        )}

        {/* Processing State with Animated Skeleton & Spinner: ONLY if page is processing AND no image available */}
        {isPageProcessing && !effectiveThumbSrc && !effectiveHighResSrc && (
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
        {isPageProcessing && (effectiveThumbSrc || effectiveHighResSrc) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#121218]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#ffd23f]/40 shadow-comic text-xs font-mono text-[#ffd23f] pointer-events-none animate-pulse">
            <span className="text-sm">⚡</span>
            <span>AI analyzing page in background...</span>
          </div>
        )}

        {/* Two-Stage Progressive Rendering Container with Zoom & Pan */}
        {!isCompleteFailure && (effectiveThumbSrc || effectiveHighResSrc) ? (
          <TransformWrapper
            key={`zoom-${comicId}-${currentPage}`}
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
              disabled: false,
              velocityDisabled: false,
            }}
            wheel={{
              step: 0.1,
              ...({ smoothStep: 0.005 } as Record<string, unknown>),
              disabled: false,
            }}
            onTransform={(ref) => {
              setCurrentScale(ref.state.scale);
            }}
            onInit={(ref) => {
              setCurrentScale(ref.state.scale);
            }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperClass="!w-full !h-full select-none"
                  contentClass={`transition-cursor ${
                    currentScale > 1.05
                      ? 'cursor-grab active:cursor-grabbing'
                      : 'cursor-default'
                  }`}
                >
                  <div className="relative inline-block">
                    {/* Stage 1: Low-Resolution Placeholder (renders instantly) */}
                    {effectiveThumbSrc && !highResLoaded && (
                      <img
                        key={`thumb-${comicId}-${currentPage}`}
                        src={effectiveThumbSrc}
                        alt={`Page ${currentPage} Preview`}
                        loading="eager"
                        decoding="async"
                        onLoad={() => setThumbLoaded(true)}
                        onError={handleDirectThumbError}
                        className={`max-h-[calc(100vh-6.5rem)] w-auto object-contain mx-auto block rounded border-2 border-[#15151c] shadow-[0_10px_35px_rgba(0,0,0,0.95)] transition-opacity duration-200 ${
                          thumbLoaded ? 'opacity-90 blur-[0.5px]' : 'opacity-0'
                        }`}
                      />
                    )}

                    {/* Stage 2: High-Resolution Final Image (streams & smoothly overlays on top) */}
                    {effectiveHighResSrc && (
                      <img
                        key={`full-${comicId}-${currentPage}`}
                        src={effectiveHighResSrc}
                        alt={`Comic Page ${currentPage}`}
                        loading="eager"
                        decoding="async"
                        onLoad={() => {
                          setHighResLoaded(true);
                        }}
                        onError={handleDirectHighResError}
                        className={`max-h-[calc(100vh-6.5rem)] w-auto object-contain mx-auto block rounded border-2 border-[#15151c] shadow-[0_10px_35px_rgba(0,0,0,0.95)] transition-opacity duration-300 ${
                          highResLoaded
                            ? 'opacity-100'
                            : effectiveThumbSrc && thumbLoaded
                            ? 'opacity-0 absolute inset-0 m-auto'
                            : 'opacity-0'
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

                {/* Sleek Floating Zoom & Pan Controls UI */}
                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#121218]/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-[#20202e] shadow-comic-sm transition-all duration-200 hover:border-[#323246]"
                  role="toolbar"
                  aria-label="Comic Zoom Controls"
                >
                  {/* Zoom Out Button (-) */}
                  <button
                    type="button"
                    onClick={() => zoomOut(0.25, 200)}
                    disabled={currentScale <= 1.01}
                    title="Zoom Out (-)"
                    aria-label="Zoom Out"
                    className="p-1.5 rounded-full text-text-secondary hover:text-white hover:bg-[#22222e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  {/* Current Zoom Percentage / Reset Indicator */}
                  <button
                    type="button"
                    onClick={() => resetTransform(200)}
                    title="Click to reset zoom (100%)"
                    aria-label="Current zoom level, click to reset"
                    className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-text-primary hover:text-[#ffd23f] hover:bg-[#1a1a24] transition-colors select-none min-w-[46px] text-center"
                  >
                    {Math.round(currentScale * 100)}%
                  </button>

                  {/* Zoom In Button (+) */}
                  <button
                    type="button"
                    onClick={() => zoomIn(0.25, 200)}
                    disabled={currentScale >= 3.99}
                    title="Zoom In (+)"
                    aria-label="Zoom In"
                    className="p-1.5 rounded-full text-text-secondary hover:text-white hover:bg-[#22222e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-3.5 bg-[#23232e] mx-0.5" />

                  {/* Reset / Fit to Screen Button */}
                  <button
                    type="button"
                    onClick={() => resetTransform(200)}
                    title="Reset / Fit to Screen"
                    aria-label="Reset / Fit to Screen"
                    className={`p-1.5 rounded-full transition-colors ${
                      currentScale > 1.01
                        ? 'text-[#ffd23f] hover:text-white hover:bg-[#22222e]'
                        : 'text-text-secondary hover:text-white hover:bg-[#22222e]'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
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

        {/* Left click navigation zone (active when not zoomed in) */}
        <div
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          role="button"
          tabIndex={-1}
          aria-label="Previous Page click area"
          className={`absolute left-0 top-0 bottom-0 w-1/6 sm:w-1/5 cursor-w-resize z-20 group transition-opacity ${
            currentScale > 1.05 ? 'pointer-events-none opacity-0' : 'pointer-events-auto'
          }`}
        >
          <div className="h-full flex items-center justify-start pl-4 opacity-0 group-hover:opacity-80 transition-opacity">
            {currentPage > 1 && (
              <div className="p-2.5 rounded-full bg-black/85 text-[#ffd23f] border border-[#ffd23f]/40 shadow-comic-sm">
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              </div>
            )}
          </div>
        </div>

        {/* Right click navigation zone (active when not zoomed in) */}
        <div
          onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          role="button"
          tabIndex={-1}
          aria-label="Next Page click area"
          className={`absolute right-0 top-0 bottom-0 w-1/6 sm:w-1/5 cursor-e-resize z-20 group transition-opacity ${
            currentScale > 1.05 ? 'pointer-events-none opacity-0' : 'pointer-events-auto'
          }`}
        >
          <div className="h-full flex items-center justify-end pr-4 opacity-0 group-hover:opacity-80 transition-opacity">
            {currentPage < totalPages && (
              <div className="p-2.5 rounded-full bg-black/85 text-[#ffd23f] border border-[#ffd23f]/40 shadow-comic-sm">
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OCR & AI Analysis Drawer Overlay */}
      {showOcrOverlay && (
        <div className="absolute bottom-0 left-0 right-0 max-h-[55%] bg-[#121217]/95 backdrop-blur-xl border-t-2 border-[#20202e] shadow-2xl z-30 p-5 overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ffd23f]" />
              <h4 className="font-comic text-sm tracking-wider text-[#ffd23f] uppercase">
                PAGE {currentPage} · TRANSCRIPTION & VISUAL EXTRACTION
              </h4>
            </div>
            <button
              onClick={() => setShowOcrOverlay(false)}
              className="text-xs font-mono font-bold text-text-muted hover:text-white px-2.5 py-1 rounded bg-[#1e1e28] border border-[#2b2b38]"
            >
              CLOSE
            </button>
          </div>

          <div className="space-y-4">
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
        </div>
      )}
    </div>
  );
}
