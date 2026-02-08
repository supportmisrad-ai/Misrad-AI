import { useState, useEffect, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { Lead } from '@/types';
import { NAV_ITEMS, QUICK_ASSETS } from '@/constants';
import { CommandPaletteMode, type CommandPaletteNavItem, type CommandPaletteQuickAsset } from './command-palette.types';
import { useAIModuleChat, type AIModuleId } from './useAIModuleChat';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { asObject } from '@/lib/shared/unknown';

function isNavItem(value: unknown): value is CommandPaletteNavItem {
  const obj = asObject(value);
  if (!obj) return false;
  return typeof obj.id === 'string' && typeof obj.label === 'string' && typeof obj.icon === 'function';
}

function toQuickAsset(value: unknown): CommandPaletteQuickAsset | null {
  const obj = asObject(value);
  if (!obj) return null;
  const id = typeof obj.id === 'string' ? obj.id : String(obj.id ?? '');
  const label = typeof obj.label === 'string' ? obj.label : String(obj.label ?? '');
  if (!id || !label) return null;

  const rawValue = obj.value;
  const v = typeof rawValue === 'string' && rawValue.trim() ? rawValue : label;

  const typeRaw = obj.type;
  const type = typeRaw === 'link' || typeRaw === 'text' ? typeRaw : 'text';

  return { id, label, value: v, type };
}

export function useCommandPalette(
  isOpen: boolean,
  mode: CommandPaletteMode,
  options?: {
    navItems?: CommandPaletteNavItem[];
    hideLeads?: boolean;
    hideAssets?: boolean;
    moduleKey?: OSModuleKey;
  }
) {
  const { addToast } = useData();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null!);
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const lastQueryRef = useRef<string>('');

  const navSource: CommandPaletteNavItem[] = (options?.navItems || NAV_ITEMS).filter(isNavItem);
  const assetsSource: CommandPaletteQuickAsset[] = (options?.hideAssets ? [] : QUICK_ASSETS)
    .map(toQuickAsset)
    .filter((v): v is CommandPaletteQuickAsset => Boolean(v));

  const moduleOverride: AIModuleId = (() => {
    const v = options?.moduleKey;
    return v === 'nexus' || v === 'system' || v === 'social' || v === 'client' || v === 'finance' || v === 'operations' || v === 'global'
      ? v
      : 'nexus';
  })();

  const {
    messages,
    isLoading: isThinking,
    error,
    sendText,
  } = useAIModuleChat({ moduleOverride });

  useEffect(() => {
    if (error) {
      const message = error instanceof Error && error.message ? error.message : 'בעיה בהתחברות לשרת';
      addToast("שגיאה בצ'אט: " + message, 'error');
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
  const extractMessageText = (message: unknown): string => {
    const obj = asObject(message);
    if (!obj) return '';

    if (typeof obj.content === 'string') {
      return obj.content;
    }

    const parts = obj.parts;
    if (Array.isArray(parts)) {
      let text = '';
      for (const part of parts) {
        const pObj = asObject(part);
        if (pObj?.type === 'text' && typeof pObj.text === 'string' && pObj.text) {
          text += pObj.text;
        } else if (typeof part === 'string') {
          text += String(part);
        }
      }
      return text;
    }

    if (typeof obj.text === 'string') {
      return obj.text;
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

