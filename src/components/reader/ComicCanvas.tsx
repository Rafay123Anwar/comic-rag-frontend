import { type RefObject, type MutableRefObject } from 'react';
import { ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import type { ComicPage } from '../../types/comic';
import { ZoomControls } from './ZoomControls';
import { getPageText } from './OcrTranscriptModal';

export interface ComicCanvasProps {
  comicId: string;
  currentPage: number;
  totalPages: number;
  displayedPage: number;
  displayedHighResSrc: string | null;
  displayedThumbSrc: string | null;
  isTransitioning: boolean;
  isInitialLoading: boolean;
  isPageProcessing: boolean;
  isCompleteFailure: boolean;
  highResLoaded: boolean;
  thumbLoaded: boolean;
  isZoomed: boolean;
  scaleRef: RefObject<number>;
  onScaleChangeRef: MutableRefObject<((scale: number) => void) | null>;
  transformComponentRef: RefObject<ReactZoomPanPinchRef | null>;
  activePageObj?: ComicPage;
  onPageChange: (page: number) => void;
  onTransform: (ref: ReactZoomPanPinchRef) => void;
  onThumbLoad: () => void;
  onHighResLoad: () => void;
  onThumbError: () => void;
  onHighResError: () => void;
}

export function ComicCanvas({
  comicId,
  currentPage,
  totalPages,
  displayedPage,
  displayedHighResSrc,
  displayedThumbSrc,
  isTransitioning,
  isInitialLoading,
  isPageProcessing,
  isCompleteFailure,
  highResLoaded,
  thumbLoaded,
  isZoomed,
  scaleRef,
  onScaleChangeRef,
  transformComponentRef,
  activePageObj,
  onPageChange,
  onTransform,
  onThumbLoad,
  onHighResLoad,
  onThumbError,
  onHighResError,
}: ComicCanvasProps) {
  const isHighResLoading = !highResLoaded && Boolean(displayedThumbSrc);

  return (
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
          onTransform={onTransform}
          onInit={onTransform}
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
                      onLoad={onThumbLoad}
                      onError={onThumbError}
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
                      onLoad={onHighResLoad}
                      onError={onHighResError}
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
  );
}
