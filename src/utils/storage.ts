/**
 * Centralized localStorage utility.
 * All storage keys are defined here to prevent scatter.
 */
import type { LocalComicEntry } from '../types/comic';

const LIBRARY_KEY = 'comic-rag-library';
const CONVERSATION_PREFIX = 'comic-rag-conversation:';

// ─── Library ────────────────────────────────────────────────────────────────

/** Read all locally stored comic entries. */
export function getLibrary(): LocalComicEntry[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Add or update a comic entry in the local library. */
export function saveComicToLibrary(entry: LocalComicEntry): void {
  const library = getLibrary();
  const idx = library.findIndex((c) => c.comic_id === entry.comic_id);
  if (idx >= 0) {
    library[idx] = entry;
  } else {
    library.unshift(entry);
  }
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

/** Update the last_opened_at timestamp for a comic. */
export function touchComicLastOpened(comicId: string): void {
  const library = getLibrary();
  const idx = library.findIndex((c) => c.comic_id === comicId);
  if (idx >= 0) {
    library[idx].last_opened_at = new Date().toISOString();
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  }
}

/** Remove a comic from the local library index. */
export function removeComicFromLibrary(comicId: string): void {
  const library = getLibrary().filter((c) => c.comic_id !== comicId);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

/** Get a single comic by ID from the local library. */
export function getLibraryEntry(comicId: string): LocalComicEntry | undefined {
  return getLibrary().find((c) => c.comic_id === comicId);
}

// ─── Conversation ────────────────────────────────────────────────────────────

/** Retrieve the persisted conversation_id for a comic. */
export function getSavedConversationId(comicId: string): string | null {
  try {
    return localStorage.getItem(`${CONVERSATION_PREFIX}${comicId}`);
  } catch {
    return null;
  }
}

/** Persist a conversation_id for a comic. */
export function saveConversationId(comicId: string, conversationId: string): void {
  localStorage.setItem(`${CONVERSATION_PREFIX}${comicId}`, conversationId);
}

/** Remove the persisted conversation_id for a comic. */
export function clearConversationId(comicId: string): void {
  localStorage.removeItem(`${CONVERSATION_PREFIX}${comicId}`);
}

// ─── UI Preferences ─────────────────────────────────────────────────────────

const AI_PANEL_WIDTH_KEY = 'comic-rag-ai-panel-width';
const SIDEBAR_WIDTH_KEY = 'comic-rag-sidebar-width';

/** Get persisted AI panel width (default: 380, clamped between 320 and 520) */
export function getAIPanelWidth(): number {
  try {
    const raw = localStorage.getItem(AI_PANEL_WIDTH_KEY);
    if (!raw) return 380;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return 380;
    return Math.max(320, Math.min(520, parsed));
  } catch {
    return 380;
  }
}

/** Persist preferred AI panel width */
export function saveAIPanelWidth(width: number): void {
  try {
    const clamped = Math.max(320, Math.min(520, width));
    localStorage.setItem(AI_PANEL_WIDTH_KEY, String(clamped));
  } catch {
    // Ignore storage errors
  }
}

/** Get persisted Sidebar Rail width (default: 180, clamped between 120 and 260) */
export function getSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (!raw) return 180;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return 180;
    return Math.max(120, Math.min(260, parsed));
  } catch {
    return 180;
  }
}

/** Persist preferred Sidebar Rail width */
export function saveSidebarWidth(width: number): void {
  try {
    const clamped = Math.max(120, Math.min(260, width));
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
  } catch {
    // Ignore storage errors
  }
}


