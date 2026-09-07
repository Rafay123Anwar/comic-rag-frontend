/**
 * TypeScript types for Comic API — mirrors backend Pydantic schemas and storage format.
 */

export interface SourceItem {
  comic_id: string;
  page_number: number;
  chunk_id: string;
  chunk_index: number;
  distance: number;
}

export interface QuestionRequest {
  question: string;
  comic_id?: string;
}

export interface QuestionResponse {
  comic_id: string;
  question: string;
  answer: string;
  sources: SourceItem[];
}

export interface ComicUploadResponse {
  message: string;
  comic_id: string;
  filename: string;
  format: string;
  total_pages: number;
  status?: 'processing' | 'completed' | 'failed';
  analyzed_pages?: number;
  successful_pages: number;
  failed_pages: number;
  json_path: string;
  rag_ingested: boolean;
  rag_chunks_stored: number;
  rag_error?: string | null;
}

export interface ComicStatusPageItem {
  page_number: number;
  image_url?: string | null;
  thumbnail_url?: string | null;
  status: string;
  analysis?: ComicPageAnalysis;
}

export interface ComicStatusResponse {
  comic_id: string;
  title: string;
  status: 'processing' | 'completed' | 'failed';
  total_pages: number;
  analyzed_pages: number;
  successful_pages: number;
  failed_pages: number;
  rag_ingested: boolean;
  pages?: ComicStatusPageItem[];
}

export interface ComicMetadata {
  id: string;
  name: string;
  source_format: string;
  total_pages: number;
  status?: 'processing' | 'completed' | 'failed';
  analyzed_pages?: number;
  successful_pages: number;
  failed_pages: number;
}

export interface ComicTextAnalysis {
  full_text?: string;
  dialogue_and_narration?: string[];
  sound_effects?: string[];
  signs_and_labels?: string[];
}

export interface ComicVisualDescription {
  characters?: string[];
  actions?: string[];
  environment?: string;
  objects?: string[];
  background?: string;
  other_details?: string;
}

export interface ComicPageAnalysis {
  page_summary?: string;
  panels_detected?: number;
  text?: ComicTextAnalysis;
  visual_description?: ComicVisualDescription;
}

/** Represents a single analyzed comic page returned from GET /comics/{comic_id} */
export interface ComicPage {
  page_number: number;
  filename?: string;
  image_path?: string;
  thumbnail_url?: string | null;
  image_url?: string | null;
  status: string;
  analysis?: ComicPageAnalysis;
  error?: string;
  // Flat fallback properties
  content?: string;
  description?: string;
  characters?: string[];
  dialogue?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface ComicContent {
  full_text?: string;
}

/** Full comic detail returned from GET /comics/{comic_id} */
export interface ComicDetailResponse {
  comic?: ComicMetadata;
  comic_content?: ComicContent;
  pages: ComicPage[];
  // Flat fallback properties
  comic_id?: string;
  comic_name?: string;
  source_format?: string;
  total_pages?: number;
  status?: 'processing' | 'completed' | 'failed';
  analyzed_pages?: number;
  successful_pages?: number;
  failed_pages?: number;
  [key: string]: unknown;
}

/** Comic entry returned from GET /comics */
export interface LocalComicEntry {
  comic_id: string;
  title: string;
  total_pages: number;
  status?: 'processing' | 'completed' | 'failed';
  analyzed_pages?: number;
  source_format: string;
  uploaded_at: string;
  last_opened_at?: string;
  cover_thumbnail_url?: string | null;
}

export type ComicListItem = LocalComicEntry;

export interface ComicDeleteResponse {
  message: string;
  comic_id: string;
}

// ─── Helper Functions for Safe Property Access ──────────────────────────────

export function getComicName(comic: ComicDetailResponse | null | undefined): string {
  return comic?.comic?.name || comic?.comic_name || 'Untitled Comic';
}

export function getComicFormat(comic: ComicDetailResponse | null | undefined): string {
  return comic?.comic?.source_format || comic?.source_format || 'cbr';
}

export function getComicTotalPages(comic: ComicDetailResponse | null | undefined): number {
  return comic?.comic?.total_pages ?? comic?.total_pages ?? comic?.pages?.length ?? 1;
}

export function getComicId(comic: ComicDetailResponse | null | undefined): string {
  return comic?.comic?.id || comic?.comic_id || '';
}

export function getComicStatus(comic: ComicDetailResponse | null | undefined): 'processing' | 'completed' | 'failed' {
  return comic?.comic?.status || comic?.status || 'completed';
}

export function getComicAnalyzedPages(comic: ComicDetailResponse | null | undefined): number {
  if (comic?.comic?.analyzed_pages !== undefined) return comic.comic.analyzed_pages;
  if (comic?.analyzed_pages !== undefined) return comic.analyzed_pages;
  if (Array.isArray(comic?.pages)) {
    return comic.pages.filter((p) => p.status === 'success' || p.status === 'error').length;
  }
  return 0;
}
