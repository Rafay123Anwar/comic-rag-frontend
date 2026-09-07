import { CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useUIStore, type Toast as ToastType } from '../../stores/uiStore';

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useUIStore();

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-[#ffd23f] shrink-0" />,
    error: <XCircle className="w-4 h-4 text-[#ff2e63] shrink-0" />,
    info: <Info className="w-4 h-4 text-[#08d9d6] shrink-0" />,
  };

  const borderColors = {
    success: 'border-[#ffd23f]/50 bg-[#161510]',
    error: 'border-[#ff2e63]/50 bg-[#1a1012]',
    info: 'border-[#08d9d6]/50 bg-[#101718]',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 border-2 ${borderColors[toast.type]} rounded-2xl px-4 py-3 shadow-comic max-w-sm w-full animate-slide-up select-none`}
    >
      {icons[toast.type]}
      <p className="text-xs sm:text-sm text-text-primary flex-1 leading-snug font-medium">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        className="text-text-muted hover:text-white transition-colors ml-1 shrink-0 p-0.5 rounded hover:bg-black/40"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}

/** Hook to fire toasts easily from anywhere */
export function useToast() {
  const { addToast } = useUIStore();
  return {
    success: (message: string) => addToast({ type: 'success', message }),
    error: (message: string) => addToast({ type: 'error', message }),
    info: (message: string) => addToast({ type: 'info', message }),
  };
}
