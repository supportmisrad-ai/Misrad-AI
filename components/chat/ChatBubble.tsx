'use client';

import React from 'react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type ChatBubbleProps = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  avatar?: string;
  name?: string;
  timestamp?: number;
  isTyping?: boolean;
};

export function ChatBubble({ role, content, avatar, name, timestamp, isTyping }: ChatBubbleProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  
  return (
    <div
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      dir="rtl"
    >
      {/* אווטר - רק לעוזר */}
      {!isUser && (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white/30 flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl">{avatar || '🤖'}</span>
        </div>
      )}

      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        {/* שם ושעה */}
        {(name || timestamp) && (
          <div className="flex items-center gap-2 px-2">
            {name && <span className="text-[12px] font-bold text-slate-600">{name}</span>}
            {timestamp && (
              <span className="text-[11px] text-slate-400">
                {new Date(timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {/* בועת תוכן */}
        <div
          className={`rounded-3xl px-5 py-4 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-fit'
              : 'bg-white border-2 border-slate-100 text-slate-900 w-full'
          }`}
          dir="rtl"
        >
          {isTyping ? (
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : isUser ? (
            <p className="text-[16px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <div className="text-[16px] leading-relaxed">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>
      </div>

      {/* אווטר - רק למשתמש */}
      {isUser && (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl">👤</span>
        </div>
      )}
    </div>
  );
}
