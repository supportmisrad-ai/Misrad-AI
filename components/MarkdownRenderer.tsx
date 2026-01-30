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
    <div className={cn('w-full', className)} dir="rtl">
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
                className={
                  isDark
                    ? 'text-amber-200 hover:text-amber-100 underline'
                    : 'text-indigo-700 hover:text-indigo-900 underline'
                }
              >
                {children}
              </a>
            );
          },
          h1: ({ children }) => (
            <h1
              className={
                isDark
                  ? 'text-2xl sm:text-3xl font-black tracking-tight text-white mt-8 first:mt-0 mb-4'
                  : 'text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mt-8 first:mt-0 mb-4'
              }
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={
                isDark
                  ? 'text-xl sm:text-2xl font-black tracking-tight text-white mt-10 mb-3 pb-3 border-b border-white/15'
                  : 'text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-10 mb-3 pb-3 border-b border-slate-200'
              }
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={
                isDark
                  ? 'text-base sm:text-lg font-black text-white mt-8 mb-2'
                  : 'text-lg sm:text-xl font-black text-slate-900 mt-8 mb-2'
              }
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p
              className={
                isDark
                  ? 'text-white/90 leading-7 my-4 text-[15px] sm:text-base'
                  : 'text-slate-700 leading-7 my-4 text-[15px] sm:text-base'
              }
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul
              className={
                isDark
                  ? 'list-disc list-outside pr-6 text-white/90 my-4 space-y-2 marker:text-white/40'
                  : 'list-disc list-outside pr-6 text-slate-700 my-4 space-y-2 marker:text-slate-400'
              }
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className={
                isDark
                  ? 'list-decimal list-outside pr-6 text-white/90 my-4 space-y-2 marker:text-white/40'
                  : 'list-decimal list-outside pr-6 text-slate-700 my-4 space-y-2 marker:text-slate-400'
              }
            >
              {children}
            </ol>
          ),
          li: ({ children }) => <li className={isDark ? 'text-white/90 leading-7' : 'text-slate-700 leading-7'}>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className={
                isDark
                  ? 'my-6 rounded-2xl border border-white/10 bg-white/5 pr-5 pl-4 py-4 text-white/85'
                  : 'my-6 rounded-2xl border border-slate-200 bg-slate-50 pr-5 pl-4 py-4 text-slate-700'
              }
            >
              {children}
            </blockquote>
          ),
          hr: () => <hr className={isDark ? 'my-4 border-white/20' : 'my-6 border-slate-200'} />,
          code: ({ children }) => (
            <code
              className={
                isDark
                  ? 'px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-sm'
                  : 'px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-sm'
              }
            >
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className={isDark ? 'my-6 overflow-x-auto rounded-2xl border border-white/10' : 'my-6 overflow-x-auto rounded-2xl border border-slate-200'}>
              <table className={isDark ? 'w-full text-sm text-white/90' : 'w-full text-sm text-slate-700'}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={isDark ? 'bg-white/5' : 'bg-slate-50'}>{children}</thead>,
          th: ({ children }) => (
            <th className={isDark ? 'px-4 py-3 text-right font-black text-white' : 'px-4 py-3 text-right font-black text-slate-900'}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={isDark ? 'px-4 py-3 align-top border-t border-white/10' : 'px-4 py-3 align-top border-t border-slate-200'}>
              {children}
            </td>
          ),
          strong: ({ children }) => <strong className={isDark ? 'font-black text-white' : 'font-black text-slate-900'}>{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
