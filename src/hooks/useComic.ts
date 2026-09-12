/**
 * useComic — hook for fetching and managing the current comic.
 */
import { useCallback, useEffect, useRef } from 'react';
import { getComic, getComicStatus } from '../services/comicApi';
import { useComicStore } from '../stores/comicStore';
import { getComicId, getComicTotalPages } from '../types/comic';
import type { ComicDetailResponse, ComicPage } from '../types/comic';
import { getErrorMessage } from '../utils/errors';
import { touchComicLastOpened } from '../utils/storage';

export function useComic() {
  const currentComic = useComicStore((state) => state.currentComic);
  const currentPage = useComicStore((state) => state.currentPage);
  const loading = useComicStore((state) => state.loading);
  const error = useComicStore((state) => state.error);
  const setComic = useComicStore((state) => state.setComic);
  const setPage = useComicStore((state) => state.setPage);
  const setLoading = useComicStore((state) => state.setLoading);
  const setError = useComicStore((state) => state.setError);

  const activeComicIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchComic = useCallback(
    async (comicId: string) => {
      if (!comicId) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeComicIdRef.current = comicId;

      setLoading(true);
      setError(null);

      try {
        const comic = await getComic(comicId, controller.signal);
        if (activeComicIdRef.current !== comicId || controller.signal.aborted) {
          return;
        }
        setComic(comic);
        touchComicLastOpened(comicId);
      } catch (err: unknown) {
        if (controller.signal.aborted || (err as { name?: string })?.name === 'CanceledError') {
          return;
        }
        if (activeComicIdRef.current !== comicId) {
          return;
        }
        setComic(null);
        setError(getErrorMessage(err));
      } finally {
        if (activeComicIdRef.current === comicId) {
          setLoading(false);
        }
      }
    },
    [setComic, setError, setLoading]
  );

  // Poll for status updates if the currently loaded comic is still processing
  const currentComicId = getComicId(currentComic);

  useEffect(() => {
    if (!currentComicId) return;

    let isCancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isFetchingUpdate = false;

    const checkAndPoll = async () => {
      if (isCancelled) return;

      const stateComic = useComicStore.getState().currentComic;
      if (!stateComic || getComicId(stateComic) !== currentComicId) return;

      const isProcessing =
        stateComic.comic?.status === 'processing' ||
        stateComic.status === 'processing' ||
        (Array.isArray(stateComic.pages) &&
          stateComic.pages.some((p) => p.status === 'processing'));

      // If already finished processing, stop polling loop
      if (!isProcessing) return;

      if (isFetchingUpdate) return;
      isFetchingUpdate = true;

      let shouldContinuePolling = true;

      try {
        const statusData = await getComicStatus(currentComicId);
        if (isCancelled) return;

        const latestStateComic = useComicStore.getState().currentComic;
        if (!latestStateComic || getComicId(latestStateComic) !== currentComicId) return;

        const currentAnalyzed =
          latestStateComic.comic?.analyzed_pages ?? latestStateComic.analyzed_pages ?? 0;
        const currentStatus =
          latestStateComic.comic?.status ?? latestStateComic.status ?? 'processing';
        const currentSuccessful =
          latestStateComic.comic?.successful_pages ?? latestStateComic.successful_pages ?? 0;
        const currentFailed =
          latestStateComic.comic?.failed_pages ?? latestStateComic.failed_pages ?? 0;

        const existingPages = Array.isArray(latestStateComic.pages) ? latestStateComic.pages : [];

        // Check if overall comic metadata changed
        const statusProgressed =
          statusData.analyzed_pages !== currentAnalyzed ||
          statusData.status !== currentStatus ||
          statusData.successful_pages !== currentSuccessful ||
          statusData.failed_pages !== currentFailed;

        // Check if any individual page actually transitioned
        let pageDataChanged = false;
        const statusPages = Array.isArray(statusData.pages) ? statusData.pages : [];

        if (statusPages.length > 0) {
          if (existingPages.length !== statusPages.length) {
            pageDataChanged = true;
          } else {
            const statusMap = new Map(statusPages.map((p) => [p.page_number, p]));
            for (const page of existingPages) {
              const sp = statusMap.get(page.page_number);
              if (sp) {
                // Check if thumbnail_url transitioned from null/empty to string
                if (!page.thumbnail_url && sp.thumbnail_url) {
                  pageDataChanged = true;
                  break;
                }
                // Check if image_url transitioned from null/empty to string
                if (!page.image_url && sp.image_url) {
                  pageDataChanged = true;
                  break;
                }
                // Check if page status changed
                if (sp.status && sp.status !== page.status) {
                  pageDataChanged = true;
                  break;
                }
                // Check if page analysis arrived or updated
                const pageHasText = Boolean(page.analysis?.text?.full_text || page.analysis?.page_summary);
                const spHasText = Boolean(sp.analysis?.text?.full_text || sp.analysis?.page_summary);
                if (sp.analysis && (!pageHasText && spHasText)) {
                  pageDataChanged = true;
                  break;
                }
              }
            }
          }
        }

        // ONLY merge into store if something ACTUALLY changed
        if (statusProgressed || pageDataChanged) {
          const statusMap = new Map(statusPages.map((p) => [p.page_number, p]));

          const basePages: ComicPage[] = existingPages.length > 0
            ? existingPages
            : statusPages.map((sp) => ({
                page_number: sp.page_number,
                image_url: sp.image_url ?? null,
                thumbnail_url: sp.thumbnail_url ?? null,
                status: sp.status || 'processing',
                analysis: sp.analysis,
              }));

          const mergedPages: ComicPage[] = basePages.map((page) => {
            const sp = statusMap.get(page.page_number);
            if (!sp) return page;

            const newImgUrl = sp.image_url || page.image_url || null;
            const newThumbUrl = sp.thumbnail_url || page.thumbnail_url || null;
            const newStatus = sp.status || page.status || 'processing';
            const newAnalysis = sp.analysis || page.analysis;

            // Preserve exact object reference if unchanged
            if (
              newImgUrl === page.image_url &&
              newThumbUrl === page.thumbnail_url &&
              newStatus === page.status &&
              newAnalysis === page.analysis
            ) {
              return page;
            }

            return {
              ...page,
              image_url: newImgUrl,
              thumbnail_url: newThumbUrl,
              status: newStatus,
              analysis: newAnalysis,
            };
          });

          // Append any new pages from status that weren't present
          const existingNums = new Set(mergedPages.map((p) => p.page_number));
          for (const sp of statusPages) {
            if (!existingNums.has(sp.page_number)) {
              mergedPages.push({
                page_number: sp.page_number,
                thumbnail_url: sp.thumbnail_url || null,
                image_url: sp.image_url || null,
                status: sp.status || 'processing',
                analysis: sp.analysis,
              });
            }
          }
          mergedPages.sort((a, b) => a.page_number - b.page_number);

          const freshComic: ComicDetailResponse = {
            ...latestStateComic,
            comic: latestStateComic.comic
              ? {
                  ...latestStateComic.comic,
                  status: statusData.status,
                  analyzed_pages: statusData.analyzed_pages,
                  successful_pages: statusData.successful_pages,
                  failed_pages: statusData.failed_pages,
                }
              : undefined,
            status: statusData.status,
            analyzed_pages: statusData.analyzed_pages,
            successful_pages: statusData.successful_pages,
            failed_pages: statusData.failed_pages,
            pages: mergedPages,
          };

          useComicStore.getState().setComic(freshComic, false);
          useComicStore.getState().updateComicDetails(freshComic);
        }

        // If status completed, fetch the final full comic ONCE and stop polling
        if (statusData.status === 'completed') {
          shouldContinuePolling = false;
          try {
            const fullUpdatedComic = await getComic(currentComicId);
            if (!isCancelled && fullUpdatedComic) {
              useComicStore.getState().setComic(fullUpdatedComic, false);
              useComicStore.getState().updateComicDetails(fullUpdatedComic);
            }
          } catch (err) {
            console.warn(`[useComic] Error fetching final comic on completion:`, err);
          }
        } else if (statusData.status === 'failed') {
          shouldContinuePolling = false;
        }
      } catch (pollErr) {
        console.warn(`[Reader Polling] Error polling status for ${currentComicId}:`, pollErr);
      } finally {
        isFetchingUpdate = false;
        // Schedule next poll ONLY after previous request has completely finished and if still processing
        if (!isCancelled && shouldContinuePolling) {
          const checkState = useComicStore.getState().currentComic;
          const stillProcessing =
            checkState &&
            (checkState.comic?.status === 'processing' ||
              checkState.status === 'processing' ||
              (Array.isArray(checkState.pages) &&
                checkState.pages.some((p) => p.status === 'processing')));

          if (stillProcessing) {
            timerId = setTimeout(checkAndPoll, 2500);
          }
        }
      }
    };

    // Safe initial check after 2500ms
    timerId = setTimeout(checkAndPoll, 2500);

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [currentComicId]);

  const navigateToPage = useCallback(
    (page: number) => {
      const total = getComicTotalPages(currentComic);
      const clamped = Math.max(1, Math.min(page, total));
      setPage(clamped);
    },
    [currentComic, setPage]
  );

  return {
    comic: currentComic,
    currentPage,
    loading,
    error,
    fetchComic,
    navigateToPage,
  };
}
