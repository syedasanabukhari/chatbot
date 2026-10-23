export type Role = 'user' | 'assistant' | 'system';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: string;
  model?: string;
  systemInstruction?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  createdAt: string;
  updatedAt: string;
  isError?: boolean;
}

export interface ChatModelInfo {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'paid';
  recommended?: boolean;
}

export interface ChatSettings {
  model: string;
  systemInstruction: string;
  temperature: number;
  soundEnabled: boolean;
  streamResponse: boolean;
}
