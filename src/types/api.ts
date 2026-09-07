/**
 * Frontend-only types for UI state, errors, and local chat messages.
 */

import type { SourceItem } from './comic';

/** Standard backend error response */
export interface ApiErrorResponse {
  detail: string;
}

/** Local chat message — includes a frontend-generated id for React keys */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceItem[];
  timestamp?: string;
}

/** Upload progress state */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/** User-facing error */
export interface AppError {
  message: string;
  status?: number;
}
