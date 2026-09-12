/**
 * Conversation API service.
 * Wraps POST /conversations, GET /conversations/{id},
 * DELETE /conversations/{id}, and POST /conversations/{id}/ask.
 */
import type {
  ConversationDetailResponse,
  ConversationQuestionResponse,
  ConversationResponse,
} from '../types/conversation';
import { clearStoredToken, getStoredToken } from '../utils/token';
import apiClient, { API_BASE_URL } from './api';

/**
 * Fetch or initialize the persistent conversation session for a comic.
 * Calls GET /comics/{comic_id}/conversation.
 */
export async function getComicConversation(
  comicId: string,
  signal?: AbortSignal
): Promise<ConversationDetailResponse> {
  const response = await apiClient.get<ConversationDetailResponse>(
    `/api/comics/${comicId}/conversation`,
    { signal }
  );
  return response.data;
}

/** Create a new conversation tied to a comic. */
export async function createConversation(
  comicId: string,
  signal?: AbortSignal
): Promise<ConversationResponse> {
  const response = await apiClient.post<ConversationResponse>(
    '/conversations',
    { comic_id: comicId },
    { signal }
  );
  return response.data;
}

/**
 * Fetch an existing conversation including message history.
 * Returns null if the conversation does not exist (404).
 */
export async function getConversation(
  conversationId: string,
  signal?: AbortSignal
): Promise<ConversationDetailResponse | null> {
  try {
    const response = await apiClient.get<ConversationDetailResponse>(
      `/conversations/${conversationId}`,
      { signal }
    );
    return response.data;
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    throw err;
  }
}

/** Delete a conversation. */
export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/conversations/${conversationId}`);
}

export async function askInConversation(
  conversationId: string,
  question: string,
  currentPage?: number,
  signal?: AbortSignal
): Promise<ConversationQuestionResponse> {
  // Use streaming under the hood and collect response to avoid buffered Axios post
  const res = await askInConversationStream(
    conversationId,
    question,
    currentPage,
    undefined,
    undefined,
    undefined,
    signal
  );
  return {
    conversation_id: conversationId,
    comic_id: '',
    question,
    answer: res.answer,
    sources: res.sources,
  };
}

export async function askInConversationStream(
  conversationId: string,
  question: string,
  currentPage?: number,
  onToken?: (token: string) => void,
  onSources?: (sources: ConversationQuestionResponse['sources']) => void,
  onDone?: (answer: string, sources: ConversationQuestionResponse['sources']) => void,
  signal?: AbortSignal
): Promise<{ answer: string; sources: ConversationQuestionResponse['sources'] }> {
  const baseURL = API_BASE_URL;
  const payload: { question: string; current_page?: number } = { question };
  if (typeof currentPage === 'number' && currentPage > 0) {
    payload.current_page = currentPage;
  }

  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Native fetch API with streaming response body
  const response = await fetch(`${baseURL}/conversations/${conversationId}/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.detail || '';
    } catch {
      errorDetail = await response.text().catch(() => '');
    }
    if (response.status === 401) {
      clearStoredToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
      throw new Error('Your session has expired. Please sign in again.');
    }
    throw new Error(errorDetail || `Streaming request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('ReadableStream not supported in this browser.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullAnswer = '';
  let finalSources: ConversationQuestionResponse['sources'] = [];
  // Scoped OUTSIDE the while loop so chunk boundaries across packets never lose event context
  let currentEvent = 'message';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          // SSE event boundary: reset event to default
          currentEvent = 'message';
          continue;
        }

        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (currentEvent === 'token' && typeof parsed.token === 'string') {
              fullAnswer += parsed.token;
              onToken?.(parsed.token);
            } else if (currentEvent === 'sources' && parsed.sources) {
              finalSources = parsed.sources;
              onSources?.(parsed.sources);
            } else if (currentEvent === 'done') {
              if (parsed.answer) fullAnswer = parsed.answer;
              if (parsed.sources) finalSources = parsed.sources;
              onDone?.(fullAnswer, finalSources);
            }
          } catch {
            if (currentEvent === 'token') {
              fullAnswer += dataStr;
              onToken?.(dataStr);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { answer: fullAnswer, sources: finalSources };
}

