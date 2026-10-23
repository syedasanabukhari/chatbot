import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white dark:bg-[#080e1c] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-[#142340] z-10"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDestructive
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                    : 'bg-blue-100 dark:bg-[#0e1d3a] text-blue-600 dark:text-blue-400'
                }`}
              >
                {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
            </div>
            <button
              onClick={onCancel}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#101c36] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{description}</p>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#101c36] transition cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm transition cursor-pointer ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-98'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
