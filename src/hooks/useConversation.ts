/**
 * useConversation — hook for conversation lifecycle and chat.
 * Uses the backend as the single source of truth for chat history and persistence.
 * Employs AbortController and active comic tracking to prevent race conditions.
 */
import { useCallback, useRef } from 'react';
import {
  askInConversationStream,
  getComicConversation,
  getConversation,
} from '../services/conversationApi';
import { useChatStore } from '../stores/chatStore';
import { useUIStore } from '../stores/uiStore';
import type { ChatMessage } from '../types/api';
import type { ConversationDetailResponse, ConversationMessage } from '../types/conversation';
import { getErrorMessage } from '../utils/errors';
import { getSavedConversationId, saveConversationId } from '../utils/storage';

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function backendMessageToChat(msg: ConversationMessage): ChatMessage {
  return {
    id: generateId(),
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
  };
}

export function useConversation() {
  const {
    conversationId,
    messages,
    isLoading,
    error,
    setConversation,
    setMessages,
    addMessage,
    updateLastAssistantMessage,
    setLoading,
    setError,
    clearChat,
  } = useChatStore();
  const { addToast } = useUIStore();

  const activeComicRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Initialise the conversation for a comic directly from backend persistence.
   * Checks localStorage for existing conversation_id or fetches latest from backend.
   */
  const initConversation = useCallback(
    async (comicId: string, forceReset = false) => {
      if (!comicId) return;

      // If already initialized for this exact comic with active state, avoid redundant wipe
      if (!forceReset && activeComicRef.current === comicId && conversationId) {
        return;
      }

      // Cancel any ongoing fetch for a previous comic
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeComicRef.current = comicId;

      // Clear state for the new comic session
      clearChat();
      setLoading(true);
      setError(null);

      try {
        let record: ConversationDetailResponse | null = null;
        const savedId = getSavedConversationId(comicId);

        if (savedId && !forceReset) {
          try {
            record = await getConversation(savedId, controller.signal);
            if (record && record.comic_id !== comicId) {
              record = null;
            }
          } catch {
            record = null;
          }
        }

        if (!record) {
          // Fetch latest or create persistent conversation directly from backend
          record = await getComicConversation(comicId, controller.signal);
        }

        // Guard against race conditions: if comic switched during fetch, ignore result
        if (activeComicRef.current !== comicId || controller.signal.aborted) {
          return;
        }

        setConversation(record.conversation_id);
        saveConversationId(comicId, record.conversation_id);

        const chatMessages = (record.messages || []).map(backendMessageToChat);
        setMessages(chatMessages);
      } catch (err: unknown) {
        // Ignore aborted requests
        if (controller.signal.aborted || (err as { name?: string })?.name === 'CanceledError') {
          return;
        }
        if (activeComicRef.current !== comicId) {
          return;
        }

        const msg = getErrorMessage(err);
        setError(msg);
        addToast({ type: 'error', message: `Could not load comic chat: ${msg}` });
      } finally {
        if (activeComicRef.current === comicId) {
          setLoading(false);
        }
      }
    },
    [addToast, clearChat, conversationId, setConversation, setError, setLoading, setMessages]
  );

  /**
   * Send a question in the current comic's conversation with progressive token streaming.
   */
  const sendQuestion = useCallback(
    async (question: string, currentPage?: number) => {
      const trimmed = question.trim();
      if (!conversationId || !trimmed || isLoading) return;

      const currentComicId = activeComicRef.current;
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      addMessage(userMessage);
      setLoading(true);
      setError(null);

      const assistantId = generateId();
      let accumulatedContent = '';
      let accumulatedSources: ChatMessage['sources'] = undefined;
      let assistantAdded = false;

      try {
        await askInConversationStream(
          conversationId,
          trimmed,
          currentPage,
          (token) => {
            if (activeComicRef.current !== currentComicId) return;
            accumulatedContent += token;
            if (!assistantAdded) {
              assistantAdded = true;
              addMessage({
                id: assistantId,
                role: 'assistant',
                content: accumulatedContent,
                sources: accumulatedSources,
                timestamp: new Date().toISOString(),
              });
            } else {
              updateLastAssistantMessage(accumulatedContent, accumulatedSources);
            }
          },
          (sources) => {
            if (activeComicRef.current !== currentComicId) return;
            accumulatedSources = sources && sources.length > 0 ? sources : undefined;
            if (assistantAdded) {
              updateLastAssistantMessage(accumulatedContent, accumulatedSources);
            }
          },
          (finalAnswer, finalSources) => {
            if (activeComicRef.current !== currentComicId) return;
            accumulatedContent = finalAnswer;
            accumulatedSources = finalSources && finalSources.length > 0 ? finalSources : undefined;
            if (!assistantAdded) {
              assistantAdded = true;
              addMessage({
                id: assistantId,
                role: 'assistant',
                content: accumulatedContent,
                sources: accumulatedSources,
                timestamp: new Date().toISOString(),
              });
            } else {
              updateLastAssistantMessage(accumulatedContent, accumulatedSources);
            }
          }
        );
      } catch (err) {
        if (activeComicRef.current !== currentComicId) {
          return;
        }

        const rawMsg = getErrorMessage(err);
        const friendlyMsg =
          rawMsg && !rawMsg.toLowerCase().includes('unexpected')
            ? rawMsg
            : 'Sorry, the message was too long or the server is busy. Please try again.';

        setError(friendlyMsg);
        addToast({ type: 'error', message: friendlyMsg });

        if (!assistantAdded) {
          addMessage({
            id: assistantId,
            role: 'assistant',
            content: friendlyMsg,
            timestamp: new Date().toISOString(),
          });
        } else {
          updateLastAssistantMessage(`${accumulatedContent}\n\n[Error: ${friendlyMsg}]`, accumulatedSources);
        }
      } finally {
        if (activeComicRef.current === currentComicId) {
          setLoading(false);
        }
      }
    },
    [conversationId, isLoading, addMessage, updateLastAssistantMessage, addToast, setError, setLoading]
  );

  /** Reset conversation state. */
  const resetConversation = useCallback(() => {
    activeComicRef.current = null;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearChat();
  }, [clearChat]);

  return {
    conversationId,
    messages,
    isLoading,
    error,
    initConversation,
    sendQuestion,
    resetConversation,
  };
}

