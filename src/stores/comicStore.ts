/**
 * Comic store — manages the current comic, library, page selection, and loading state.
 */
import { create } from 'zustand';
import type { ComicDetailResponse, LocalComicEntry } from '../types/comic';

interface ComicState {
  /** Full comic detail fetched from backend */
  currentComic: ComicDetailResponse | null;
  /** Currently viewed page number (1-indexed) */
  currentPage: number;
  /** Local library entries from localStorage */
  comics: LocalComicEntry[];
  /** Loading state for comic fetch */
  loading: boolean;
  /** Error message for comic fetch */
  error: string | null;

  setComic: (comic: ComicDetailResponse | null, resetPage?: boolean) => void;
  updateComicDetails: (comic: ComicDetailResponse) => void;
  setPage: (page: number) => void;
  setComics: (comics: LocalComicEntry[]) => void;
  addComic: (entry: LocalComicEntry) => void;
  removeComic: (comicId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useComicStore = create<ComicState>((set) => ({
  currentComic: null,
  currentPage: 1,
  comics: [],
  loading: false,
  error: null,

  setComic: (comic, resetPage = true) =>
    set((state) => ({
      currentComic: comic
        ? {
            ...comic,
            pages: Array.isArray(comic.pages) ? comic.pages.map((p) => ({ ...p })) : [],
          }
        : null,
      currentPage: resetPage ? 1 : state.currentPage,
      error: comic ? null : state.error,
    })),
  updateComicDetails: (comic) =>
    set((state) => {
      const comicId = comic?.comic?.id || comic?.comic_id;
      const status = comic?.comic?.status || comic?.status;
      const analyzedPages = comic?.comic?.analyzed_pages ?? comic?.analyzed_pages;
      const totalPages = comic?.comic?.total_pages ?? comic?.total_pages;

      let updatedComics = state.comics;
      if (comicId) {
        const idx = state.comics.findIndex((c) => c.comic_id === comicId);
        if (idx >= 0) {
          updatedComics = [...state.comics];
          updatedComics[idx] = {
            ...updatedComics[idx],
            status: status || updatedComics[idx].status,
            analyzed_pages: analyzedPages ?? updatedComics[idx].analyzed_pages,
            total_pages: totalPages ?? updatedComics[idx].total_pages,
          };
        }
      }

      return {
        currentComic: comic
          ? {
              ...comic,
              pages: Array.isArray(comic.pages) ? comic.pages.map((p) => ({ ...p })) : [],
            }
          : null,
        comics: updatedComics,
        error: null,
      };
    }),
  setPage: (page) => set({ currentPage: page }),
  setComics: (comics) => set({ comics }),
  addComic: (entry) =>
    set((state) => {
      const existing = state.comics.findIndex((c) => c.comic_id === entry.comic_id);
      if (existing >= 0) {
        const updated = [...state.comics];
        updated[existing] = entry;
        return { comics: updated };
      }
      return { comics: [entry, ...state.comics] };
    }),
  removeComic: (comicId) =>
    set((state) => ({ comics: state.comics.filter((c) => c.comic_id !== comicId) })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ currentComic: null, currentPage: 1, loading: false, error: null }),
}));
