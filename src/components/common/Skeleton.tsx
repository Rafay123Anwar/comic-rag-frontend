import type { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-base-elevated animate-pulse rounded ${className}`}
      aria-hidden="true"
    />
  );
}

interface SkeletonBlockProps {
  lines?: number;
  className?: string;
}

export function SkeletonBlock({ lines = 3, className = '' }: SkeletonBlockProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  children?: ReactNode;
  className?: string;
}

export function SkeletonCard({ children, className = '' }: SkeletonCardProps) {
  return (
    <div className={`bg-base-surface border border-base-border rounded-xl p-4 ${className}`}>
      {children ?? <SkeletonBlock />}
    </div>
  );
}
