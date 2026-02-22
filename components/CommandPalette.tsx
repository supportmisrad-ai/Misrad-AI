'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { CommandPaletteProps, CommandPaletteMode } from './command-palette/command-palette.types';
import { useCommandPalette } from './command-palette/useCommandPalette';
import { CommandPaletteHeader } from './command-palette/CommandPaletteHeader';
import { CommandPaletteChat } from './command-palette/CommandPaletteChat';
import { CommandPaletteSearch } from './command-palette/CommandPaletteSearch';
import { getSemanticStarters } from './command-palette/semanticStarters';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { useApp } from '@/contexts/AppContext';

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectLead,
  leads,
  navItems,
  hideLeads,
  hideAssets,
}) => {
  const [mode, setMode] = useState<CommandPaletteMode>('search');

  let orgSlug: string | null = null;
  try {
    orgSlug = useApp().orgSlug;
  } catch {
    orgSlug = null;
  }

  const moduleDef = getModuleDefinition('nexus');
  const moduleAccent = moduleDef.theme.accent;
  const moduleGradient = `linear-gradient(135deg, ${moduleDef.theme.accent} 0%, #6D28D9 100%)`;

  const {
    query,
    setQuery,
    inputRef,
    messagesEndRef,
    messages,
    isThinking,
    error,
    extractMessageText,
    getFilteredResults,
    handleSendMessage,
    sendText
  } = useCommandPalette(isOpen, mode, { navItems, hideLeads, hideAssets });

  useEffect(() => {
    if (!isOpen) {
      setMode('search');
    }
  }, [isOpen]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'chat') {
        handleSendMessage();
      } else if (mode === 'search' && query.trim().length >= 2) {
        handleSendMessage();
      }
    }
  };

  if (!isOpen) return null;

  const { filteredNav, filteredLeads, filteredAssets } = getFilteredResults(leads);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center px-3 sm:px-4 transition-all duration-300" onClick={onClose} style={{ paddingTop: '6vh' }}>
      <div 
        className={`w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60 animate-scale-in transform transition-all ${
          mode === 'chat' ? 'max-w-3xl h-[80vh] flex flex-col' : 'max-w-lg'
        }`}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <CommandPaletteHeader 
          mode={mode} 
          onModeChange={setMode} 
          onClose={onClose}
          inputRef={inputRef}
          moduleGradient={moduleGradient}
          moduleAccent={moduleAccent}
        />

        {mode === 'chat' ? (
          <CommandPaletteChat
            query={query}
            setQuery={setQuery}
            messages={messages}
            isThinking={isThinking}
            error={error}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
            extractMessageText={extractMessageText}
            handleSendMessage={handleSendMessage}
            sendText={sendText}
            starters={getSemanticStarters('nexus')}
            onKeyDown={handleKeyDown}
            moduleGradient={moduleGradient}
            moduleAccent={moduleAccent}
            moduleKey="nexus"
            orgSlug={orgSlug}
          />
        ) : (
          <CommandPaletteSearch
            query={query}
            setQuery={setQuery}
            isThinking={isThinking}
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
            onKeyDown={handleKeyDown}
            filteredNav={filteredNav}
            filteredLeads={filteredLeads}
            filteredAssets={filteredAssets}
            onNavigate={onNavigate}
            onSelectLead={onSelectLead}
            onClose={onClose}
            moduleAccent={moduleAccent}
          />
        )}
      </div>
    </div>
  );
};

export default CommandPalette;