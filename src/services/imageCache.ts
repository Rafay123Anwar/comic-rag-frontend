/**
 * Authenticated Image & Thumbnail Cache with Window Prefetching.
 * Fetches comic page images/thumbnails using authenticated Axios client,
 * creates Object URLs, caches them in memory, pre-decodes bitmap buffers,
 * and executes aggressive window prefetching for zero-lag page navigation.
 */
import apiClient, { isDirectImageUrl } from './api';
import type { ComicPage } from '../types/comic';

interface CacheEntry {
  url: string;
  blob?: Blob;
  createdAt: number;
}

const imageCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<string>>();

/** Maximum cached images before evicting oldest entries */
const MAX_CACHE_SIZE = 25;

/**
 * Evicts the oldest entry in the LRU cache and revokes its Object URL to free RAM.
 */
function evictOldest(): void {
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) {
      const oldEntry = imageCache.get(oldestKey);
      if (oldEntry) {
        if (oldEntry.url.startsWith('blob:')) {
          URL.revokeObjectURL(oldEntry.url);
        }
        imageCache.delete(oldestKey);
      }
    }
  }
}

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
 * Resolves when decoded, or rejects on error/abort.
 */
function preloadImageBitmap(url: string, signal?: AbortSignal): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const img = new Image();

    const onAbort = () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      cleanup();
      if ('decode' in img && typeof img.decode === 'function') {
        img.decode().then(resolve).catch(() => resolve());
      } else {
        resolve();
      }
      return;
    }

    img.onload = () => {
      cleanup();
      if ('decode' in img && typeof img.decode === 'function') {
        img.decode().then(resolve).catch(() => resolve());
      } else {
        resolve();
      }
    };

    img.onerror = (err) => {
      cleanup();
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Fetches a comic page image or lightweight thumbnail as an authenticated Blob and returns an Object URL.
 */
export async function getAuthenticatedImageUrl(
  comicId: string,
  pageNumber: number,
  isThumbnail: boolean = false,
  signal?: AbortSignal
): Promise<string> {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const key = getCacheKey(comicId, pageNumber, isThumbnail);

  // Return cached Object URL if available
  const existing = imageCache.get(key);
  if (existing && existing.url) {
    return existing.url;
  }

  // Deduplicate simultaneous requests for the same image
  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    if (!signal) return inFlight;
    return new Promise<string>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
      signal.addEventListener('abort', onAbort, { once: true });

      inFlight
        .then((url) => {
          signal.removeEventListener('abort', onAbort);
          resolve(url);
        })
        .catch((err) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        });
    });
  }

  const endpoint = isThumbnail
    ? `/api/comics/${comicId}/pages/${pageNumber}/thumbnail`
    : `/api/comics/${comicId}/pages/${pageNumber}/image`;

  const fetchPromise = (async () => {
    try {
      const response = await apiClient.get<Blob>(endpoint, {
        responseType: 'blob',
        signal,
      });

      const blob = response.data;
      if (!blob || blob.size === 0 || blob.type === 'application/json') {
        throw new Error(`Invalid image response for ${endpoint}`);
      }

      const objectUrl = URL.createObjectURL(blob);

      // Evict oldest if cache exceeded and revoke its blob URL
      evictOldest();

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
      inFlightRequests.delete(key);
      throw err;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise);

  if (signal) {
    signal.addEventListener('abort', () => inFlightRequests.delete(key), { once: true });
  }

  return fetchPromise;
}

/**
 * Prefetches a single page image into memory cache without throwing errors.
 * If direct CDN URL is available, warms browser HTTP/raster cache directly.
 * Falls back to authenticated backend endpoint if direct CDN URL is absent or fails.
 */
export async function prefetchPage(
  comicId: string,
  pageNumber: number,
  isThumbnail: boolean = false,
  directUrlOrSignal?: string | null | AbortSignal,
  signal?: AbortSignal
): Promise<string | null> {
  const directUrl = typeof directUrlOrSignal === 'string' ? directUrlOrSignal : null;
  const activeSignal = directUrlOrSignal instanceof AbortSignal ? directUrlOrSignal : signal;

  const key = getCacheKey(comicId, pageNumber, isThumbnail);

  // 1. Return cached URL if already in memory cache
  const existing = imageCache.get(key);
  if (existing?.url) {
    return existing.url;
  }

  // 2. Direct Cloudinary CDN preload
  if (directUrl && isDirectImageUrl(directUrl)) {
    const inFlight = inFlightRequests.get(key);
    if (inFlight) {
      try {
        return await inFlight;
      } catch {
        return null;
      }
    }

    const preloadPromise = (async () => {
      try {
        await preloadImageBitmap(directUrl, activeSignal);
        evictOldest();
        imageCache.set(key, {
          url: directUrl,
          createdAt: Date.now(),
        });
        return directUrl;
      } catch (err) {
        if (activeSignal?.aborted) throw err;
        // Direct CDN preload failed: try authenticated backend fallback
        return await getAuthenticatedImageUrl(comicId, pageNumber, isThumbnail, activeSignal);
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, preloadPromise);
    try {
      return await preloadPromise;
    } catch {
      return null;
    }
  }

  // 3. Authenticated backend fallback
  try {
    return await getAuthenticatedImageUrl(comicId, pageNumber, isThumbnail, activeSignal);
  } catch {
    return null;
  }
}

/**
 * Aggressively prefetches a sliding window of pages around current page (±2-3 pages).
 * Prioritizes low-res thumbnails first, then high-res images in background.
 * Uses direct Cloudinary CDN URLs from page objects when available to avoid backend 307 redirects.
 * Only prefetches pages that are ready/completed (if readyPages filter is provided).
 */
export function prefetchPageWindow(
  comicId: string,
  currentPage: number,
  totalPages: number,
  readyPages?: Set<number> | number[],
  pages?: ComicPage[]
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

  // Fast O(1) page lookup map
  const pageMap = pages ? new Map(pages.map((p) => [p.page_number ?? 1, p])) : null;

  // Phase 1: Prefetch low-res thumbnails immediately (~55KB each, direct CDN)
  targetPages.forEach((p) => {
    if (!hasCachedImage(comicId, p, true)) {
      const pageObj = pageMap?.get(p);
      prefetchPage(comicId, p, true, pageObj?.thumbnail_url);
    }
  });

  // Phase 2: Prefetch high-res pages with slight stagger to keep network free for current page
  const prefetchHighRes = () => {
    targetPages.forEach((p) => {
      if (!hasCachedImage(comicId, p, false)) {
        const pageObj = pageMap?.get(p);
        prefetchPage(comicId, p, false, pageObj?.image_url);
      }
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(prefetchHighRes);
  } else {
    setTimeout(prefetchHighRes, 150);
  }
}

/**
 * Revokes all Object URLs for a specific comic or the entire cache.
 */
export function revokeComicImages(comicId?: string): void {
  for (const [key, entry] of imageCache.entries()) {
    if (!comicId || key.startsWith(`${comicId}:`)) {
      if (entry.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
      imageCache.delete(key);
    }
  }
}

/**
 * Clear all cached object URLs.
 */
export function clearAllImageCache(): void {
  for (const entry of imageCache.values()) {
    if (entry.url.startsWith('blob:')) {
      URL.revokeObjectURL(entry.url);
    }
  }
  imageCache.clear();
  inFlightRequests.clear();
}
