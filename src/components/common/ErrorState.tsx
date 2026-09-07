import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <AlertCircle className="w-8 h-8 text-red-400 mb-4 opacity-70" aria-hidden="true" />
      <h3 className="text-base font-semibold text-text-secondary mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
