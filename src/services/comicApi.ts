import type {
  ComicDeleteResponse,
  ComicDetailResponse,
  ComicStatusResponse,
  ComicUploadResponse,
  LocalComicEntry,
} from '../types/comic';
import apiClient, { API_BASE_URL, UPLOAD_TIMEOUT } from './api';

/**
 * Fetch processing status and progress for a comic.
 * Calls GET /comics/{comic_id}/status.
 */
export async function getComicStatus(comicId: string, signal?: AbortSignal): Promise<ComicStatusResponse> {
  const response = await apiClient.get<ComicStatusResponse>(`/comics/${comicId}/status`, { signal });
  return response.data;
}

/**
 * Fetch list of all ingested comics from the backend.
 * Calls GET /comics.
 */
export async function getComics(signal?: AbortSignal): Promise<LocalComicEntry[]> {
  const response = await apiClient.get<LocalComicEntry[]>('/comics', { signal });
  return response.data;
}

/**
 * Delete a comic and all associated backend resources.
 * Calls DELETE /comics/{comic_id}.
 */
export async function deleteComic(comicId: string): Promise<ComicDeleteResponse> {
  const response = await apiClient.delete<ComicDeleteResponse>(`/comics/${comicId}`);
  return response.data;
}

/**
 * Upload a comic file to the backend.
 * Uses multipart/form-data with field name "file".
 *
 * A per-request timeout override (UPLOAD_TIMEOUT) is applied here because
 * comic ingestion is a long-running operation: the backend analyzes every
 * page via an AI service and may hit rate-limit retries.
 * This keeps the global apiClient timeout short for all other requests.
 */
export async function uploadComic(
  file: File,
  onUploadProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<ComicUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ComicUploadResponse>('/comics/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Override the default apiClient timeout for this long-running operation.
    timeout: UPLOAD_TIMEOUT,
    signal,
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onUploadProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percent);
      }
    },
  });

  return response.data;
}

/**
 * Fetch full comic metadata and analyzed pages.
 * Calls GET /comics/{comic_id}.
 */
export async function getComic(comicId: string, signal?: AbortSignal): Promise<ComicDetailResponse> {
  const response = await apiClient.get<ComicDetailResponse>(`/comics/${comicId}`, { signal });
  return response.data;
}

/**
 * Returns the URL for fetching the actual comic page image.
 * Calls GET /comics/{comic_id}/pages/{page_number}/image.
 */
export function getPageImageUrl(comicId: string, pageNumber: number): string {
  return `${API_BASE_URL}/comics/${comicId}/pages/${pageNumber}/image`;
}

