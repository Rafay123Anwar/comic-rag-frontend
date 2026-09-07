/**
 * TypeScript types for Conversation API — mirrors backend Pydantic schemas exactly.
 */

import type { SourceItem } from './comic';

export interface ConversationCreateRequest {
  comic_id: string;
}

export interface ConversationResponse {
  conversation_id: string;
  comic_id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationDetailResponse {
  conversation_id: string;
  comic_id: string;
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
}

export interface ConversationQuestionRequest {
  question: string;
  current_page?: number;
}

export interface ConversationQuestionResponse {
  conversation_id: string;
  comic_id: string;
  question: string;
  answer: string;
  sources: SourceItem[];
}
