import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Conversation, Message, Role } from '../shared/types.js';

interface DatabaseSchema {
  conversations: Conversation[];
  messages: Message[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'chatbot_db.json');
const TMP_FILE = path.join(DATA_DIR, 'chatbot_db.tmp.json');

class Database {
  private data: DatabaseSchema = {
    conversations: [],
    messages: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(content);
        if (!Array.isArray(this.data.conversations)) this.data.conversations = [];
        if (!Array.isArray(this.data.messages)) this.data.messages = [];
      } catch (err) {
        console.error('Error loading database file, initializing empty store:', err);
        this.seedInitialData();
      }
    } else {
      this.seedInitialData();
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(TMP_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(TMP_FILE, DB_FILE);
    } catch (err) {
      console.error('Database persist error:', err);
    }
  }

  private seedInitialData() {
    const welcomeConvId = crypto.randomUUID();
    const now = new Date().toISOString();

    const initialConv: Conversation = {
      id: welcomeConvId,
      title: 'Welcome to Gemini AI Chatbot',
      createdAt: now,
      updatedAt: now,
      model: 'gemini-3.1-flash-lite',
      systemInstruction: 'You are a modern, helpful, friendly, and precise AI assistant. Format your responses with clean Markdown, clear headings, structured lists, and syntax-highlighted code blocks where helpful.',
    };

    const initialMessages: Message[] = [
      {
        id: crypto.randomUUID(),
        conversationId: welcomeConvId,
        role: 'user',
        content: 'Hi! What can you do, and how is this chatbot built?',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        updatedAt: new Date(Date.now() - 60000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        conversationId: welcomeConvId,
        role: 'assistant',
        content: `👋 **Welcome! I'm your Gemini-powered AI Assistant.**

Here's an overview of what this application features:

### ⚡ Key Capabilities
1. **Real-time SSE Streaming**: High-speed, responsive token generation directly from Google Gemini API.
2. **Full CRUD Chat Management**: Create new chats, rename them, edit prompts, regenerate answers, and delete with confirmations.
3. **Rich Markdown & Code Highlighting**: Full Markdown support including tables, lists, and syntax-highlighted code blocks with 1-click copy:

\`\`\`typescript
// Server-side streaming endpoint snippet
for await (const chunk of responseStream) {
  const text = chunk.text;
  if (text) {
    res.write(\`data: \${JSON.stringify({ chunk: text })}\\n\\n\`);
  }
}
\`\`\`

4. **Multi-device Responsive Design**: Collapsible sidebar, mobile drawer, keyboard shortcuts, and theme switcher (Light / Dark).
5. **Robust Architecture**: Server-side credentials protection, request validation with Zod, and persistent conversation history.

Feel free to ask a question, start a **New Chat**, or test out the prompts on the welcome screen!`,
        createdAt: now,
        updatedAt: now,
      },
    ];

    this.data.conversations = [initialConv];
    this.data.messages = initialMessages;
    this.persist();
  }

  // Conversation CRUD
  public listConversations(query?: string): Conversation[] {
    let list = [...this.data.conversations];

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((c) => {
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesMessages = this.data.messages.some(
          (m) => m.conversationId === c.id && m.content.toLowerCase().includes(q)
        );
        return matchesTitle || matchesMessages;
      });
    }

    // Sort by updatedAt desc
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Decorate with messageCount and lastMessage
    return list.map((c) => {
      const msgs = this.data.messages.filter((m) => m.conversationId === c.id);
      const lastMsg = msgs[msgs.length - 1];
      return {
        ...c,
        messageCount: msgs.length,
        lastMessage: lastMsg ? lastMsg.content.slice(0, 80) : undefined,
      };
    });
  }

  public getConversation(id: string): { conversation: Conversation; messages: Message[] } | null {
    const conversation = this.data.conversations.find((c) => c.id === id);
    if (!conversation) return null;

    const messages = this.data.messages
      .filter((m) => m.conversationId === id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { conversation, messages };
  }

  public createConversation(title?: string, model?: string, systemInstruction?: string): Conversation {
    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      title: title?.trim() || 'New Conversation',
      createdAt: now,
      updatedAt: now,
      model: model || 'gemini-3.1-flash-lite',
      systemInstruction: systemInstruction || '',
    };

    this.data.conversations.unshift(newConv);
    this.persist();
    return newConv;
  }

  public updateConversation(id: string, updates: Partial<Conversation>): Conversation | null {
    const index = this.data.conversations.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const current = this.data.conversations[index];
    const updated: Conversation = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.conversations[index] = updated;
    this.persist();
    return updated;
  }

  public deleteConversation(id: string): boolean {
    const prevConvCount = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    // Cascading delete messages
    this.data.messages = this.data.messages.filter((m) => m.conversationId !== id);

    if (this.data.conversations.length !== prevConvCount) {
      this.persist();
      return true;
    }
    return false;
  }

  // Message CRUD
  public getMessages(conversationId: string): Message[] {
    return this.data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public getMessageById(messageId: string): Message | null {
    return this.data.messages.find((m) => m.id === messageId) || null;
  }

  public addMessage(conversationId: string, role: Role, content: string, isError = false): Message {
    const now = new Date().toISOString();
    const newMsg: Message = {
      id: crypto.randomUUID(),
      conversationId,
      role,
      content,
      createdAt: now,
      updatedAt: now,
      isError,
    };

    this.data.messages.push(newMsg);

    // Bump conversation updatedAt
    const conv = this.data.conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.updatedAt = now;
      // If conversation title is default and this is the first user message, generate title from content snippet
      if (conv.title === 'New Conversation' && role === 'user') {
        const cleanTitle = content.trim().replace(/[\r\n]+/g, ' ').slice(0, 40);
        conv.title = cleanTitle.length > 37 ? cleanTitle + '...' : cleanTitle;
      }
    }

    this.persist();
    return newMsg;
  }

  public updateMessage(messageId: string, content: string): Message | null {
    const msg = this.data.messages.find((m) => m.id === messageId);
    if (!msg) return null;

    msg.content = content;
    msg.updatedAt = new Date().toISOString();

    const conv = this.data.conversations.find((c) => c.id === msg.conversationId);
    if (conv) {
      conv.updatedAt = msg.updatedAt;
    }

    this.persist();
    return msg;
  }

  public deleteMessage(messageId: string): boolean {
    const index = this.data.messages.findIndex((m) => m.id === messageId);
    if (index === -1) return false;

    const [deleted] = this.data.messages.splice(index, 1);
    const conv = this.data.conversations.find((c) => c.id === deleted.conversationId);
    if (conv) {
      conv.updatedAt = new Date().toISOString();
    }

    this.persist();
    return true;
  }

  // Delete all messages strictly after a message (used when editing a past prompt or regenerating)
  public deleteMessagesAfter(conversationId: string, messageId: string, inclusive = false): boolean {
    const msgs = this.getMessages(conversationId);
    const targetIdx = msgs.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return false;

    const cutoffIdx = inclusive ? targetIdx : targetIdx + 1;
    const toRemoveIds = new Set(msgs.slice(cutoffIdx).map((m) => m.id));

    if (toRemoveIds.size > 0) {
      this.data.messages = this.data.messages.filter((m) => !toRemoveIds.has(m.id));
      const conv = this.data.conversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.updatedAt = new Date().toISOString();
      }
      this.persist();
      return true;
    }
    return false;
  }

  public clearAll(): void {
    this.data.conversations = [];
    this.data.messages = [];
    this.persist();
  }

  public exportData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }
}

export const db = new Database();
