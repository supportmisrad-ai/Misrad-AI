import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createHash } from 'crypto';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { logAuditEvent } from '@/lib/audit';
import { AIService } from '@/lib/services/ai/AIService';
import prisma from '@/lib/prisma';
import { APIError, getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow, getWorkspaceOrThrow } from '@/lib/server/api-workspace';
import { OpenAIProvider } from '@/lib/services/ai/providers/OpenAIProvider';
import { GeminiProvider } from '@/lib/services/ai/providers/GeminiProvider';
import { queryRawOrgScoped } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { Redis } from '@upstash/redis';
import { MisradInvoiceStatus, Prisma } from '@prisma/client';

import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getErrorMessage } from '@/lib/shared/unknown';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const runtime = 'nodejs';
export const maxDuration = 30;

let cachedTechDocsSnippet: string | null = null;
let cachedSalesDocsSnippet: string | null = null;

const HARD_LIMITS = {
  maxContentLengthBytes: 220_000,
  maxMessages: 40,
  maxTotalMessageChars: 24_000,
  maxFeatureKeyChars: 80,
  maxModuleChars: 40,
  maxToneOverrideChars: 400,
};

const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 400;

type CachedChatResponse = {
  text: string;
  provider?: string | null;
  model?: string | null;
  chargedCents?: number | null;
  memory?: Array<{ docKey: string; similarity: number; chunkIndex: number; content: string; metadata: unknown }>;
};

type CacheEntry = { expiresAt: number; value: CachedChatResponse };

type _ChatGlobalCaches = typeof globalThis & {
  __MISRAD_AI_CHAT_RESPONSE_CACHE__?: Map<string, CacheEntry>;
  __MISRAD_AI_CHAT_INFLIGHT__?: Map<string, Promise<CachedChatResponse>>;
  __MISRAD_AI_CHAT_LOCAL_ORG_INFLIGHT__?: Map<string, number>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

type ErrorWithStatus = Error & { status?: number; retryAfterSeconds?: number; name?: string };

function withStatus(err: Error, status: number, retryAfterSeconds?: number): ErrorWithStatus {
  const e = err as ErrorWithStatus;
  e.status = status;
  if (typeof retryAfterSeconds === 'number') e.retryAfterSeconds = retryAfterSeconds;
  return e;
}

function getErrorStatus(e: unknown): number | null {
  if (!e) return null;
  if (e instanceof Error) {
    const s = (e as ErrorWithStatus).status;
    return typeof s === 'number' ? s : null;
  }
  if (isRecord(e)) {
    const s = e.status;
    return typeof s === 'number' ? s : null;
  }
  return null;
}

function getErrorName(e: unknown): string {
  if (e instanceof Error && typeof e.name === 'string') return e.name;
  if (isRecord(e) && typeof e.name === 'string') return e.name;
  return '';
}



const _g = globalThis as _ChatGlobalCaches;

const responseCache: Map<string, CacheEntry> =
  _g.__MISRAD_AI_CHAT_RESPONSE_CACHE__ || (_g.__MISRAD_AI_CHAT_RESPONSE_CACHE__ = new Map());

const inflightByKey: Map<string, Promise<CachedChatResponse>> =
  _g.__MISRAD_AI_CHAT_INFLIGHT__ || (_g.__MISRAD_AI_CHAT_INFLIGHT__ = new Map());

const localOrgInFlight: Map<string, number> =
  _g.__MISRAD_AI_CHAT_LOCAL_ORG_INFLIGHT__ || (_g.__MISRAD_AI_CHAT_LOCAL_ORG_INFLIGHT__ = new Map());

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
  const maxGlobal = 8;
  const maxPerOrg = 2;

  const orgId = params.organizationId ? String(params.organizationId) : null;

  const localKey = orgId || '__no_org__';
  const localCount = localOrgInFlight.get(localKey) ?? 0;
  if (localCount >= maxPerOrg) {
    throw withStatus(new Error('Overloaded'), 503, 3);
  }

  localOrgInFlight.set(localKey, localCount + 1);

  let redisKeys: { globalKey: string; orgKey?: string; acquired: boolean } = { globalKey: '', acquired: false };
  try {
    if (redis) {
      const globalKey = `conc:ai_chat:global`;
      const orgKey = orgId ? `conc:ai_chat:org:${orgId}` : undefined;

      const globalCount = await redis.incr(globalKey);
      if (globalCount === 1) await redis.pexpire(globalKey, ttlMs);
      if (globalCount > maxGlobal) {
        await redis.decr(globalKey).catch(() => null);
        throw withStatus(new Error('Overloaded'), 503, 3);
      }

      if (orgKey) {
        const orgCount = await redis.incr(orgKey);
        if (orgCount === 1) await redis.pexpire(orgKey, ttlMs);
        if (orgCount > maxPerOrg) {
          await redis.decr(orgKey).catch(() => null);
          await redis.decr(globalKey).catch(() => null);
          throw withStatus(new Error('Overloaded'), 503, 3);
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

const BodySchema = z
  .object({
    featureKey: z.string().optional(),
    module: z.string().optional(),
    orgId: z.union([z.string(), z.number()]).optional(),
    context: z.unknown().optional(),
    clientContext: z.unknown().optional(),
    toneOverride: z.string().optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      )
      .optional(),
    message: z.string().optional(),
    pathname: z.string().optional(),
  })
  .strict();

function jsonError(message: string, status: number, headers?: Record<string, string>) {
  return apiError(message, { status, headers });
}

function clampText(input: unknown, maxChars: number): string {
  const s = String(input ?? '');
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(0, maxChars)) + '…';
}

function safeJsonStringify(value: unknown, maxChars: number): string {
  try {
    return clampText(JSON.stringify(value), maxChars);
  } catch {
    return '';
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

function ensureSalesCTA(text: string): string {
  const out = String(text || '').trim();
  if (!out) return out;

  const lowered = out.toLowerCase();
  const hasCta =
    lowered.includes('/pricing') ||
    lowered.includes('/subscribe') ||
    lowered.includes('/login?mode=sign-up') ||
    lowered.includes('/login') ||
    lowered.includes('/contact') ||
    lowered.includes('וואטסאפ') ||
    lowered.includes('whatsapp');

  if (hasCta) return out;

  return [
    out,
    '---',
    '**צעד הבא:**',
    '- [מחירון](/pricing)',
    '- [הרשמה / התחלה מהירה](/subscribe/checkout)',
    '- [דבר איתנו / צור קשר](/contact)',
  ].join('\n');
}

function formatHistory(messages: ChatMessage[]): string {
  return messages
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${clampText(String(m.content || '').trim(), 1200)}`)
    .filter(Boolean)
    .join('\n');
}

function normalizeModuleId(m: string | null | undefined): string | null {
  const v = String(m || '').trim().toLowerCase();
  if (!v) return null;
  if (['system', 'client', 'nexus', 'finance', 'social', 'global'].includes(v)) return v === 'global' ? null : v;
  return null;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function normalizeRoute(pathname: string): string {
  const path = String(pathname || '/');
  const match = path.match(/^\/w\/[^/]+(\/.*)?$/);
  if (match) return match[1] || '/';
  return path || '/';
}

function isMarketingPathname(pathname: string): boolean {
  const p = String(pathname || '').trim() || '/';
  if (p.startsWith('/w/')) return false;
  if (p.startsWith('/app')) return false;
  if (p.startsWith('/api')) return false;
  return true;
}

async function loadTechDocsSnippet(): Promise<string> {
  if (cachedTechDocsSnippet !== null) return cachedTechDocsSnippet;
  try {
    const root = process.cwd();
    const candidates = [
      path.join(root, 'docs', 'project-history', 'ARCHITECTURE.md'),
      path.join(root, 'docs', 'SYSTEM_MIGRATION_MAP.md'),
      path.join(root, 'docs', 'SYSTEM_MIGRATION_MAP.md'.toLowerCase()),
    ];

    let combined = '';
    for (const filePath of candidates) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        if (content && content.trim()) {
          combined += `\n\n# ${path.basename(filePath)}\n${content}`;
        }
      } catch {
        // ignore
      }
      if (combined.length > 14000) break;
    }

    cachedTechDocsSnippet = (combined || '').slice(0, 14000);
    return cachedTechDocsSnippet;
  } catch {
    cachedTechDocsSnippet = '';
    return '';
  }
}

async function loadSalesDocsSnippet(): Promise<string> {
  if (cachedSalesDocsSnippet !== null) return cachedSalesDocsSnippet;
  try {
    const root = process.cwd();
    const salesDocsDir = path.join(root, 'docs', 'sales-docs');
    
    const mainFiles = [
      '01-סקירה-כללית.md',
      '10-מבנה-תמחור.md',
      '11-החבילות.md',
      '12-דוגמאות-מחיר.md',
      '04-מודול-nexus.md',
      '05-מודול-system.md',
      '06-מודול-social.md',
      '07-מודול-finance.md',
      '08-מודול-client.md',
      '09-מודול-operations.md',
      '18-התנגדויות.md',
    ];

    let combined = '';
    for (const fileName of mainFiles) {
      try {
        const filePath = path.join(salesDocsDir, fileName);
        const content = await fs.readFile(filePath, 'utf8');
        if (content && content.trim()) {
          combined += `\n\n# ${fileName}\n${content}`;
        }
      } catch {
        // ignore missing files
      }
      if (combined.length > 28000) break;
    }

    cachedSalesDocsSnippet = (combined || '').slice(0, 28000);
    return cachedSalesDocsSnippet;
  } catch {
    cachedSalesDocsSnippet = '';
    return '';
  }
}

async function getHelpVideoSuggestion(params: { organizationId: string; pathname: string; moduleKey?: string | null }) {
  const pathname = String(params.pathname || '/');
  const normalized = normalizeRoute(pathname);

  const where: Prisma.help_videosWhereInput = {};
  const mk = String(params.moduleKey || '').trim().toLowerCase();
  if (mk && ['nexus', 'system', 'social', 'finance', 'client', 'operations'].includes(mk)) {
    where.module_key = mk;
  }

  const rows = await prisma.help_videos.findMany({
    where,
    orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    select: { id: true, module_key: true, title: true, video_url: true, order: true, route_prefix: true, duration: true },
  });

  if (rows.length === 0) return null;

  let best: unknown | null = null;
  let bestLen = -1;
  let moduleDefault: unknown | null = null;

  for (const row of rows) {
    const rp = isRecord(row) ? String(row.route_prefix ?? '').trim() : '';
    if (!rp) {
      if (!moduleDefault) moduleDefault = row;
      continue;
    }

    if (normalized === rp || normalized.startsWith(rp.endsWith('/') ? rp : `${rp}/`) || normalized.startsWith(rp)) {
      if (rp.length > bestLen) {
        best = row;
        bestLen = rp.length;
      }
    }
  }

  const picked = best || moduleDefault;
  if (!picked) return null;

  if (!isRecord(picked)) return null;

  return {
    id: String(picked.id || ''),
    title: String(picked.title || ''),
    videoUrl: String(picked.video_url || ''),
    duration: picked.duration == null ? null : String(picked.duration),
    routePrefix: String(picked.route_prefix || ''),
    moduleKey: String(picked.module_key || ''),
  };
}

function parseCommitments(rating: unknown): Array<{ who: string; what: string; due: string }> {
  const commitments = isRecord(rating) ? rating.commitments : undefined;
  if (!Array.isArray(commitments)) return [];
  return commitments
    .map((c) => {
      const who = isRecord(c) ? asString(c.who) : '';
      const what = isRecord(c) ? asString(c.what) : '';
      const due = isRecord(c) ? asString(c.due) : '';
      return { who: who.trim(), what: what.trim(), due: due.trim() };
    })
    .filter((c) => c.who || c.what || c.due);
}

async function POSTHandler(req: Request) {
  try {
    const contentLengthHeader = req.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > HARD_LIMITS.maxContentLengthBytes) {
        return jsonError('Payload too large', 413);
      }
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonError('Invalid request body', 400);
    }
    const body = parsed.data;

    if (body.featureKey && String(body.featureKey).length > HARD_LIMITS.maxFeatureKeyChars) {
      return jsonError('featureKey too long', 413);
    }
    if (body.module && String(body.module).length > HARD_LIMITS.maxModuleChars) {
      return jsonError('module too long', 413);
    }
    if (body.toneOverride && String(body.toneOverride).length > HARD_LIMITS.maxToneOverrideChars) {
      return jsonError('toneOverride too long', 413);
    }

    const pathnameRaw =
      typeof body.pathname === 'string'
        ? body.pathname
        : isRecord(body.context) && typeof body.context.pathname === 'string'
          ? String(body.context.pathname)
          : '';
    const normalizedPathname = String(pathnameRaw || '').trim() || '/';
    const hasExplicitPathname = Boolean(String(pathnameRaw || '').trim());

    const safeIncomingMessages: ChatMessage[] = (() => {
      const msgs = Array.isArray(body.messages) ? body.messages : [];
      if (msgs.length > HARD_LIMITS.maxMessages) {
        throw Object.assign(new Error('Too many messages'), { status: 413 });
      }
      const normalized = msgs
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: clampText(String(m.content || ''), 4000) }));
      const single = clampText(String(body.message || '').trim(), 4000);
      if (!normalized.length && single) {
        return [{ role: 'user', content: single }];
      }
      return normalized;
    })();

    const totalMessageChars = safeIncomingMessages.reduce((sum, m) => sum + String(m.content || '').length, 0);
    if (totalMessageChars > HARD_LIMITS.maxTotalMessageChars) {
      return jsonError('Messages too large', 413);
    }

    const ip = getClientIpFromRequest(req);
    const marketingRequest = hasExplicitPathname && isMarketingPathname(normalizedPathname);
    const earlyRateLimit = await (async () => {
      const rl = await rateLimit({
        namespace: marketingRequest ? 'ai.chat.marketing.ip_min' : 'ai.chat.anon.ip_min',
        key: ip,
        limit: marketingRequest ? 10 : 20,
        windowMs: 60_000,
        mode: 'fail_closed',
      });

      if (!rl.ok) {
        return {
          ok: false as const,
          headers: buildRateLimitHeaders({
            limit: marketingRequest ? 10 : 20,
            remaining: 0,
            resetAt: rl.resetAt,
            retryAfterSeconds: rl.retryAfterSeconds,
            label: 'ip-min',
          }),
          reason: rl.reason,
        };
      }

      return {
        ok: true as const,
        headers: buildRateLimitHeaders({
          limit: marketingRequest ? 10 : 20,
          remaining: rl.remaining,
          resetAt: rl.resetAt,
          label: 'ip-min',
        }),
      };
    })();
    if (!earlyRateLimit.ok) {
      const status = earlyRateLimit.reason === 'unavailable' ? 503 : 429;
      const msg = earlyRateLimit.reason === 'unavailable' ? 'Rate limiting temporarily unavailable' : 'Rate limit exceeded';
      return jsonError(msg, status, earlyRateLimit.headers);
    }

    if (marketingRequest) {
      const lastUser = [...safeIncomingMessages].reverse().find((m) => m.role === 'user')?.content || '';
      const historyText = formatHistory(safeIncomingMessages);

      let salesDocsKnowledge = '';
      try {
        salesDocsKnowledge = await loadSalesDocsSnippet();
      } catch {
        salesDocsKnowledge = '';
      }

      const systemInstruction = [
        'ענה תמיד בעברית טבעית, זורמת ומודרנית.',
        'אתה יועץ מכירות מומחה של MISRAD AI. המטרה שלך היא להמיר מתעניינים למשתמשים על ידי הצגת ערך פרקטי (ROI).',
        'אל תשתמש בשמות באנגלית. השתמש בשמות בעברית בלבד: "עוזר קולי (בנהיגה)", "חיבור לידים", "קיוסק".',
        'התמקד בעוזר הקולי (בנהיגה), בחיבור לידים ובקיוסק.',
        'דבר בגובה העיניים, היה ישיר ואל תשתמש במילים שיווקיות זולות.',
        'אתה מייצג את MISRAD AI בלבד (לא Misrad-CRM). אל תמציא יכולות/מודולים שלא קיימים.',
        'אם שואלים על מערכות אחרות: תן השוואה עניינית קצרה ותסביר למה הגישה של MISRAD (ניהול מבוסס קול ושטח) עדיפה לבעלי עסקים שזזים הרבה.',
        'פורמט תשובה: Markdown קריא למובייל. השתמש בכותרות קצרות, בולטים והדגשות כשצריך.',
        'בסוף כל תשובה משמעותית הוסף CTA ברור עם לינקים לפרייסינג/הרשמה או וואטסאפ/צור קשר.',
      ].join('\n');

      const request = [
        `עמוד נוכחי: ${clampText(normalizedPathname, 200)}`,
        '',
        salesDocsKnowledge ? `מידע על המוצר והמודולים:\n${clampText(salesDocsKnowledge, 14000)}` : '',
        '',
        `History:\n${clampText(historyText || '(empty)', 6000)}`,
        '',
        `User message:\n${clampText(lastUser, 4000)}`,
      ].filter(Boolean).join('\n\n');

      const cacheKey = stableHash(
        [
          'marketing',
          normalizedPathname,
          clampText(historyText || '', 6000),
          clampText(lastUser || '', 4000),
        ].join('|')
      );
      const cached = cacheGet(cacheKey);
      if (cached) {
        return apiSuccess(
          { ...cached, provider: cached.provider || null, model: cached.model || null, chargedCents: cached.chargedCents ?? 0, memory: [] },
          { headers: { ...earlyRateLimit.headers, 'X-Misrad-Cache': 'HIT' } }
        );
      }

      const openaiKey = process.env.OPENAI_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (openaiKey) {
        const openai = new OpenAIProvider(openaiKey);
        const out = await openai.generateText({
          model: 'gpt-4o-mini',
          prompt: request,
          systemInstruction: clampText(systemInstruction, 6000),
          timeoutMs: 30000,
        });
        const resp: CachedChatResponse = {
          text: ensureSalesCTA(out.text || ''),
          provider: 'openai',
          model: 'gpt-4o-mini',
          chargedCents: 0,
          memory: [],
        };
        cacheSet(cacheKey, resp);
        return apiSuccess(resp, { headers: { ...earlyRateLimit.headers, 'X-Misrad-Cache': 'MISS' } });
      }

      if (geminiKey) {
        const gemini = new GeminiProvider(geminiKey);
        const out = await gemini.generateText({
          model: 'gemini-2.5-flash',
          prompt: request,
          systemInstruction: clampText(systemInstruction, 6000),
          timeoutMs: 30000,
        });
        const resp: CachedChatResponse = {
          text: ensureSalesCTA(out.text || ''),
          provider: 'google',
          model: 'gemini-2.5-flash',
          chargedCents: 0,
          memory: [],
        };
        cacheSet(cacheKey, resp);
        return apiSuccess(resp, { headers: { ...earlyRateLimit.headers, 'X-Misrad-Cache': 'MISS' } });
      }

      return apiError('Missing AI provider key', { status: 500 });
    }

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const bodyOrgKey = body.orgId == null ? '' : String(body.orgId).trim();
    if (bodyOrgKey) {
      let headerOrgKey = '';
      try {
        headerOrgKey = getOrgKeyOrThrow(req);
      } catch {
        headerOrgKey = '';
      }

      if (headerOrgKey && headerOrgKey !== bodyOrgKey) {
        try {
          const { workspaceId: headerWorkspaceId } = await getWorkspaceOrThrow(req);
          const { workspaceId: bodyWorkspaceId } = await getWorkspaceByOrgKeyOrThrow(bodyOrgKey);
          if (String(headerWorkspaceId) !== String(bodyWorkspaceId)) {
            return apiError('Conflicting workspace context', { status: 400 });
          }
        } catch {
          return apiError('Conflicting workspace context', { status: 400 });
        }
      }
    }

    const featureKey = String(body.featureKey || 'ai.chat');
    const moduleName = String(body.module || 'global');

    const { workspaceId: organizationId } = await getWorkspaceOrThrow(req);

    const userRateLimit = await enforceRateLimit({
      namespace: 'ai.chat.user.user_min',
      key: `${organizationId}:${clerkUserId}`,
      limit: 15,
      windowMs: 60_000,
      label: 'user-min',
    });
    if (!userRateLimit.ok) {
      return jsonError('Rate limit exceeded', 429, userRateLimit.headers);
    }

    const userDayRateLimit = await enforceRateLimit({
      namespace: 'ai.chat.user.user_day',
      key: `${organizationId}:${clerkUserId}`,
      limit: 500,
      windowMs: 24 * 60 * 60_000,
      label: 'user-day',
    });
    if (!userDayRateLimit.ok) {
      return jsonError('Rate limit exceeded', 429, { ...userRateLimit.headers, ...userDayRateLimit.headers });
    }

    const orgRateLimit = await enforceRateLimit({
      namespace: 'ai.chat.org.org_10m',
      key: String(organizationId),
      limit: 120,
      windowMs: 10 * 60_000,
      label: 'org-10m',
    });
    if (!orgRateLimit.ok) {
      return jsonError('Rate limit exceeded', 429, orgRateLimit.headers);
    }

    const orgDayRateLimit = await enforceRateLimit({
      namespace: 'ai.chat.org.org_day',
      key: String(organizationId),
      limit: 5000,
      windowMs: 24 * 60 * 60_000,
      label: 'org-day',
    });
    if (!orgDayRateLimit.ok) {
      return jsonError('Rate limit exceeded', 429, { ...orgRateLimit.headers, ...orgDayRateLimit.headers });
    }

    const safeMessages: ChatMessage[] = safeIncomingMessages;

    const lastUser = clampText([...safeMessages].reverse().find((m) => m.role === 'user')?.content || '', 5000);
    const historyText = formatHistory(safeMessages);

    const context = body.context ?? body.clientContext ?? null;
    const contextText = context ? safeJsonStringify(context, 5000) : '';

    const cacheKey = stableHash(
      [
        'auth',
        String(organizationId),
        String(clerkUserId),
        clampText(featureKey, 120),
        clampText(moduleName, 80),
        clampText(normalizedPathname, 250),
        clampText(lastUser, 5000),
        clampText(historyText, 7000),
        clampText(contextText, 5000),
        clampText(String(body.toneOverride || ''), 400),
      ].join('|')
    );

    const cached = cacheGet(cacheKey);
    if (cached) {
      return apiSuccess(cached, {
        headers: {
          ...earlyRateLimit.headers,
          ...userRateLimit.headers,
          ...userDayRateLimit.headers,
          ...orgRateLimit.headers,
          ...orgDayRateLimit.headers,
          'X-Misrad-Cache': 'HIT',
        },
      });
    }

    const inflight = inflightByKey.get(cacheKey);
    if (inflight) {
      const resp = await inflight;
      return apiSuccess(resp, {
        headers: {
          ...earlyRateLimit.headers,
          ...userRateLimit.headers,
          ...userDayRateLimit.headers,
          ...orgRateLimit.headers,
          ...orgDayRateLimit.headers,
          'X-Misrad-Cache': 'HIT-INFLIGHT',
        },
      });
    }

    const ai = AIService.getInstance();

    const memoryModuleId = normalizeModuleId(moduleName);

    const computePromise = withLoadIsolation({
      organizationId,
      task: async (): Promise<CachedChatResponse> => {
        let moduleSnapshotText = '';
        try {
          if (memoryModuleId === 'system') {
            const hottest = await prisma.systemLead.findFirst({
              where: { organizationId },
              orderBy: [{ isHot: 'desc' }, { score: 'desc' }, { updatedAt: 'desc' }],
              select: { id: true, name: true, status: true, score: true, updatedAt: true },
            });
            moduleSnapshotText = safeJsonStringify({
              hottestLead: hottest
                ? {
                    id: hottest.id,
                    name: hottest.name,
                    status: hottest.status,
                    score: hottest.score ?? null,
                    updatedAt: hottest.updatedAt ? new Date(hottest.updatedAt).toISOString() : null,
                  }
                : null,
            }, 2500);
          } else if (memoryModuleId === 'client') {
            const analyses = await prisma.misradMeetingAnalysisResult.findMany({
              where: { organization_id: organizationId },
              orderBy: { created_at: 'desc' },
              take: 6,
              select: { meeting_id: true, rating: true, created_at: true, meeting: { select: { title: true } }, client: { select: { name: true } } },
            });

            let lastCommitment: {
              meetingId: string;
              clientName: string | null;
              meetingTitle: string | null;
              createdAt: string;
              who: string;
              what: string;
              due: string;
            } | null = null;
            for (const a of analyses) {
              const commitments = parseCommitments(a.rating ?? {});
              if (commitments.length) {
                const c = commitments[0];
                lastCommitment = {
                  meetingId: String(a.meeting_id),
                  clientName: a.client?.name ? String(a.client.name) : null,
                  meetingTitle: a.meeting?.title ? String(a.meeting.title) : null,
                  createdAt: new Date(a.created_at).toISOString(),
                  who: c.who,
                  what: c.what,
                  due: c.due,
                };
                break;
              }
            }

            moduleSnapshotText = safeJsonStringify({ lastCommitment }, 2500);
          } else if (memoryModuleId === 'finance') {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

            const weightedPipelineRows = await queryRawOrgScoped<Array<{ weighted_pipeline: unknown }>>(prisma, {
              organizationId,
              reason: 'ai_chat_finance_weighted_pipeline',
              query: `
                SELECT
                  COALESCE(
                    SUM(
                      (COALESCE(l.value, 0)::numeric)
                      * GREATEST(0, LEAST(1, (COALESCE(l.score, 0)::numeric / 100.0)))
                    ),
                    0
                  ) AS weighted_pipeline
                FROM system_leads l
                WHERE l.organization_id = $1::uuid
                  AND lower(COALESCE(l.status, '')) NOT IN ('won', 'lost')
              `,
              values: [organizationId],
            });

            const weightedPipelineRaw = Array.isArray(weightedPipelineRows) ? weightedPipelineRows[0]?.weighted_pipeline : 0;
            const weightedPipeline = Math.round(Number(weightedPipelineRaw || 0) * 100) / 100;

            const systemInvoicesOpenRows = await queryRawOrgScoped<Array<{ open_sum: unknown }>>(prisma, {
              organizationId,
              reason: 'ai_chat_finance_system_invoices_open_sum',
              query: `
                SELECT
                  COALESCE(SUM(i.amount::numeric), 0) AS open_sum
                FROM system_invoices i
                JOIN system_leads l ON l.id = i.lead_id
                WHERE l.organization_id = $1::uuid
                  AND i.date >= $2::timestamptz
                  AND i.date < $3::timestamptz
                  AND (
                    COALESCE(i.status, '') = ''
                    OR NOT (
                      lower(i.status) LIKE '%paid%'
                      OR lower(i.status) LIKE '%settled%'
                      OR lower(i.status) LIKE '%complete%'
                      OR lower(i.status) LIKE '%void%'
                      OR lower(i.status) LIKE '%cancel%'
                    )
                  )
              `,
              values: [organizationId, startOfMonth, startOfNextMonth],
            });

            const systemInvoicesOpenRaw = Array.isArray(systemInvoicesOpenRows) ? systemInvoicesOpenRows[0]?.open_sum : 0;
            const systemInvoicesOpen = Math.round(Number(systemInvoicesOpenRaw || 0) * 100) / 100;

            const startDateStr = startOfMonth.toISOString().slice(0, 10);
            const nextDateStr = startOfNextMonth.toISOString().slice(0, 10);
            const misradInvoicesAgg = await prisma.misradInvoice.aggregate({
              where: {
                organization_id: organizationId,
                status: { not: MisradInvoiceStatus.PAID },
                dueDate: { gte: startDateStr, lt: nextDateStr },
              },
              _sum: { amount: true },
            });

            const misradInvoicesOpenThisMonth = Number(misradInvoicesAgg._sum?.amount || 0);

            let recurringMonthly = 0;
            const billingAgg = await prisma.nexus_billing_items.aggregate({
              where: { organization_id: organizationId, cadence: 'monthly' },
              _sum: { amount: true },
            });

            const rm = billingAgg._sum?.amount;
            const rmNum = rm == null ? 0 : rm instanceof Prisma.Decimal ? rm.toNumber() : Number(rm);
            recurringMonthly = Math.round((Number.isFinite(rmNum) ? rmNum : 0) * 100) / 100;

            const expectedMonthlyRevenue = Math.round((weightedPipeline + systemInvoicesOpen + misradInvoicesOpenThisMonth + recurringMonthly) * 100) / 100;
            moduleSnapshotText = safeJsonStringify(
              {
                expectedMonthlyRevenue,
                breakdown: {
                  weightedPipeline,
                  systemInvoicesOpenThisMonth: systemInvoicesOpen,
                  misradInvoicesOpenThisMonth,
                  recurringMonthly,
                },
              },
              2500
            );
          }
        } catch {
          moduleSnapshotText = '';
        }

        let memoryHits: Array<{ docKey: string; chunkIndex: number; similarity: number; content: string; metadata: unknown }> = [];
        try {
          if (lastUser.trim()) {
            const hits = await ai.semanticSearch({
              featureKey: `${featureKey}.semantic_search`,
              organizationId,
              userId: clerkUserId,
              query: lastUser,
              moduleId: memoryModuleId,
              matchCount: 6,
              similarityThreshold: 0.2,
            });
            memoryHits = (hits || []).map((h) => ({
              docKey: h.docKey,
              chunkIndex: h.chunkIndex,
              similarity: h.similarity,
              content: clampText(String(h.content || ''), 450),
              metadata: h.metadata ?? null,
            }));
          }
        } catch {
          memoryHits = [];
        }

        const memoryText = memoryHits.length
          ? memoryHits
              .map((h, i) => `#${i + 1} (${h.similarity.toFixed(3)}) ${h.docKey}\n${h.content}`)
              .join('\n\n')
          : '(none)';

        let helpVideoText = '';
        try {
          if (normalizedPathname) {
            const hv = await getHelpVideoSuggestion({ organizationId, pathname: normalizedPathname, moduleKey: moduleName });
            if (hv?.videoUrl) {
              helpVideoText = `מדריך וידאו מומלץ למסך הזה: ${hv.title}${hv.duration ? ` (${hv.duration})` : ''} - ${hv.videoUrl}`;
            }
          }
        } catch {
          helpVideoText = '';
        }

        let techDocs = '';
        try {
          techDocs = clampText(await loadTechDocsSnippet(), 3500);
        } catch {
          techDocs = '';
        }

        let salesDocsKnowledge = '';
        try {
          salesDocsKnowledge = clampText(await loadSalesDocsSnippet(), 8000);
        } catch {
          salesDocsKnowledge = '';
        }

        const systemInstruction = [
          'אתה "שרה מהתמיכה".',
          'אתה מומחה תמיכה טכנית. עזור למשתמש לבצע פעולות בתוך המערכת.',
          'השתמש במידע על המודולים ובלינקים למדריכים. היה סבלני ושירותי.',
          helpVideoText ? `מדריכים רלוונטיים:\n${helpVideoText}` : '',
          techDocs ? `תיעוד טכני פנימי (קטע):\n${techDocs}` : '',
          salesDocsKnowledge ? `מידע על מודולים ויכולות המערכת:\n${salesDocsKnowledge}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        const request = `מודול: ${clampText(moduleName, 60)}

UI Snapshot (me-insights):
${clampText(moduleSnapshotText || '(none)', 2500)}

Organizational Memory (pgvector):
${clampText(memoryText, 3500)}

Context (JSON):
${clampText(contextText || '{}', 5000)}

History:
${clampText(historyText || '(empty)', 7000)}

User message:
${clampText(lastUser, 5000)}`;

        await logAuditEvent('ai.query', featureKey, {
          details: {
            organizationId,
            module: moduleName,
            hasContext: Boolean(context),
            memoryHits: memoryHits.length,
          },
        });

        const out = await ai.generateText({
          featureKey,
          organizationId,
          userId: clerkUserId,
          prompt: request,
          systemInstruction: clampText(systemInstruction, 6000),
          meta: {
            module: moduleName,
            toneOverride: body.toneOverride,
          },
        });

        return {
          text: out.text || '',
          provider: out.provider,
          model: out.model,
          chargedCents: out.chargedCents,
          memory: memoryHits.map((h) => ({
            docKey: h.docKey,
            similarity: h.similarity,
            chunkIndex: h.chunkIndex,
            content: h.content,
            metadata: h.metadata ?? null,
          })),
        } as CachedChatResponse;
      },
    });

    inflightByKey.set(cacheKey, computePromise);
    try {
      const resp = await computePromise;
      cacheSet(cacheKey, resp);
      return apiSuccess(resp, {
        headers: {
          ...earlyRateLimit.headers,
          ...userRateLimit.headers,
          ...userDayRateLimit.headers,
          ...orgRateLimit.headers,
          ...orgDayRateLimit.headers,
          'X-Misrad-Cache': 'MISS',
        },
      });
    } finally {
      inflightByKey.delete(cacheKey);
    }
  } catch (e: unknown) {
    const status = getErrorStatus(e);
    const name = getErrorName(e);
    const message = getErrorMessage(e);
    if (status === 402 || name === 'UpgradeRequiredError') {
      return apiError(e, { status: 402, message: message || 'Upgrade Required' });
    }
    if (status === 413) {
      return apiError(e, { status: 413, message: message || 'Payload too large' });
    }
    if (status === 503) {
      const retryAfterSeconds =
        e instanceof Error && typeof (e as ErrorWithStatus).retryAfterSeconds === 'number' ? (e as ErrorWithStatus).retryAfterSeconds : 3;
      return apiError('Server overloaded, try again shortly.', { status: 503, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }
    return apiError(e, { status: 500, message: message || 'Chat failed' });
  }
}

export const POST = shabbatGuard(POSTHandler);
