import { useEffect, type RefObject } from 'react';

export interface UseReaderGesturesOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  scaleRef: RefObject<number>;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Handles reader touch swipe navigation and keyboard hotkeys.
 * - Single-finger horizontal swipe on container (disabled when zoomed in).
 * - Keyboard navigation (ArrowLeft/KeyA, ArrowRight/KeyD, Home, End).
 */
export function useReaderGestures({
  containerRef,
  scaleRef,
  currentPage,
  totalPages,
  onPageChange,
}: UseReaderGesturesOptions): void {
  // Single authoritative mobile touch swipe listener on container
  useEffect(() => {
    const container = containerRef.current;
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
  }, [containerRef, scaleRef, currentPage, totalPages, onPageChange]);

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
}
