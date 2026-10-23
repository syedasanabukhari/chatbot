import React from 'react';
import { ChatProvider, useChat } from './context/ChatContext.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatArea } from './components/ChatArea.js';
import { MobileDrawer } from './components/MobileDrawer.js';
import { ToastContainer } from './components/Toast.js';

function ChatLayout() {
  const { sidebarOpen } = useChat();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#070b16] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar with collapsible state */}
      {sidebarOpen && (
        <div className="hidden md:block h-full">
          <Sidebar />
        </div>
      )}

      {/* Mobile Drawer */}
      <MobileDrawer />

      {/* Main Conversation Stage */}
      <main className="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden">
        <ChatArea />
      </main>

      {/* Floating Toasts */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}
