import { X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect } from 'react';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right' | 'bottom';
  children: ReactNode;
}

export function MobileDrawer({
  open,
  onClose,
  title,
  side = 'left',
  children,
}: MobileDrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const drawerClasses = {
    left: 'left-0 top-0 h-full w-72 sm:w-80 animate-slide-in-left border-r-2 border-[#20202c]',
    right: 'right-0 top-0 h-full w-72 sm:w-80 animate-slide-in-right border-l-2 border-[#20202c]',
    bottom: 'bottom-0 left-0 right-0 max-h-[85vh] h-[80vh] rounded-t-2xl animate-slide-up border-t-2 border-[#20202c]',
  };

  return (
    <div className="fixed inset-0 z-50 select-none" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer Container */}
      <div
        className={`absolute bg-[#111116] shadow-2xl flex flex-col ${drawerClasses[side]}`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#1a1a22] bg-[#14141a] shrink-0">
            <h2 className="font-comic text-sm text-[#ffd23f] tracking-wider uppercase">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-[#1e1e28] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
