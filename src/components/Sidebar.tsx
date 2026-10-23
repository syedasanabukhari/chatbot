import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  X,
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  PanelLeftClose,
  Moon,
  Sun,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useChat } from '../context/ChatContext.js';
import { Conversation } from '../../shared/types.js';
import { ConfirmationModal } from './ConfirmationModal.js';
import { SettingsModal } from './SettingsModal.js';

interface SidebarProps {
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobileDrawer }) => {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createNewConversation,
    renameConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
    theme,
    toggleTheme,
    setSidebarOpen,
    settings,
  } = useChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Group conversations by time periods
  const groupedConversations = useMemo(() => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const last7Days: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const sevenDaysAgo = todayStart - 7 * 86400000;

    for (const conv of conversations) {
      const time = new Date(conv.updatedAt || conv.createdAt).getTime();
      if (time >= todayStart) {
        today.push(conv);
      } else if (time >= yesterdayStart) {
        yesterday.push(conv);
      } else if (time >= sevenDaysAgo) {
        last7Days.push(conv);
      } else {
        older.push(conv);
      }
    }

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Previous 7 Days', items: last7Days },
      { label: 'Older', items: older },
    ].filter((g) => g.items.length > 0);
  }, [conversations]);

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editingTitle.trim()) {
      await renameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleNewChat = async () => {
    await createNewConversation();
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const handleSelect = (id: string) => {
    selectConversation(id);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  return (
    <aside className="h-full flex flex-col bg-slate-100/90 dark:bg-[#060a14] border-r border-slate-200/90 dark:border-[#131f38] w-72 shrink-0 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-200/90 dark:border-[#131f38]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              Gemini Chat
            </h1>
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-[#0d1c3a] dark:text-blue-300 dark:border dark:border-[#1b3363]">
              v3.8 Flash
            </span>
          </div>
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#0d162b] transition cursor-pointer"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Action: New Chat Button in Velvet Navy & Midnight Gradient */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-md shadow-blue-900/30 dark:shadow-blue-950/60 transition active:scale-98 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-blue-800/60 rounded border border-blue-400/30 text-blue-100">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-white dark:bg-[#090f1e] border border-slate-200 dark:border-[#15233e] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 py-1">
        {groupedConversations.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-400 dark:text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-slate-600 dark:text-slate-400">
              {searchQuery ? 'No matching conversations' : 'No chats yet'}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              {searchQuery ? 'Try another keyword' : 'Click New Chat to begin!'}
            </p>
          </div>
        ) : (
          groupedConversations.map((group) => (
            <div key={group.label} className="space-y-1">
              <h2 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                {group.label}
              </h2>
              {group.items.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = conv.id === editingId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelect(conv.id)}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-100/90 dark:bg-[#0e1a33] text-blue-950 dark:text-blue-100 font-semibold border-l-2 border-blue-500 shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#0a1224]'
                    }`}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(conv.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center gap-1.5 min-w-0"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-white dark:bg-[#090f1f] rounded border border-blue-500 text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-[#121f38] rounded"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          <span className="truncate pr-1 font-medium">{conv.title}</span>
                        </div>

                        {/* Hover Actions */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(conv, e)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-[#121f38] rounded transition"
                            title="Rename chat"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(conv.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Bottom Footer Bar */}
      <div className="p-3 border-t border-slate-200/90 dark:border-[#131f38] bg-slate-100/60 dark:bg-[#050812] space-y-2">
        <div className="flex items-center justify-between">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#0e172c] transition cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-700" />
                <span>Velvet Navy</span>
              </>
            )}
          </button>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-[#0e172c] transition cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Model info chip */}
        <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400 rounded-lg bg-slate-200/50 dark:bg-[#091021] border border-slate-300/40 dark:border-[#162445]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[130px] font-mono">
              {settings.model}
            </span>
          </span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">Free Tier</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deletingId)}
        title="Delete Conversation?"
        description="Are you sure you want to delete this conversation? All associated messages will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingId) deleteConversation(deletingId);
        }}
        onCancel={() => setDeletingId(null)}
      />

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </aside>
  );
};
