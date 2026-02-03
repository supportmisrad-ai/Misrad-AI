'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import type { ChatSource } from './ChatSources';

export type AIModuleId = 'nexus' | 'system' | 'social' | 'client' | 'finance' | 'operations' | 'global';

export type AIModuleChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
};

function normalizeModuleId(m: string | null | undefined): AIModuleId {
  const v = String(m || '').trim().toLowerCase();
  if (v === 'nexus' || v === 'system' || v === 'social' || v === 'client' || v === 'finance' || v === 'operations') return v;
  return 'global';
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function useAIModuleChat(opts?: {
  moduleOverride?: AIModuleId;
  orgSlugOverride?: string | null;
  context?: any;
  featureKeyOverride?: string;
}) {
  const pathname = usePathname();
  const routeInfo = useMemo(() => parseWorkspaceRoute(pathname), [pathname]);

  const orgSlug = typeof opts?.orgSlugOverride === 'string' ? opts?.orgSlugOverride : routeInfo.orgSlug;
  const moduleId = opts?.moduleOverride ? opts.moduleOverride : normalizeModuleId(routeInfo.module);

  const featureKey =
    typeof opts?.featureKeyOverride === 'string' && opts.featureKeyOverride.trim()
      ? opts.featureKeyOverride
      : moduleId === 'social'
        ? 'social.chat'
        : 'ai.chat';

  const [messages, setMessages] = useState<AIModuleChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;

      setError(null);

      const userMsg: AIModuleChatMessage = {
        id: makeId('user'),
        role: 'user',
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const history = [...messages, userMsg]
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
          .map((m) => ({ role: m.role, content: String(m.content || '') }));

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(orgSlug ? { 'x-org-id': encodeURIComponent(String(orgSlug)) } : {}),
          },
          body: JSON.stringify({
            featureKey,
            module: moduleId,
            orgId: orgSlug,
            context: opts?.context,
            messages: history,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as any;

        if (!res.ok) {
          const msg = data?.error || `Chat failed (${res.status})`;
          throw new Error(String(msg));
        }

        const assistantMsg: AIModuleChatMessage = {
          id: makeId('assistant'),
          role: 'assistant',
          content: String(data?.text || ''),
          sources: Array.isArray(data?.memory) ? (data.memory as ChatSource[]) : [],
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e: any) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    },
    // Intentionally depend on messages so history includes latest assistant replies
    [featureKey, messages, moduleId, orgSlug, opts?.context]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    error,
    sendText,
    clear,
    moduleId,
    orgSlug,
  };
}
