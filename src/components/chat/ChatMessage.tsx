import { memo } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/api';
import { formatTime } from '../../utils/formatting';
import { SourceList } from '../sources/SourceList';
import { Sparkles, User } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  onNavigate?: (pageNumber: number) => void;
}

const FALLBACK_ANSWER = "I could not find relevant information in the comic.";

export const ChatMessage = memo(function ChatMessage({ message, onNavigate }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isFallback = !isUser && message.content === FALLBACK_ANSWER;

  return (
    <div
      className={`flex flex-col gap-1 animate-fade-in ${isUser ? 'items-end' : 'items-start'}`}
    >
      {/* Role Tag */}
      <div className="flex items-center gap-1.5 px-1">
        {isUser ? (
          <span className="font-comic text-[11px] text-[#08d9d6] uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" />
            YOU
          </span>
        ) : (
          <span className="font-comic text-[11px] text-[#ffd23f] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#ff2e63]" />
            COMIC AI
          </span>
        )}
      </div>

      {/* Message Speech Bubble */}
      <div
        className={`relative max-w-[92%] sm:max-w-[88%] px-4 py-3 text-xs sm:text-sm leading-relaxed transition-all ${
          isUser
            ? 'bg-[#122830] text-[#e8faf9] border-2 border-[#08d9d6]/50 rounded-2xl rounded-tr-none shadow-comic-sm font-medium'
            : isFallback
            ? 'bg-[#282012] border-2 border-[#ffd23f]/50 text-[#ffd23f] rounded-2xl rounded-tl-none shadow-comic-sm font-medium'
            : 'bg-[#f3e7cf] text-[#121216] border-2 border-black rounded-2xl rounded-tl-none shadow-comic font-medium'
        }`}
      >
        {/* Comic Speech Bubble Tail for AI messages */}
        {!isUser && (
          <div
            aria-hidden="true"
            className="absolute top-0 -left-[12px] w-[13px] h-[14px] pointer-events-none overflow-visible"
          >
            <svg
              viewBox="0 0 13 14"
              className="w-full h-full overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 0 L0 0 L13 14 Z"
                fill={isFallback ? '#282012' : '#f3e7cf'}
                stroke={isFallback ? 'rgba(255,210,63,0.5)' : '#000000'}
                strokeWidth="2"
                strokeLinejoin="miter"
              />
              {/* Seamless joint covering internal seam */}
              <line
                x1="12"
                y1="1"
                x2="12"
                y2="13"
                stroke={isFallback ? '#282012' : '#f3e7cf'}
                strokeWidth="3"
              />
            </svg>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words leading-relaxed relative z-10">{message.content}</p>
      </div>

      {/* Sources Citations */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="max-w-[92%] sm:max-w-[88%] w-full pl-1">
          <SourceList sources={message.sources} onNavigate={onNavigate} />
        </div>
      )}

      {/* Timestamp */}
      {message.timestamp && (
        <p className="text-[9px] font-mono text-text-muted px-1 mt-0.5">
          {formatTime(message.timestamp)}
        </p>
      )}
    </div>
  );
});
