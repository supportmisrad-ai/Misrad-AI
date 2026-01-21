import { createClient } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { AIProviderError, UpgradeRequiredError } from './errors';
import {
  AIFeatureSettingsRow,
  AIGenerateJsonParams,
  AIGenerateJsonResult,
  AIGenerateTextParams,
  AIGenerateTextResult,
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

type LoadedFeatureSettings = {
  settings: AIFeatureSettingsRow;
  modelDisplayName?: string | null;
};

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

export class AIService {
  private static instance: AIService | null = null;

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
  }): Promise<Array<{ id: string; docKey: string; chunkIndex: number; content: string; metadata: any; similarity: number }>> {
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

    const supabase = createClient();
    const { data, error } = await supabase.rpc('ai_semantic_search', {
      p_organization_id: ctx.organizationId,
      p_query_embedding: this.vectorToPgText(embedOut.embedding),
      p_user_id: ctx.userId,
      p_module_id: params.moduleId || null,
      p_match_count: Math.max(1, Math.min(50, Math.floor(params.matchCount ?? 8))),
      p_similarity_threshold: typeof params.similarityThreshold === 'number' ? params.similarityThreshold : 0.2,
    });

    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map((r: any) => ({
      id: String(r?.id || ''),
      docKey: String(r?.doc_key || ''),
      chunkIndex: Number(r?.chunk_index || 0),
      content: String(r?.content || ''),
      metadata: r?.metadata ?? null,
      similarity: Number(r?.similarity || 0),
    }));
  }

  async ingestText(params: {
    featureKey: string;
    organizationId?: string;
    userId?: string;
    moduleId: string;
    docKey: string;
    text: string;
    isPublicInOrg: boolean;
    metadata?: Record<string, any>;
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
      const supabase = createClient();

      const apiKey = await this.getProviderKey({ provider: 'openai', organizationId: ctx.organizationId });
      const openai = new OpenAIProvider(apiKey);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vec = await openai.embedText({ model: modelUsed, input: chunk, timeoutMs: feature.settings.timeout_ms });

        const { error } = await supabase
          .from('ai_embeddings')
          .upsert(
            {
              organization_id: ctx.organizationId,
              module_id: params.moduleId,
              user_id: ctx.userId,
              is_public_in_org: Boolean(params.isPublicInOrg),
              doc_key: params.docKey,
              chunk_index: i,
              content: chunk,
              embedding: this.vectorToPgText(vec.embedding),
              metadata: params.metadata || null,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: 'organization_id,doc_key,chunk_index' }
          );

        if (error) {
          throw new Error(`Failed to upsert embedding: ${error.message}`);
        }
      }

      await this.logUsage({
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
    } catch (err: any) {
      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      await this.logUsage({
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
        errorMessage: String(err?.message || err),
        meta: {
          ...(params.metadata || {}),
          parentFeatureKey,
          moduleId: params.moduleId,
          docKey: params.docKey,
          refundedCents: chargedCents,
        },
      });

      throw err;
    }
  }

  async generateJson<T = any>(params: AIGenerateJsonParams): Promise<AIGenerateJsonResult<T>> {
    const ctx = await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });
    const feature = await this.loadFeatureSettings({ organizationId: ctx.organizationId, featureKey: params.featureKey });

    const effectivePrompt = await this.assemblePrompt({
      organizationId: ctx.organizationId,
      featureKey: params.featureKey,
      basePrompt: (feature.settings as any)?.base_prompt ?? null,
      userRequest: params.prompt,
      meta: params.meta,
    });

    const chargedCents = await this.reserveCredits({ organizationId: ctx.organizationId, reserveCents: feature.settings.reserve_cost_cents });

    const start = Date.now();
    let providerUsed: AIProviderName = feature.settings.primary_provider;
    let modelUsed = feature.settings.primary_model;
    let providersTried: Array<{ provider: AIProviderName; model: string; ok: boolean; error?: string }> = [];

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

      await this.logUsage({
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
    } catch (primaryErr: any) {
      providersTried.push({
        provider: feature.settings.primary_provider,
        model: feature.settings.primary_model,
        ok: false,
        error: String(primaryErr?.message || primaryErr),
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

          await this.logUsage({
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
        } catch (fallbackErr: any) {
          providersTried.push({
            provider: feature.settings.fallback_provider as AIProviderName,
            model: feature.settings.fallback_model as string,
            ok: false,
            error: String(fallbackErr?.message || fallbackErr),
          });
        }
      }

      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      await this.logUsage({
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
        errorMessage: String(primaryErr?.message || primaryErr),
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

  async generateVisionJson<T = any>(params: {
    featureKey: string;
    organizationId?: string;
    userId?: string;
    bypassAuth?: boolean;
    prompt: string;
    imageDataUrl: string;
    systemInstruction?: string;
    responseSchema?: any;
    meta?: Record<string, any>;
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

      await this.logUsage({
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
    } catch (err: any) {
      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      await this.logUsage({
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
        errorMessage: String(err?.message || err),
        meta: { ...(params.meta || {}), refundedCents: chargedCents, kind: 'vision_json' },
      });

      throw err;
    }
  }

  async generateText(params: AIGenerateTextParams): Promise<AIGenerateTextResult> {
    const ctx = await this.resolveContext({ organizationId: params.organizationId, userId: params.userId });
    const feature = await this.loadFeatureSettings({ organizationId: ctx.organizationId, featureKey: params.featureKey });

    const effectivePrompt = await this.assemblePrompt({
      organizationId: ctx.organizationId,
      featureKey: params.featureKey,
      basePrompt: (feature.settings as any)?.base_prompt ?? null,
      userRequest: params.prompt,
      meta: params.meta,
    });

    const chargedCents = await this.reserveCredits({ organizationId: ctx.organizationId, reserveCents: feature.settings.reserve_cost_cents });

    const start = Date.now();
    let providerUsed: AIProviderName = feature.settings.primary_provider;
    let modelUsed = feature.settings.primary_model;
    let providersTried: Array<{ provider: AIProviderName; model: string; ok: boolean; error?: string }> = [];

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

      await this.logUsage({
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
    } catch (primaryErr: any) {
      providersTried.push({
        provider: feature.settings.primary_provider,
        model: feature.settings.primary_model,
        ok: false,
        error: String(primaryErr?.message || primaryErr),
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

          await this.logUsage({
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
        } catch (fallbackErr: any) {
          providersTried.push({
            provider: feature.settings.fallback_provider as AIProviderName,
            model: feature.settings.fallback_model as string,
            ok: false,
            error: String(fallbackErr?.message || fallbackErr),
          });
        }
      }

      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      const modelDisplayName = await this.getModelDisplayName({
        organizationId: ctx.organizationId,
        provider: providerUsed,
        model: modelUsed,
      });

      await this.logUsage({
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
        errorMessage: String(primaryErr?.message || primaryErr),
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
        const key = await this.getProviderKey({ provider: 'deepgram', organizationId: ctx.organizationId });
        const deepgram = new DeepgramProvider(key);

        const out = await deepgram.transcribe({
          audioBuffer: params.audioBuffer,
          mimeType: params.mimeType,
          timeoutMs: feature.settings.timeout_ms,
        });

        providerUsed = 'deepgram';
        modelUsed = feature.settings.primary_model;

        await this.logUsage({
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

      if (feature.settings.primary_provider === 'google') {
        const apiKey = await this.getProviderKey({ provider: 'google', organizationId: ctx.organizationId });
        const gemini = new GeminiProvider(apiKey);

        const out = await gemini.transcribe({
          model: feature.settings.primary_model,
          audioBuffer: params.audioBuffer,
          mimeType: params.mimeType,
          timeoutMs: feature.settings.timeout_ms,
        });

        providerUsed = 'google';
        modelUsed = feature.settings.primary_model;

        await this.logUsage({
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

      throw new AIProviderError({ provider: feature.settings.primary_provider, message: 'Transcription provider not supported yet' });
    } catch (err: any) {
      await this.adjustCredits({ organizationId: ctx.organizationId, deltaCents: chargedCents });

      await this.logUsage({
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
        errorMessage: String(err?.message || err),
        meta: { ...params.meta, refundedCents: chargedCents },
      });

      throw err;
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

    const supabase = createClient();
    const { data, error } = await supabase
      .from('social_users')
      .select('organization_id')
      .eq('clerk_user_id', effectiveUserId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve organization for user: ${error.message}`);
    }

    const orgId = (data as any)?.organization_id ? String((data as any).organization_id) : null;
    if (!orgId) {
      throw new Error('Missing organization context');
    }

    return { organizationId: orgId, userId: String(effectiveUserId) };
  }

  private async loadFeatureSettings(params: { organizationId: string; featureKey: string }): Promise<LoadedFeatureSettings> {
    const supabase = createClient();

    const { data: orgRow, error: orgErr } = await supabase
      .from('ai_feature_settings')
      .select('*')
      .eq('organization_id', params.organizationId)
      .eq('feature_key', params.featureKey)
      .eq('enabled', true)
      .maybeSingle();

    let settings: any = orgRow;

    if (orgErr || !settings) {
      const { data: globalRow } = await supabase
        .from('ai_feature_settings')
        .select('*')
        .is('organization_id', null)
        .eq('feature_key', params.featureKey)
        .eq('enabled', true)
        .maybeSingle();
      settings = globalRow;
    }

    if (!settings) {
      const fk = String(params.featureKey || '').toLowerCase();
      const isTranscription = fk.includes('transcription') || fk.includes('transcribe');
      const isClientMeetingsTranscription = fk.includes('client_os.meetings.transcription') || fk.includes('client-os.meetings.transcription');
      const isClientMeetings = fk.startsWith('client_os.meetings.') || fk.startsWith('client-os.meetings.') || fk.startsWith('client.meetings.');
      const isClientMeetingsAnalyze = fk.includes('client_os.meetings.analyze') || fk.includes('client-os.meetings.analyze');
      const isObjection = fk.includes('objection') || fk.includes('objections') || fk.includes('handler');
      const isEmbedding = fk.includes('embedding') || fk.includes('embed') || fk.includes('vector');
      const isVision = fk.includes('vision');

      const defaultTimeoutMs = isClientMeetingsTranscription ? 180000 : isClientMeetings ? 120000 : 30000;

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

    if ((settings as any).backup_provider && !(settings as any).fallback_provider) {
      (settings as any).fallback_provider = (settings as any).backup_provider;
    }
    if ((settings as any).backup_model && !(settings as any).fallback_model) {
      (settings as any).fallback_model = (settings as any).backup_model;
    }

    const modelDisplayName = await this.getModelDisplayName({
      organizationId: params.organizationId,
      provider: settings.primary_provider,
      model: settings.primary_model,
    });

    return { settings: settings as AIFeatureSettingsRow, modelDisplayName };
  }

  private async loadOrganizationAiDna(params: { organizationId: string }): Promise<Record<string, any>> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('organization_settings')
      .select('ai_dna')
      .eq('organization_id', params.organizationId)
      .maybeSingle();

    if (error) {
      return {};
    }

    const aiDna = (data as any)?.ai_dna;
    if (!aiDna || typeof aiDna !== 'object' || Array.isArray(aiDna)) return {};
    return aiDna as Record<string, any>;
  }

  private pickRelevantDna(params: {
    featureKey: string;
    aiDna: Record<string, any>;
    meta?: Record<string, any>;
  }): Record<string, any> {
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

  private applyTemplate(params: { template: string; dna: Record<string, any>; request: string }): string {
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
    meta?: Record<string, any>;
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
    const supabase = createClient();

    const { data: orgRow } = await supabase
      .from('ai_model_aliases')
      .select('*')
      .eq('organization_id', params.organizationId)
      .eq('provider', params.provider)
      .eq('model', params.model)
      .maybeSingle();

    const orgName = (orgRow as any)?.display_name ? String((orgRow as any).display_name) : null;
    if (orgName) return orgName;

    const { data: globalRow } = await supabase
      .from('ai_model_aliases')
      .select('*')
      .is('organization_id', null)
      .eq('provider', params.provider)
      .eq('model', params.model)
      .maybeSingle();

    const globalName = (globalRow as any)?.display_name ? String((globalRow as any).display_name) : null;
    return globalName;
  }

  private isRetryableProviderFailure(err: any): boolean {
    const name = String(err?.name || '');
    const msg = String(err?.message || err || '');
    const status = typeof err?.status === 'number' ? err.status : undefined;

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

  private async getProviderKey(params: { provider: AIProviderName; organizationId: string }): Promise<string> {
    const supabase = createClient();

    const { data: orgKeyRow } = await supabase
      .from('ai_provider_keys')
      .select('*')
      .eq('provider', params.provider)
      .eq('organization_id', params.organizationId)
      .eq('enabled', true)
      .maybeSingle();

    const orgKey = (orgKeyRow as any)?.api_key ? String((orgKeyRow as any).api_key) : null;
    if (orgKey) return orgKey;

    const { data: globalKeyRow } = await supabase
      .from('ai_provider_keys')
      .select('*')
      .eq('provider', params.provider)
      .is('organization_id', null)
      .eq('enabled', true)
      .maybeSingle();

    const globalKey = (globalKeyRow as any)?.api_key ? String((globalKeyRow as any).api_key) : null;

    if (globalKey) return globalKey;

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

    const supabase = createClient();

    const { error: debitErr } = await supabase.rpc('ai_debit_credits', {
      p_organization_id: params.organizationId,
      p_amount_cents: reserve,
    });

    if (debitErr) {
      const msg = String(debitErr.message || '');
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('credit')) {
        throw new UpgradeRequiredError();
      }
      throw new Error(`Failed to debit credits: ${debitErr.message}`);
    }

    return reserve;
  }

  private async adjustCredits(params: { organizationId: string; deltaCents: number }): Promise<void> {
    const delta = Math.floor(params.deltaCents || 0);
    if (delta === 0) return;

    const supabase = createClient();
    await supabase.rpc('ai_adjust_credits', {
      p_organization_id: params.organizationId,
      p_delta_cents: delta,
    });
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
    meta?: Record<string, any>;
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

      await this.logUsage({
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
    } catch (err: any) {
      await this.adjustCredits({ organizationId: params.organizationId, deltaCents: chargedCents });

      await this.logUsage({
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
        errorMessage: String(err?.message || err),
        meta: { ...(params.meta || {}), parentFeatureKey: baseFeatureKey, refundedCents: chargedCents },
      });

      throw err;
    }
  }

  private async tryGenerateJson(params: {
    organizationId: string;
    provider: AIProviderName;
    model: string;
    prompt: string;
    systemInstruction?: string;
    responseSchema?: any;
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

  private async logUsage(params: {
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
    meta?: Record<string, any>;
  }): Promise<void> {
    const supabase = createClient();

    await supabase.from('ai_usage_logs').insert({
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
      meta: params.meta || null,
    });
  }

  private mergeSystemInstruction(custom?: string): string {
    const cleaned = String(custom || '').trim();
    if (!cleaned) return GLOBAL_HEBREW_SYSTEM_INSTRUCTION;
    return `${GLOBAL_HEBREW_SYSTEM_INSTRUCTION}\n\n${cleaned}`;
  }
}
