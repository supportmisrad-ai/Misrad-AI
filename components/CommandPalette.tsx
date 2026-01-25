'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { CommandPaletteProps, CommandPaletteMode } from './command-palette/command-palette.types';
import { useCommandPalette } from './command-palette/useCommandPalette';
import { CommandPaletteHeader } from './command-palette/CommandPaletteHeader';
import { CommandPaletteChat } from './command-palette/CommandPaletteChat';
import { CommandPaletteSearch } from './command-palette/CommandPaletteSearch';
import { getSemanticStarters } from './command-palette/semanticStarters';

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
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start justify-center transition-all duration-300" onClick={onClose} style={{ paddingTop: mode === 'chat' ? '5vh' : '12vh' }}>
      <div 
        className={`w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-scale-in transform transition-all ${
          mode === 'chat' ? 'max-w-5xl h-[85vh] flex flex-col' : 'max-w-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)]'
        }`}
        onClick={e => e.stopPropagation()}
        style={{
          boxShadow: mode === 'chat' 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)'
            : '0 20px 60px -12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <CommandPaletteHeader 
          mode={mode} 
          onModeChange={setMode} 
          onClose={onClose}
          inputRef={inputRef}
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
          />
        ) : (
          <CommandPaletteSearch
            query={query}
            setQuery={setQuery}
            isThinking={isThinking}
            messages={messages}
            error={error}
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
            extractMessageText={extractMessageText}
            handleSendMessage={handleSendMessage}
                            onKeyDown={handleKeyDown}
            filteredNav={filteredNav}
            filteredLeads={filteredLeads}
            filteredAssets={filteredAssets}
            onNavigate={onNavigate}
            onSelectLead={onSelectLead}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default CommandPalette;