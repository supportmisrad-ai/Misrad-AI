import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/cn';

export default function MarkdownRenderer({
  content,
  className,
  theme = 'light',
}: {
  content: string;
  className?: string;
  theme?: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  return (
    <div 
      className={cn('w-full', className)} 
      dir="rtl" 
      style={{ 
        fontFamily: '"Heebo", "Assistant", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = href ? /^https?:\/\//i.test(href) : false;
            return (
              <a
                href={href}
                {...props}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer noopener' : undefined}
                className="inline-block my-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-medium text-xs transition-colors no-underline"
              >
                {children}
              </a>
            );
          },
          h1: ({ children }) => (
            <h1
              className={
                isDark
                  ? 'text-2xl font-bold text-white mt-6 first:mt-0 mb-4'
                  : 'text-2xl font-bold text-slate-900 mt-6 first:mt-0 mb-4'
              }
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={
                isDark
                  ? 'text-xl font-semibold text-white mt-8 mb-3 pb-2 border-b border-white/10'
                  : 'text-xl font-semibold text-slate-900 mt-8 mb-3 pb-2 border-b border-slate-200'
              }
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={
                isDark
                  ? 'text-lg font-semibold text-white mt-6 mb-2'
                  : 'text-lg font-semibold text-slate-900 mt-6 mb-2'
              }
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p
              className={
                isDark
                  ? 'text-white/85 leading-relaxed my-3 text-base'
                  : 'text-slate-700 leading-relaxed my-3 text-base'
              }
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul
              className={
                isDark
                  ? 'list-disc pr-6 text-white/85 my-3 space-y-2 marker:text-slate-400'
                  : 'list-disc pr-6 text-slate-700 my-3 space-y-2 marker:text-slate-400'
              }
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className={
                isDark
                  ? 'list-decimal list-outside pr-6 text-white/85 my-3 space-y-2 marker:text-slate-500'
                  : 'list-decimal list-outside pr-6 text-slate-700 my-3 space-y-2 marker:text-slate-500'
              }
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className={isDark ? 'text-white/85 leading-relaxed text-base' : 'text-slate-700 leading-relaxed text-base'}>
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={
                isDark
                  ? 'my-4 rounded-lg border-r-2 border-slate-500 bg-white/5 pr-4 pl-4 py-3 text-white/80'
                  : 'my-4 rounded-lg border-r-2 border-slate-300 bg-slate-50 pr-4 pl-4 py-3 text-slate-600'
              }
            >
              {children}
            </blockquote>
          ),
          hr: () => <hr className={isDark ? 'my-6 border-t border-white/10' : 'my-6 border-t border-slate-200'} />,
          code: ({ children }) => (
            <code
              className={
                isDark
                  ? 'px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-sm'
                  : 'px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-sm'
              }
            >
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className={isDark ? 'my-6 overflow-x-auto rounded-lg border border-white/10' : 'my-6 overflow-x-auto rounded-lg border border-slate-200'}>
              <table className={isDark ? 'w-full text-sm text-white/85' : 'w-full text-sm text-slate-700'}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={isDark ? 'bg-white/5' : 'bg-slate-50'}>{children}</thead>,
          th: ({ children }) => (
            <th className={isDark ? 'px-4 py-3 text-right font-semibold text-white text-sm' : 'px-4 py-3 text-right font-semibold text-slate-900 text-sm'}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={isDark ? 'px-4 py-3 align-top border-t border-white/10' : 'px-4 py-3 align-top border-t border-slate-200'}>
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className={isDark ? 'font-semibold text-white' : 'font-semibold text-slate-900'}>
              {children}
            </strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
