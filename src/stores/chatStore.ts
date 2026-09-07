/**
 * Chat store — manages conversation ID, messages, loading, and errors.
 */
import { create } from 'zustand';
import type { ChatMessage } from '../types/api';

interface ChatState {
  conversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  setConversation: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string, sources?: ChatMessage['sources']) => void;
  appendLastAssistantChunk: (token: string, sources?: ChatMessage['sources']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  setConversation: (id) => set({ conversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastAssistantMessage: (content, sources) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          messages[i] = {
            ...messages[i],
            content,
            sources: sources !== undefined ? sources : messages[i].sources,
          };
          break;
        }
      }
      return { messages };
    }),
  appendLastAssistantChunk: (token, sources) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          messages[i] = {
            ...messages[i],
            content: (messages[i].content || '') + token,
            sources: sources !== undefined ? sources : messages[i].sources,
          };
          break;
        }
      }
      return { messages };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearChat: () =>
    set({ conversationId: null, messages: [], isLoading: false, error: null }),
}));
