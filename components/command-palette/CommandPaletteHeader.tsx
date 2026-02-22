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
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1 border border-slate-200/50">
          <button
            onClick={() => handleModeChange('search')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
              mode === 'search'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Search size={13} />
            <span>חיפוש</span>
          </button>
          <button
            onClick={() => handleModeChange('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
              mode === 'chat'
                ? 'text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            style={mode === 'chat' ? { background: moduleGradient } : undefined}
          >
            <Sparkles size={13} />
            <span>צ׳אט AI</span>
          </button>
        </div>
        {mode === 'chat' && (
          <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-slate-200/60 mr-1">
            <div className="relative">
              <div className="p-1.5 rounded-xl shadow-sm" style={{ background: moduleGradient }}>
                <Sparkles className="text-white" size={14} />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white animate-pulse"></div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Misrad AI</div>
              <div className="text-[9px] text-slate-400 font-medium">עוזר חכם • מחובר</div>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1.5 hover:bg-slate-100 rounded-lg transition-all duration-150"
        aria-label="סגור"
      >
        <X size={16} className="text-slate-400" />
      </button>
    </div>
  );
}

