import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { db } from './server/db.js';
import { ai, DEFAULT_MODEL, SUPPORTED_MODELS, generateChatTitle, cleanErrorMessage } from './server/gemini.js';
import {
  createConversationSchema,
  updateConversationSchema,
  addMessageSchema,
  updateMessageSchema,
  streamChatSchema,
  regenerateSchema,
} from './server/validation.js';
import { Message } from './shared/types.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '5mb' }));

// Helper to strictly format turns for Gemini API (alternating user <-> model)
function formatGeminiContents(
  existingMessages: Message[],
  currentPrompt?: string
): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  const turns: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (const m of existingMessages) {
    if (m.isError || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';

    // If consecutive messages have the same role, combine them to maintain strict alternation
    if (turns.length > 0 && turns[turns.length - 1].role === role) {
      turns[turns.length - 1].parts[0].text += '\n\n' + m.content;
    } else {
      turns.push({ role, parts: [{ text: m.content }] });
    }
  }

  if (currentPrompt) {
    if (turns.length > 0 && turns[turns.length - 1].role === 'user') {
      turns[turns.length - 1].parts[0].text += '\n\n' + currentPrompt;
    } else {
      turns.push({ role: 'user', parts: [{ text: currentPrompt }] });
    }
  }

  // Ensure first turn starts with user
  if (turns.length > 0 && turns[0].role !== 'user') {
    turns.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  return turns;
}

// Resilient multi-model streaming with automatic failover
async function streamGeminiWithFallback({
  primaryModel,
  contents,
  systemInstruction,
  temperature,
  onChunk,
  isCancelled,
}: {
  primaryModel: string;
  contents: { role: 'user' | 'model'; parts: { text: string }[] }[];
  systemInstruction: string;
  temperature?: number;
  onChunk: (text: string) => void;
  isCancelled: () => boolean;
}): Promise<{ text: string; modelUsed: string }> {
  // Candidates prioritized by speed and availability
  const candidates = [
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ];

  let lastError: any = null;

  for (const model of candidates) {
    if (isCancelled()) break;
    let fullText = '';
    let hasSentAnyChunk = false;

    try {
      console.log(`[Gemini Stream] Attempting request with model: ${model}`);
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: contents as any,
        config: {
          systemInstruction,
          temperature: temperature ?? 0.7,
        },
      });

      for await (const chunk of responseStream) {
        if (isCancelled()) break;
        const text = chunk.text;
        if (text) {
          hasSentAnyChunk = true;
          fullText += text;
          onChunk(text);
        }
      }

      if (hasSentAnyChunk || fullText.length > 0 || isCancelled()) {
        return { text: fullText, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Stream] Model ${model} failed:`, err?.status || err?.code || err?.message);
      lastError = err;
      if (hasSentAnyChunk) {
        throw err;
      }
    }
  }

  throw lastError;
}

// Health & Models
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: DEFAULT_MODEL,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/models', (_req: Request, res: Response) => {
  res.json({ models: SUPPORTED_MODELS });
});

// Conversations CRUD
app.get('/api/conversations', (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const conversations = db.listConversations(query);
    res.json({ conversations });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list conversations: ' + err.message });
  }
});

app.post('/api/conversations', (req: Request, res: Response) => {
  try {
    const validated = createConversationSchema.parse(req.body);
    const conv = db.createConversation(validated.title, validated.model || DEFAULT_MODEL, validated.systemInstruction);
    res.status(201).json({ conversation: conv });
  } catch (err: any) {
    res.status(400).json({ error: err.errors ? err.errors[0]?.message : err.message });
  }
});

app.get('/api/conversations/:id', (req: Request, res: Response) => {
  try {
    const data = db.getConversation(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get conversation: ' + err.message });
  }
});

app.patch('/api/conversations/:id', (req: Request, res: Response) => {
  try {
    const validated = updateConversationSchema.parse(req.body);
    const updated = db.updateConversation(req.params.id, validated);
    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.errors ? err.errors[0]?.message : err.message });
  }
});

app.delete('/api/conversations/:id', (req: Request, res: Response) => {
  try {
    const deleted = db.deleteConversation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete conversation: ' + err.message });
  }
});

// Messages CRUD
app.post('/api/conversations/:id/messages', (req: Request, res: Response) => {
  try {
    const conv = db.getConversation(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const validated = addMessageSchema.parse(req.body);
    const msg = db.addMessage(req.params.id, validated.role, validated.content);
    res.status(201).json({ message: msg });
  } catch (err: any) {
    res.status(400).json({ error: err.errors ? err.errors[0]?.message : err.message });
  }
});

app.patch('/api/conversations/:id/messages/:messageId', (req: Request, res: Response) => {
  try {
    const validated = updateMessageSchema.parse(req.body);
    const msg = db.updateMessage(req.params.messageId, validated.content);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: msg });
  } catch (err: any) {
    res.status(400).json({ error: err.errors ? err.errors[0]?.message : err.message });
  }
});

app.delete('/api/conversations/:id/messages/:messageId', (req: Request, res: Response) => {
  try {
    const deleted = db.deleteMessage(req.params.messageId);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete message: ' + err.message });
  }
});

// Clear and Export
app.post('/api/conversations/clear', (_req: Request, res: Response) => {
  try {
    db.clearAll();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear conversations: ' + err.message });
  }
});

app.get('/api/conversations/export', (_req: Request, res: Response) => {
  try {
    const dump = db.exportData();
    res.setHeader('Content-Disposition', 'attachment; filename="chat-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(dump);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export conversations: ' + err.message });
  }
});

// SSE Streaming Route
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  try {
    const validated = streamChatSchema.parse(req.body);
    let convData = db.getConversation(validated.conversationId);

    // If conversation doesn't exist, create it on the fly
    if (!convData) {
      const newConv = db.createConversation(
        validated.content.slice(0, 30),
        validated.model || DEFAULT_MODEL,
        validated.systemInstruction
      );
      convData = db.getConversation(newConv.id);
    }

    if (!convData) {
      return res.status(500).json({ error: 'Unable to initialize conversation' });
    }

    // Save user message to database
    const userMsg = db.addMessage(convData.conversation.id, 'user', validated.content);

    // Check if we should auto-generate a smart title
    const isNewConversation =
      convData.conversation.title === 'New Conversation' ||
      convData.conversation.title === 'New Chat' ||
      convData.messages.length === 0;

    let updatedTitle: string | undefined = undefined;

    // Set up Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Notify client of the user message creation
    res.write(`data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`);

    // Prepare contents payload for Gemini API with strict turn alternation
    const existingMessages = db.getMessages(convData.conversation.id);
    const historyBeforeCurrent = existingMessages.filter((m) => m.id !== userMsg.id);
    const contents = formatGeminiContents(historyBeforeCurrent, validated.content);

    const modelToUse = validated.model || convData.conversation.model || DEFAULT_MODEL;
    const systemInstruction =
      validated.systemInstruction ||
      convData.conversation.systemInstruction ||
      'You are a modern, helpful, friendly, and precise AI assistant. Format your responses with clean Markdown, clear headings, structured lists, and syntax-highlighted code blocks where helpful.';

    let clientDisconnected = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
      }
    });

    try {
      const { text: fullResponseText, modelUsed } = await streamGeminiWithFallback({
        primaryModel: modelToUse,
        contents,
        systemInstruction,
        temperature: validated.temperature,
        onChunk: (chunkText) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        },
        isCancelled: () => clientDisconnected || res.destroyed,
      });

      if (!clientDisconnected && !res.destroyed) {
        // Save assistant response to DB
        const assistantMsg = db.addMessage(convData.conversation.id, 'assistant', fullResponseText);

        // Update conversation model if fallback was used
        if (modelUsed !== convData.conversation.model) {
          db.updateConversation(convData.conversation.id, { model: modelUsed });
        }

        // Fast title assignment from user prompt
        if (isNewConversation) {
          const quickTitle = validated.content.slice(0, 35).trim();
          updatedTitle = quickTitle.length > 32 ? quickTitle.slice(0, 32) + '...' : quickTitle;
          db.updateConversation(convData.conversation.id, { title: updatedTitle });

          // Refine title with AI in background without blocking SSE completion
          generateChatTitle(validated.content)
            .then((smartTitle) => {
              if (smartTitle) {
                db.updateConversation(convData.conversation.id, { title: smartTitle });
              }
            })
            .catch(() => {});
        }

        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            message: assistantMsg,
            title: updatedTitle,
          })}\n\n`
        );
      }
    } catch (apiError: any) {
      console.error('Gemini API Streaming Error:', apiError);
      const friendlyMessage = cleanErrorMessage(apiError);

      const errorMsg = db.addMessage(
        convData.conversation.id,
        'assistant',
        `⚠️ **Temporary Connection Issue**\n\n${friendlyMessage}`,
        true
      );

      if (!clientDisconnected && !res.destroyed) {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: friendlyMessage,
            message: errorMsg,
          })}\n\n`
        );
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(400).json({ error: err.errors ? err.errors[0]?.message : err.message });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

// SSE Regenerate Route
app.post('/api/chat/regenerate', async (req: Request, res: Response) => {
  try {
    const validated = regenerateSchema.parse(req.body);
    const convData = db.getConversation(validated.conversationId);

    if (!convData) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = convData.messages;
    if (messages.length === 0) {
      return res.status(400).json({ error: 'No messages to regenerate' });
    }

    // Determine cutoff message:
    if (validated.messageId) {
      const targetIdx = messages.findIndex((m) => m.id === validated.messageId);
      if (targetIdx !== -1) {
        const targetMsg = messages[targetIdx];
        if (targetMsg.role === 'assistant') {
          db.deleteMessagesAfter(convData.conversation.id, targetMsg.id, true);
        } else if (targetMsg.role === 'user') {
          db.deleteMessagesAfter(convData.conversation.id, targetMsg.id, false);
        }
      }
    } else {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        db.deleteMessage(lastMsg.id);
      }
    }

    // SSE streaming setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const remainingMessages = db.getMessages(convData.conversation.id);
    const contents = formatGeminiContents(remainingMessages);

    const modelToUse = validated.model || convData.conversation.model || DEFAULT_MODEL;
    const systemInstruction =
      validated.systemInstruction ||
      convData.conversation.systemInstruction ||
      'You are a modern, helpful, friendly, and precise AI assistant. Format your responses with clean Markdown, clear headings, structured lists, and syntax-highlighted code blocks where helpful.';

    let clientDisconnected = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
      }
    });

    try {
      const { text: fullResponseText, modelUsed } = await streamGeminiWithFallback({
        primaryModel: modelToUse,
        contents,
        systemInstruction,
        temperature: validated.temperature,
        onChunk: (chunkText) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        },
        isCancelled: () => clientDisconnected || res.destroyed,
      });

      if (!clientDisconnected && !res.destroyed) {
        const assistantMsg = db.addMessage(convData.conversation.id, 'assistant', fullResponseText);

        if (modelUsed !== convData.conversation.model) {
          db.updateConversation(convData.conversation.id, { model: modelUsed });
        }

        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            message: assistantMsg,
          })}\n\n`
        );
      }
    } catch (apiError: any) {
      console.error('Regenerate API Error:', apiError);
      const friendlyMessage = cleanErrorMessage(apiError);

      const errorMsg = db.addMessage(
        convData.conversation.id,
        'assistant',
        `⚠️ **Temporary Connection Issue**\n\n${friendlyMessage}`,
        true
      );

      if (!clientDisconnected && !res.destroyed) {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: friendlyMessage,
            message: errorMsg,
          })}\n\n`
        );
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(400).json({ error: err.message });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

// Setup Vite dev server or static serve
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Chatbot Server] Ready on http://localhost:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
