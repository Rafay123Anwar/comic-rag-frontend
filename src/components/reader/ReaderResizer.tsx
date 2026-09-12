import { ResizeHandle } from './ResizeHandle';

interface ReaderResizerProps {
  onResize: (width: number) => void;
  onResizeEnd?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export function ReaderResizer({
  onResize,
  onResizeEnd,
  minWidth = 320,
  maxWidth = 520,
}: ReaderResizerProps) {
  return (
    <ResizeHandle
      side="right"
      currentWidth={380}
      onResize={onResize}
      onResizeEnd={onResizeEnd}
      minWidth={minWidth}
      maxWidth={maxWidth}
      ariaLabel="Resize AI Assistant Panel"
    />
  );
}
