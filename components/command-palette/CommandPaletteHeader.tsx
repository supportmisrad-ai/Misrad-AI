'use client';

import React from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { CommandPaletteMode } from './command-palette.types';

interface CommandPaletteHeaderProps {
  mode: CommandPaletteMode;
  onModeChange: (mode: CommandPaletteMode) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;

  moduleGradient: string;
  moduleAccent: string;
}

export function CommandPaletteHeader({ mode, onModeChange, onClose, inputRef, moduleGradient, moduleAccent }: CommandPaletteHeaderProps) {
  const handleModeChange = (newMode: CommandPaletteMode) => {
    onModeChange(newMode);
    setTimeout(() => {
      if (inputRef.current) {
        if (newMode === 'search' && inputRef.current instanceof HTMLInputElement) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        } else if (newMode === 'chat' && inputRef.current instanceof HTMLTextAreaElement) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }
    }, 50);
  };

  return (
    <div className="flex items-center justify-between p-5 border-b border-slate-200/60 bg-gradient-to-r from-white via-slate-50/50 to-white backdrop-blur-xl shrink-0 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: `linear-gradient(90deg, ${moduleAccent}0D 0%, transparent 50%, ${moduleAccent}0D 100%)` }}
      ></div>
      
      <div className="flex items-center gap-4 relative z-10">
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200/60 shadow-sm">
          <button
            onClick={() => handleModeChange('search')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              mode === 'search'
                ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <Search size={14} />
            <span>חיפוש</span>
          </button>
          <button
            onClick={() => handleModeChange('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              mode === 'chat'
                ? 'text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
            style={mode === 'chat' ? { background: moduleGradient } : undefined}
          >
            <Sparkles size={14} />
            <span>AI Chat</span>
          </button>
        </div>
        {mode === 'chat' && (
          <div className="flex items-center gap-3 pl-4 border-r border-slate-200/60 pr-4">
            <div className="relative">
              <div className="p-2.5 rounded-2xl shadow-md" style={{ background: moduleGradient }}>
                <Sparkles className="text-white" size={18} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Misrad AI</div>
              <div className="text-[10px] text-slate-500 font-medium">עוזר חכם • מחובר</div>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-slate-100/80 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 relative z-10"
        aria-label="סגור"
      >
        <X size={18} className="text-slate-500" />
      </button>
    </div>
  );
}

