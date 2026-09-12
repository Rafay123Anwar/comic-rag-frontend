import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface ZoomControlsProps {
  scaleRef: { current: number };
  onScaleChangeRef: React.MutableRefObject<((scale: number) => void) | null>;
  zoomIn: (step?: number, animationTime?: number) => void | Promise<void>;
  zoomOut: (step?: number, animationTime?: number) => void | Promise<void>;
  resetTransform: (animationTime?: number) => void | Promise<void>;
}

export const ZoomControls = React.memo(function ZoomControls({
  scaleRef,
  onScaleChangeRef,
  zoomIn,
  zoomOut,
  resetTransform,
}: ZoomControlsProps) {
  const [scale, setScale] = useState(scaleRef.current ?? 1);

  useEffect(() => {
    let rafId: number | null = null;
    let pendingScale: number | null = null;

    onScaleChangeRef.current = (newScale: number) => {
      pendingScale = newScale;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (pendingScale !== null) {
            setScale(pendingScale);
          }
        });
      }
    };

    return () => {
      onScaleChangeRef.current = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [onScaleChangeRef]);

  return (
    <div
      className="hidden sm:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-30 items-center gap-1 bg-[#121218]/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-[#20202e] shadow-comic-sm transition-all duration-200 hover:border-[#323246]"
      role="toolbar"
      aria-label="Comic Zoom Controls"
    >
      {/* Zoom Out Button (-) */}
      <button
        type="button"
        onClick={() => zoomOut(0.25, 200)}
        disabled={scale <= 1.01}
        title="Zoom Out (-)"
        aria-label="Zoom Out"
        className="p-1.5 rounded-full text-text-secondary hover:text-white hover:bg-[#22222e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      {/* Current Zoom Percentage / Reset Indicator */}
      <button
        type="button"
        onClick={() => resetTransform(200)}
        title="Click to reset zoom (100%)"
        aria-label="Current zoom level, click to reset"
        className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-text-primary hover:text-[#ffd23f] hover:bg-[#1a1a24] transition-colors select-none min-w-[46px] text-center cursor-pointer"
      >
        {Math.round(scale * 100)}%
      </button>

      {/* Zoom In Button (+) */}
      <button
        type="button"
        onClick={() => zoomIn(0.25, 200)}
        disabled={scale >= 3.99}
        title="Zoom In (+)"
        aria-label="Zoom In"
        className="p-1.5 rounded-full text-text-secondary hover:text-white hover:bg-[#22222e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
          scale > 1.01
            ? 'text-[#ffd23f] hover:text-white hover:bg-[#22222e]'
            : 'text-text-secondary hover:text-white hover:bg-[#22222e]'
        }`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});
