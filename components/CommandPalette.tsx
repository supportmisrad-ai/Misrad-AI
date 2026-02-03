'use client';

import React, { useState, useEffect } from 'react';
import { CommandPaletteProps, CommandPaletteMode } from './command-palette/command-palette.types';
import { useCommandPalette } from './command-palette/useCommandPalette';
import { CommandPaletteHeader } from './command-palette/CommandPaletteHeader';
import { CommandPaletteChat } from './command-palette/CommandPaletteChat';
import { CommandPaletteSearch } from './command-palette/CommandPaletteSearch';

import { getSemanticStarters } from './command-palette/semanticStarters';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import type { OSModuleKey } from '@/lib/os/modules/types';

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectLead,
  leads,
  moduleKey,
  navItems,
  hideLeads,
  hideAssets,
}) => {
  const [mode, setMode] = useState<CommandPaletteMode>('search');

  const pathname = usePathname();
  const routeInfo = parseWorkspaceRoute(pathname);
  const resolvedModuleKey: OSModuleKey = (routeInfo.module || moduleKey || 'nexus') as OSModuleKey;
  const moduleDef = getModuleDefinition(resolvedModuleKey);
  const moduleAccent = moduleDef?.theme?.accent || '#3730A3';

  const moduleGradient = (() => {
    switch (resolvedModuleKey) {
      case 'system':
        return 'linear-gradient(135deg, #A21D3C 0%, #881337 100%)';
      case 'finance':
        return 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)';
      case 'social':
        return 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)';
      case 'client':
        return 'linear-gradient(135deg, #EAD7A1 0%, #C5A572 50%, #B45309 100%)';
      case 'operations':
        return 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)';
      case 'nexus':
      default:
        return 'linear-gradient(135deg, #6366F1 0%, #9333EA 100%)';
    }
  })();

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
  } = useCommandPalette(isOpen, mode, { navItems, hideLeads, hideAssets, moduleKey: resolvedModuleKey });

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
      }
    }
  };

  if (!isOpen) return null;

  const { filteredNav, filteredLeads, filteredAssets } = getFilteredResults(leads);

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-start justify-center transition-all duration-300"
      onClick={onClose}
      style={{
        paddingTop: mode === 'chat' ? '5vh' : '12vh',
        '--os-accent': moduleAccent,
      } as React.CSSProperties}
    >
      <div 
        className={`w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-scale-in transform transition-all ${
          mode === 'chat' ? 'max-w-5xl h-[85vh] flex flex-col' : 'max-w-5xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)]'
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
            starters={getSemanticStarters(resolvedModuleKey as any)}
            onKeyDown={handleKeyDown}
            moduleGradient={moduleGradient}
            moduleAccent={moduleAccent}
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