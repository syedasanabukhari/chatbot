import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(150).optional(),
  model: z.string().optional(),
  systemInstruction: z.string().max(2000).optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(150).optional(),
  systemInstruction: z.string().max(2000).optional(),
  model: z.string().optional(),
});

export const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().trim().min(1, 'Message content cannot be empty').max(30000, 'Message is too long (max 30,000 characters)'),
});

export const updateMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message content cannot be empty').max(30000),
});

export const streamChatSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID required'),
  content: z.string().trim().min(1, 'Message content cannot be empty').max(30000),
  model: z.string().optional(),
  systemInstruction: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const regenerateSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID required'),
  messageId: z.string().optional(), // If provided, regenerate from this message; otherwise regenerate latest assistant response
  model: z.string().optional(),
  systemInstruction: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
