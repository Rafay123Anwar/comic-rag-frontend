import { useEffect, useRef } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/api';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { MessageCircle, Sparkles } from 'lucide-react';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onNavigate?: (pageNumber: number) => void;
}

const SUGGESTIONS = [
  'Who appears on this page?',
  'What is happening in this scene?',
  'Summarize the story so far.',
  'What was the dialogue about?',
];

export function ChatMessageList({ messages, isLoading, onNavigate }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 bg-[#0d0d12]" aria-live="polite" aria-label="Chat messages">
      {messages.length === 0 && !isLoading ? (
        /* Comic Empty State with Clickable Suggestions */
        <div className="flex flex-col items-center justify-center h-full text-center px-3 py-6 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ffd23f] text-black border-2 border-black flex items-center justify-center shadow-comic">
            <Sparkles className="w-6 h-6 stroke-[2.5]" />
          </div>

          <div>
            <h3 className="font-comic text-lg text-white tracking-wider uppercase">
              ASK THE COMIC
            </h3>
            <p className="text-xs text-text-muted mt-1 max-w-xs leading-relaxed">
              Curious about dialogue, characters, or scenes? Ask anything grounded strictly in the pages.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#ffd23f] font-bold text-left px-1">
              Suggested Queries:
            </span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="flex items-center gap-2.5 text-left text-xs font-medium px-3.5 py-2.5 rounded-xl bg-[#171720] border border-[#262634] text-text-secondary hover:text-white hover:border-[#ffd23f] hover:bg-[#1d1d28] transition-all shadow-sm comic-btn-tactile group"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('chat:suggestion', { detail: s }));
                }}
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#ffd23f] shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
                <span className="truncate">"{s}"</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} onNavigate={onNavigate} />
          ))}
          {isLoading && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant') && (
            <div className="flex items-start">
              <TypingIndicator />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
