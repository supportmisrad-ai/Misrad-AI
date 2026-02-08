'use client';

import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Clock, Trash2 } from 'lucide-react';
import { ChatSources } from './ChatSources';
import { Skeleton } from '@/components/ui/skeletons';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatHistoryItem } from '@/components/chat/ChatHistory';
import { saveChatHistory, getChatHistory, deleteChatHistory } from '@/app/actions/chat-history';
import type { AIModuleChatMessage } from './useAIModuleChat';
import { getErrorMessage } from '@/lib/shared/unknown';

interface CommandPaletteChatProps {
  query: string;
  setQuery: (query: string) => void;
  messages: AIModuleChatMessage[];
  isThinking: boolean;
  error: unknown;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  extractMessageText: (message: unknown) => string;
  handleSendMessage: () => void;
  sendText?: (text: string) => void;
  starters?: Array<{ id: string; text: string }>;
  onKeyDown: (e: React.KeyboardEvent) => void;

  moduleGradient: string;
  moduleAccent: string;
  moduleKey?: string;
  orgSlug?: string | null;
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
  moduleAccent,
  moduleKey = 'general',
  orgSlug
}: CommandPaletteChatProps) {
  const resolvedStarters = Array.isArray(starters) ? starters : [];
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [currentSessionId] = useState<string>(`session_${Date.now()}`);

  useEffect(() => {
    if (orgSlug) {
      loadHistory();
    }
  }, [orgSlug]);

  const loadHistory = async () => {
    if (!orgSlug) return;
    const result = await getChatHistory({ moduleKey });
    if (result.success && result.data) {
      setChatHistory(result.data);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!orgSlug) return;
    await deleteChatHistory({ moduleKey, chatSessionId: id });
    await loadHistory();
  };

  useEffect(() => {
    if (orgSlug && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      const chatMessages = messages.map(m => ({
        id: m.id || `msg_${Date.now()}`,
        role: m.role,
        content: extractMessageText(m),
        timestamp: Date.now()
      }));

      const title = messages[0]?.content?.slice(0, 50) || 'שיחה חדשה';
      const preview = messages[0]?.content?.slice(0, 80) || '';

      setTimeout(() => {
        saveChatHistory({
          moduleKey,
          chatSessionId: currentSessionId,
          title,
          preview,
          messages: chatMessages,
        }).then(() => loadHistory());
      }, 1000);
    }
  }, [messages, orgSlug]);

  return (
    <>
      {view === 'history' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[18px] font-bold text-slate-900">היסטוריית שיחות</h3>
            <button
              onClick={() => setView('chat')}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium"
            >
              ← חזרה לצ'אט
            </button>
          </div>
          {chatHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Clock size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">אין שיחות שמורות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[14px] text-slate-900 truncate mb-1">{item.title}</h4>
                      <p className="text-[12px] text-slate-600 truncate">{item.preview}</p>
                      <p className="text-[11px] text-slate-400 mt-2">
                        {new Date(item.timestamp).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
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
          <div key={message.id} className="relative z-10">
            <ChatBubble
              role={message.role}
              content={extractMessageText(message)}
              avatar={message.role === 'assistant' ? '🤖' : undefined}
              name={message.role === 'assistant' ? 'איציק' : undefined}
              timestamp={Date.now()}
            />
            {message.role === 'assistant' && Array.isArray(message.sources) && message.sources.length ? (
              <div className="mr-14 mt-2">
                <ChatSources sources={message.sources} />
              </div>
            ) : null}
          </div>
        ))}

        {isThinking && (
          <div className="relative z-10">
            <ChatBubble
              role="assistant"
              content=""
              avatar="🤖"
              isTyping
            />
          </div>
        )}

        {Boolean(error) && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-[14px] relative z-10">
            <strong>שגיאה:</strong> {getErrorMessage(error) || 'אירעה שגיאה. נסה שוב.'}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      )}

      <div className="p-5 border-t border-slate-200/60 bg-gradient-to-r from-white via-slate-50/50 to-white backdrop-blur-xl shrink-0 relative">
        {view === 'chat' && (
          <div className="absolute top-3 left-5">
            <button
              onClick={() => setView('history')}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              title="היסטוריית שיחות"
            >
              <Clock size={20} />
            </button>
          </div>
        )}
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="שאל שאלה..."
              className="w-full px-5 py-[14px] border-2 border-slate-200 rounded-3xl focus:outline-none focus:border-blue-400 resize-none min-h-[56px] max-h-[120px] text-[16px] leading-[1.5]"
              disabled={isThinking || view === 'history'}
              dir="rtl"
              rows={1}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!query.trim() || isThinking || view === 'history'}
            className="px-6 py-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:shadow-none min-h-[56px] font-bold"
          >
            <Send size={20} />
            <span className="hidden sm:inline">שלח</span>
          </button>
        </div>
      </div>
    </>
  );
}

