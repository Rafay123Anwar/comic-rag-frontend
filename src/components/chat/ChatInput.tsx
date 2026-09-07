import { ArrowUp } from 'lucide-react';
import { type KeyboardEvent, useRef, useState } from 'react';

const MAX_CHAR_LIMIT = 2000;
const WARNING_THRESHOLD = 1800;

interface ChatInputProps {
  onSend: (question: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask something about this comic…',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = value.length;
  const isNearLimit = charCount >= WARNING_THRESHOLD && charCount < MAX_CHAR_LIMIT;
  const isAtLimit = charCount >= MAX_CHAR_LIMIT;

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="p-3 bg-[#111116] border-t-2 border-[#1a1a22]">
      <div className="flex flex-col gap-1.5 p-2 bg-[#171722] border-2 border-[#262636] focus-within:border-[#ffd23f] rounded-2xl transition-all shadow-inner">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            maxLength={MAX_CHAR_LIMIT}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            aria-label="Chat input"
            aria-describedby="char-counter"
            className="flex-1 resize-none bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none disabled:opacity-40 min-h-[36px] max-h-[120px] overflow-y-auto leading-relaxed"
          />
          {/* Comic Pink Send Button */}
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            aria-label="Send question to comic assistant"
            className="shrink-0 w-8 h-8 flex items-center justify-center bg-[#ff2e63] hover:bg-[#e62453] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-comic-sm border border-black comic-btn-tactile active:scale-90"
          >
            <ArrowUp className="w-4 h-4 stroke-[3]" aria-hidden="true" />
          </button>
        </div>

        {/* Character Counter */}
        <div className="flex justify-end items-center px-2 pt-0.5">
          <span
            id="char-counter"
            aria-live="polite"
            className={`text-[10px] font-mono tracking-wide transition-colors ${
              isAtLimit
                ? 'text-[#ff2e63] font-bold'
                : isNearLimit
                ? 'text-[#ffd23f] font-semibold'
                : 'text-text-muted/60'
            }`}
          >
            {charCount}/{MAX_CHAR_LIMIT}
          </span>
        </div>
      </div>
    </div>
  );
}

