'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';

interface ChatInterfaceProps {
  className?: string;
  initialMessage?: string;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
};

export default function ChatInterface({ className = '', initialMessage }: ChatInterfaceProps) {
  const [input, setInput] = useState(initialMessage || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Set initial message if provided
  useEffect(() => {
    if (initialMessage && initialMessage.trim() && messages.length === 0 && !isLoading) {
      // Don't auto-send, just set it in the input
      setInput(initialMessage);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [initialMessage, messages.length, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      parts: [{ type: 'text', text: userText }],
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: nextMessages }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(String((data as any)?.error || 'שגיאה בבוט. נסה שוב.'));
        }

        const text = await res.text();
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          parts: [{ type: 'text', text: text || '' }],
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        setError(String(err?.message || 'שגיאה בבוט. נסה שוב.'));
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, but allow Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white">Nexus Brain</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">עוזר AI חכם</p>
        </div>
      </div>

      {/* Messages Container */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <Bot className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium mb-2">שלום! איך אני יכול לעזור?</p>
            <p className="text-sm">שאל אותי על לידים, משימות, סטטיסטיקות או כל דבר אחר</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Message Content */}
            <div
              className={`flex-1 rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.parts.map((part, i) => (
                  <div key={`${message.id}-${i}`} className="text-sm leading-relaxed">
                    {part.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <Skeleton className="w-4 h-4 rounded-full" />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            שגיאה: {error}
          </div>
        )}

        {/* Scroll anchor for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="שאל שאלה או בקש עזרה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none min-h-[52px] max-h-[120px] text-base leading-relaxed"
              disabled={isLoading}
              dir="rtl"
              rows={1}
            />
            <div className="absolute left-3 bottom-3 text-xs text-gray-400 dark:text-gray-500">
              {input.length > 0 && `${input.length} תווים`}
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:shadow-none min-h-[52px]"
            title="שלח (Enter)"
          >
            {isLoading ? (
              <Skeleton className="w-5 h-5 rounded-full bg-white/30" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="font-medium hidden sm:inline">שלח</span>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">Enter</kbd> לשליחה • <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">Shift+Enter</kbd> לשורה חדשה
        </div>
      </form>
    </div>
  );
}

