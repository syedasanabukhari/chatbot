import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-slate-200/80 dark:border-[#142340] bg-[#060a14] text-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-[#091021] border-b border-slate-200 dark:border-[#142340] text-xs font-mono text-slate-400 select-none">
        <span className="uppercase tracking-wider font-semibold text-slate-600 dark:text-blue-300">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-200 dark:bg-[#0f1b34] hover:bg-slate-300 dark:hover:bg-[#16274b] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs cursor-pointer active:scale-95"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto text-sm leading-relaxed p-4 font-mono">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-[15px] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-[#0d172e] text-blue-700 dark:text-sky-300 text-[13px] font-mono border border-blue-200/70 dark:border-[#1a2d54]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match ? match[1] : ''} value={codeString} />;
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-[#142340]">
                <table className="w-full text-left text-sm divide-y divide-slate-200 dark:divide-[#142340]">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-100/70 dark:bg-[#0c152a] font-semibold">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-3.5 py-2.5 text-slate-900 dark:text-slate-100 font-semibold">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 border-t border-slate-200/60 dark:border-[#142340]">{children}</td>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-sky-400 hover:underline font-medium decoration-blue-400/50 underline-offset-2"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="my-3 space-y-1.5 list-disc list-outside pl-5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-3 space-y-1.5 list-decimal list-outside pl-5">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-1 text-slate-800 dark:text-slate-200">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 border-l-4 border-blue-500 pl-4 py-1 italic bg-blue-50/40 dark:bg-[#0b1730]/40 text-slate-700 dark:text-slate-300 rounded-r-lg">
                {children}
              </blockquote>
            );
          },
          h1({ children }) {
            return <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-6 mb-3">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2.5">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-2">{children}</h3>;
          },
          p({ children }) {
            return <p className="my-2.5 leading-relaxed">{children}</p>;
          },
          hr() {
            return <hr className="my-6 border-slate-200 dark:border-[#142340]" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
