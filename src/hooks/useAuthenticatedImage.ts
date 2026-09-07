import { useEffect, useState } from 'react';
import { getAuthenticatedImageUrl, getCachedImageUrl } from '../services/imageCache';

interface UseAuthenticatedImageOptions {
  isThumbnail?: boolean;
  enabled?: boolean;
}

interface UseAuthenticatedImageResult {
  src: string | null;
  loading: boolean;
  error: boolean;
}

export function useAuthenticatedImage(
  comicId: string | undefined,
  pageNumber: number | undefined,
  options?: UseAuthenticatedImageOptions
): UseAuthenticatedImageResult {
  const isThumbnail = options?.isThumbnail ?? false;
  const enabled = options?.enabled ?? true;

  // Initialize synchronously from memory cache if available
  const initialCached =
    comicId && pageNumber && pageNumber >= 1
      ? getCachedImageUrl(comicId, pageNumber, isThumbnail)
      : null;

  const [src, setSrc] = useState<string | null>(initialCached);
  const [loading, setLoading] = useState<boolean>(enabled && !initialCached);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!comicId || !pageNumber || pageNumber < 1) {
      setSrc(null);
      setLoading(false);
      setError(true);
      return;
    }

    // Check sync cache again on prop changes
    const cached = getCachedImageUrl(comicId, pageNumber, isThumbnail);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      setError(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);

    getAuthenticatedImageUrl(comicId, pageNumber, isThumbnail)
      .then((objectUrl) => {
        if (isMounted) {
          setSrc(objectUrl);
          setLoading(false);
          setError(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSrc(null);
          setLoading(false);
          setError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [comicId, pageNumber, isThumbnail, enabled]);

  return { src, loading, error };
}
