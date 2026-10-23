import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  PanelLeft,
  Plus,
  Send,
  Square,
  RotateCcw,
  Copy,
  Check,
  Edit3,
  Trash2,
  Sparkles,
  Download,
  FileText,
  X,
  User,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useChat } from '../context/ChatContext.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { WelcomeScreen } from './WelcomeScreen.js';
import { Message } from '../../shared/types.js';

export const ChatArea: React.FC = () => {
  const {
    activeConversation,
    messages,
    isLoadingMessages,
    isStreaming,
    streamingContent,
    sendMessage,
    stopStreaming,
    regenerateResponse,
    editMessage,
    deleteMessage,
    sidebarOpen,
    setSidebarOpen,
    setMobileDrawerOpen,
    createNewConversation,
    renameConversation,
    settings,
    addToast,
  } = useChat();

  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  // Smart auto-scroll: scroll to bottom when streaming or new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 250;
      if (isNearBottom || isStreaming) {
        messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
      }
    }
  }, [messages, streamingContent, isStreaming]);

  // Keyboard shortcut: Cmd/Ctrl + K for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        createNewConversation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewConversation]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedMessageId(msg.id);
    addToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingContent.trim()) return;
    await editMessage(msgId, editingContent.trim(), true);
    setEditingMessageId(null);
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeConversation && titleInput.trim()) {
      await renameConversation(activeConversation.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleExportMarkdown = () => {
    if (!activeConversation) return;
    let md = `# ${activeConversation.title}\n*Generated with Gemini Chat on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    for (const m of messages) {
      md += `### ${m.role === 'user' ? '👤 User' : '🤖 Gemini'}\n\n${m.content}\n\n---\n\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    addToast('Markdown exported', 'success');
  };

  const handleExportJson = () => {
    if (!activeConversation) return;
    const data = {
      conversation: activeConversation,
      messages,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
    addToast('JSON exported', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#070b16] overflow-hidden relative">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-200/90 dark:border-[#131f38] px-4 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#070b16]/85 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile drawer trigger */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0e172e] transition cursor-pointer"
            title="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop expand sidebar trigger (when sidebar is collapsed) */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="hidden md:flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0e172e] transition cursor-pointer"
              title="Expand sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}

          {/* Editable Conversation Title */}
          {activeConversation && (
            <div className="flex items-center gap-2 min-w-0">
              {isEditingTitle ? (
                <form onSubmit={handleSaveTitle} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="text-sm font-semibold px-2 py-0.5 rounded border border-blue-500 bg-white dark:bg-[#0a1224] text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  <button type="submit" className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0f1b34] rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTitleInput(activeConversation.title);
                    setIsEditingTitle(true);
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-[#0d162c] px-2 py-1 rounded-lg transition group truncate text-left cursor-pointer"
                  title="Click to rename chat"
                >
                  <span className="truncate max-w-[200px] sm:max-w-md">{activeConversation.title}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5">
          {/* Active Model Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0a1429] border border-slate-200 dark:border-[#172749] text-xs text-blue-600 dark:text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium font-mono text-[11px]">{settings.model}</span>
          </div>

          {/* New Chat Quick Button */}
          <button
            onClick={() => createNewConversation()}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0e172e] transition cursor-pointer"
            title="Start new chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0e172e] transition cursor-pointer"
              title="Export chat options"
            >
              <Download className="w-4 h-4" />
            </button>

            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0a1326] rounded-xl shadow-xl border border-slate-200 dark:border-[#172749] py-1 z-30 text-xs">
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#0f1b34] flex items-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Export Markdown (.md)</span>
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#0f1b34] flex items-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Export JSON (.json)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Conversation Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 space-y-6"
      >
        {isLoadingMessages ? (
          /* Animated loading skeletons */
          <div className="max-w-3xl mx-auto space-y-6 animate-pulse pt-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#0f1b34] shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-[#0f1b34] rounded w-1/4" />
                <div className="h-10 bg-slate-200 dark:bg-[#0f1b34] rounded-xl w-3/4" />
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#0f1b34] shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-[#0f1b34] rounded w-1/3" />
                <div className="h-24 bg-slate-200 dark:bg-[#0f1b34] rounded-xl w-full" />
              </div>
            </div>
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          /* Empty / Welcome Screen */
          <WelcomeScreen onSelectPrompt={(p) => sendMessage(p)} />
        ) : (
          /* Message List */
          <div className="max-w-3xl mx-auto space-y-6 pb-2">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isEditing = editingMessageId === msg.id;
              const isCopied = copiedMessageId === msg.id;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`group relative flex gap-3.5 sm:gap-4 items-start ${
                    isUser ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-semibold shadow-xs select-none ${
                      isUser
                        ? 'bg-gradient-to-tr from-blue-900 via-slate-800 to-indigo-950 text-white shadow-xs'
                        : 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white shadow-md shadow-blue-950/50'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble & Content in Velvet Navy & Midnight Blue */}
                  <div
                    className={`relative max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-xs ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-md shadow-blue-950/40'
                        : msg.isError
                        ? 'bg-rose-50 dark:bg-[#1a0f1b] border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-100'
                        : 'bg-slate-100/90 dark:bg-[#0b1426] border border-slate-200/70 dark:border-[#152545] text-slate-900 dark:text-slate-100 shadow-sm'
                    }`}
                  >
                    {/* User Editing Mode */}
                    {isEditing ? (
                      <div className="space-y-2 min-w-[260px] sm:min-w-[400px]">
                        <textarea
                          rows={3}
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full text-sm p-2 rounded-xl bg-white text-slate-900 dark:bg-[#070b16] dark:text-slate-100 border border-blue-500 focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-[#101b33] text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition font-medium"
                          >
                            Save & Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.isError ? (
                          <div className="space-y-3 py-0.5">
                            <div className="flex items-start gap-2.5">
                              <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                              <div className="text-xs sm:text-sm text-rose-950 dark:text-rose-100 leading-relaxed">
                                <p className="font-semibold text-rose-600 dark:text-rose-400 mb-1">
                                  Service High Demand Notice
                                </p>
                                <p className="text-rose-900/90 dark:text-rose-200/90 leading-relaxed">
                                  {msg.content.replace(/^⚠️[^\n]*\n\n/, '')}
                                </p>
                              </div>
                            </div>
                            <div className="pt-1 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => regenerateResponse(msg.id)}
                                disabled={isStreaming}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Retry Now</span>
                              </button>
                            </div>
                          </div>
                        ) : isUser ? (
                          <div className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        ) : (
                          <MarkdownRenderer content={msg.content} />
                        )}

                        {/* Action Toolbar on Hover */}
                        <div
                          className={`mt-2 pt-1 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isUser ? 'justify-end text-blue-200' : 'justify-start text-slate-400 dark:text-slate-400'
                          }`}
                        >
                          {/* Copy Message */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg)}
                            className={`p-1 rounded-md transition text-xs flex items-center gap-1 cursor-pointer ${
                              isUser
                                ? 'hover:bg-blue-800/80 text-blue-200'
                                : 'hover:bg-slate-200 dark:hover:bg-[#111e38] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                            title="Copy message text"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* User: Edit Message */}
                          {isUser && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="p-1 rounded-md hover:bg-blue-800/80 text-blue-200 transition text-xs cursor-pointer"
                              title="Edit prompt and regenerate"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Assistant: Regenerate Response */}
                          {!isUser && index === messages.length - 1 && !isStreaming && (
                            <button
                              type="button"
                              onClick={() => regenerateResponse(msg.id)}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#111e38] text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition text-xs flex items-center gap-1 cursor-pointer"
                              title="Regenerate this answer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Retry</span>
                            </button>
                          )}

                          {/* Delete Message */}
                          <button
                            type="button"
                            onClick={() => deleteMessage(msg.id)}
                            className={`p-1 rounded-md transition text-xs cursor-pointer ${
                              isUser
                                ? 'hover:bg-blue-800/80 text-blue-200'
                                : 'hover:bg-slate-200 dark:hover:bg-[#111e38] text-slate-400 hover:text-rose-500'
                            }`}
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* In-flight streaming message */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3.5 sm:gap-4 items-start"
              >
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-semibold shadow-xs bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white shadow-blue-950/50">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>

                <div className="relative max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 bg-slate-100/90 dark:bg-[#0b1426] border border-slate-200/70 dark:border-[#152545] text-slate-900 dark:text-slate-100 shadow-sm">
                  {streamingContent ? (
                    <div>
                      <MarkdownRenderer content={streamingContent} />
                      <span className="streaming-cursor" />
                    </div>
                  ) : (
                    /* Initial thinking animation */
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-1">
                      <span className="inline-flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
                      </span>
                      <span>Gemini is generating response...</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Input Area in Midnight Navy */}
      <div className="p-4 sm:p-5 shrink-0 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#070b16] dark:via-[#070b16]/95 dark:to-transparent z-10">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Textarea Container */}
          <div className="relative rounded-2xl border border-slate-300 dark:border-[#18294a] bg-white dark:bg-[#091122] shadow-xl shadow-slate-200/50 dark:shadow-blue-950/40 focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500 transition-all flex flex-col p-2 sm:p-2.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? 'Generating response... click Stop to cancel'
                  : 'Ask Gemini anything... (Enter to send, Shift + Enter for new line)'
              }
              className="w-full text-sm sm:text-[15px] px-2 py-1.5 bg-transparent resize-none focus:outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed max-h-44 overflow-y-auto"
            />

            {/* Bottom Input Controls */}
            <div className="flex items-center justify-between pt-1 px-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="hidden sm:inline">Press Enter to send</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Shift + Enter for new line</span>
              </div>

              <div className="flex items-center gap-2">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-sm transition active:scale-95 cursor-pointer animate-pulse"
                    title="Stop generation"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className={`p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
                      input.trim()
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-950/40 active:scale-95'
                        : 'bg-slate-100 dark:bg-[#0e172a] text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Small Footer Notice */}
          <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            Gemini may display inaccurate info, so double-check responses.
          </div>
        </div>
      </div>
    </div>
  );
};
