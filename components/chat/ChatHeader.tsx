'use client';

import React from 'react';
import { X, Minimize2, Maximize2, Clock } from 'lucide-react';

type ChatHeaderProps = {
  name: string;
  role: string;
  avatar: string;
  onClose?: () => void;
  onToggleSize?: () => void;
  isExpanded?: boolean;
  showHistory?: boolean;
  onShowHistory?: () => void;
};

export function ChatHeader({
  name,
  role,
  avatar,
  onClose,
  onToggleSize,
  isExpanded,
  showHistory,
  onShowHistory,
}: ChatHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-slate-700 to-slate-800 text-white px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white/30 flex items-center justify-center shadow-lg">
          <span className="text-2xl">{avatar}</span>
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-black truncate">{name}</div>
          <div className="text-[12px] font-bold text-white/80 truncate">{role}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onShowHistory && (
          <button
            type="button"
            onClick={onShowHistory}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center transition-colors"
            aria-label="היסטוריה"
          >
            <Clock size={18} />
          </button>
        )}
        
        {onToggleSize && (
          <button
            type="button"
            onClick={onToggleSize}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center transition-colors"
            aria-label={isExpanded ? 'הקטן' : 'הרחב'}
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center transition-colors"
            aria-label="סגור"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
