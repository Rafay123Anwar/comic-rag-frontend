/**
 * Centralized error handling utilities.
 * Converts raw Axios/network errors into user-friendly messages.
 */
import axios from 'axios';

export interface GetErrorMessageOptions {
  /**
   * Set to true when the error comes from a comic upload request.
   * Produces a more informative timeout message that advises the user to
   * check their library rather than retrying immediately (which could
   * cause duplicate processing).
   */
  isUploadTimeout?: boolean;
}

export function getErrorMessage(error: unknown, options: GetErrorMessageOptions = {}): string {
  if (axios.isAxiosError(error)) {
    // Request was cancelled (e.g. component unmounted, AbortController) — not a server error
    if (axios.isCancel(error)) {
      return 'Upload was cancelled.';
    }

    // No response — network-level failure (connection refused, timeout, CORS block, etc.)
    if (!error.response) {
      const code = (error.code ?? '').toUpperCase();

      // Genuine "backend unreachable" — connection refused before a request was sent
      if (
        code === 'ECONNREFUSED' ||
        code === 'ERR_NETWORK' ||
        code === 'ERR_CONNECTION_REFUSED'
      ) {
        return 'Unable to connect to the Comic RAG server. Is the backend running?';
      }

      // Timeout — the request was sent but no response arrived within the timeout window
      if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
        if (options.isUploadTimeout) {
          // Comic ingestion is long-running; the backend may still be processing.
          // Do NOT suggest retrying immediately — that would create duplicate processing.
          return (
            'Comic analysis is taking longer than expected. ' +
            'The server may still be processing your comic. ' +
            'Please check your library before uploading again.'
          );
        }
        return 'The request timed out. The server may be busy — please try again.';
      }

      // Generic network error (includes CORS blocks, ERR_FAILED, etc.)
      return 'A network error occurred. Please check your connection and try again.';
    }

    const status = error.response.status;
    const detail = error.response.data?.detail;

    const extractDetailString = (rawDetail: unknown): string | null => {
      if (!rawDetail) return null;
      if (typeof rawDetail === 'string') return rawDetail;
      if (Array.isArray(rawDetail)) {
        return rawDetail
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              const obj = item as Record<string, unknown>;
              return obj.msg || obj.description || obj.message || JSON.stringify(item);
            }
            return String(item);
          })
          .filter(Boolean)
          .join(', ');
      }
      if (typeof rawDetail === 'object') {
        const obj = rawDetail as Record<string, unknown>;
        return (obj.msg || obj.description || obj.message || JSON.stringify(rawDetail)) as string;
      }
      return String(rawDetail);
    };

    const detailString = extractDetailString(detail);

    switch (status) {
      case 400:
        return detailString || 'Please check your input and try again.';
      case 404:
        return detailString || 'The requested resource could not be found.';
      case 413:
        return 'The file is too large. Please try a smaller file.';
      case 422:
        return detailString || 'Invalid request. Please check your input.';
      case 500:
        return detailString
          ? `Server error: ${detailString}. Please try again.`
          : 'The server encountered an error while processing your request. Please try again.';
      default:
        return detailString || `An unexpected error occurred (${status}).`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
