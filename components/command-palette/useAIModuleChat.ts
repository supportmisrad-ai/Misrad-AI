'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import type { ChatSource } from './ChatSources';
import { asObject } from '@/lib/shared/unknown';

export type AIModuleId = 'nexus' | 'system' | 'social' | 'client' | 'finance' | 'operations' | 'global';

export type AIModuleChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
};

function coerceChatSource(value: unknown): ChatSource | null {
  const obj = asObject(value);
  if (!obj) return null;

  const docKey = typeof obj.docKey === 'string' ? obj.docKey : String(obj.docKey ?? '');
  const similarityRaw = obj.similarity;
  const similarity = typeof similarityRaw === 'number' ? similarityRaw : Number(similarityRaw);
  const chunkIndexRaw = obj.chunkIndex;
  const chunkIndex = typeof chunkIndexRaw === 'number' ? chunkIndexRaw : Number(chunkIndexRaw);
  if (!docKey || !Number.isFinite(similarity) || !Number.isFinite(chunkIndex)) return null;

  return {
    docKey,
    similarity,
    chunkIndex,
    content: typeof obj.content === 'string' ? obj.content : undefined,
    metadata: obj.metadata,
  };
}

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
  context?: unknown;
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
  const [error, setError] = useState<unknown | null>(null);

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

        if (!res.ok) {
          const errData: unknown = await res.json().catch(() => ({}));
          const errObj = asObject(errData) ?? {};
          const msg = typeof errObj.error === 'string' ? errObj.error : `Chat failed (${res.status})`;
          throw new Error(String(msg));
        }

        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('text/plain') && res.body) {
          const assistantId = makeId('assistant');
          const assistantMsg: AIModuleChatMessage = {
            id: assistantId,
            role: 'assistant',
            content: '',
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsLoading(false);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            const snapshot = accumulated;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
            );
          }
        } else {
          const data: unknown = await res.json().catch(() => ({}));
          const obj = asObject(data) ?? {};

          const sourcesRaw = obj.memory;
          const sources = Array.isArray(sourcesRaw)
            ? sourcesRaw
                .map(coerceChatSource)
                .filter((v): v is ChatSource => Boolean(v))
            : [];

          const assistantMsg: AIModuleChatMessage = {
            id: makeId('assistant'),
            role: 'assistant',
            content: typeof obj.text === 'string' ? obj.text : String(obj.text || ''),
            sources,
          };

          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (e: unknown) {
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
