import { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeHandleProps {
  side: 'left' | 'right';
  currentWidth?: number;
  onResize: (newWidth: number) => void;
  onResizeEnd?: (finalWidth: number) => void;
  minWidth?: number;
  maxWidth?: number;
  ariaLabel?: string;
}

export function ResizeHandle({
  side,
  currentWidth,
  onResize,
  onResizeEnd,
  minWidth = 120,
  maxWidth = 300,
  ariaLabel,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const lastWidthRef = useRef<number>(currentWidth ?? minWidth);

  useEffect(() => {
    if (currentWidth !== undefined) {
      lastWidthRef.current = currentWidth;
    }
  }, [currentWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback((_e: React.TouchEvent) => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      let calculatedWidth: number;

      if (side === 'left') {
        // Resizing left sidebar: width is distance from viewport left edge
        calculatedWidth = e.clientX;
      } else {
        // Resizing right panel: width is distance from viewport right edge
        calculatedWidth = window.innerWidth - e.clientX;
      }

      const clamped = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
      lastWidthRef.current = clamped;
      onResize(clamped);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      let calculatedWidth: number;

      if (side === 'left') {
        calculatedWidth = touch.clientX;
      } else {
        calculatedWidth = window.innerWidth - touch.clientX;
      }

      const clamped = Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
      lastWidthRef.current = clamped;
      onResize(clamped);
    };

    const handleEnd = () => {
      setIsDragging(false);
      onResizeEnd?.(lastWidthRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleEnd);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, side, minWidth, maxWidth, onResize, onResizeEnd]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel || `Resize ${side} panel`}
      tabIndex={0}
      className={`group relative w-2 hover:w-2.5 shrink-0 bg-[#121217] hover:bg-[#ffd23f]/50 active:bg-[#ffd23f] cursor-col-resize transition-all duration-150 z-20 flex items-center justify-center border-x border-[#1e1e26] select-none ${
        isDragging ? 'bg-[#ffd23f] w-2.5 shadow-[0_0_8px_rgba(255,210,63,0.5)]' : ''
      }`}
    >
      {/* Visual Comic Grab Dots */}
      <div className="flex flex-col gap-1 items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
        <span className="w-1 h-1 rounded-full bg-white/70 group-hover:bg-black" />
        <span className="w-1 h-1 rounded-full bg-white/70 group-hover:bg-black" />
        <span className="w-1 h-1 rounded-full bg-white/70 group-hover:bg-black" />
      </div>
    </div>
  );
}
