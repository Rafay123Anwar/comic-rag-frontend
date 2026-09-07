import { Sparkles } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#f3e7cf] text-[#121216] border-2 border-black rounded-2xl rounded-bl-sm shadow-comic animate-pulse">
      <Sparkles className="w-3.5 h-3.5 text-[#ff2e63] animate-spin" />
      <span className="font-comic text-xs tracking-wider uppercase text-[#121216]">
        SCANNING THE PANELS…
      </span>
      <div className="flex items-center gap-1 ml-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#121216] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[#121216] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[#121216] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
