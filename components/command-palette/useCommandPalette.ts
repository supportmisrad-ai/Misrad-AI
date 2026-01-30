import { useState, useEffect, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { Lead } from '@/types';
import { NAV_ITEMS, QUICK_ASSETS } from '@/constants';
import { CommandPaletteMode } from './command-palette.types';
import { useAIModuleChat } from './useAIModuleChat';

export function useCommandPalette(
  isOpen: boolean,
  mode: CommandPaletteMode,
  options?: {
    navItems?: any[];
    hideLeads?: boolean;
    hideAssets?: boolean;
  }
) {
  const { addToast } = useData();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null!);
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const lastQueryRef = useRef<string>('');

  const navSource = options?.navItems || NAV_ITEMS;
  const assetsSource = options?.hideAssets ? [] : QUICK_ASSETS;

  const {
    messages,
    isLoading: isThinking,
    error,
    sendText,
  } = useAIModuleChat({ moduleOverride: 'nexus' });

  useEffect(() => {
    if (error) {
      addToast('שגיאה בצ\'אט: ' + (error?.message || 'בעיה בהתחברות לשרת'), 'error');
    }
  }, [addToast, error]);

  // Auto-focus when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      const focusInput = () => {
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            if (inputRef.current instanceof HTMLTextAreaElement || inputRef.current instanceof HTMLInputElement) {
              const len = inputRef.current.value.length;
              inputRef.current.setSelectionRange(len, len);
            }
          } else {
            setTimeout(focusInput, 50);
          }
        });
      };
      
      const timer = setTimeout(focusInput, 200);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      lastQueryRef.current = '';
    }
  }, [isOpen, mode]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [messages, isThinking]);

  // Auto-resize textarea for chat mode
  useEffect(() => {
    if (mode === 'chat' && inputRef.current && inputRef.current instanceof HTMLTextAreaElement) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [query, mode]);

  // Helper to extract message text
  const extractMessageText = (message: any): string => {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (message.parts && Array.isArray(message.parts)) {
      let text = '';
      for (const part of message.parts) {
        if (part.type === 'text' && part.text) {
          text += part.text;
        } else if (typeof part === 'string') {
          text += part;
        }
      }
      return text;
    }
    if (typeof message.text === 'string') {
      return message.text;
    }
    return '';
  };

  // Filter Logic
  const getFilteredResults = (leads: Lead[]) => {
    const filteredNav = navSource.filter(item => 
      item.label.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3);

    const filteredLeads = options?.hideLeads
      ? ([] as Lead[])
      : leads
          .filter(
            (lead) =>
              lead.name.toLowerCase().includes(query.toLowerCase()) ||
              lead.company?.toLowerCase().includes(query.toLowerCase()) ||
              (lead.phone || '').includes(query)
          )
          .slice(0, 5);

    const filteredAssets = assetsSource.filter(asset => 
      asset.label.toLowerCase().includes(query.toLowerCase())
    );

    return { filteredNav, filteredLeads, filteredAssets };
  };

  // Handle send message
  const handleSendMessage = () => {
    if (mode === 'chat') {
      if (query.trim().length >= 1 && !isThinking) {
        sendText(query);
        setQuery('');
        lastQueryRef.current = '';
      }
    } else {
      if (query.trim().length >= 2 && query !== lastQueryRef.current) {
        lastQueryRef.current = query;
        sendText(query);
      }
    }
  };

  return {
    query,
    setQuery,
    mode,
    inputRef,
    messagesEndRef,
    messages,
    isThinking,
    error,
    extractMessageText,
    getFilteredResults,
    handleSendMessage,
    sendText
  };
}

