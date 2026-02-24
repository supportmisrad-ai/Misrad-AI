import prisma, { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { AIProviderError, UpgradeRequiredError } from './errors';
import {
  AIFeatureSettingsRow,
  AIGenerateJsonParams,
  AIGenerateJsonResult,
  AIGenerateTextParams,
  AIGenerateTextResult,
  AIStreamTextParams,
  AIStreamTextResult,
  AITaskKind,
  AIProviderName,
  AITranscribeParams,
  AITranscribeResult,
} from './types';
import { GeminiProvider } from './providers/GeminiProvider';
import { DeepgramProvider } from './providers/DeepgramProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GroqProvider } from './providers/GroqProvider';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { decrypt } from '@/lib/encryption';
import prompts from './prompts.json';

type LoadedFeatureSettings = {
  settings: AIFeatureSettingsRow;
  modelDisplayName?: string | null;
};

function stringifyError(error: unknown): string {
  const obj = asObject(error);
  const msg = obj && typeof obj.message === 'string' ? obj.message : '';
  return msg || getErrorMessage(error) || String(error);
}

function isAIProviderName(value: unknown): value is AIProviderName {
  return value === 'google' || value === 'openai' || value === 'anthropic' || value === 'groq' || value === 'deepgram';
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function coerceFeatureSettingsRow(row: unknown): AIFeatureSettingsRow | null {
  const obj = asObject(row);
  if (!obj) return null;

  const id = typeof obj.id === 'string' ? obj.id : '';
  const feature_key = typeof obj.feature_key === 'string' ? obj.feature_key : '';
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : false;
  const primary_provider = isAIProviderName(obj.primary_provider) ? obj.primary_provider : null;
  const primary_model = typeof obj.primary_model === 'string' ? obj.primary_model : '';
  const fallback_provider = obj.fallback_provider == null ? null : isAIProviderName(obj.fallback_provider) ? obj.fallback_provider : null;
  const fallback_model = obj.fallback_model == null ? null : typeof obj.fallback_model === 'string' ? obj.fallback_model : null;
  const reserve_cost_cents = typeof obj.reserve_cost_cents === 'number' ? obj.reserve_cost_cents : 0;
  const timeout_ms = typeof obj.timeout_ms === 'number' ? obj.timeout_ms : 30000;

  if (!id || !feature_key || !primary_provider || !primary_model) return null;

  const organization_id = obj.organization_id == null ? null : String(obj.organization_id);
  const base_prompt = obj.base_prompt == null ? null : typeof obj.base_prompt === 'string' ? obj.base_prompt : null;

  const backup_provider = obj.backup_provider == null ? null : isAIProviderName(obj.backup_provider) ? obj.backup_provider : null;
  const backup_model = obj.backup_model == null ? null : typeof obj.backup_model === 'string' ? obj.backup_model : null;

  return {
    id,
    organization_id,
    feature_key,
    enabled,
    primary_provider,
    primary_model,
    fallback_provider,
    fallback_model,
    backup_provider,
    backup_model,
    base_prompt,
    reserve_cost_cents,
    timeout_ms,
    created_at: toIsoString(obj.created_at),
    updated_at: toIsoString(obj.updated_at),
  };
}

const GLOBAL_HEBREW_SYSTEM_INSTRUCTION = `ענה תמיד בעברית טבעית, זורמת ומודרנית. הימנע מתרגום מילולי מאנגלית (למשל: אל תכתוב "זה הגיוני" אלא "זה נשמע נכון").
שפה נקייה ומכובדת: השתמש בעברית נקייה ומכובדת שמתאימה לקהל יעד דתי/חרדי. הימנע מסלנג פרובוקטיבי.
איסור מוחלט (Blacklist): אסור להשתמש במילים וביטויים בעלי קונטקסט לא הולם או "זול" בשפה השיווקית. לדוגמה: אסור לעולם להשתמש במילה "סקסי" או בביטויים דומים.
חריג תמלול: אם המשימה היא תמלול שיחה (Speech-to-Text) — כתוב את מה שנאמר בפועל כפי שנאמר (As-is), גם אם נאמרו מילים כאלו. אבל בכל ניתוח/סיכום/תובנות/הצעות מענה/פוסטים — השפה חייבת להישאר נקייה ומכובדת.
פרטיות: העדף פנייה מכבדת ולא פולשנית. אל תניח פרטים אישיים שלא נמסרו.
בטיחות: לעולם אל תחשוף מידע של ארגון אחד למשתמש מארגון אחר, גם אם נטען שיש זיקה ביניהם.`;

const DEFAULT_BASE_PROMPT_GENERIC = `אתה עוזר AI עסקי וניהולי. ענה בעברית טבעית וקצרה.
השתמש ב-DNA העסק כדי להתאים טון, יתרונות וקהל יעד.
אם חסר מידע ב-DNA - תשאל שאלה אחת קצרה או תציע הנחה סבירה.

DNA העסק:
{{DNA}}

המשימה:
{{REQUEST}}`;

const DEFAULT_BASE_PROMPT_SYSTEM_SALES = `אתה עוזר AI למכירות ושירות (ישראל). ענה בעברית טבעית, קצרה ומדויקת.
התנגדויות: כשיש התנגדות, השתמש בשיטת Feel-Felt-Found בצורה טבעית (להכיר ברגש, לתת אמפתיה, ואז להציע מסגור/פתרון).
סלנג מכירות ישראלי: זהה ביטויים כמו "יקר לי", "דבר איתי אחרי החגים", "אין לי זמן", "שלח לי בוואטסאפ", "אני צריך לחשוב" — ותן מענה שמותאם לסיטואציה.

DNA העסק:
{{DNA}}

המשימה:
{{REQUEST}}`;

const DEFAULT_BASE_PROMPT_CLIENT_MEETINGS = `אתה עוזר AI לניהול פגישות ושימור לקוחות. ענה בעברית טבעית וקצרה.
התחייבויות (Commitments): חילוץ קפדני של "מי הבטיח מה ולמתי". אם לא ברור — כתוב "לא צוין" במקום להמציא.
חום מערכת יחסים: תן ציון סנטימנט מ-1 עד 10 לפי הטון של הלקוח, והסבר במשפט קצר למה.

DNA העסק:
{{DNA}}

המשימה:
{{REQUEST}}`;

const DEFAULT_BASE_PROMPT_SOCIAL_COPY = `אתה קופירייטר/ית בעברית מודרנית, זורמת ומכובדת.
הימנע מקלישאות AI (למשל: "בעולם של היום", "בעידן הדיגיטלי").
הוסף ערך: שלב את ה-DNA העסקי (חזון ויעדי רווח) באופן טבעי ולא דוחף.
שפה נקייה: בפוסטים העדף מונחים כמו "מושך", "עוצמתי", "בולט", "יוקרתי" על פני סלנג שיווקי פרובוקטיבי.

DNA העסק:
{{DNA}}

המשימה:
{{REQUEST}}`;

const DEFAULT_BASE_PROMPT_BI = `אתה אנליסט BI עסקי. ענה בעברית ברורה ומעשית.
אל תסתפק בתיאור נתונים: תן תובנות אופרטיביות שמטרתן שיפור רווחיות בכ-5% (עם צעדים קונקרטיים).
חפש קשרים בין מודולים: לדוגמה, ירידה ברווחיות בגלל עלייה בהוצאות שיווק במודול System או בגלל תהליכי מכירה לא יעילים.

DNA העסק:
{{DNA}}

המשימה:
{{REQUEST}}`;

function getDefaultBasePrompt(featureKey: string): string {
  const fk = String(featureKey || '').toLowerCase();

  if (fk.startsWith('system.')) return DEFAULT_BASE_PROMPT_SYSTEM_SALES;
  if (fk.startsWith('client.') || fk.startsWith('client-os.') || fk.startsWith('client_os.')) return DEFAULT_BASE_PROMPT_CLIENT_MEETINGS;
  if (fk.startsWith('social.')) return DEFAULT_BASE_PROMPT_SOCIAL_COPY;
  if (fk.startsWith('nexus.') || fk.startsWith('finance.')) return DEFAULT_BASE_PROMPT_BI;

  return DEFAULT_BASE_PROMPT_GENERIC;
}

type CacheEntry<T> = { value: T; expiresAt: number };

const CACHE_TTL = {
  FEATURE_SETTINGS: 60_000,
  PROVIDER_KEY: 300_000,
  MODEL_DISPLAY_NAME: 300_000,
  AI_DNA: 60_000,
} as const;

const CACHE_MAX_SIZE = 200;

function ttlGet<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function ttlSet<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (cache.size > CACHE_MAX_SIZE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

export class AIService {
  private static instance: AIService | null = null;
  private static _featureSettingsCache = new Map<string, CacheEntry<LoadedFeatureSettings>>();
  private static _providerKeyCache = new Map<string, CacheEntry<string>>();
  private static _modelDisplayNameCache = new Map<string, CacheEntry<string | null>>();
  private static _aiDnaCache = new Map<string, CacheEntry<Record<string, unknown>>>();

  static getInstance(): AIService {
    if (!AIService.instance) AIService.instance = new AIService();
    return AIService.instance;
  }

  async semanticSearch(params: {
    featureKey: string;
    organizationId?: string;
    userId?: string;
    query: string;
    moduleId?: string | null;
    matchCount?: number;
    similarityThreshold?: number;
  }): Promise<Array<{ id: string; docKey: string; chunkIndex: number; content: string; metadata: unknown; similarity: number }>> {
    const ctx = await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });

    const embedOut = await this.embedForMemory({
      featureKey: params.featureKey,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      input: params.query,
      meta: {
        module: params.moduleId || null,
        kind: 'semantic_search',
        queryChars: String(params.query || '').length,
      },
    });

    const rows = await queryRawOrgScoped<unknown[]>(prisma, {
      organizationId: ctx.organizationId,
      reason: 'ai_semantic_search',
      query:
        'select r.*\n' +
        'from (select $1::uuid as organization_id) scope\n' +
        'join lateral ai_semantic_search(\n' +
        '  p_organization_id := scope.organization_id,\n' +
        '  p_query_embedding := $2::vector,\n' +
        '  p_user_id := $3::uuid,\n' +
        '  p_module_id := $4,\n' +
        '  p_match_count := $5,\n' +
        '  p_similarity_threshold := $6\n' +
        ') r on true\n' +
        'where scope.organization_id = $1::uuid',
      values: [
        ctx.organizationId,
        this.vectorToPgText(embedOut.embedding),
        ctx.userId,
        params.moduleId || null,
        Math.max(1, Math.min(50, Math.floor(params.matchCount ?? 8))),
        typeof params.similarityThreshold === 'number' ? params.similarityThreshold : 0.2,
      ],
    });

    return rows.map((r) => {
      const obj = asObject(r) ?? {};
      return {
        id: String(obj.id ?? ''),
        docKey: String(obj.doc_key ?? ''),
        chunkIndex: Number(obj.chunk_index ?? 0),
        content: String(obj.content ?? ''),
        metadata: obj.metadata ?? null,
        similarity: Number(obj.similarity ?? 0),
      };
    });
  }

  async ingestText(params: {
    featureKey: string;
    organizationId?: string;
    userId?: string;
    moduleId: string;
    docKey: string;
    text: string;
    isPublicInOrg: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<{ chunks: number; chargedCents: number }> {
    const parentFeatureKey = String(params.featureKey || '').trim() || 'ai.memory';
    const embeddingFeatureKey = parentFeatureKey.toLowerCase().includes('embedding') ? parentFeatureKey : `${parentFeatureKey}.embedding`;

    const ctx = await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });
    const feature = await this.loadFeatureSettings({ organizationId: ctx.organizationId, featureKey: embeddingFeatureKey });

    const chargedCents = await this.reserveCredits({ organizationId: ctx.organizationId, reserveCents: feature.settings.reserve_cost_cents });
    const start = Date.now();

    const providerUsed: AIProviderName = feature.settings.primary_provider;
    const modelUsed = feature.settings.primary_model;

    try {
      if (providerUsed !== 'openai') {
        throw new AIProviderError({ provider: providerUsed, message: 'Embedding provider must be openai for pgvector ingestion' });
      }

      const chunks = this.chunkText(String(params.text || ''));

      const apiKey = await this.getProviderKey({ provider: 'openai', organizationId: ctx.organizationId });
      const openai = new OpenAIProvider(apiKey);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vec = await openai.embedText({ model: modelUsed, input: chunk, timeoutMs: feature.settings.timeout_ms });

        await executeRawOrgScoped(prisma, {
          organizationId: ctx.organizationId,
          reason: 'ai_embeddings_upsert',
          query:
            'insert into ai_embeddings (\n' +
            '  organization_id, module_id, user_id, is_public_in_org, doc_key, chunk_index, content, embedding, metadata, updated_at\n' +
            ') values (\n' +
            '  $1::uuid, $2, $3, $4, $5, $6, $7, $8::vector, $9::jsonb, now()\n' +
            ')\n' +
            'on conflict (organization_id, doc_key, chunk_index) do update set\n' +
            '  module_id = excluded.module_id,\n' +
            '  user_id = excluded.user_id,\n' +
            '  is_public_in_org = excluded.is_public_in_org,\n' +
            '  content = excluded.content,\n' +
            '  embedding = excluded.embedding,\n' +
            '  metadata = excluded.metadata,\n' +
            '  updated_at = now()',
          values: [
            ctx.organizationId,
            params.moduleId,
            ctx.userId,
            Boolean(params.isPublicInOrg),
            params.docKey,
            i,
            chunk,
            this.vectorToPgText(vec.embedding),
            params.metadata || null,
          ],
        });
      }

      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: embeddingFeatureKey,
        taskKind: 'embedding',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: null,
        chargedCents,
        latencyMs: Date.now() - start,
        status: 'success',
        meta: {
          ...(params.metadata || {}),
          parentFeatureKey,
          moduleId: params.moduleId,
          docKey: params.docKey,
          chunks: chunks.length,
          isPublicInOrg: Boolean(params.isPublicInOrg),
        },
      });

      return { chunks: chunks.length, chargedCents };
    } catch (err: unknown) {
      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      const message = getErrorMessage(err);
      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: embeddingFeatureKey,
        taskKind: 'embedding',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: null,
        chargedCents: 0,
        latencyMs: Date.now() - start,
        status: 'error',
        errorMessage: message || String(err),
        meta: {
          ...(params.metadata || {}),
          parentFeatureKey,
          moduleId: params.moduleId,
          docKey: params.docKey,
          refundedCents: chargedCents,
        },
      });

      throw err instanceof Error ? err : new Error(message || 'AI provider error');
    }
  }

  async generateJson<T = unknown>(params: AIGenerateJsonParams): Promise<AIGenerateJsonResult<T>> {
    const ctx = await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });
    const feature = await this.loadFeatureSettings({ organizationId: ctx.organizationId, featureKey: params.featureKey });

    const effectivePrompt = await this.assemblePrompt({
      organizationId: ctx.organizationId,
      featureKey: params.featureKey,
      basePrompt: feature.settings.base_prompt ?? null,
      userRequest: params.prompt,
      meta: params.meta,
    });

    const chargedCents = await this.reserveCredits({ organizationId: ctx.organizationId, reserveCents: feature.settings.reserve_cost_cents });

    const start = Date.now();
    let providerUsed: AIProviderName = feature.settings.primary_provider;
    let modelUsed = feature.settings.primary_model;
    const providersTried: Array<{ provider: AIProviderName; model: string; ok: boolean; error?: string }> = [];

    try {
      const primary = await this.tryGenerateJson({
        organizationId: ctx.organizationId,
        provider: feature.settings.primary_provider,
        model: feature.settings.primary_model,
        prompt: effectivePrompt,
        systemInstruction: params.systemInstruction,
        responseSchema: params.responseSchema,
        timeoutMs: feature.settings.timeout_ms,
      });
      providersTried.push({ provider: feature.settings.primary_provider, model: feature.settings.primary_model, ok: true });

      providerUsed = feature.settings.primary_provider;
      modelUsed = feature.settings.primary_model;

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      const parsed = JSON.parse(primary.text || '{}');

      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: params.featureKey,
        taskKind: 'json',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: modelDisplayName,
        chargedCents,
        latencyMs: Date.now() - start,
        status: 'success',
        meta: { ...params.meta, providersTried, fallbackUsed: false },
      });

      return {
        result: parsed as T,
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: modelDisplayName,
        chargedCents,
      };
    } catch (primaryErr: unknown) {
      providersTried.push({
        provider: feature.settings.primary_provider,
        model: feature.settings.primary_model,
        ok: false,
        error: stringifyError(primaryErr),
      });

      const shouldTryFallback = !!feature.settings.fallback_provider && !!feature.settings.fallback_model;
      if (shouldTryFallback && this.isRetryableProviderFailure(primaryErr)) {
        try {
          const fallback = await this.tryGenerateJson({
            organizationId: ctx.organizationId,
            provider: feature.settings.fallback_provider as AIProviderName,
            model: feature.settings.fallback_model as string,
            prompt: effectivePrompt,
            systemInstruction: params.systemInstruction,
            responseSchema: params.responseSchema,
            timeoutMs: feature.settings.timeout_ms,
          });
          providersTried.push({
            provider: feature.settings.fallback_provider as AIProviderName,
            model: feature.settings.fallback_model as string,
            ok: true,
          });

          providerUsed = feature.settings.fallback_provider as AIProviderName;
          modelUsed = feature.settings.fallback_model as string;

          const modelDisplayName = await this.getModelDisplayName({
            organizationId: ctx.organizationId,
            provider: providerUsed,
            model: modelUsed,
          });

          const parsed = JSON.parse(fallback.text || '{}');

          this.logUsage({
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            featureKey: params.featureKey,
            taskKind: 'json',
            provider: providerUsed,
            model: modelUsed,
            modelDisplayName: modelDisplayName,
            chargedCents,
            latencyMs: Date.now() - start,
            status: 'success',
            meta: {
              ...params.meta,
              providersTried,
              fallbackUsed: true,
              fallbackFrom: { provider: feature.settings.primary_provider, model: feature.settings.primary_model },
            },
          });

          return {
            result: parsed as T,
            provider: providerUsed,
            model: modelUsed,
            modelDisplayName: modelDisplayName,
            chargedCents,
          };
        } catch (fallbackErr: unknown) {
          providersTried.push({
            provider: feature.settings.fallback_provider as AIProviderName,
            model: feature.settings.fallback_model as string,
            ok: false,
            error: stringifyError(fallbackErr),
          });
        }
      }

      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: params.featureKey,
        taskKind: 'json',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: modelDisplayName,
        chargedCents: 0,
        latencyMs: Date.now() - start,
        status: 'error',
        errorMessage: stringifyError(primaryErr),
        meta: {
          ...params.meta,
          providersTried,
          refundedCents: chargedCents,
          fallbackUsed: providerUsed !== feature.settings.primary_provider,
          fallbackAttempted: providersTried.some((p) => p.provider !== feature.settings.primary_provider),
        },
      });

      throw primaryErr;
    }
  }

  async generateVisionJson<T = unknown>(params: {
    featureKey: string;
    organizationId?: string;
    userId?: string;
    bypassAuth?: boolean;
    prompt: string;
    imageDataUrl: string;
    systemInstruction?: string;
    responseSchema?: unknown;
    meta?: Record<string, unknown>;
  }): Promise<AIGenerateJsonResult<T>> {
    const ctx = params.bypassAuth
      ? (() => {
          const organizationId = String(params.organizationId || '').trim();
          const userId = String(params.userId || '').trim();
          if (!organizationId || !userId) {
            throw new Error('Unauthorized');
          }
          return { organizationId, userId };
        })()
      : await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });

    const feature = await this.loadFeatureSettings({ organizationId: ctx.organizationId, featureKey: params.featureKey });

    const chargedCents = await this.reserveCredits({ organizationId: ctx.organizationId, reserveCents: feature.settings.reserve_cost_cents });
    const start = Date.now();

    const providerUsed: AIProviderName = 'openai';
    const modelUsed = String(feature.settings.primary_model || 'gpt-4o');

    try {
      const apiKey = await this.getProviderKey({ provider: 'openai', organizationId: ctx.organizationId });
      const openai = new OpenAIProvider(apiKey);

      const out = await openai.generateVisionJson({
        model: modelUsed,
        prompt: String(params.prompt || ''),
        imageDataUrl: String(params.imageDataUrl || ''),
        systemInstruction: this.mergeSystemInstruction(params.systemInstruction),
        timeoutMs: feature.settings.timeout_ms,
      });

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      const parsed = JSON.parse(out.text || '{}');

      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: params.featureKey,
        taskKind: 'json',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName,
        chargedCents,
        latencyMs: Date.now() - start,
        status: 'success',
        meta: {
          ...(params.meta || {}),
          responseSchema: params.responseSchema ? true : false,
          kind: 'vision_json',
        },
      });

      return {
        result: parsed as T,
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName,
        chargedCents,
      };
    } catch (err: unknown) {
      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      const message = getErrorMessage(err);

      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: params.featureKey,
        taskKind: 'json',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName,
        chargedCents: 0,
        latencyMs: Date.now() - start,
        status: 'error',
        errorMessage: message || String(err),
        meta: { ...(params.meta || {}), refundedCents: chargedCents, kind: 'vision_json' },
      });

      throw err instanceof Error ? err : new Error(message || 'AI provider error');
    }
  }

  async generateText(params: AIGenerateTextParams): Promise<AIGenerateTextResult> {
    const ctx = await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });
    const feature = await this.loadFeatureSettings({ organizationId: ctx.organizationId, featureKey: params.featureKey });

    const effectivePrompt = await this.assemblePrompt({
      organizationId: ctx.organizationId,
      featureKey: params.featureKey,
      basePrompt: feature.settings.base_prompt ?? null,
      userRequest: params.prompt,
      meta: params.meta,
    });

    const chargedCents = await this.reserveCredits({ organizationId: ctx.organizationId, reserveCents: feature.settings.reserve_cost_cents });

    const start = Date.now();
    let providerUsed: AIProviderName = feature.settings.primary_provider;
    let modelUsed = feature.settings.primary_model;
    const providersTried: Array<{ provider: AIProviderName; model: string; ok: boolean; error?: string }> = [];

    try {
      const primary = await this.tryGenerateText({
        organizationId: ctx.organizationId,
        provider: feature.settings.primary_provider,
        model: feature.settings.primary_model,
        prompt: effectivePrompt,
        systemInstruction: params.systemInstruction,
        timeoutMs: feature.settings.timeout_ms,
      });
      providersTried.push({ provider: feature.settings.primary_provider, model: feature.settings.primary_model, ok: true });

      providerUsed = feature.settings.primary_provider;
      modelUsed = feature.settings.primary_model;

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: params.featureKey,
        taskKind: 'text',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: modelDisplayName,
        chargedCents,
        latencyMs: Date.now() - start,
        status: 'success',
        meta: { ...params.meta, providersTried, fallbackUsed: false },
      });

      return {
        text: primary.text,
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: modelDisplayName,
        chargedCents,
      };
    } catch (primaryErr: unknown) {
      providersTried.push({
        provider: feature.settings.primary_provider,
        model: feature.settings.primary_model,
        ok: false,
        error: stringifyError(primaryErr),
      });

      const shouldTryFallback = !!feature.settings.fallback_provider && !!feature.settings.fallback_model;
      if (shouldTryFallback && this.isRetryableProviderFailure(primaryErr)) {
        try {
          const fallback = await this.tryGenerateText({
            organizationId: ctx.organizationId,
            provider: feature.settings.fallback_provider as AIProviderName,
            model: feature.settings.fallback_model as string,
            prompt: effectivePrompt,
            systemInstruction: params.systemInstruction,
            timeoutMs: feature.settings.timeout_ms,
          });
          providersTried.push({
            provider: feature.settings.fallback_provider as AIProviderName,
            model: feature.settings.fallback_model as string,
            ok: true,
          });

          providerUsed = feature.settings.fallback_provider as AIProviderName;
          modelUsed = feature.settings.fallback_model as string;

          const modelDisplayName = await this.getModelDisplayName({
            organizationId: ctx.organizationId,
            provider: providerUsed,
            model: modelUsed,
          });

          this.logUsage({
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            featureKey: params.featureKey,
            taskKind: 'text',
            provider: providerUsed,
            model: modelUsed,
            modelDisplayName: modelDisplayName,
            chargedCents,
            latencyMs: Date.now() - start,
            status: 'success',
            meta: {
              ...params.meta,
              providersTried,
              fallbackUsed: true,
              fallbackFrom: { provider: feature.settings.primary_provider, model: feature.settings.primary_model },
            },
          });

          return {
            text: fallback.text,
            provider: providerUsed,
            model: modelUsed,
            modelDisplayName: modelDisplayName,
            chargedCents,
          };
        } catch (fallbackErr: unknown) {
          providersTried.push({
            provider: feature.settings.fallback_provider as AIProviderName,
            model: feature.settings.fallback_model as string,
            ok: false,
            error: stringifyError(fallbackErr),
          });
        }
      }

      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: params.featureKey,
        taskKind: 'text',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: modelDisplayName,
        chargedCents: 0,
        latencyMs: Date.now() - start,
        status: 'error',
        errorMessage: stringifyError(primaryErr),
        meta: {
          ...params.meta,
          providersTried,
          refundedCents: chargedCents,
          fallbackUsed: providerUsed !== feature.settings.primary_provider,
          fallbackAttempted: providersTried.some((p) => p.provider !== feature.settings.primary_provider),
        },
      });

      throw primaryErr;
    }
  }

  async transcribe(params: AITranscribeParams): Promise<AITranscribeResult> {
    const ctx = await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });
    const feature = await this.loadFeatureSettings({ organizationId: ctx.organizationId, featureKey: params.featureKey });

    const chargedCents = await this.reserveCredits({ organizationId: ctx.organizationId, reserveCents: feature.settings.reserve_cost_cents });

    const start = Date.now();
    let providerUsed: AIProviderName = feature.settings.primary_provider;
    let modelUsed = feature.settings.primary_model;

    try {
      if (feature.settings.primary_provider === 'deepgram') {
        let deepgramKey: string | null = null;
        try {
          deepgramKey = await this.getProviderKey({ provider: 'deepgram', organizationId: ctx.organizationId });
        } catch {
          // Deepgram key missing — fall through to Google fallback below
        }

        if (deepgramKey) {
          const deepgram = new DeepgramProvider(deepgramKey);

          const out = await deepgram.transcribe({
            audioBuffer: params.audioBuffer,
            mimeType: params.mimeType,
            timeoutMs: feature.settings.timeout_ms,
          });

          providerUsed = 'deepgram';
          modelUsed = feature.settings.primary_model;

          this.logUsage({
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            featureKey: params.featureKey,
            taskKind: 'transcription',
            provider: providerUsed,
            model: modelUsed,
            modelDisplayName: null,
            chargedCents,
            latencyMs: Date.now() - start,
            status: 'success',
            meta: params.meta,
          });

          return { text: out.text, provider: providerUsed, model: modelUsed, chargedCents };
        }

        // Deepgram key not available — fallback to Google
        console.warn('[AIService] Deepgram key not configured, falling back to Google for transcription');
      }

      // Google provider (primary or fallback from Deepgram)
      {
        const apiKey = await this.getProviderKey({ provider: 'google', organizationId: ctx.organizationId });
        const gemini = new GeminiProvider(apiKey);

        const geminiModel = feature.settings.primary_provider === 'google'
          ? feature.settings.primary_model
          : 'gemini-2.5-flash';

        const out = await gemini.transcribe({
          model: geminiModel,
          audioBuffer: params.audioBuffer,
          mimeType: params.mimeType,
          timeoutMs: feature.settings.timeout_ms,
        });

        providerUsed = 'google';
        modelUsed = geminiModel;

        this.logUsage({
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          featureKey: params.featureKey,
          taskKind: 'transcription',
          provider: providerUsed,
          model: modelUsed,
          modelDisplayName: null,
          chargedCents,
          latencyMs: Date.now() - start,
          status: 'success',
          meta: { ...params.meta, fallbackFromDeepgram: feature.settings.primary_provider === 'deepgram' },
        });

        return { text: out.text, provider: providerUsed, model: modelUsed, chargedCents };
      }
    } catch (err: unknown) {
      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      const message = getErrorMessage(err);
      this.logUsage({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        featureKey: params.featureKey,
        taskKind: 'transcription',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: null,
        chargedCents: 0,
        latencyMs: Date.now() - start,
        status: 'error',
        errorMessage: message || String(err),
        meta: { ...params.meta, refundedCents: chargedCents },
      });

      throw err instanceof Error ? err : new Error(message || 'AI provider error');
    }
  }

  private async resolveContext(params: { organizationId?: string; userId?: string }): Promise<{ organizationId: string; userId: string }> {
    const sessionUserId = await getCurrentUserId();
    const effectiveUserId = params.userId || sessionUserId;

    if (!effectiveUserId) {
      throw new Error('Unauthorized');
    }

    if (params.userId && sessionUserId && String(params.userId) !== String(sessionUserId)) {
      throw new Error('Unauthorized');
    }

    if (params.organizationId) {
      const workspace = await requireWorkspaceAccessByOrgSlugApi(String(params.organizationId));
      return { organizationId: String(workspace.id), userId: String(effectiveUserId) };
    }

    const data = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: effectiveUserId },
      select: { organization_id: true },
    });

    const orgId = data?.organization_id ? String(data.organization_id) : null;
    if (!orgId) {
      throw new Error('Missing organization context');
    }

    return { organizationId: orgId, userId: String(effectiveUserId) };
  }

  private async loadFeatureSettings(params: { organizationId: string; featureKey: string }): Promise<LoadedFeatureSettings> {
    const cacheKey = `${params.organizationId}:${params.featureKey}`;
    const cached = ttlGet(AIService._featureSettingsCache, cacheKey);
    if (cached) return cached;

    const orgRow = await prisma.ai_feature_settings.findFirst({
      where: { organization_id: params.organizationId, feature_key: params.featureKey, enabled: true },
    });

    let settings = coerceFeatureSettingsRow(orgRow);

    if (!settings) {
      try {
        const globalRow = await prisma.ai_feature_settings.findFirst({
          where: { organization_id: null, feature_key: params.featureKey, enabled: true },
        });
        settings = coerceFeatureSettingsRow(globalRow);
      } catch {
        // Tenant guard blocks organization_id:null queries — fall through to defaults
      }
    }

    if (!settings) {
      const fk = String(params.featureKey || '').toLowerCase();
      const isTranscription = fk.includes('transcription') || fk.includes('transcribe');
      const isClientMeetings = fk.startsWith('client_os.meetings.') || fk.startsWith('client-os.meetings.') || fk.startsWith('client.meetings.');
      const isClientMeetingsTranscription = fk.includes('client_os.meetings.transcription') || fk.includes('client-os.meetings.transcription') || (isClientMeetings && isTranscription);
      const isClientMeetingsAnalyze = fk.includes('client_os.meetings.analyze') || fk.includes('client-os.meetings.analyze');
      const isObjection = fk.includes('objection') || fk.includes('objections') || fk.includes('handler');
      const isEmbedding = fk.includes('embedding') || fk.includes('embed') || fk.includes('vector');
      const isVision = fk.includes('vision');

      const isLiveTranscription = fk.includes('live_transcribe') || fk.includes('live.transcribe');
      const defaultTimeoutMs = isLiveTranscription ? 15000 : isClientMeetingsTranscription ? 180000 : isClientMeetings ? 120000 : 30000;

      settings = {
        id: 'default',
        organization_id: null,
        feature_key: params.featureKey,
        enabled: true,
        primary_provider: isEmbedding
          ? 'openai'
          : isVision
            ? 'openai'
          : isTranscription
            ? isClientMeetingsTranscription
              ? 'google'
              : 'deepgram'
            : isObjection
              ? 'groq'
              : 'google',
        primary_model: isEmbedding
          ? 'text-embedding-3-small'
          : isVision
            ? 'gpt-4o'
          : isTranscription
            ? isClientMeetingsTranscription
              ? 'gemini-2.0-pro'
              : 'nova-2'
            : isObjection
              ? 'llama-3.1-70b-versatile'
              : isClientMeetingsAnalyze
                ? 'gemini-2.0-pro'
                : 'gemini-2.5-flash',
        fallback_provider: null,
        fallback_model: null,
        reserve_cost_cents: isEmbedding ? 10 : isVision ? 35 : 25,
        timeout_ms: isVision ? 45000 : defaultTimeoutMs,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as AIFeatureSettingsRow;
    }

    if (settings.backup_provider && !settings.fallback_provider) {
      settings = { ...settings, fallback_provider: settings.backup_provider };
    }
    if (settings.backup_model && !settings.fallback_model) {
      settings = { ...settings, fallback_model: settings.backup_model };
    }

    const modelDisplayName = await this.getModelDisplayName({
      organizationId: params.organizationId,
      provider: settings.primary_provider,
      model: settings.primary_model,
    });

    const result = { settings, modelDisplayName };
    ttlSet(AIService._featureSettingsCache, cacheKey, result, CACHE_TTL.FEATURE_SETTINGS);
    return result;
  }

  private async loadOrganizationAiDna(params: { organizationId: string }): Promise<Record<string, unknown>> {
    const cacheKey = params.organizationId;
    const cached = ttlGet(AIService._aiDnaCache, cacheKey);
    if (cached) return cached;

    const row = await prisma.organization_settings
      .findUnique({ where: { organization_id: params.organizationId }, select: { ai_dna: true } })
      .catch(() => null);

    const aiDna = row?.ai_dna;
    if (!aiDna || typeof aiDna !== 'object' || Array.isArray(aiDna)) {
      const empty = {} as Record<string, unknown>;
      ttlSet(AIService._aiDnaCache, cacheKey, empty, CACHE_TTL.AI_DNA);
      return empty;
    }
    const result = aiDna as Record<string, unknown>;
    ttlSet(AIService._aiDnaCache, cacheKey, result, CACHE_TTL.AI_DNA);
    return result;
  }

  private pickRelevantDna(params: {
    featureKey: string;
    aiDna: Record<string, unknown>;
    meta?: Record<string, unknown>;
  }): Record<string, unknown> {
    const base = { ...params.aiDna };

    const toneOverride = params.meta?.toneOverride;
    if (toneOverride && typeof toneOverride === 'string') {
      base.tone = toneOverride;
    }

    const feature = String(params.featureKey || '');

    if (feature.includes('write_post') || feature.includes('post') || feature.startsWith('social.')) {
      return {
        vision: base.vision,
        tone: base.tone,
        targetAudience: base.targetAudience,
        advantages: base.advantages,
        vocabulary: base.vocabulary,
      };
    }

    if (feature.includes('objection') || feature.includes('handler')) {
      return {
        vision: base.vision,
        advantages: base.advantages,
        offers: base.offers,
        faq: base.faq,
        targetAudience: base.targetAudience,
      };
    }

    if (feature.includes('business') || feature.includes('analysis') || feature.startsWith('nexus.')) {
      return {
        vision: base.vision,
        profitGoals: base.profitGoals,
        pricing: base.pricing,
        costs: base.costs,
        targetAudience: base.targetAudience,
        advantages: base.advantages,
      };
    }

    return base;
  }

  private applyTemplate(params: { template: string; dna: Record<string, unknown>; request: string }): string {
    const dnaJson = JSON.stringify(params.dna || {}, null, 2);
    const req = String(params.request || '');

    const t = String(params.template || '');
    const hasPlaceholders = t.includes('{{DNA}}') || t.includes('{{REQUEST}}');
    if (!hasPlaceholders) {
      return `${t}\n\nDNA העסק:\n${dnaJson}\n\nבקשת המשתמש:\n${req}`;
    }

    return t.replaceAll('{{DNA}}', dnaJson).replaceAll('{{REQUEST}}', req);
  }

  private async assemblePrompt(params: {
    organizationId: string;
    featureKey: string;
    basePrompt: string | null;
    userRequest: string;
    meta?: Record<string, unknown>;
  }): Promise<string> {
    const aiDna = await this.loadOrganizationAiDna({ organizationId: params.organizationId });
    const relevantDna = this.pickRelevantDna({ featureKey: params.featureKey, aiDna, meta: params.meta });

    const override = params.meta?.dnaOverride;
    if (override && typeof override === 'object' && !Array.isArray(override)) {
      Object.assign(relevantDna, override);
    }

    const basePrompt = (params.basePrompt || '').trim() || getDefaultBasePrompt(params.featureKey);
    return this.applyTemplate({ template: basePrompt, dna: relevantDna, request: params.userRequest });
  }

  private async getModelDisplayName(params: { organizationId: string; provider: AIProviderName; model: string }): Promise<string | null> {
    const cacheKey = `${params.organizationId}:${params.provider}:${params.model}`;
    const cached = ttlGet(AIService._modelDisplayNameCache, cacheKey);
    if (cached !== undefined) return cached;

    const orgRow = await prisma.ai_model_aliases.findFirst({
      where: { organization_id: params.organizationId, provider: params.provider, model: params.model },
      select: { display_name: true },
    });

    const orgName = orgRow?.display_name ? String(orgRow.display_name) : null;
    if (orgName) {
      ttlSet(AIService._modelDisplayNameCache, cacheKey, orgName, CACHE_TTL.MODEL_DISPLAY_NAME);
      return orgName;
    }

    let globalName: string | null = null;
    try {
      const globalRow = await prisma.ai_model_aliases.findFirst({
        where: { organization_id: null, provider: params.provider, model: params.model },
        select: { display_name: true },
      });
      globalName = globalRow?.display_name ? String(globalRow.display_name) : null;
    } catch {
      // Tenant guard blocks organization_id:null queries — fall through to null
    }
    ttlSet(AIService._modelDisplayNameCache, cacheKey, globalName, CACHE_TTL.MODEL_DISPLAY_NAME);
    return globalName;
  }

  private isRetryableProviderFailure(err: unknown): boolean {
    const obj = asObject(err) ?? {};
    const name = typeof obj.name === 'string' ? obj.name : '';
    const msg = typeof obj.message === 'string' ? obj.message : String(err || '');
    const status = typeof obj.status === 'number' ? obj.status : undefined;

    if (name === 'UpgradeRequiredError') return false;

    if (name === 'AbortError') return true;
    if (status && [402, 408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;

    const lower = msg.toLowerCase();
    if (lower.includes('timeout')) return true;
    if (lower.includes('timed out')) return true;
    if (lower.includes('overload')) return true;
    if (lower.includes('overloaded')) return true;
    if (lower.includes('rate limit')) return true;
    if (lower.includes('too many requests')) return true;
    if (lower.includes('quota')) return true;
    if (lower.includes('insufficient_quota')) return true;

    return false;
  }

  private async decryptKeyOrPlaintext(raw: string): Promise<string> {
    try {
      return await decrypt(raw);
    } catch {
      // Backward-compatible: key is still plain text (not yet migrated)
      return raw;
    }
  }

  private async getProviderKey(params: { provider: AIProviderName; organizationId: string }): Promise<string> {
    const cacheKey = `${params.organizationId}:${params.provider}`;
    const cached = ttlGet(AIService._providerKeyCache, cacheKey);
    if (cached) return cached;

    const orgKeyRow = await prisma.ai_provider_keys.findFirst({
      where: { provider: params.provider, organization_id: params.organizationId, enabled: true },
      select: { api_key: true },
    });

    const orgKey = orgKeyRow?.api_key ? String(orgKeyRow.api_key) : null;
    if (orgKey) {
      const decrypted = await this.decryptKeyOrPlaintext(orgKey);
      ttlSet(AIService._providerKeyCache, cacheKey, decrypted, CACHE_TTL.PROVIDER_KEY);
      return decrypted;
    }

    let globalKey: string | null = null;
    try {
      const globalKeyRow = await prisma.ai_provider_keys.findFirst({
        where: { provider: params.provider, organization_id: null, enabled: true },
        select: { api_key: true },
      });
      globalKey = globalKeyRow?.api_key ? String(globalKeyRow.api_key) : null;
    } catch {
      // Tenant guard blocks organization_id:null queries — fall through to env vars
    }

    if (globalKey) {
      const decrypted = await this.decryptKeyOrPlaintext(globalKey);
      ttlSet(AIService._providerKeyCache, cacheKey, decrypted, CACHE_TTL.PROVIDER_KEY);
      return decrypted;
    }

    if (params.provider === 'google') {
      const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (envKey) return envKey;
    }

    if (params.provider === 'openai') {
      const envKey = process.env.OPENAI_API_KEY;
      if (envKey) return envKey;
    }

    if (params.provider === 'anthropic') {
      const envKey = process.env.ANTHROPIC_API_KEY;
      if (envKey) return envKey;
    }

    if (params.provider === 'groq') {
      const envKey = process.env.GROQ_API_KEY;
      if (envKey) return envKey;
    }

    if (params.provider === 'deepgram') {
      const envKey = process.env.DEEPGRAM_API_KEY;
      if (envKey) return envKey;
    }

    throw new Error(`Missing API key for provider: ${params.provider}`);
  }

  private async reserveCredits(params: { organizationId: string; reserveCents: number }): Promise<number> {
    const reserve = Math.max(0, Math.floor(params.reserveCents || 0));
    if (reserve <= 0) return 0;

    try {
      await executeRawOrgScoped(prisma, {
        organizationId: params.organizationId,
        reason: 'ai_debit_credits',
        query:
          'select ai_debit_credits(\n' +
          '  p_organization_id := scope.organization_id,\n' +
          '  p_amount_cents := $2::int\n' +
          ')\n' +
          'from (select $1::uuid as organization_id) scope\n' +
          'where scope.organization_id = $1::uuid',
        values: [params.organizationId, reserve],
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      const lower = msg.toLowerCase();
      if (lower.includes('insufficient') || lower.includes('credit')) {
        throw new UpgradeRequiredError();
      }
      if (lower.includes('does not exist') || lower.includes('function') || lower.includes('not found')) {
        console.warn('[AIService] ai_debit_credits function not available, skipping credit reservation');
        return 0;
      }
      throw new Error(`Failed to debit credits: ${msg || String(err)}`);
    }

    return reserve;
  }

  private async adjustCredits(params: { organizationId: string; deltaCents: number }): Promise<void> {
    const delta = Math.floor(params.deltaCents || 0);
    if (delta === 0) return;

    try {
      await executeRawOrgScoped(prisma, {
        organizationId: params.organizationId,
        reason: 'ai_adjust_credits',
        query:
          'select ai_adjust_credits(\n' +
          '  p_organization_id := scope.organization_id,\n' +
          '  p_delta_cents := $2::int\n' +
          ')\n' +
          'from (select $1::uuid as organization_id) scope\n' +
          'where scope.organization_id = $1::uuid',
        values: [params.organizationId, delta],
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err).toLowerCase();
      if (msg.includes('does not exist') || msg.includes('function') || msg.includes('not found')) {
        console.warn('[AIService] ai_adjust_credits function not available, skipping credit adjustment');
        return;
      }
      console.error('[AIService] adjustCredits failed:', getErrorMessage(err));
    }
  }

  private vectorToPgText(vec: number[]): string {
    const safe = Array.isArray(vec) ? vec : [];
    return `[${safe.map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : 0)).join(',')}]`;
  }

  private chunkText(text: string): string[] {
    const src = String(text || '').trim();
    if (!src) return [''];

    const max = 1200;
    const overlap = 200;
    if (src.length <= max) return [src];

    const out: string[] = [];
    let i = 0;
    while (i < src.length) {
      const end = Math.min(src.length, i + max);
      out.push(src.slice(i, end));
      if (end >= src.length) break;
      i = Math.max(0, end - overlap);
    }
    return out;
  }

  private async embedForMemory(params: {
    featureKey: string;
    organizationId: string;
    userId: string;
    input: string;
    meta?: Record<string, unknown>;
  }): Promise<{ embedding: number[] }> {
    const baseFeatureKey = String(params.featureKey || '').trim() || 'ai.memory';
    const embeddingFeatureKey = baseFeatureKey.toLowerCase().includes('embedding') ? baseFeatureKey : `${baseFeatureKey}.embedding`;

    const feature = await this.loadFeatureSettings({ organizationId: params.organizationId, featureKey: embeddingFeatureKey });
    const chargedCents = await this.reserveCredits({ organizationId: params.organizationId, reserveCents: feature.settings.reserve_cost_cents });
    const start = Date.now();

    const providerUsed: AIProviderName = feature.settings.primary_provider;
    const modelUsed = feature.settings.primary_model;

    try {
      if (providerUsed !== 'openai') {
        throw new AIProviderError({ provider: providerUsed, message: 'Embedding provider must be openai for semantic search' });
      }

      const apiKey = await this.getProviderKey({ provider: 'openai', organizationId: params.organizationId });
      const openai = new OpenAIProvider(apiKey);
      const out = await openai.embedText({ model: modelUsed, input: String(params.input || ''), timeoutMs: feature.settings.timeout_ms });

      this.logUsage({
        organizationId: params.organizationId,
        userId: params.userId,
        featureKey: embeddingFeatureKey,
        taskKind: 'embedding',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: null,
        chargedCents,
        latencyMs: Date.now() - start,
        status: 'success',
        meta: { ...(params.meta || {}), parentFeatureKey: baseFeatureKey },
      });

      return { embedding: out.embedding };
    } catch (err: unknown) {
      await this.adjustCredits({ organizationId: params.organizationId, deltaCents: chargedCents });

      const message = getErrorMessage(err);

      this.logUsage({
        organizationId: params.organizationId,
        userId: params.userId,
        featureKey: embeddingFeatureKey,
        taskKind: 'embedding',
        provider: providerUsed,
        model: modelUsed,
        modelDisplayName: null,
        chargedCents: 0,
        latencyMs: Date.now() - start,
        status: 'error',
        errorMessage: message || String(err),
        meta: { ...(params.meta || {}), parentFeatureKey: baseFeatureKey, refundedCents: chargedCents },
      });

      throw err instanceof Error ? err : new Error(message || 'AI provider error');
    }
  }

  private async tryGenerateJson(params: {
    organizationId: string;
    provider: AIProviderName;
    model: string;
    prompt: string;
    systemInstruction?: string;
    responseSchema?: unknown;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const systemInstruction = this.mergeSystemInstruction(params.systemInstruction);
    if (params.provider === 'google') {
      const apiKey = await this.getProviderKey({ provider: 'google', organizationId: params.organizationId });
      const gemini = new GeminiProvider(apiKey);
      return gemini.generateJson({
        model: params.model,
        prompt: params.prompt,
        systemInstruction,
        responseSchema: params.responseSchema,
        timeoutMs: params.timeoutMs,
      });
    }

    if (params.provider === 'openai') {
      const apiKey = await this.getProviderKey({ provider: 'openai', organizationId: params.organizationId });
      const openai = new OpenAIProvider(apiKey);
      return openai.generateJson({
        model: params.model,
        prompt: params.prompt,
        systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    if (params.provider === 'anthropic') {
      const apiKey = await this.getProviderKey({ provider: 'anthropic', organizationId: params.organizationId });
      const anthropic = new AnthropicProvider(apiKey);
      return anthropic.generateJson({
        model: params.model,
        prompt: params.prompt,
        systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    if (params.provider === 'groq') {
      const apiKey = await this.getProviderKey({ provider: 'groq', organizationId: params.organizationId });
      const groq = new GroqProvider(apiKey);
      return groq.generateJson({
        model: params.model,
        prompt: params.prompt,
        systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    throw new AIProviderError({ provider: params.provider, message: 'Provider not implemented yet' });
  }

  async streamText(params: AIStreamTextParams): Promise<AIStreamTextResult> {
    const ctx = await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });
    const feature = await this.loadFeatureSettings({ organizationId: ctx.organizationId, featureKey: params.featureKey });

    const effectivePrompt = await this.assemblePrompt({
      organizationId: ctx.organizationId,
      featureKey: params.featureKey,
      basePrompt: feature.settings.base_prompt ?? null,
      userRequest: params.prompt,
      meta: params.meta,
    });

    const systemInstruction = this.mergeSystemInstruction(params.systemInstruction);
    const provider = feature.settings.primary_provider;
    const model = feature.settings.primary_model;

    const modelDisplayName = await this.getModelDisplayName({
      organizationId: ctx.organizationId,
      provider,
      model,
    });

    const stream = await this.tryStreamText({
      organizationId: ctx.organizationId,
      provider,
      model,
      prompt: effectivePrompt,
      systemInstruction,
      timeoutMs: feature.settings.timeout_ms,
    });

    return {
      stream: stream.stream,
      provider,
      model,
      modelDisplayName,
    };
  }

  private async tryStreamText(params: {
    organizationId: string;
    provider: AIProviderName;
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
  }): Promise<{ stream: ReadableStream<Uint8Array> }> {
    if (params.provider === 'google') {
      const apiKey = await this.getProviderKey({ provider: 'google', organizationId: params.organizationId });
      const gemini = new GeminiProvider(apiKey);
      return gemini.streamText({
        model: params.model,
        prompt: params.prompt,
        systemInstruction: params.systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    if (params.provider === 'openai') {
      const apiKey = await this.getProviderKey({ provider: 'openai', organizationId: params.organizationId });
      const openai = new OpenAIProvider(apiKey);
      return openai.streamText({
        model: params.model,
        prompt: params.prompt,
        systemInstruction: params.systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    // Fallback to non-streaming for providers that don't support it yet
    const result = await this.tryGenerateText(params);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(result.text));
        controller.close();
      },
    });
    return { stream };
  }

  private async tryGenerateText(params: {
    organizationId: string;
    provider: AIProviderName;
    model: string;
    prompt: string;
    systemInstruction?: string;
    timeoutMs: number;
  }): Promise<{ text: string }> {
    const systemInstruction = this.mergeSystemInstruction(params.systemInstruction);
    if (params.provider === 'google') {
      const apiKey = await this.getProviderKey({ provider: 'google', organizationId: params.organizationId });
      const gemini = new GeminiProvider(apiKey);
      return gemini.generateText({
        model: params.model,
        prompt: params.prompt,
        systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    if (params.provider === 'openai') {
      const apiKey = await this.getProviderKey({ provider: 'openai', organizationId: params.organizationId });
      const openai = new OpenAIProvider(apiKey);
      return openai.generateText({
        model: params.model,
        prompt: params.prompt,
        systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    if (params.provider === 'anthropic') {
      const apiKey = await this.getProviderKey({ provider: 'anthropic', organizationId: params.organizationId });
      const anthropic = new AnthropicProvider(apiKey);
      return anthropic.generateText({
        model: params.model,
        prompt: params.prompt,
        systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    if (params.provider === 'groq') {
      const apiKey = await this.getProviderKey({ provider: 'groq', organizationId: params.organizationId });
      const groq = new GroqProvider(apiKey);
      return groq.generateText({
        model: params.model,
        prompt: params.prompt,
        systemInstruction,
        timeoutMs: params.timeoutMs,
      });
    }

    throw new AIProviderError({ provider: params.provider, message: 'Provider not implemented yet' });
  }

  private logUsage(params: {
    organizationId: string;
    userId: string;
    featureKey: string;
    taskKind: AITaskKind;
    provider: AIProviderName;
    model: string;
    modelDisplayName: string | null;
    chargedCents: number;
    latencyMs: number;
    status: 'success' | 'error';
    errorMessage?: string;
    meta?: Record<string, unknown>;
  }): void {
    type AIUsageLogsCreateData = Parameters<typeof prisma.ai_usage_logs.create>[0]['data'];
    const data: AIUsageLogsCreateData = {
      organization_id: params.organizationId,
      user_id: params.userId,
      feature_key: params.featureKey,
      task_kind: params.taskKind,
      provider: params.provider,
      model: params.model,
      model_display_name: params.modelDisplayName,
      charged_cents: params.chargedCents,
      latency_ms: params.latencyMs,
      status: params.status,
      error_message: params.errorMessage || null,
      meta: params.meta ? (params.meta as Prisma.InputJsonValue) : undefined,
    };
    prisma.ai_usage_logs.create({ data }).catch(() => null);
  }

  private mergeSystemInstruction(custom?: string): string {
    const cleaned = String(custom || '').trim();
    if (!cleaned) return GLOBAL_HEBREW_SYSTEM_INSTRUCTION;
    return `${GLOBAL_HEBREW_SYSTEM_INSTRUCTION}\n\n${cleaned}`;
  }
}
