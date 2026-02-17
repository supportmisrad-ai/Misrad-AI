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
    <div className="h-full flex flex-col">
      {view === 'history' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">היסטוריית שיחות</h3>
            <button
              onClick={() => setView('chat')}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl transition-all font-bold"
            >
              ← חזרה לצ'אט
            </button>
          </div>
          {chatHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold text-sm">אין שיחות שמורות</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chatHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-600 truncate">{item.preview}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(item.timestamp).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="מחק שיחה"
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-slate-50/30 via-white to-slate-50/30 min-h-0 relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br rounded-full blur-3xl pointer-events-none" style={{ background: moduleGradient, opacity: 0.05 }}></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tl rounded-full blur-3xl pointer-events-none" style={{ background: moduleGradient, opacity: 0.05 }}></div>
          
          {messages.length === 0 && !isThinking ? (
            <div className="flex flex-col items-center justify-center h-full text-center relative z-10">
              <div className="relative mb-6">
                <div 
                  className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl" 
                  style={{ background: `linear-gradient(135deg, ${moduleGradient})` }}
                >
                  <Sparkles size={44} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">שלום! איך אני יכול לעזור?</h3>
              <p className="text-sm text-slate-600 max-w-md leading-relaxed">
                שאל אותי על לידים, משימות, סטטיסטיקות או כל דבר אחר במערכת
              </p>
              
              {resolvedStarters.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3 justify-center max-w-2xl">
                  {resolvedStarters.map((starter) => (
                    <button
                      key={starter.id}
                      onClick={() => sendText?.(starter.text)}
                      className="px-4 py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-bold text-slate-700 hover:text-slate-900 transition-all hover:shadow-sm"
                    >
                      {starter.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              {messages.map((message) => (
                <div key={message.id}>
                  <ChatBubble
                    role={message.role}
                    content={extractMessageText(message)}
                    avatar={message.role === 'assistant' ? '🤖' : undefined}
                    name={message.role === 'assistant' ? 'איציק AI' : undefined}
                    timestamp={Date.now()}
                  />
                  {message.role === 'assistant' && Array.isArray(message.sources) && message.sources.length > 0 && (
                    <div className="mr-14 mt-2">
                      <ChatSources sources={message.sources} />
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div>
                  <ChatBubble
                    role="assistant"
                    content=""
                    avatar="🤖"
                    name="איציק AI"
                    isTyping
                  />
                </div>
              )}

              {Boolean(error) && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                  <p className="text-sm font-bold text-red-700">
                    <strong>שגיאה:</strong> {getErrorMessage(error) || 'אירעה שגיאה. נסה שוב.'}
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}

      <div className="shrink-0 p-5 border-t border-slate-200 bg-white">
        {view === 'chat' && orgSlug && (
          <div className="absolute top-5 left-5">
            <button
              onClick={() => setView('history')}
              className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              title="היסטוריית שיחות"
            >
              <Clock size={20} />
            </button>
          </div>
        )}
        
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="שאל שאלה..."
              className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100 resize-none text-base leading-relaxed transition-all"
              style={{ minHeight: '56px', maxHeight: '120px' }}
              disabled={isThinking || view === 'history'}
              dir="rtl"
              rows={1}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!query.trim() || isThinking || view === 'history'}
            className="px-6 h-14 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl hover:from-slate-800 hover:to-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:shadow-none font-bold"
          >
            <Send size={20} />
            <span className="hidden sm:inline">שלח</span>
          </button>
        </div>
      </div>
    </div>
  );
}

