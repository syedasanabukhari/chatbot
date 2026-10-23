import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useChat } from '../context/ChatContext.js';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useChat();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all ${
                isError
                  ? 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-100'
                  : isSuccess
                  ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-100'
                  : 'bg-white/95 dark:bg-[#0a1226]/95 border-slate-200 dark:border-[#16274a] text-slate-900 dark:text-slate-100'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isError && <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                {!isError && !isSuccess && <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold tracking-tight leading-snug">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-normal break-words">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
