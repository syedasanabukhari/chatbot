import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Code2, Lightbulb, PenTool, Compass, ArrowRight } from 'lucide-react';
import { useChat } from '../context/ChatContext.js';

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string) => void;
}

const promptCategories = [
  {
    icon: Code2,
    color: 'text-sky-500 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    title: 'Code & Build',
    prompts: [
      'Write a TypeScript function to debounce an API call',
      'Explain how React Server Components work behind the scenes',
    ],
  },
  {
    icon: Lightbulb,
    color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    title: 'Brainstorm & Ideate',
    prompts: [
      'Pitch 4 innovative ideas for an AI productivity app',
      'Design a launch strategy for an open-source developer tool',
    ],
  },
  {
    icon: PenTool,
    color: 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    title: 'Writing & Refinement',
    prompts: [
      'Draft a polite, professional email declining an invitation',
      'Rewrite a technical summary for a non-technical stakeholder',
    ],
  },
  {
    icon: Compass,
    color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    title: 'Explain & Learn',
    prompts: [
      'Compare PostgreSQL vs SQLite vs MongoDB for modern apps',
      'Explain quantum computing concepts using simple analogies',
    ],
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt }) => {
  const { settings } = useChat();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full text-center">
      {/* Hero Badge & Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative inline-flex items-center justify-center mb-6"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center shadow-2xl shadow-blue-950/60 ring-4 ring-blue-500/20">
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
      </motion.div>

      {/* Greeting Title */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Where would you like to start?
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Powered by Google’s fast and versatile{' '}
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {settings.model === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : settings.model}
          </span>
          . Select a prompt below or type your own question.
        </p>
      </motion.div>

      {/* Prompt Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-8 w-full text-left"
      >
        {promptCategories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white dark:bg-[#091021]/90 border border-slate-200/90 dark:border-[#142340] shadow-sm flex flex-col justify-between hover:border-blue-400/50 dark:hover:border-[#22396b] transition"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-2 rounded-xl border ${cat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-xs tracking-wider uppercase text-slate-600 dark:text-slate-300">
                  {cat.title}
                </h3>
              </div>

              <div className="space-y-2">
                {cat.prompts.map((p, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => onSelectPrompt(p)}
                    className="w-full text-left p-2.5 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0f1b34] transition flex items-center justify-between group cursor-pointer border border-transparent hover:border-slate-200/60 dark:hover:border-[#1b2f56]"
                  >
                    <span className="line-clamp-2 pr-2 font-normal leading-relaxed">{p}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};
