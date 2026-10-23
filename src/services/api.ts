import { Conversation, Message } from '../../shared/types.js';

export interface StreamEventCallbacks {
  onUserMessage?: (msg: Message) => void;
  onChunk: (chunk: string) => void;
  onDone: (data: { message: Message; title?: string }) => void;
  onError: (error: string, errorMsg?: Message) => void;
}

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getModels() {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error('Failed to load models');
    return res.json();
  },

  async listConversations(query?: string): Promise<Conversation[]> {
    const url = query ? `/api/conversations?q=${encodeURIComponent(query)}` : '/api/conversations';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    const data = await res.json();
    return data.conversations;
  },

  async createConversation(data?: { title?: string; model?: string; systemInstruction?: string }): Promise<Conversation> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create conversation');
    }
    const resData = await res.json();
    return resData.conversation;
  },

  async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Conversation not found');
    }
    return res.json();
  },

  async updateConversation(id: string, updates: { title?: string; systemInstruction?: string; model?: string }): Promise<Conversation> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update conversation');
    }
    const data = await res.json();
    return data.conversation;
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete conversation');
    }
  },

  async updateMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
    const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update message');
    }
    const data = await res.json();
    return data.message;
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete message');
    }
  },

  async clearAll(): Promise<void> {
    const res = await fetch('/api/conversations/clear', {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to clear conversations');
  },

  async streamChat(
    payload: {
      conversationId: string;
      content: string;
      model?: string;
      systemInstruction?: string;
      temperature?: number;
    },
    callbacks: StreamEventCallbacks,
    signal?: AbortSignal
  ) {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') break;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'user_message' && callbacks.onUserMessage) {
                callbacks.onUserMessage(event.message);
              } else if (event.type === 'chunk') {
                callbacks.onChunk(event.text);
              } else if (event.type === 'done') {
                callbacks.onDone(event);
              } else if (event.type === 'error') {
                callbacks.onError(event.error, event.message);
              }
            } catch (parseErr) {
              console.warn('SSE JSON parse error:', parseErr, jsonStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        callbacks.onError(err.message || 'Stream connection error');
      }
    }
  },

  async regenerateChat(
    payload: {
      conversationId: string;
      messageId?: string;
      model?: string;
      systemInstruction?: string;
      temperature?: number;
    },
    callbacks: Omit<StreamEventCallbacks, 'onUserMessage'>,
    signal?: AbortSignal
  ) {
    const response = await fetch('/api/chat/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') break;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'chunk') {
                callbacks.onChunk(event.text);
              } else if (event.type === 'done') {
                callbacks.onDone(event);
              } else if (event.type === 'error') {
                callbacks.onError(event.error, event.message);
              }
            } catch (parseErr) {
              console.warn('SSE JSON parse error in regenerate:', parseErr, jsonStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Regenerate aborted by user');
      } else {
        callbacks.onError(err.message || 'Regenerate connection error');
      }
    }
  },
};
