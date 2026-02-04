'use client';

import React from 'react';
import { ChevronLeft, MessageSquare, Trash2 } from 'lucide-react';

export type ChatHistoryItem = {
  id: string;
  title: string;
  preview: string;
  timestamp: number;
  messagesCount?: number;
  messages?: Array<{ id: string; role: string; content: string; timestamp: number }>;
};

type ChatHistoryProps = {
  history: ChatHistoryItem[];
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onBack: () => void;
};

export function ChatHistory({ history, onSelect, onDelete, onBack }: ChatHistoryProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* כותרת */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold text-[14px] transition-colors"
        >
          <ChevronLeft size={18} />
          <span>חזרה לשיחה</span>
        </button>
        <h3 className="text-[17px] font-bold text-slate-900 mt-3">היסטוריית שיחות</h3>
        <p className="text-[13px] text-slate-500 mt-1">{history.length} שיחות שמורות</p>
      </div>

      {/* רשימה */}
      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <MessageSquare size={48} className="mb-3 opacity-30" />
            <p className="text-[14px] font-medium">אין היסטוריה עדיין</p>
            <p className="text-[12px] mt-1">שיחות שתשמור יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="group relative bg-white rounded-2xl border-2 border-slate-100 hover:border-slate-300 p-4 cursor-pointer transition-all hover:shadow-md"
                onClick={() => onSelect(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-bold text-slate-900 truncate">{item.title}</h4>
                    <p className="text-[13px] text-slate-500 line-clamp-2 mt-1">{item.preview}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>{new Date(item.timestamp).toLocaleDateString('he-IL')}</span>
                      {item.messagesCount && <span>• {item.messagesCount} הודעות</span>}
                    </div>
                  </div>

                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-all"
                      aria-label="מחק"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
