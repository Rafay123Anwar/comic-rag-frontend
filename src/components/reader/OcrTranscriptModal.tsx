import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import type { ComicPage } from '../../types/comic';

/**
 * Format OCR content from structured AI analysis or plain text properties.
 */
export function getPageText(page?: ComicPage): string {
  if (!page) return '';
  const parts: string[] = [];
  const textAnalysis = page.analysis?.text;
  if (textAnalysis?.full_text) {
    parts.push(textAnalysis.full_text.trim());
  } else if (
    Array.isArray(textAnalysis?.dialogue_and_narration) &&
    textAnalysis.dialogue_and_narration.length > 0
  ) {
    const dialogueLines = textAnalysis.dialogue_and_narration.map((item: unknown) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        return String(obj.text || obj.dialogue || obj.content || obj.description || JSON.stringify(item));
      }
      return String(item);
    });
    parts.push(dialogueLines.join('\n\n').trim());
  }

  if (Array.isArray(textAnalysis?.signs_and_labels) && textAnalysis.signs_and_labels.length > 0) {
    const labels = textAnalysis.signs_and_labels.map((s) => `- ${String(s)}`).join('\n');
    parts.push(`SIGNS & LABELS:\n${labels}`);
  }

  if (Array.isArray(textAnalysis?.sound_effects) && textAnalysis.sound_effects.length > 0) {
    const sfx = textAnalysis.sound_effects.map((s) => `*${String(s)}*`).join(', ');
    parts.push(`SFX: ${sfx}`);
  }

  if (page.analysis?.page_summary) {
    parts.push(`SUMMARY:\n${page.analysis.page_summary.trim()}`);
  }

  // Visual description fallback if no text found
  const vis = page.analysis?.visual_description;
  if (parts.length === 0 && vis) {
    const visParts: string[] = [];
    if (vis.environment) visParts.push(`ENVIRONMENT: ${vis.environment}`);
    if (Array.isArray(vis.actions) && vis.actions.length > 0) {
      visParts.push(`ACTIONS:\n${vis.actions.map((a) => `- ${String(a)}`).join('\n')}`);
    }
    if (visParts.length > 0) {
      parts.push(visParts.join('\n\n'));
    }
  }

  // Direct fallback properties on page object
  if (parts.length === 0) {
    if (page.content) parts.push(String(page.content).trim());
    else if (page.summary) parts.push(`SUMMARY:\n${String(page.summary).trim()}`);
    else if (page.description) parts.push(String(page.description).trim());
    else if (typeof page.full_text === 'string' && page.full_text) parts.push(page.full_text.trim());
    else if (typeof page.dialogue === 'string' && page.dialogue) parts.push(page.dialogue.trim());
  }

  return parts.join('\n\n────────────────────\n\n');
}

function formatCharacterLabel(char: unknown): string {
  if (typeof char === 'string') return char;
  if (char && typeof char === 'object') {
    const obj = char as Record<string, unknown>;
    return String(obj.name || obj.character || obj.label || JSON.stringify(char));
  }
  return String(char);
}

export interface OcrTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  page?: ComicPage;
  targetPage?: ComicPage;
  currentPage: number;
  totalPages: number;
  isPageProcessing: boolean;
}

export function OcrTranscriptModal({
  isOpen,
  onClose,
  page,
  targetPage,
  currentPage,
  totalPages,
  isPageProcessing,
}: OcrTranscriptModalProps) {
  // Close OCR modal when Escape key is pressed
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const characters =
    targetPage?.analysis?.visual_description?.characters ||
    page?.analysis?.visual_description?.characters ||
    (Array.isArray(targetPage?.characters)
      ? targetPage.characters
      : Array.isArray(page?.characters)
      ? page.characters
      : []);

  return (
    <>
      {/* Backdrop overlay - click to dismiss */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Drawer container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-drawer-title"
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[82dvh] sm:max-h-[68vh] bg-[#121217] border-t-2 border-[#28283a] shadow-[0_-8px_32px_rgba(0,0,0,0.85)] rounded-t-2xl overflow-hidden animate-slide-up"
      >
        {/* Grab handle bar */}
        <div className="w-12 h-1 bg-[#2e2e40] rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Pinned Sticky Header - NEVER scrolls away */}
        <header className="sticky top-0 z-10 shrink-0 bg-[#121217] px-4 py-2.5 border-b border-[#20202a] flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[#ffd23f] shrink-0" />
            <h4
              id="ocr-drawer-title"
              className="font-comic text-xs sm:text-sm tracking-wider text-[#ffd23f] uppercase truncate"
            >
              PAGE {currentPage} · TRANSCRIPTION & VISUAL EXTRACTION
            </h4>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Transcript"
            className="text-xs font-mono font-bold text-text-muted hover:text-white px-3 py-1 rounded-lg bg-[#1e1e28] hover:bg-[#282838] border border-[#2b2b38] cursor-pointer transition-colors shrink-0"
          >
            CLOSE
          </button>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left">
          {characters.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1.5 font-bold">
                DETECTED CHARACTERS / FIGURES
              </p>
              <div className="flex flex-wrap gap-1.5">
                {characters.map((char, i) => (
                  <span
                    key={i}
                    className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#ffd23f]/15 text-[#ffd23f] border border-[#ffd23f]/30"
                  >
                    {formatCharacterLabel(char)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1.5 font-bold">
              TRANSCRIPTION & DIALOGUE
            </p>
            <div className="p-3.5 bg-[#f3e7cf] text-[#121216] border-2 border-black rounded-xl text-xs font-mono leading-relaxed whitespace-pre-wrap shadow-comic-sm">
              {isPageProcessing
                ? '⚡ Visual AI analysis is currently processing this page in the background... You can continue reading the visual comic pages while text is indexed.'
                : (getPageText(page) || 'No transcription extracted.')}
            </div>
          </div>
        </div>

        {/* Pinned Sticky Footer - user never has to scroll back to top to close! */}
        <footer className="sticky bottom-0 z-10 shrink-0 bg-[#121217] px-4 py-2.5 border-t border-[#20202a] flex items-center justify-between gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.5)]">
          <span className="text-[11px] font-mono text-text-muted">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-comic text-xs tracking-wider text-black bg-[#ffd23f] hover:bg-[#e6bd35] border border-black shadow-comic-sm comic-btn-tactile cursor-pointer active:scale-95 transition-all"
          >
            <span>CLOSE TRANSCRIPT</span>
          </button>
        </footer>
      </div>
    </>
  );
}
