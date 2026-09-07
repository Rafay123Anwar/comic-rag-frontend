/**
 * Formatting utilities for dates, distances, and page numbers.
 */

/** Format an ISO-8601 timestamp as a human-readable relative date. */
export function formatRelativeDate(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Format an ISO-8601 timestamp as a short time string. */
export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Convert a cosine distance score (0–1, lower = more similar) to a
 * visual "relevance" percentage. Labeled as "Relevance" not "confidence".
 */
export function distanceToRelevance(distance: number): number {
  return Math.round(Math.max(0, Math.min(100, (1 - distance) * 100)));
}

/** Format a page number with zero-padding for display in sidebar. */
export function formatPageNumber(page: number): string {
  return String(page).padStart(2, '0');
}

/** Format file size in a human-readable way. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
