import { useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useConversation } from '../../hooks/useConversation';
import { useChatStore } from '../../stores/chatStore';
import { Spinner } from '../common/Spinner';
import { ChatInput } from './ChatInput';
import { ChatMessageList } from './ChatMessageList';

interface ChatPanelProps {
  comicId: string;
  currentPage?: number;
  onNavigateToPage?: (page: number) => void;
  onClose?: () => void;
  className?: string;
}

export function ChatPanel({
  comicId,
  currentPage,
  onNavigateToPage,
  onClose,
  className = '',
}: ChatPanelProps) {
  const { messages, isLoading, conversationId, initConversation, sendQuestion } =
    useConversation();
  const error = useChatStore((state) => state.error);

  // Initialize or restore conversation when panel mounts / comicId changes
  useEffect(() => {
    if (comicId) {
      initConversation(comicId);
    }
  }, [comicId, initConversation]);

  // Listen for suggestion clicks from ChatMessageList
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text && conversationId) {
        sendQuestion(text, currentPage);
      }
    };
    window.addEventListener('chat:suggestion', handler);
    return () => window.removeEventListener('chat:suggestion', handler);
  }, [conversationId, currentPage, sendQuestion]);

  const isInitializing = !conversationId && !error;

  return (
    <aside
      className={`flex flex-col bg-[#111116] h-full overflow-hidden select-none ${className}`}
      aria-label="Comic Companion Assistant Panel"
    >
      {/* Panel Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b-2 border-[#1a1a22] shrink-0 bg-[#14141a]">
        <div className="w-7 h-7 rounded-lg bg-[#08d9d6]/15 border border-[#08d9d6]/30 flex items-center justify-center shadow-comic-sm">
          <Sparkles className="w-4 h-4 text-[#08d9d6]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-comic text-sm tracking-wider text-white uppercase leading-tight">
            ASK THE COMIC
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#08d9d6] animate-pulse" />
            <p className="text-[10px] font-mono text-text-muted truncate">
              {currentPage ? `Active Page ${currentPage}` : 'Story Companion'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {conversationId && (
            <button
              onClick={() => initConversation(comicId, true)}
              aria-label="Restart Conversation"
              title="Restart Conversation"
              className="p-1.5 rounded-lg text-text-muted hover:text-[#ffd23f] hover:bg-[#1e1e28] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Assistant"
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-[#1e1e28] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation Initializing State */}
      {isInitializing && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Spinner size="md" />
            <p className="font-comic text-xs tracking-wider text-[#ffd23f]">
              INITIALIZING COMIC COMPANION…
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !conversationId && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="p-4 rounded-xl bg-[#2a1215] border border-[#ff2e63]/30">
            <p className="text-xs text-[#ff6b8b] mb-3 leading-relaxed">{error}</p>
            <button
              onClick={() => initConversation(comicId, true)}
              className="text-xs font-comic tracking-wider text-[#ffd23f] hover:underline uppercase"
            >
              RETRY CONNECTION
            </button>
          </div>
        </div>
      )}

      {/* Chat Messages List */}
      {conversationId && (
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          onNavigate={onNavigateToPage}
        />
      )}

      {/* Chat Input */}
      {conversationId && (
        <div className="shrink-0 bg-[#111116]">
          <ChatInput
            onSend={(text) => sendQuestion(text, currentPage)}
            disabled={isLoading}
            placeholder={currentPage ? `Ask about page ${currentPage} or story…` : 'Ask something about this comic…'}
          />
        </div>
      )}
    </aside>
  );
}
