import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { logAuditEvent } from '@/lib/audit';
import { AIService } from '@/lib/services/ai/AIService';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { Redis } from '@upstash/redis';

import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
type IncomingMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
  text?: string;
};

export const runtime = 'nodejs';
export const maxDuration = 30;

const IS_PROD = process.env.NODE_ENV === 'production';

const HARD_LIMITS = {
  maxContentLengthBytes: 220_000,
  maxMessages: 60,
  maxTotalMessageChars: 40_000,
};

const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 400;

type CachedChatResponse = {
  text?: string;
  stream?: ReadableStream<Uint8Array>;
};

type CacheEntry = { expiresAt: number; value: CachedChatResponse };

declare global {
  var __MISRAD_CHAT_API_RESPONSE_CACHE__: Map<string, CacheEntry> | undefined;
  var __MISRAD_CHAT_API_INFLIGHT__: Map<string, Promise<CachedChatResponse>> | undefined;
  var __MISRAD_CHAT_API_LOCAL_ORG_INFLIGHT__: Map<string, number> | undefined;
}

const responseCache: Map<string, CacheEntry> =
  globalThis.__MISRAD_CHAT_API_RESPONSE_CACHE__ ??
  (globalThis.__MISRAD_CHAT_API_RESPONSE_CACHE__ = new Map<string, CacheEntry>());

const inflightByKey: Map<string, Promise<CachedChatResponse>> =
  globalThis.__MISRAD_CHAT_API_INFLIGHT__ ??
  (globalThis.__MISRAD_CHAT_API_INFLIGHT__ = new Map<string, Promise<CachedChatResponse>>());

const localOrgInFlight: Map<string, number> =
  globalThis.__MISRAD_CHAT_API_LOCAL_ORG_INFLIGHT__ ??
  (globalThis.__MISRAD_CHAT_API_LOCAL_ORG_INFLIGHT__ = new Map<string, number>());

type OverloadedError = Error & { status: number; retryAfterSeconds: number };

function overloadedError(): OverloadedError {
  return Object.assign(new Error('Overloaded'), { status: 503, retryAfterSeconds: 3 });
}


function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

function cacheGet(key: string): CachedChatResponse | null {
  const e = responseCache.get(key);
  if (!e) return null;
  if (e.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return e.value;
}

function cacheSet(key: string, value: CachedChatResponse) {
  const now = Date.now();
  responseCache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  if (responseCache.size > MAX_CACHE_ENTRIES) {
    const toDelete = Math.max(1, Math.floor(MAX_CACHE_ENTRIES * 0.1));
    const keys = [...responseCache.keys()].slice(0, toDelete);
    for (const k of keys) responseCache.delete(k);
  }
}

async function withLoadIsolation<T>(params: { organizationId?: string | null; task: () => Promise<T> }): Promise<T> {
  const redis = getRedisClient();
  const ttlMs = 45_000;
  const maxGlobal = 10;
  const maxPerOrg = 3;

  const orgId = params.organizationId ? String(params.organizationId) : null;

  const localKey = orgId || '__no_org__';
  const localCount = localOrgInFlight.get(localKey) ?? 0;
  if (localCount >= maxPerOrg) {
    throw overloadedError();
  }

  localOrgInFlight.set(localKey, localCount + 1);

  let redisKeys: { globalKey: string; orgKey?: string; acquired: boolean } = { globalKey: '', acquired: false };
  try {
    if (redis) {
      const globalKey = `conc:chat_api:global`;
      const orgKey = orgId ? `conc:chat_api:org:${orgId}` : undefined;

      const globalCount = await redis.incr(globalKey);
      if (globalCount === 1) await redis.pexpire(globalKey, ttlMs);
      if (globalCount > maxGlobal) {
        await redis.decr(globalKey).catch(() => null);
        throw overloadedError();
      }

      if (orgKey) {
        const orgCount = await redis.incr(orgKey);
        if (orgCount === 1) await redis.pexpire(orgKey, ttlMs);
        if (orgCount > maxPerOrg) {
          await redis.decr(orgKey).catch(() => null);
          await redis.decr(globalKey).catch(() => null);
          throw overloadedError();
        }
      }

      redisKeys = { globalKey, orgKey, acquired: true };
    }

    return await params.task();
  } finally {
    localOrgInFlight.set(localKey, Math.max(0, (localOrgInFlight.get(localKey) ?? 1) - 1));
    if (redis && redisKeys.acquired) {
      await redis.decr(redisKeys.globalKey).catch(() => null);
      if (redisKeys.orgKey) await redis.decr(redisKeys.orgKey).catch(() => null);
    }
  }
}

function buildRateLimitHeaders(params: {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
  label?: string;
}) {
  const suffix = params.label ? `-${params.label}` : '';
  const headers: Record<string, string> = {
    [`X-RateLimit-Limit${suffix}`]: String(params.limit),
    [`X-RateLimit-Remaining${suffix}`]: String(Math.max(0, params.remaining)),
    [`X-RateLimit-Reset${suffix}`]: String(Math.floor(params.resetAt / 1000)),
  };
  if (params.retryAfterSeconds) headers['Retry-After'] = String(params.retryAfterSeconds);
  return headers;
}

async function enforceRateLimit(params: { namespace: string; key: string; limit: number; windowMs: number; label: string }) {
  const rl = await rateLimit({
    namespace: params.namespace,
    key: params.key,
    limit: params.limit,
    windowMs: params.windowMs,
  });
  if (!rl.ok) {
    return {
      ok: false as const,
      headers: buildRateLimitHeaders({
        limit: params.limit,
        remaining: 0,
        resetAt: rl.resetAt,
        retryAfterSeconds: rl.retryAfterSeconds,
        label: params.label,
      }),
      reason: rl.reason,
    };
  }
  return {
    ok: true as const,
    headers: buildRateLimitHeaders({ limit: params.limit, remaining: rl.remaining, resetAt: rl.resetAt, label: params.label }),
  };
}

function extractText(msg: IncomingMessage): string {
  if (typeof msg.content === 'string') return String(msg.content);
  if (typeof msg.text === 'string') return String(msg.text);
  const parts = Array.isArray(msg.parts) ? msg.parts : [];
  return parts
    .filter((p) => p && p.type === 'text')
    .map((p) => String(p.text || ''))
    .join('');
}

function streamTextResponse(text: string, headers?: Record<string, string>, status?: number): NextResponse {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...(headers || {}),
    },
  });
}

async function POSTHandler(req: Request): Promise<NextResponse> {
  try {
    const contentLengthHeader = req.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > HARD_LIMITS.maxContentLengthBytes) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }
    }

    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await getWorkspaceOrThrow(req);

    const ip = getClientIpFromRequest(req);
    const earlyRateLimit = await enforceRateLimit({
      namespace: 'chat.api.ip_min',
      key: ip,
      limit: 20,
      windowMs: 60_000,
      label: 'ip-min',
    });
    if (!earlyRateLimit.ok) {
      const status = earlyRateLimit.reason === 'unavailable' ? 503 : 429;
      const msg = earlyRateLimit.reason === 'unavailable' ? 'Rate limiting temporarily unavailable' : 'Rate limit exceeded';
      return NextResponse.json({ error: msg }, { status, headers: earlyRateLimit.headers });
    }

    const { messages, clientContext }: {
      messages: IncomingMessage[];
      clientContext?: {
        companyName: string;
        name: string;
        brandVoice: string;
        dna?: {
          brandSummary?: string;
          voice?: {
            formal: number;
            funny: number;
            length: number;
          };
          vocabulary?: {
            loved: string[];
            forbidden: string[];
          };
        };
      };
    } = await req.json();

    // workspaceId resolved & authorized above (Fail-Closed)

    const safeMessages = Array.isArray(messages) ? messages : [];
    if (safeMessages.length > HARD_LIMITS.maxMessages) {
      return NextResponse.json({ error: 'Too many messages' }, { status: 413 });
    }
    const coreMessages = safeMessages.filter((m) => m.id !== 'welcome').map((m) => ({
      role: m.role,
      content: extractText(m),
    }));

    const totalMessageChars = coreMessages.reduce((sum, m) => sum + String(m.content || '').length, 0);
    if (totalMessageChars > HARD_LIMITS.maxTotalMessageChars) {
      return NextResponse.json({ error: 'Messages too large' }, { status: 413 });
    }

    const lastUser = [...coreMessages].reverse().find((m) => m.role === 'user')?.content || '';
    const history = coreMessages.slice(-6).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

    const ctx = clientContext ? {
      companyName: clientContext.companyName,
      name: clientContext.name,
      brandVoice: clientContext.brandVoice,
      dna: clientContext.dna,
    } : null;

    const featureKey = ctx ? 'social.chat' : 'ai.chat';
    const moduleName = ctx ? 'social' : 'global';

    const userRateLimit = await enforceRateLimit({
      namespace: 'chat.api.user_min',
      key: `${workspaceId}:${clerkUserId}`,
      limit: 15,
      windowMs: 60_000,
      label: 'user-min',
    });
    if (!userRateLimit.ok) {
      return NextResponse.json(
        { error: userRateLimit.reason === 'unavailable' ? 'Rate limiting temporarily unavailable' : 'Rate limit exceeded' },
        { status: userRateLimit.reason === 'unavailable' ? 503 : 429, headers: { ...earlyRateLimit.headers, ...userRateLimit.headers } }
      );
    }

    const userDayRateLimit = await enforceRateLimit({
      namespace: 'chat.api.user_day',
      key: `${workspaceId}:${clerkUserId}`,
      limit: 500,
      windowMs: 24 * 60 * 60_000,
      label: 'user-day',
    });
    if (!userDayRateLimit.ok) {
      return NextResponse.json(
        { error: userDayRateLimit.reason === 'unavailable' ? 'Rate limiting temporarily unavailable' : 'Rate limit exceeded' },
        { status: userDayRateLimit.reason === 'unavailable' ? 503 : 429, headers: { ...earlyRateLimit.headers, ...userRateLimit.headers, ...userDayRateLimit.headers } }
      );
    }

    const orgRateLimit = await enforceRateLimit({
      namespace: 'chat.api.org_10m',
      key: String(workspaceId),
      limit: 120,
      windowMs: 10 * 60_000,
      label: 'org-10m',
    });
    if (!orgRateLimit.ok) {
      return NextResponse.json(
        { error: orgRateLimit.reason === 'unavailable' ? 'Rate limiting temporarily unavailable' : 'Rate limit exceeded' },
        { status: orgRateLimit.reason === 'unavailable' ? 503 : 429, headers: { ...earlyRateLimit.headers, ...userRateLimit.headers, ...userDayRateLimit.headers, ...orgRateLimit.headers } }
      );
    }

    const orgDayRateLimit = await enforceRateLimit({
      namespace: 'chat.api.org_day',
      key: String(workspaceId),
      limit: 5000,
      windowMs: 24 * 60 * 60_000,
      label: 'org-day',
    });
    if (!orgDayRateLimit.ok) {
      return NextResponse.json(
        { error: orgDayRateLimit.reason === 'unavailable' ? 'Rate limiting temporarily unavailable' : 'Rate limit exceeded' },
        { status: orgDayRateLimit.reason === 'unavailable' ? 503 : 429, headers: { ...earlyRateLimit.headers, ...userRateLimit.headers, ...userDayRateLimit.headers, ...orgRateLimit.headers, ...orgDayRateLimit.headers } }
      );
    }

    const cacheKey = stableHash(
      [
        'chat_api',
        String(workspaceId),
        String(clerkUserId),
        featureKey,
        moduleName,
        String(lastUser || '').slice(0, 6000),
        String(history || '').slice(0, 12000),
        ctx ? JSON.stringify(ctx).slice(0, 12000) : '',
      ].join('|')
    );

    const combinedHeaders = {
      ...earlyRateLimit.headers,
      ...userRateLimit.headers,
      ...userDayRateLimit.headers,
      ...orgRateLimit.headers,
      ...orgDayRateLimit.headers,
    };

    // Note: Streaming responses are not cached
    // Only use cache for debugging/fallback scenarios

    await logAuditEvent('ai.query', featureKey, {
      details: {
        organizationId: workspaceId,
        module: moduleName,
        hasClientContext: Boolean(ctx),
      },
    });

    const computePromise = withLoadIsolation({
      organizationId: workspaceId,
      task: async (): Promise<CachedChatResponse> => {
        let memoryBlock = '';
        try {
          const ai = AIService.getInstance();
          const memory = await ai.semanticSearch({
            featureKey: `${featureKey}.memory_search`,
            organizationId: workspaceId,
            userId: clerkUserId,
            query: `${lastUser}\n\n${history}`.slice(0, 6000),
            moduleId: moduleName,
            matchCount: 8,
            similarityThreshold: 0.2,
          });

          const compact = memory
            .slice(0, 6)
            .map((m) => ({
              docKey: m.docKey,
              similarity: m.similarity,
              content: String(m.content || '').slice(0, 900),
              metadata: m.metadata ?? null,
            }));

          if (compact.length > 0) {
            memoryBlock = `\n\nMemory snippets (from organizational knowledge base):\n${JSON.stringify(compact).slice(0, 12000)}`;
          }
        } catch (e: unknown) {
          if (IS_PROD) {
            console.warn('[chat] semantic memory skipped/failed (non-fatal)');
          } else {
            console.warn('[chat] semantic memory skipped/failed (non-fatal)', {
              message: getErrorMessage(e) || String(e ?? ''),
            });
          }
        }

        const prompt = `מודול: ${moduleName}\n\nContext (JSON):\n${ctx ? JSON.stringify(ctx).slice(0, 12000) : '{}'}\n\nHistory:\n${history || '(empty)'}${memoryBlock}\n\nUser message:\n${lastUser}`;

        const ai = AIService.getInstance();
        const result = await ai.streamText({
          featureKey,
          organizationId: workspaceId,
          userId: clerkUserId,
          prompt,
        });

        return { stream: result.stream };
      },
    });

    // Execute streaming request directly (no caching for streams)
    const resp = await computePromise;
    
    // Return actual streaming response
    return new NextResponse(resp.stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        ...combinedHeaders,
      },
    });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      const safeMsg =
        e.status === 400
          ? 'Bad request'
          : e.status === 401
            ? 'Unauthorized'
            : e.status === 404
              ? 'Not found'
              : e.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      return NextResponse.json(
        { error: IS_PROD ? safeMsg : e.message || safeMsg },
        { status: e.status }
      );
    }
    const obj = asObject(e);
    const statusFromError = obj?.status;
    const retryAfterSeconds = obj?.retryAfterSeconds;
    const msg = getErrorMessage(e) || 'Internal server error';
    const status = typeof statusFromError === 'number'
      ? statusFromError
      : msg.toLowerCase().includes('unauthorized')
        ? 401
        : 500;
    const headers: Record<string, string> = {};
    if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
      headers['Retry-After'] = String(Math.floor(retryAfterSeconds));
    }
    const safeMsg = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Internal server error';
    return NextResponse.json({ error: IS_PROD ? safeMsg : msg }, { status, headers });
  }
}

export const POST = shabbatGuard(POSTHandler);
