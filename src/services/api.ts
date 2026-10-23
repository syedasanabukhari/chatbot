import { Conversation, Message } from '../../shared/types.js';

export interface StreamEventCallbacks {
  onUserMessage?: (msg: Message) => void;
  onChunk: (chunk: string) => void;
  onDone: (data: { message: Message; title?: string }) => void;
  onError: (error: string, errorMsg?: Message) => void;
}

async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `${fallbackError} (HTTP ${res.status})`);
    } else {
      if (res.status === 404) {
        throw new Error(`API route not found (HTTP 404). Ensure Vercel serverless functions are configured.`);
      }
      const rawText = await res.text().catch(() => '');
      throw new Error(rawText.slice(0, 80) || `${fallbackError} (HTTP ${res.status})`);
    }
  }

  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }

  throw new Error(`Invalid response format from server (expected JSON, received ${contentType || 'text'})`);
}

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return handleResponse<{ status: string; hasApiKey: boolean; defaultModel: string }>(res, 'Failed to fetch health');
  },

  async getModels() {
    const res = await fetch('/api/models');
    return handleResponse<{ models: any[] }>(res, 'Failed to load models');
  },

  async listConversations(query?: string): Promise<Conversation[]> {
    const url = query ? `/api/conversations?q=${encodeURIComponent(query)}` : '/api/conversations';
    const res = await fetch(url);
    const data = await handleResponse<{ conversations: Conversation[] }>(res, 'Failed to fetch conversations');
    return data.conversations;
  },

  async createConversation(data?: { title?: string; model?: string; systemInstruction?: string }): Promise<Conversation> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    const resData = await handleResponse<{ conversation: Conversation }>(res, 'Failed to create conversation');
    return resData.conversation;
  },

  async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const res = await fetch(`/api/conversations/${id}`);
    return handleResponse<{ conversation: Conversation; messages: Message[] }>(res, 'Conversation not found');
  },

  async updateConversation(id: string, updates: { title?: string; systemInstruction?: string; model?: string }): Promise<Conversation> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await handleResponse<{ conversation: Conversation }>(res, 'Failed to update conversation');
    return data.conversation;
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<{ success: boolean }>(res, 'Failed to delete conversation');
  },

  async updateMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
    const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await handleResponse<{ message: Message }>(res, 'Failed to update message');
    return data.message;
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    });
    await handleResponse<{ success: boolean }>(res, 'Failed to delete message');
  },

  async clearAll(): Promise<void> {
    const res = await fetch('/api/conversations/clear', {
      method: 'POST',
    });
    await handleResponse<{ success: boolean }>(res, 'Failed to clear conversations');
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

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      } else {
        if (response.status === 404) {
          throw new Error('API streaming endpoint not found (HTTP 404). Check Vercel serverless configuration.');
        }
        throw new Error(`HTTP error ${response.status}`);
      }
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

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      } else {
        throw new Error(`HTTP error ${response.status}`);
      }
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
