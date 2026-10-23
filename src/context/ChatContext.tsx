import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, Message, ChatSettings } from '../../shared/types.js';
import { api } from '../services/api.js';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  streamingContent: string;
  searchQuery: string;
  theme: 'light' | 'dark';
  settings: ChatSettings;
  sidebarOpen: boolean;
  mobileDrawerOpen: boolean;
  toasts: ToastItem[];
  // Actions
  selectConversation: (id: string) => Promise<void>;
  createNewConversation: () => Promise<string>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearAllConversations: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string, regenerate?: boolean) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  regenerateResponse: (messageId?: string) => Promise<void>;
  stopStreaming: () => void;
  setSearchQuery: (q: string) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  updateSettings: (newSettings: Partial<ChatSettings>) => void;
  addToast: (title: string, type?: 'success' | 'error' | 'info', description?: string) => void;
  removeToast: (id: string) => void;
  refreshConversations: (query?: string) => Promise<Conversation[]>;
}

const defaultSettings: ChatSettings = {
  model: 'gemini-3.1-flash-lite',
  systemInstruction: 'You are a modern, helpful, friendly, and precise AI assistant. Format your responses with clean Markdown, clear headings, structured lists, and syntax-highlighted code blocks where helpful.',
  temperature: 0.7,
  soundEnabled: true,
  streamResponse: true,
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Theme management with dark mode persisted in localStorage and system preference fallback
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gemini_chat_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Settings persisted in localStorage
  const [settings, setSettings] = useState<ChatSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gemini_chat_settings');
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
          console.error(e);
        }
      }
    }
    return defaultSettings;
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync theme to document element class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('gemini_chat_theme', theme);
  }, [theme]);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('gemini_chat_settings', JSON.stringify(settings));
  }, [settings]);

  // Toast helper
  const addToast = useCallback((title: string, type: 'success' | 'error' | 'info' = 'info', description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, type, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    addToast('Settings updated', 'success');
  }, [addToast]);

  // Load conversation list
  const refreshConversations = useCallback(async (query?: string) => {
    try {
      const list = await api.listConversations(query);
      setConversations(list);
      return list;
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      addToast('Failed to load conversations', 'error', err.message);
      return [];
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoadingConversations(true);
      const list = await refreshConversations();
      if (mounted) {
        setIsLoadingConversations(false);
        if (list.length > 0 && !activeConversationId) {
          selectConversation(list[0].id);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter conversations when search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshConversations(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, refreshConversations]);

  // Select conversation and load messages
  const selectConversation = useCallback(async (id: string) => {
    if (isStreaming) {
      stopStreaming();
    }
    setActiveConversationId(id);
    setIsLoadingMessages(true);
    setStreamingContent('');
    try {
      const data = await api.getConversation(id);
      setMessages(data.messages);
    } catch (err: any) {
      console.error('Failed to get conversation:', err);
      addToast('Conversation not found', 'error');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [isStreaming, addToast]);

  // Create new conversation
  const createNewConversation = useCallback(async (): Promise<string> => {
    if (isStreaming) {
      stopStreaming();
    }
    try {
      const newConv = await api.createConversation({
        title: 'New Conversation',
        model: settings.model,
        systemInstruction: settings.systemInstruction,
      });
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      setStreamingContent('');
      return newConv.id;
    } catch (err: any) {
      addToast('Failed to create new conversation', 'error', err.message);
      throw err;
    }
  }, [isStreaming, settings, addToast]);

  // Rename conversation
  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const updated = await api.updateConversation(id, { title });
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)));
      addToast('Conversation renamed', 'success');
    } catch (err: any) {
      addToast('Failed to rename conversation', 'error', err.message);
    }
  }, [addToast]);

  // Delete conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      addToast('Conversation deleted', 'success');

      // If active conversation was deleted, pick the next or create new
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err: any) {
      addToast('Failed to delete conversation', 'error', err.message);
    }
  }, [activeConversationId, conversations, selectConversation, addToast]);

  // Clear all conversations
  const clearAllConversations = useCallback(async () => {
    try {
      await api.clearAll();
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      addToast('All chat history cleared', 'success');
    } catch (err: any) {
      addToast('Failed to clear conversations', 'error', err.message);
    }
  }, [addToast]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Send message with SSE streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      targetConvId = await createNewConversation();
    }

    const tempMsgId = 'temp-' + Date.now();
    const tempUserMsg: Message = {
      id: tempMsgId,
      conversationId: targetConvId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistically render prompt in <1ms
    setMessages((prev) => [...prev, tempUserMsg]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsStreaming(true);
    setStreamingContent('');

    try {
      await api.streamChat(
        {
          conversationId: targetConvId,
          content,
          model: settings.model,
          systemInstruction: settings.systemInstruction,
          temperature: settings.temperature,
        },
        {
          onUserMessage: (userMsg) => {
            setMessages((prev) => prev.map((m) => (m.id === tempMsgId ? userMsg : m)));
          },
          onChunk: (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
          onDone: ({ message, title }) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === message.id)) return prev;
              return [...prev, message];
            });
            setStreamingContent('');
            setIsStreaming(false);
            abortControllerRef.current = null;

            // Refresh conversation title & order
            setConversations((prev) => {
              const updated = prev.map((c) => {
                if (c.id === targetConvId) {
                  return {
                    ...c,
                    title: title || c.title,
                    updatedAt: new Date().toISOString(),
                    lastMessage: message.content.slice(0, 80),
                    messageCount: (c.messageCount || 0) + 2,
                  };
                }
                return c;
              });
              return [...updated].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            });
          },
          onError: (errorText, errorMsg) => {
            setIsStreaming(false);
            setStreamingContent('');
            abortControllerRef.current = null;
            if (errorMsg) {
              setMessages((prev) => [...prev, errorMsg]);
            }
            addToast('Error generating response', 'error', errorText);
          },
        },
        abortController.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
        addToast('Failed to send message', 'error', err.message);
      }
    }
  }, [activeConversationId, isStreaming, settings, createNewConversation, addToast]);

  // Edit user message and optionally regenerate
  const editMessage = useCallback(async (messageId: string, newContent: string, regenerate = true) => {
    if (!activeConversationId) return;

    try {
      await api.updateMessage(activeConversationId, messageId, newContent);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m)));
      addToast('Message updated', 'success');

      if (regenerate) {
        await regenerateResponse(messageId);
      }
    } catch (err: any) {
      addToast('Failed to edit message', 'error', err.message);
    }
  }, [activeConversationId, addToast]);

  // Delete individual message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!activeConversationId) return;
    try {
      await api.deleteMessage(activeConversationId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      addToast('Message deleted', 'success');
      refreshConversations();
    } catch (err: any) {
      addToast('Failed to delete message', 'error', err.message);
    }
  }, [activeConversationId, addToast, refreshConversations]);

  // Regenerate assistant response
  const regenerateResponse = useCallback(async (messageId?: string) => {
    if (!activeConversationId || isStreaming) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsStreaming(true);
    setStreamingContent('');

    // Remove the assistant message that is being regenerated from local state
    if (messageId) {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        const target = messages[idx];
        if (target.role === 'assistant') {
          setMessages((prev) => prev.slice(0, idx));
        } else if (target.role === 'user') {
          setMessages((prev) => prev.slice(0, idx + 1));
        }
      }
    } else {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        setMessages((prev) => prev.slice(0, -1));
      }
    }

    try {
      await api.regenerateChat(
        {
          conversationId: activeConversationId,
          messageId,
          model: settings.model,
          systemInstruction: settings.systemInstruction,
          temperature: settings.temperature,
        },
        {
          onChunk: (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
          onDone: ({ message }) => {
            setMessages((prev) => [...prev, message]);
            setStreamingContent('');
            setIsStreaming(false);
            abortControllerRef.current = null;
            refreshConversations();
          },
          onError: (errorText, errorMsg) => {
            setIsStreaming(false);
            setStreamingContent('');
            abortControllerRef.current = null;
            if (errorMsg) {
              setMessages((prev) => [...prev, errorMsg]);
            }
            addToast('Regenerate failed', 'error', errorText);
          },
        },
        abortController.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
        addToast('Regenerate failed', 'error', err.message);
      }
    }
  }, [activeConversationId, isStreaming, messages, settings, addToast, refreshConversations]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        isStreaming,
        streamingContent,
        searchQuery,
        theme,
        settings,
        sidebarOpen,
        mobileDrawerOpen,
        toasts,
        selectConversation,
        createNewConversation,
        renameConversation,
        deleteConversation,
        clearAllConversations,
        sendMessage,
        editMessage,
        deleteMessage,
        regenerateResponse,
        stopStreaming,
        setSearchQuery,
        toggleTheme,
        setSidebarOpen,
        setMobileDrawerOpen,
        updateSettings,
        addToast,
        removeToast,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
