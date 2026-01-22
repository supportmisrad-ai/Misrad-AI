import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export default function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={className} dir="rtl">
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
                className="text-indigo-700 hover:text-indigo-900 underline"
              >
                {children}
              </a>
            );
          },
          h1: ({ children }) => <h1 className="text-3xl font-black text-slate-900 mt-6 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-2xl font-black text-slate-900 mt-6 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xl font-black text-slate-900 mt-5 mb-2">{children}</h3>,
          p: ({ children }) => <p className="text-slate-700 leading-relaxed my-3">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside text-slate-700 my-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-slate-700 my-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-slate-700">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-r-4 border-slate-200 pr-4 text-slate-600 my-4">{children}</blockquote>
          ),
          hr: () => <hr className="my-6 border-slate-200" />,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-sm">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
