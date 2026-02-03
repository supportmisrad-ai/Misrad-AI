'use client';

import React from 'react';
import { Send, Bot, User, X, Sparkles } from 'lucide-react';
import { ChatSources } from './ChatSources';
import { Skeleton } from '@/components/ui/skeletons';

interface CommandPaletteChatProps {
  query: string;
  setQuery: (query: string) => void;
  messages: any[];
  isThinking: boolean;
  error: any;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  extractMessageText: (message: any) => string;
  handleSendMessage: () => void;
  sendText?: (text: string) => void;
  starters?: Array<{ id: string; text: string }>;
  onKeyDown: (e: React.KeyboardEvent) => void;

  moduleGradient: string;
  moduleAccent: string;
}

export function CommandPaletteChat({
  query,
  setQuery,
  messages,
  isThinking,
  error,
  messagesEndRef,
  inputRef,
  extractMessageText,
  handleSendMessage,
  sendText,
  starters,
  onKeyDown,
  moduleGradient,
  moduleAccent
}: CommandPaletteChatProps) {
  const resolvedStarters = Array.isArray(starters) ? starters : [];

  return (
    <>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-white via-slate-50/30 to-white space-y-5 min-h-0 relative">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: moduleAccent, opacity: 0.03 }}></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: moduleAccent, opacity: 0.03 }}></div>
        
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 relative z-10">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl border-2 border-white/50" style={{ background: moduleGradient }}>
                <Sparkles size={40} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
            </div>
            <p className="text-xl font-bold text-slate-800 mb-2">שלום! איך אני יכול לעזור?</p>
            <p className="text-sm text-slate-500 max-w-md">שאל אותי על לידים, משימות, סטטיסטיקות או כל דבר אחר במערכת</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-4 relative z-10 ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border-2 ${
                message.role === 'user'
                  ? 'text-white border-white/30'
                  : 'bg-slate-100 text-slate-700 border-white/50'
              }`}
              style={message.role === 'user' ? { background: moduleGradient } : undefined}
            >
              {message.role === 'user' ? (
                <User className="w-5 h-5" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>

            <div
              className={`flex-1 rounded-3xl p-4 max-w-[75%] backdrop-blur-sm transition-all duration-200 ${
                message.role === 'user'
                  ? 'text-white shadow-lg border border-white/20'
                  : 'bg-white/80 backdrop-blur-md border border-slate-200/60 text-slate-900 shadow-md hover:shadow-lg'
              }`}
              style={message.role === 'user' ? { background: moduleGradient } : undefined}
            >
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed font-medium">
                {extractMessageText(message)}
              </div>

              {message.role === 'assistant' && Array.isArray((message as any)?.sources) && (message as any).sources.length ? (
                <ChatSources sources={(message as any).sources} />
              ) : null}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-4 relative z-10">
            <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-slate-100 border-2 border-white/50 shadow-lg flex items-center justify-center">
              <Bot className="w-5 h-5" style={{ color: moduleAccent }} />
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 border border-slate-200/60 shadow-md">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-full" />
                <span className="text-sm text-slate-600 font-medium">חושב...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50/80 backdrop-blur-md border border-red-200/60 rounded-3xl shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-xl shrink-0">
                <X className="text-red-600" size={20} />
              </div>
              <div className="flex-1">
                <div className="text-red-800 font-bold text-sm mb-1">שגיאה בצ'אט</div>
                <div className="text-red-700 text-sm">
                  {error.message || 'אירעה שגיאה. נסה שוב.'}
                </div>
                {(error.message?.includes('API') || error.message?.includes('network') || error.message?.includes('fetch')) && (
                  <div className="mt-2 text-xs text-red-600">
                    ⚠️ בדוק את חיבור האינטרנט והגדרות ה-AI
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 border-t border-slate-200/60 bg-gradient-to-r from-white via-slate-50/50 to-white backdrop-blur-xl shrink-0 relative">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="שאל שאלה..."
              className="w-full px-5 py-4 pr-14 bg-white/80 backdrop-blur-md border-2 border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:border-slate-300 resize-none min-h-[56px] max-h-[120px] text-base leading-relaxed shadow-sm transition-all duration-200"
              disabled={isThinking}
              dir="rtl"
              rows={1}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!query.trim() || isThinking}
            className="px-6 py-4 text-white rounded-2xl hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 shadow-lg min-h-[56px] hover:scale-105 active:scale-95 disabled:hover:scale-100"
            style={{ background: moduleGradient }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}

