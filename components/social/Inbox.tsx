'use client';

import React, { useState } from 'react';
import { MessageSquare, Send, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function Inbox() {
  const { clients, conversations, addToast } = useApp();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = (convId: string) => {
    if (!messageText.trim()) return;
    addToast('הודעה נשלחה');
    setMessageText('');
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-8 pb-32" dir="rtl">
      <h1 className="text-4xl font-black text-slate-900">תיבת הודעות</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-[32px] border border-slate-200 shadow-xl p-6">
          <h2 className="text-xl font-black mb-6">שיחות</h2>
          <div className="flex flex-col gap-3">
            {conversations.length > 0 ? conversations.map(conv => {
              const client = clients.find(c => c.id === conv.clientId);
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`p-4 rounded-2xl border border-slate-200 text-right transition-all ${
                    selectedConversation === conv.id 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <img src={conv.userAvatar} className="w-10 h-10 rounded-xl" alt={conv.userName} />
                    <div className="flex-1">
                      <p className={`font-black text-sm ${selectedConversation === conv.id ? 'text-white' : 'text-slate-900'}`}>
                        {conv.userName}
                      </p>
                      <p className={`text-xs font-bold ${selectedConversation === conv.id ? 'text-slate-300' : 'text-slate-400'}`}>
                        {conv.platform}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-bold line-clamp-2 ${selectedConversation === conv.id ? 'text-slate-200' : 'text-slate-600'}`}>
                    {conv.lastMessage}
                  </p>
                  <p className={`text-xs font-black mt-2 ${selectedConversation === conv.id ? 'text-slate-400' : 'text-slate-400'}`}>
                    {conv.timestamp}
                  </p>
                </button>
              );
            }) : (
              <div className="text-center py-12">
                <MessageSquare size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">אין שיחות פעילות</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages View */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-xl p-6 flex flex-col">
          {selectedConversation ? (
            <>
              <div className="flex-1 overflow-y-auto mb-6 space-y-4">
                {conversations.find(c => c.id === selectedConversation)?.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isMe ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[70%] p-4 rounded-2xl ${
                      msg.isMe 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-50 text-slate-900'
                    }`}>
                      <p className="font-bold text-sm mb-1">{msg.sender}</p>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs font-black mt-2 ${
                        msg.isMe ? 'text-slate-300' : 'text-slate-400'
                      }`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 border-t border-slate-200 pt-4">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="כתוב הודעה..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-slate-900 font-bold"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && selectedConversation) {
                      handleSendMessage(selectedConversation);
                    }
                  }}
                />
                <button
                  onClick={() => selectedConversation && handleSendMessage(selectedConversation)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2"
                >
                  <Send size={20} />
                  שלח
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={64} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">בחר שיחה כדי להתחיל</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

