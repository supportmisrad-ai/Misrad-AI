'use client';

import React, { useState } from 'react';
import { Phone, MoreVertical, Send } from 'lucide-react';
import { Conversation } from '@/types/social';

interface MessagesTabProps {
  conversations: Conversation[];
  onSendMessage: (convId: string, text: string) => void;
}

const MessagesTab: React.FC<MessagesTabProps> = ({ conversations, onSendMessage }) => {
  const [replyMessage, setReplyMessage] = useState('');

  const currentConv = conversations[0];

  return (
    <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col h-[600px]">
      <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-6">
        <h3 className="text-2xl font-black">הודעות מהפורטל</h3>
        <div className="flex items-center gap-4">
          <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-900"><Phone size={20}/></button>
          <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-900"><MoreVertical size={20}/></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar">
        {currentConv?.messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.isMe ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-5 rounded-[28px] font-bold text-sm shadow-sm ${msg.isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200'}`}>
              {msg.text}
              <p className={`text-[10px] mt-2 font-black ${msg.isMe ? 'text-blue-200' : 'text-slate-300'}`}>{msg.timestamp}</p>
            </div>
          </div>
        ))}
        {!currentConv && <div className="text-center py-20 text-slate-300 font-bold">אין שיחות פעילות</div>}
      </div>
      <div className="mt-8 pt-8 border-t border-slate-200 flex gap-3">
        <input 
          value={replyMessage}
          onChange={e => setReplyMessage(e.target.value)}
          placeholder="הקלד תשובה ללקוח..." 
          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 ring-blue-50 transition-all"
        />
        <button 
          onClick={() => { if(replyMessage) { onSendMessage(currentConv?.id || '1', replyMessage); setReplyMessage(''); } }} 
          className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all focus:outline-none"
        >
          <Send size={24} style={{ transform: 'rotate(-90deg)' }} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default MessagesTab;

