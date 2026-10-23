import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar.js';
import { useChat } from '../context/ChatContext.js';

export const MobileDrawer: React.FC = () => {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useChat();

  return (
    <AnimatePresence>
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer content */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative z-10 w-72 h-full shadow-2xl bg-slate-100 dark:bg-[#060a14] flex flex-col border-r border-slate-200 dark:border-[#131f38]"
          >
            {/* Close button in top right of drawer */}
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200/80 dark:bg-[#0e172c] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Sidebar onCloseMobileDrawer={() => setMobileDrawerOpen(false)} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
