import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { ChatPanel } from '../components/chat/ChatPanel';
import { MobileDrawer } from '../components/layout/MobileDrawer';
import { Sidebar } from '../components/layout/Sidebar';
import { ComicReader } from '../components/reader/ComicReader';
import { ResizeHandle } from '../components/reader/ResizeHandle';
import { ReaderToolbar } from '../components/reader/ReaderToolbar';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { ErrorState } from '../components/common/ErrorState';
import { Skeleton, SkeletonBlock } from '../components/common/Skeleton';
import { useComic } from '../hooks/useComic';
import { useUIStore } from '../stores/uiStore';
import { getComicId } from '../types/comic';
import { revokeComicImages } from '../services/imageCache';
import {
  getAIPanelWidth,
  saveAIPanelWidth,
  getSidebarWidth,
  saveSidebarWidth,
} from '../utils/storage';

export default function ReaderPage() {
  const { comicId } = useParams<{ comicId: string }>();
  const { comic, currentPage, loading, error, fetchComic, navigateToPage } = useComic();
  const {
    sidebarOpen,
    toggleSidebar,
    mobileChatOpen,
    setMobileChatOpen,
    mobileNavOpen,
    setMobileNavOpen,
  } = useUIStore();

  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => getSidebarWidth());
  const [aiPanelWidth, setAiPanelWidth] = useState<number>(() => getAIPanelWidth());
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);
  const [hasRefreshedExpiredUrls, setHasRefreshedExpiredUrls] = useState(false);

  useEffect(() => {
    if (comicId) {
      setHasRefreshedExpiredUrls(false);
      fetchComic(comicId);
    }
  }, [comicId, fetchComic]);

  // Free cached image blobs when switching comics or unmounting reader
  useEffect(() => {
    return () => {
      if (comicId) {
        revokeComicImages(comicId);
      }
    };
  }, [comicId]);

  useEffect(() => {
    if (error) {
      const errLower = error.toLowerCase();
      if (errLower.includes('401') || errLower.includes('unauthorized') || errLower.includes('session has expired')) {
        localStorage.removeItem('auth_token');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
  }, [error]);

  const handleSignedUrlExpired = useCallback(() => {
    if (comicId && !hasRefreshedExpiredUrls) {
      setHasRefreshedExpiredUrls(true);
      console.log('[IMAGE DELIVERY] Signed URL expired, refreshing comic metadata once...');
      fetchComic(comicId);
    }
  }, [comicId, fetchComic, hasRefreshedExpiredUrls]);

  const handleResizeSidebar = useCallback((width: number) => {
    setSidebarWidth(width);
  }, []);

  const handleResizeSidebarEnd = useCallback((width: number) => {
    saveSidebarWidth(width);
  }, []);

  const handleResizeAI = useCallback((width: number) => {
    setAiPanelWidth(width);
  }, []);

  const handleResizeAIEnd = useCallback((width: number) => {
    saveAIPanelWidth(width);
  }, []);

  const handleSourceNavigate = useCallback(
    (pageNumber: number) => {
      navigateToPage(pageNumber);
      setHighlightedPage(pageNumber);
      // On mobile, close chat drawer so user immediately views the targeted page
      setMobileChatOpen(false);
      setTimeout(() => {
        setHighlightedPage(null);
      }, 2500);
    },
    [navigateToPage, setMobileChatOpen]
  );

  if (!comicId) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#08080a]">
        <ErrorState message="No comic ID specified." />
      </div>
    );
  }

  const currentLoadedId = getComicId(comic);
  const isMatchingComic = comic && currentLoadedId === comicId;
  const isComicLoading = !error && (!isMatchingComic || loading);

  if (isComicLoading) {
    return (
      <div className="h-screen flex flex-col bg-[#08080a]">
        {/* Toolbar Skeleton */}
        <div className="h-13 min-h-[52px] border-b border-[#20202a] bg-[#111116] flex items-center px-4 gap-3">
          <Skeleton className="w-32 h-5 bg-[#1d1d26]" />
          <div className="flex-1" />
          <Skeleton className="w-28 h-7 rounded-lg bg-[#1d1d26]" />
        </div>
        {/* Layout Skeleton */}
        <div className="flex-1 flex overflow-hidden">
          <div className="w-48 border-r border-[#20202a] bg-[#111116] p-4 hidden md:block">
            <SkeletonBlock lines={8} />
          </div>
          <div className="flex-1 p-6 flex items-center justify-center bg-reading-room">
            <div className="w-3/4 h-5/6 rounded-2xl border border-white/5 bg-[#14141c] animate-pulse" />
          </div>
          <div className="w-96 border-l border-[#20202a] bg-[#111116] p-4 hidden lg:block">
            <SkeletonBlock lines={6} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !isMatchingComic) {
    const isAuthError =
      Boolean(error &&
      (error.includes('401') ||
        error.toLowerCase().includes('unauthorized') ||
        error.toLowerCase().includes('session has expired')));

    return (
      <div className="h-screen flex flex-col bg-[#08080a]">
        <div className="h-13 min-h-[52px] border-b border-[#20202a] bg-[#111116] flex items-center px-4">
          <Link
            to={isAuthError ? "/login" : "/library"}
            className="flex items-center gap-1.5 font-comic text-sm text-[#ffd23f] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            {isAuthError ? "GO TO LOGIN" : "BACK TO VAULT"}
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 bg-reading-room">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#13131a] border-2 border-black shadow-comic text-center space-y-4">
            <h2 className="font-comic text-xl text-[#ffd23f] tracking-wider uppercase">
              {isAuthError ? 'SESSION EXPIRED' : error ? 'UNABLE TO LOAD COMIC' : 'COMIC NOT FOUND'}
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              {isAuthError
                ? 'Your session has expired. Please sign in again.'
                : error ?? 'This comic could not be loaded from storage.'}
            </p>
            <Link
              to={isAuthError ? "/login" : "/library"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffd23f] text-black font-comic text-sm rounded-xl shadow-comic-sm hover:bg-[#e6bd35] comic-btn-tactile"
            >
              {isAuthError ? "GO TO LOGIN" : "RETURN TO LIBRARY"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#08080a] overflow-hidden select-none">
      {/* Top Comic Reader Header */}
      <ReaderToolbar
        comic={comic}
        currentPage={currentPage}
        onPrev={() => navigateToPage(currentPage - 1)}
        onNext={() => navigateToPage(currentPage + 1)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => {
          if (window.innerWidth < 768) {
            setMobileNavOpen(!mobileNavOpen);
          } else {
            toggleSidebar();
          }
        }}
        aiOpen={aiPanelOpen}
        onToggleAI={() => {
          if (window.innerWidth < 1024) {
            setMobileChatOpen(!mobileChatOpen);
          } else {
            setAiPanelOpen((v) => !v);
          }
        }}
        ocrOpen={ocrOpen}
        onToggleOcr={() => setOcrOpen((v) => !v)}
      />

      {/* Main 3-Panel Resizable Desktop Experience */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left: Comic Page Rail (Desktop) */}
        {sidebarOpen && (
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="hidden md:flex shrink-0 h-full overflow-hidden"
          >
            <Sidebar
              comic={comic}
              currentPage={currentPage}
              onPageSelect={navigateToPage}
              className="w-full"
              onSignedUrlExpired={handleSignedUrlExpired}
            />
          </div>
        )}

        {/* Resizer Handle between Left Sidebar & Center Reader (Desktop) */}
        {sidebarOpen && (
          <div className="hidden md:flex h-full">
            <ResizeHandle
              side="left"
              currentWidth={sidebarWidth}
              onResize={handleResizeSidebar}
              onResizeEnd={handleResizeSidebarEnd}
              minWidth={120}
              maxWidth={260}
              ariaLabel="Resize Left Page Rail"
            />
          </div>
        )}

        {/* Center: Comic Reading Canvas (Primary Focus) */}
        <main className="flex-1 min-w-0 h-full overflow-hidden relative">
          <ErrorBoundary
            fallbackTitle="Reader Error"
            fallbackMessage="An error occurred while displaying the comic reader."
          >
            <ComicReader
              comic={comic}
              currentPage={currentPage}
              onPageChange={navigateToPage}
              highlightedPage={highlightedPage}
              onSignedUrlExpired={handleSignedUrlExpired}
              ocrOpen={ocrOpen}
              onToggleOcr={() => setOcrOpen((v) => !v)}
            />
          </ErrorBoundary>
        </main>

        {/* Resizer Handle between Center Reader & AI Companion (Desktop) */}
        {aiPanelOpen && (
          <div className="hidden lg:flex h-full">
            <ResizeHandle
              side="right"
              currentWidth={aiPanelWidth}
              onResize={handleResizeAI}
              onResizeEnd={handleResizeAIEnd}
              minWidth={320}
              maxWidth={520}
              ariaLabel="Resize AI Companion Panel"
            />
          </div>
        )}

        {/* Right: AI Companion Panel (Desktop Resizable) */}
        {aiPanelOpen && (
          <div
            style={{ width: `${aiPanelWidth}px` }}
            className="hidden lg:flex shrink-0 h-full border-l-2 border-[#1a1a22]"
          >
            <ErrorBoundary
              fallbackTitle="Companion Error"
              fallbackMessage="Could not load Comic Companion panel."
            >
              <ChatPanel
                comicId={comicId}
                currentPage={currentPage}
                onNavigateToPage={handleSourceNavigate}
                onClose={() => setAiPanelOpen(false)}
                className="w-full"
              />
            </ErrorBoundary>
          </div>
        )}
      </div>

      {/* Mobile Bottom Quick Actions Bar */}
      <div className="md:hidden h-14 bg-[#111116]/95 backdrop-blur-md border-t-2 border-[#1a1a24] flex items-center justify-center gap-2.5 px-3 shrink-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open Comic Pages Rail"
          className="flex-1 max-w-[155px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-comic text-xs tracking-wider text-[#ffd23f] bg-[#181822] hover:bg-[#20202e] border border-[#ffd23f]/30 comic-btn-tactile cursor-pointer shadow-sm active:scale-95 transition-all truncate"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#ffd23f] shrink-0" />
          <span className="truncate">PAGE {currentPage} / {comic.comic?.total_pages || comic.pages?.length || 1}</span>
        </button>

        <button
          onClick={() => setMobileChatOpen(true)}
          aria-label="Ask Comic AI Companion"
          className="flex-1 max-w-[155px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-comic text-xs tracking-wider text-black bg-[#ffd23f] hover:bg-[#e6bd35] border border-black comic-btn-tactile cursor-pointer shadow-comic-sm active:scale-95 transition-all shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#ff2e63] fill-[#ff2e63] shrink-0" />
          <span>ASK COMIC</span>
        </button>
      </div>

      {/* Mobile: Left Page Rail Drawer */}
      <MobileDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title="Comic Pages Rail"
        side="left"
      >
        <Sidebar
          comic={comic}
          currentPage={currentPage}
          onPageSelect={(p) => {
            navigateToPage(p);
            setMobileNavOpen(false);
          }}
          className="w-full h-full border-none"
          onSignedUrlExpired={handleSignedUrlExpired}
        />
      </MobileDrawer>

      {/* Mobile: Bottom-sheet AI Companion Drawer */}
      <MobileDrawer
        open={mobileChatOpen}
        onClose={() => setMobileChatOpen(false)}
        title="Comic AI Companion"
        side="bottom"
      >
        <ChatPanel
          comicId={comicId}
          currentPage={currentPage}
          onNavigateToPage={handleSourceNavigate}
          onClose={() => setMobileChatOpen(false)}
          className="h-full border-none"
        />
      </MobileDrawer>
    </div>
  );
}
