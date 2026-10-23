import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Cpu, Sliders, MessageSquare, Download, Trash2, Check, Sparkles } from 'lucide-react';
import { useChat } from '../context/ChatContext.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, clearAllConversations } = useChat();

  const [model, setModel] = useState(settings.model);
  const [systemInstruction, setSystemInstruction] = useState(settings.systemInstruction);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings({
      model,
      systemInstruction,
      temperature,
    });
    onClose();
  };

  const handleExport = () => {
    window.location.href = '/api/conversations/export';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#080e1c] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#142340] z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#142340]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-[#0e1d3a] text-blue-600 dark:text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chatbot Settings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure AI models, behavior, and chat storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#101c36] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Gemini Model</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setModel('gemini-3.8-flash')}
                className={`p-3 text-left rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  model === 'gemini-3.8-flash'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-[#0d1c3a] text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-[#142340] dark:bg-[#060a14] hover:border-slate-300 dark:hover:border-[#1d335c] text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Gemini 3.8 Flash</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Free-tier flagship model. Fast, precise, and excels at complex coding & writing.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModel('gemini-3.1-flash-lite')}
                className={`p-3 text-left rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  model === 'gemini-3.1-flash-lite'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-[#0d1c3a] text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-[#142340] dark:bg-[#060a14] hover:border-slate-300 dark:hover:border-[#1d335c] text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Gemini 3.1 Flash Lite</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-[#101b34] dark:text-slate-300">
                      Lightweight
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Minimal latency for ultra-snappy short queries and simple tasks.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* System Instruction */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>System Instruction</span>
              </span>
              <span className="text-xs font-normal text-slate-400">Controls assistant persona</span>
            </label>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              rows={3}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-[#142340] bg-slate-50/80 dark:bg-[#060a14] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
              placeholder="e.g. You are a senior software architect..."
            />
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>Creativity (Temperature: {temperature})</span>
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {temperature < 0.4 ? '🎯 Precise & Factual' : temperature < 0.9 ? '⚖️ Balanced' : '🎨 Highly Creative'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-[#0e172e] rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Data Management */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#142340] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Data & Privacy</h4>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-[#142340] hover:bg-slate-100 dark:hover:bg-[#0f1b34] text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Export Chat History (JSON)
              </button>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Conversations
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/70 dark:bg-[#050812] border-t border-slate-200 dark:border-[#142340] rounded-b-2xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Powered by official @google/genai</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#101b34] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-950/40 transition cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>

        {/* Clear Confirmation Sub-dialog */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 dark:bg-[#080e1c]/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-20"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Clear All Chat History?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mt-1 mb-6">
                This action is permanent and will delete all stored conversations and messages.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#101b34] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAllConversations();
                    setShowClearConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
