/**
 * Authenticated Image & Thumbnail Cache with Window Prefetching.
 * Fetches comic page images/thumbnails using authenticated Axios client,
 * creates Object URLs, caches them in memory, pre-decodes bitmap buffers,
 * and executes aggressive window prefetching for zero-lag page navigation.
 */
import apiClient from './api';

interface CacheEntry {
  url: string;
  blob: Blob;
  createdAt: number;
}

const imageCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<string>>();

/** Maximum cached images before evicting oldest entries */
const MAX_CACHE_SIZE = 300;

function getCacheKey(comicId: string, pageNumber: number, isThumbnail: boolean): string {
  return `${comicId}:${pageNumber}:${isThumbnail ? 'thumb' : 'full'}`;
}

/**
 * Synchronously checks if a page image or thumbnail is already cached in memory.
 */
export function hasCachedImage(
  comicId: string,
  pageNumber: number,
  isThumbnail: boolean = false
): boolean {
  const key = getCacheKey(comicId, pageNumber, isThumbnail);
  return imageCache.has(key);
}

/**
 * Synchronously returns the cached Object URL if available, or null.
 */
export function getCachedImageUrl(
  comicId: string,
  pageNumber: number,
  isThumbnail: boolean = false
): string | null {
  const key = getCacheKey(comicId, pageNumber, isThumbnail);
  return imageCache.get(key)?.url || null;
}

/**
 * Pre-decodes an image in the browser image pipeline so rendering is instantaneous.
 */
function preloadImageBitmap(url: string): void {
  if (typeof window === 'undefined') return;
  const img = new Image();
  img.src = url;
  if ('decode' in img && typeof img.decode === 'function') {
    img.decode().catch(() => {});
  }
}

/**
 * Fetches a comic page image or lightweight thumbnail as an authenticated Blob and returns an Object URL.
 */
export async function getAuthenticatedImageUrl(
  comicId: string,
  pageNumber: number,
  isThumbnail: boolean = false
): Promise<string> {
  const key = getCacheKey(comicId, pageNumber, isThumbnail);

  // Return cached Object URL if available
  const existing = imageCache.get(key);
  if (existing && existing.url) {
    return existing.url;
  }

  // Deduplicate simultaneous requests for the same image
  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    return inFlight;
  }

  const endpoint = isThumbnail
    ? `/comics/${comicId}/pages/${pageNumber}/thumbnail`
    : `/comics/${comicId}/pages/${pageNumber}/image`;

  const fetchPromise = (async () => {
    try {
      const response = await apiClient.get<Blob>(endpoint, {
        responseType: 'blob',
      });

      const blob = response.data;
      if (!blob || blob.size === 0 || blob.type === 'application/json') {
        throw new Error(`Invalid image response for ${endpoint}`);
      }

      const objectUrl = URL.createObjectURL(blob);

      // Evict oldest if cache exceeded
      if (imageCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = imageCache.keys().next().value;
        if (oldestKey) {
          const oldEntry = imageCache.get(oldestKey);
          if (oldEntry) {
            URL.revokeObjectURL(oldEntry.url);
            imageCache.delete(oldestKey);
          }
        }
      }

      imageCache.set(key, {
        url: objectUrl,
        blob,
        createdAt: Date.now(),
      });

      // Warm up browser raster cache
      preloadImageBitmap(objectUrl);

      return objectUrl;
    } catch (err) {
      imageCache.delete(key);
      throw err;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * Prefetches a single page image into memory cache without throwing errors.
 */
export async function prefetchPage(
  comicId: string,
  pageNumber: number,
  isThumbnail: boolean = false
): Promise<string | null> {
  try {
    return await getAuthenticatedImageUrl(comicId, pageNumber, isThumbnail);
  } catch {
    return null;
  }
}

/**
 * Aggressively prefetches a sliding window of pages around current page (±2-3 pages).
 * Prioritizes low-res thumbnails first, then high-res images in background.
 * Only prefetches pages that are ready/completed (if readyPages filter is provided).
 */
export function prefetchPageWindow(
  comicId: string,
  currentPage: number,
  totalPages: number,
  readyPages?: Set<number> | number[]
): void {
  if (!comicId || totalPages <= 0) return;

  const readySet = readyPages instanceof Set ? readyPages : Array.isArray(readyPages) ? new Set(readyPages) : null;

  // Window offsets: next 3 pages, previous 2 pages
  const targetOffsets = [1, 2, -1, 3, -2];
  const targetPages: number[] = [];

  for (const offset of targetOffsets) {
    const p = currentPage + offset;
    if (p >= 1 && p <= totalPages) {
      if (!readySet || readySet.has(p)) {
        targetPages.push(p);
      }
    }
  }

  // Phase 1: Prefetch low-res thumbnails immediately
  targetPages.forEach((p) => {
    if (!hasCachedImage(comicId, p, true)) {
      prefetchPage(comicId, p, true);
    }
  });

  // Phase 2: Prefetch high-res pages with slight stagger to keep network free for current page
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
      targetPages.forEach((p) => {
        if (!hasCachedImage(comicId, p, false)) {
          prefetchPage(comicId, p, false);
        }
      });
    });
  } else {
    setTimeout(() => {
      targetPages.forEach((p) => {
        if (!hasCachedImage(comicId, p, false)) {
          prefetchPage(comicId, p, false);
        }
      });
    }, 150);
  }
}

/**
 * Revokes all Object URLs for a specific comic or the entire cache.
 */
export function revokeComicImages(comicId?: string): void {
  for (const [key, entry] of imageCache.entries()) {
    if (!comicId || key.startsWith(`${comicId}:`)) {
      URL.revokeObjectURL(entry.url);
      imageCache.delete(key);
    }
  }
}

/**
 * Clear all cached object URLs.
 */
export function clearAllImageCache(): void {
  for (const entry of imageCache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  imageCache.clear();
  inFlightRequests.clear();
}
