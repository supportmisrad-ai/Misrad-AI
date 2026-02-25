'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  ArrowRight,
  Plus,
  X,
  CheckCheck,
  Globe,
  Loader2,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Avatar } from '@/components/Avatar';
import type { Conversation, Message, Client, SocialPlatform } from '@/types/social';
import {
  getMessages,
  sendMessage,
  markConversationAsRead,
  createConversation,
} from '@/app/actions/conversations';

// ─── Platform helpers ───────────────────────────────────────────────
const PLATFORM_META: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: 'bg-green-500' },
  facebook: { label: 'Facebook', color: 'bg-blue-600' },
  instagram: { label: 'Instagram', color: 'bg-pink-500' },
  linkedin: { label: 'LinkedIn', color: 'bg-sky-700' },
  tiktok: { label: 'TikTok', color: 'bg-slate-900' },
  twitter: { label: 'X', color: 'bg-slate-800' },
  google: { label: 'Google', color: 'bg-red-500' },
  threads: { label: 'Threads', color: 'bg-slate-700' },
  youtube: { label: 'YouTube', color: 'bg-red-600' },
  pinterest: { label: 'Pinterest', color: 'bg-red-700' },
  portal: { label: 'פורטל', color: 'bg-indigo-500' },
};

function getPlatformMeta(p: string) {
  return PLATFORM_META[p] ?? { label: p, color: 'bg-slate-400' };
}

function formatTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return d.toLocaleDateString('he-IL', { weekday: 'short' });
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

function formatMessageTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// ─── New Conversation Modal ─────────────────────────────────────────
function NewConversationModal({
  clients,
  orgSlug,
  onCreated,
  onClose,
}: {
  clients: Client[];
  orgSlug: string | null;
  onCreated: (conv: Conversation) => void;
  onClose: () => void;
}) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [userName, setUserName] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>('portal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.companyName.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!orgSlug || !selectedClientId || !userName.trim()) return;
    setIsSubmitting(true);
    const res = await createConversation(orgSlug, selectedClientId, userName.trim(), platform);
    setIsSubmitting(false);
    if (res.success && res.data) {
      onCreated(res.data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">שיחה חדשה</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          {/* Client selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-500">בחר לקוח</label>
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="חפש לקוח..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {clientSearch && filteredClients.length > 0 && !selectedClientId && (
              <div className="max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                {filteredClients.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedClientId(c.id);
                      setClientSearch(c.companyName || c.name);
                    }}
                    className="w-full text-right px-4 py-2.5 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <Avatar name={c.name} src={c.avatar} size="xs" />
                    <span className="truncate">{c.companyName || c.name}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedClientId && (
              <button
                onClick={() => {
                  setSelectedClientId('');
                  setClientSearch('');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 self-start"
              >
                שנה בחירה
              </button>
            )}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-500">שם איש קשר</label>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="שם מלא..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-500">פלטפורמה</label>
            <div className="flex flex-wrap gap-2">
              {(['portal', 'whatsapp', 'facebook', 'instagram', 'linkedin'] as const).map((p) => {
                const meta = getPlatformMeta(p);
                const isActive = platform === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
          <button
            disabled={!selectedClientId || !userName.trim() || isSubmitting}
            onClick={handleSubmit}
            className="w-full bg-gradient-to-l from-blue-600 to-indigo-600 text-white font-black text-sm py-3 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {isSubmitting ? 'יוצר שיחה...' : 'צור שיחה'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Conversation List Item ─────────────────────────────────────────
function ConversationItem({
  conv,
  client,
  isActive,
  onClick,
}: {
  conv: Conversation;
  client?: Client;
  isActive: boolean;
  onClick: () => void;
}) {
  const meta = getPlatformMeta(conv.platform);
  return (
    <button
      onClick={onClick}
      className={`w-full text-right p-4 flex items-center gap-3.5 transition-all group ${
        isActive
          ? 'bg-blue-50/80 border-r-[3px] border-r-blue-500'
          : 'hover:bg-slate-50/80 border-r-[3px] border-r-transparent'
      }`}
    >
      <div className="relative shrink-0">
        <Avatar name={conv.userName} src={conv.userAvatar} size="md" rounded="xl" />
        <div
          className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-md ${meta.color} border-2 border-white`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
            {conv.userName}
          </p>
          <span className="text-[10px] font-bold text-slate-400 shrink-0">
            {formatTime(conv.timestamp)}
          </span>
        </div>
        {client && (
          <p className="text-[10px] font-black text-slate-400 truncate mb-0.5">{client.companyName}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-bold text-slate-700' : 'font-medium text-slate-400'}`}>
            {conv.lastMessage || 'אין הודעות עדיין'}
          </p>
          {conv.unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
              {conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Message Thread View ────────────────────────────────────────────
function MessageThread({
  conv,
  client,
  orgSlug,
  onBack,
  onConversationRead,
}: {
  conv: Conversation;
  client?: Client;
  orgSlug: string | null;
  onBack: () => void;
  onConversationRead: (convId: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages
  useEffect(() => {
    if (!orgSlug) return;
    setIsLoading(true);
    getMessages(orgSlug, conv.id).then((res) => {
      if (res.success && res.data) {
        setMessages(res.data);
      }
      setIsLoading(false);
    });
    // Mark as read
    if (conv.unreadCount > 0) {
      markConversationAsRead(orgSlug, conv.id).then(() => {
        onConversationRead(conv.id);
      });
    }
  }, [orgSlug, conv.id, conv.unreadCount, onConversationRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !orgSlug || isSending) return;

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: 'me',
      text: trimmed,
      timestamp: new Date().toISOString(),
      isMe: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setIsSending(true);

    const res = await sendMessage(orgSlug, conv.id, trimmed);
    setIsSending(false);

    if (res.success && res.data) {
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? res.data! : m)));
    } else {
      // Revert on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInputText(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const meta = getPlatformMeta(conv.platform);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-slate-100 bg-white flex items-center gap-4 shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ArrowRight size={16} className="text-slate-600" />
        </button>
        <div className="relative">
          <Avatar name={conv.userName} src={conv.userAvatar} size="lg" rounded="xl" />
          <div className={`absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-lg ${meta.color} border-2 border-white flex items-center justify-center`}>
            <Globe size={10} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-base text-slate-900 truncate">{conv.userName}</p>
          <div className="flex items-center gap-2">
            {client && (
              <span className="text-xs font-bold text-slate-400 truncate">{client.companyName}</span>
            )}
            <span className={`text-[10px] font-black text-white px-1.5 py-0.5 rounded-md ${meta.color}`}>
              {meta.label}
            </span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-slate-50/50 to-white" dir="rtl">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <p className="text-xs font-bold text-slate-400">טוען הודעות...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <MessageSquare size={28} className="text-slate-300" />
              </div>
              <div>
                <p className="font-black text-slate-700 mb-1">עדיין אין הודעות</p>
                <p className="text-xs font-bold text-slate-400">שלח את ההודעה הראשונה כדי להתחיל</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {messages.map((msg, idx) => {
              const showDate =
                idx === 0 ||
                new Date(msg.timestamp).toDateString() !==
                  new Date(messages[idx - 1].timestamp).toDateString();
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                        {new Date(msg.timestamp).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${msg.isMe ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[75%] px-4 py-3 shadow-sm ${
                        msg.isMe
                          ? 'bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md'
                          : 'bg-white border border-slate-100 text-slate-900 rounded-2xl rounded-bl-md'
                      }`}
                    >
                      {!msg.isMe && (
                        <p className="text-[10px] font-black text-slate-400 mb-1">{msg.sender}</p>
                      )}
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                      <div className={`flex items-center gap-1 mt-1 ${msg.isMe ? 'justify-start' : 'justify-end'}`}>
                        <span className={`text-[10px] font-bold ${msg.isMe ? 'text-white/60' : 'text-slate-400'}`}>
                          {formatMessageTime(msg.timestamp)}
                        </span>
                        {msg.isMe && <CheckCheck size={12} className="text-white/60" />}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-100 bg-white shrink-0" dir="rtl">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="כתוב הודעה..."
              rows={1}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pr-4 text-sm font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none min-h-[44px] max-h-[120px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                el.style.overflow = el.scrollHeight > 120 ? 'auto' : 'hidden';
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="w-11 h-11 bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="rotate-180" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Inbox Component ───────────────────────────────────────────
export default function Inbox() {
  const { clients, conversations, setConversations, orgSlug } = useApp();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const client = clients.find((c) => c.id === conv.clientId);
    return (
      conv.userName.toLowerCase().includes(q) ||
      conv.lastMessage.toLowerCase().includes(q) ||
      (client?.companyName || '').toLowerCase().includes(q) ||
      conv.platform.toLowerCase().includes(q)
    );
  });

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const activeClient = activeConversation
    ? clients.find((c) => c.id === activeConversation.clientId)
    : undefined;

  const handleConversationRead = useCallback(
    (convId: string) => {
      setConversations((prev: Conversation[]) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    },
    [setConversations]
  );

  const handleNewConversation = (conv: Conversation) => {
    setConversations((prev: Conversation[]) => [conv, ...prev]);
    setActiveConversationId(conv.id);
    setShowNewModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900">תיבת הודעות</h1>
          <p className="text-sm font-bold text-slate-400">
            {conversations.length > 0
              ? `${conversations.length} שיחות${totalUnread > 0 ? ` · ${totalUnread} לא נקראו` : ''}`
              : 'ניהול שיחות עם לקוחות במקום אחד'}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white font-black text-xs px-5 py-2.5 rounded-2xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
        >
          <Plus size={16} />
          שיחה חדשה
        </button>
      </div>

      {/* Main container */}
      <div className="bg-white rounded-[32px] md:rounded-[48px] border border-slate-200 shadow-xl overflow-hidden h-[calc(100vh-220px)] min-h-[500px]">
        {conversations.length === 0 ? (
          /* ── Global empty state ── */
          <div className="flex items-center justify-center h-full p-8">
            <div className="flex flex-col items-center gap-6 text-center max-w-sm">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[28px] flex items-center justify-center">
                <MessageSquare size={44} className="text-blue-300" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-2">אין שיחות עדיין</h3>
                <p className="text-sm font-bold text-slate-400 leading-relaxed">
                  צרו שיחה חדשה עם לקוח כדי להתחיל לנהל את כל התקשורת במקום אחד — בקשות, אישורים, משובים ועדכונים.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(true)}
                className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white font-black text-sm px-6 py-3 rounded-2xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
              >
                <Plus size={16} />
                שיחה ראשונה
              </button>
            </div>
          </div>
        ) : (
          /* ── Split view ── */
          <div className="flex h-full">
            {/* Sidebar - conversation list */}
            <div
              className={`w-full lg:w-[360px] xl:w-[400px] border-l border-slate-100 flex flex-col shrink-0 ${
                activeConversationId ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Search bar */}
              <div className="p-4 border-b border-slate-100 shrink-0">
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש שיחה, לקוח או פלטפורמה..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Search size={32} className="text-slate-200 mb-3" />
                    <p className="font-black text-sm text-slate-500">
                      {searchQuery ? 'לא נמצאו תוצאות' : 'אין שיחות'}
                    </p>
                    <p className="text-xs font-bold text-slate-400 mt-1">
                      {searchQuery ? 'נסו לחפש מונח אחר' : 'צרו שיחה חדשה כדי להתחיל'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {filteredConversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conv={conv}
                        client={clients.find((c) => c.id === conv.clientId)}
                        isActive={activeConversationId === conv.id}
                        onClick={() => setActiveConversationId(conv.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main area - message thread */}
            <div className={`flex-1 flex flex-col bg-white ${!activeConversationId ? 'hidden lg:flex' : 'flex'}`}>
              {activeConversation ? (
                <MessageThread
                  key={activeConversation.id}
                  conv={activeConversation}
                  client={activeClient}
                  orgSlug={orgSlug}
                  onBack={() => setActiveConversationId(null)}
                  onConversationRead={handleConversationRead}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center">
                      <MessageSquare size={36} className="text-slate-200" />
                    </div>
                    <div>
                      <p className="font-black text-slate-600 mb-1">בחרו שיחה</p>
                      <p className="text-xs font-bold text-slate-400">
                        בחרו שיחה מהרשימה כדי לצפות בהודעות
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <NewConversationModal
          clients={clients}
          orgSlug={orgSlug}
          onCreated={handleNewConversation}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}
