import { BookOpen, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ComicGrid } from '../components/comic/ComicGrid';
import { UploadDropzone } from '../components/comic/UploadDropzone';
import { AppHeader } from '../components/layout/AppHeader';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { deleteComic, getComics, getComicStatus } from '../services/comicApi';
import { useChatStore } from '../stores/chatStore';
import { useComicStore } from '../stores/comicStore';
import { useUIStore } from '../stores/uiStore';
import type { LocalComicEntry } from '../types/comic';
import { getErrorMessage } from '../utils/errors';
import { clearConversationId, removeComicFromLibrary, saveComicToLibrary } from '../utils/storage';

export default function LibraryPage() {
  const { comics, currentComic, setComics, removeComic, reset: resetComic } = useComicStore();
  const { clearChat } = useChatStore();
  const { addToast } = useUIStore();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingComics, setLoadingComics] = useState(true);

  // Load library from backend on mount as the authoritative source of truth
  useEffect(() => {
    let active = true;
    const fetchLibrary = async () => {
      setLoadingComics(true);
      try {
        const backendComics = await getComics();
        if (active) {
          setComics(backendComics);
          // Sync local storage cache
          backendComics.forEach(saveComicToLibrary);
        }
      } catch (err) {
        if (active) {
          addToast({
            type: 'error',
            message: `Could not load library: ${getErrorMessage(err)}`,
          });
        }
      } finally {
        if (active) {
          setLoadingComics(false);
        }
      }
    };

    fetchLibrary();
    return () => {
      active = false;
    };
  }, [setComics, addToast]);

  const comicsRef = useRef(comics);
  comicsRef.current = comics;

  // Poll status for any processing comics with stable interval
  useEffect(() => {
    const hasProcessing = comics.some((c: LocalComicEntry) => c.status === 'processing');
    if (!hasProcessing) return;

    let isPolling = false;
    const interval = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const currentList: LocalComicEntry[] = comicsRef.current;
        const processingItems = currentList.filter((c: LocalComicEntry) => c.status === 'processing');
        if (processingItems.length === 0) {
          clearInterval(interval);
          return;
        }

        let changed = false;
        const updated = await Promise.all(
          currentList.map(async (comic: LocalComicEntry) => {
            if (comic.status !== 'processing') return comic;
            try {
              const statusData = await getComicStatus(comic.comic_id);
              if (
                statusData.status !== comic.status ||
                statusData.analyzed_pages !== comic.analyzed_pages
              ) {
                changed = true;
                return {
                  ...comic,
                  status: statusData.status,
                  total_pages: statusData.total_pages || comic.total_pages,
                  analyzed_pages: statusData.analyzed_pages,
                };
              }
            } catch {
              // ignore transient polling error
            }
            return comic;
          })
        );
        if (changed) {
          setComics(updated);
        }
      } catch {
        // ignore polling error
      } finally {
        isPolling = false;
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [setComics]);

  const filtered = useMemo<LocalComicEntry[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return comics;
    return comics.filter((c) => c.title.toLowerCase().includes(q));
  }, [comics, search]);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const activeDeletesRef = useRef<Set<string>>(new Set());

  const handleDelete = async (comicId: string) => {
    if (!comicId) return;

    // Prevent repeated / duplicate clicks while deletion is in-flight
    if (activeDeletesRef.current.has(comicId)) {
      return;
    }

    activeDeletesRef.current.add(comicId);
    setDeletingIds((prev) => new Set(prev).add(comicId));

    try {
      await deleteComic(comicId);

      // Only update frontend state upon successful backend deletion
      removeComic(comicId);
      removeComicFromLibrary(comicId);
      clearConversationId(comicId);

      if (currentComic?.comic?.id === comicId || currentComic?.comic_id === comicId) {
        resetComic();
        clearChat();
      }

      addToast({
        type: 'success',
        message: 'Comic deleted successfully from backend and library.',
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      addToast({
        type: 'error',
        message: `Failed to delete comic: ${msg}`,
      });
    } finally {
      activeDeletesRef.current.delete(comicId);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(comicId);
        return next;
      });
    }
  };


  return (
    <div className="min-h-screen bg-[#0a0a0d] flex flex-col select-none">
      <AppHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-[#1a1a22]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-comic text-3xl sm:text-4xl text-white tracking-wider uppercase">
                COMIC <span className="text-[#ffd23f]">VAULT</span>
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#171720] text-[#ffd23f] border border-[#282836]">
                {comics.length} {comics.length === 1 ? 'ISSUE' : 'ISSUES'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Your digital collection with AI-powered reading and dialogue search.
            </p>
          </div>

          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#ffd23f] hover:bg-[#e6bd35] text-black font-comic text-sm font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-comic border-2 border-black transition-all comic-btn-tactile shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" aria-hidden="true" />
            <span>ADD NEW ISSUE</span>
          </button>
        </div>

        {/* Search Bar */}
        {comics.length > 0 && (
          <div className="relative mb-8 max-w-md">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search comics by title or series…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search library"
              className="w-full pl-10 pr-4 py-2.5 bg-[#14141c] border-2 border-[#20202c] focus:border-[#ffd23f] rounded-xl text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors shadow-inner"
            />
          </div>
        )}

        {/* Library Content */}
        {loadingComics && comics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="font-comic text-sm tracking-wider text-[#ffd23f] uppercase">
              LOADING COMIC VAULT…
            </p>
          </div>
        ) : comics.length === 0 ? (
          <div className="max-w-lg mx-auto py-8">
            <div className="p-8 bg-[#121218] border-2 border-black rounded-2xl shadow-comic text-center space-y-4">
              <div className="w-16 h-16 bg-[#ffd23f] text-black rounded-2xl flex items-center justify-center mx-auto shadow-comic-sm border-2 border-black">
                <BookOpen className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h2 className="font-comic text-2xl text-white tracking-wider uppercase">
                YOUR VAULT IS EMPTY
              </h2>
              <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                Add your first CBR, CBZ, PDF, or image comic to begin exploring with AI.
              </p>
            </div>

            {/* Direct Upload Dropzone in empty state */}
            <div className="mt-8">
              <UploadDropzone />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-comic text-xl text-text-muted uppercase tracking-wider">
              NO ISSUES FOUND FOR "{search}"
            </p>
          </div>
        ) : (
          <ComicGrid comics={filtered} onDelete={handleDelete} deletingIds={deletingIds} />
        )}
      </main>

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="ADD NEW COMIC ISSUE">
        <UploadDropzone onSuccess={() => setUploadOpen(false)} />
      </Modal>
    </div>
  );
}
