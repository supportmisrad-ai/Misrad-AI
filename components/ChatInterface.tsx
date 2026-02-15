'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatHistory, ChatHistoryItem } from '@/components/chat/ChatHistory';
import { saveChatHistory, getChatHistory, deleteChatHistory } from '@/app/actions/chat-history';

interface ChatInterfaceProps {
  className?: string;
  initialMessage?: string;
  moduleKey?: string; // 'nexus', 'social', 'finance', etc.
  assistantName?: string;
  assistantRole?: string;
  assistantAvatar?: string;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export default function ChatInterface({
  className = '',
  initialMessage,
  moduleKey = 'general',
  assistantName = 'איציק',
  assistantRole = 'עוזר AI חכם',
  assistantAvatar = '🤖',
}: ChatInterfaceProps) {
  const [input, setInput] = useState(initialMessage || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(`session_${Date.now()}`);

  let orgSlug: string | null = null;
  try {
    orgSlug = useApp().orgSlug;
  } catch {
    orgSlug = null;
  }

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load history on mount
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

  const saveCurrentChat = async () => {
    if (!orgSlug || messages.length === 0) return;

    const title = messages[0]?.content?.slice(0, 50) || 'שיחה חדשה';
    const preview = messages[0]?.content?.slice(0, 80) || '';

    await saveChatHistory({
      moduleKey,
      chatSessionId: currentSessionId,
      title,
      preview,
      messages,
    });

    await loadHistory();
  };

  const doSubmit = () => {
    if (!input.trim() || isLoading) return;

    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      setError('חסר ארגון פעיל. עבור למסך עם Workspace פעיל ונסה שוב.');
      return;
    }

    const userText = input;
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const nextMessages = [...messages, userMessage];
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'x-org-id': resolvedOrgSlug 
          },
          body: JSON.stringify({ 
            messages: nextMessages.map(m => ({ 
              role: m.role, 
              parts: [{ type: 'text', text: m.content }] 
            }))
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as Record<string, unknown>;
          throw new Error(String(data?.error || 'שגיאה בבוט. נסה שוב.'));
        }

        const text = await res.text();
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: text || '',
          timestamp: Date.now(),
        };
        
        const updatedMessages = [...nextMessages, assistantMessage];
        setMessages(updatedMessages);

        // Auto-save after AI response
        setTimeout(() => saveCurrentChat(), 1000);
      } catch (err: unknown) {
        setError(String(err instanceof Error ? err.message : err || 'שגיאה בבוט. נסה שוב.'));
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSubmit();
    }
  };

  const handleLoadHistory = (id: string) => {
    const item = chatHistory.find(h => h.id === id);
    if (item && item.messages) {
      setMessages(item.messages as ChatMessage[]);
      setCurrentSessionId(id);
      setView('chat');
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!orgSlug) return;
    
    await deleteChatHistory({ moduleKey, chatSessionId: id });
    await loadHistory();
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(`session_${Date.now()}`);
    setView('chat');
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <ChatHeader
        name={assistantName}
        role={assistantRole}
        avatar={assistantAvatar}
        onShowHistory={() => setView(view === 'history' ? 'chat' : 'history')}
        showHistory={view === 'history'}
      />

      {/* Content */}
      {view === 'history' ? (
        <ChatHistory
          history={chatHistory}
          onSelect={handleLoadHistory}
          onDelete={handleDeleteHistory}
          onBack={() => setView('chat')}
        />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
                  <Sparkles size={32} className="text-slate-600" />
                </div>
                <p className="text-[16px] font-bold mb-2">שלום! איך אני יכול לעזור?</p>
                <p className="text-[14px]">שאל אותי על לידים, משימות, סטטיסטיקות או כל דבר אחר</p>
              </div>
            )}

            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                role={message.role}
                content={message.content}
                avatar={message.role === 'assistant' ? assistantAvatar : undefined}
                name={message.role === 'assistant' ? assistantName : undefined}
                timestamp={message.timestamp}
              />
            ))}

            {isLoading && (
              <ChatBubble
                role="assistant"
                content=""
                avatar={assistantAvatar}
                isTyping
              />
            )}

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-[14px]">
                <strong>שגיאה:</strong> {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t-2 border-slate-100 bg-white">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="שאל שאלה..."
                  className="w-full px-5 py-[14px] border-2 border-slate-200 rounded-3xl focus:outline-none focus:border-blue-400 resize-none min-h-[56px] max-h-[120px] text-[16px] leading-[1.5]"
                  disabled={isLoading}
                  dir="rtl"
                  rows={1}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-6 py-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:shadow-none min-h-[56px] font-bold"
              >
                <Send size={20} />
                <span className="hidden sm:inline">שלח</span>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
