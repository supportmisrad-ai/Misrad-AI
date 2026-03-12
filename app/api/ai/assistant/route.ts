import { apiError } from '@/lib/server/api-response';
import { promises as fs } from 'fs';
import path from 'path';
// NOTE: Currently using OpenAI (gpt-4o-mini) for AI chat.
// Switch to Claude (Anthropic) requires EXPLICIT user request only.
// Do NOT change to Claude without explicit user approval.
import OpenAI from 'openai';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { checkAiAccess } from '@/lib/server/subscription-guard';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import prisma from '@/lib/prisma';
import { getContentByKey } from '@/lib/services/site-content';
import { getAllDocsArticles, getDocsCategory } from '@/config/docs';
import { getLinksHub } from '@/config/links-hub';
import UI_MAP from '@/docs/UI_MAP.json';
import type { OSModuleKey } from '@/lib/os/modules/types';

type IncomingMessage = {
  id?: string;
  role?: 'user' | 'assistant' | string;
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
  text?: string;
};

type UserContext = {
  name?: string;
  company?: string;
  industry?: string;
  painPoints?: string[];
  interests?: string[];
  budget?: string;
  timeline?: string;
  objections?: string[];
};

type SituationType = 'browsing' | 'pricing_inquiry' | 'ready_to_buy' | 'technical_support' | 'objection' | 'comparison' | 'urgent';

type SmartResponse = {
  text: string;
  situation: SituationType;
  confidence: number;
  detectedInfo?: Partial<UserContext>;
  suggestedActions?: Array<{ label: string; action: string }>;
};

function extractText(msg: IncomingMessage): string {
  if (typeof msg.content === 'string') return String(msg.content);
  if (typeof msg.text === 'string') return String(msg.text);
  const parts = Array.isArray(msg.parts) ? msg.parts : [];
  return parts
    .filter((p) => p && p.type === 'text')
    .map((p) => String(p.text || ''))
    .join('');
}

function analyzeConversationContext(messages: Array<{ role: string; content: string }>): { detectedInfo: Partial<UserContext>; situation: SituationType } {
  const allText = messages.map(m => m.content).join(' ').toLowerCase();
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  const lastUserMsg = userMessages[userMessages.length - 1] || '';
  
  const detectedInfo: Partial<UserContext> = {};
  
  // זיהוי שם
  const nameMatch = allText.match(/שמי ([א-ת]+)|אני ([א-ת]+)|קוראים לי ([א-ת]+)/);
  if (nameMatch) detectedInfo.name = nameMatch[1] || nameMatch[2] || nameMatch[3];
  
  // זיהוי חברה
  const companyMatch = allText.match(/מחברת ([א-ת\s]+)|העסק שלי ([א-ת\s]+)|אני ב([א-ת\s]+)/);
  if (companyMatch) detectedInfo.company = (companyMatch[1] || companyMatch[2] || companyMatch[3]).trim();
  
  // זיהוי תחום
  if (allText.includes('נדל"ן') || allText.includes('נדלן')) detectedInfo.industry = 'נדל"ן';
  else if (allText.includes('ביטוח')) detectedInfo.industry = 'ביטוח';
  else if (allText.includes('שיווק')) detectedInfo.industry = 'שיווק ופרסום';
  else if (allText.includes('בניה')) detectedInfo.industry = 'בניה ושיפוצים';
  
  // זיהוי בעיות
  const painPoints: string[] = [];
  if (allText.includes('לא מספיק') || allText.includes('חסר')) painPoints.push('חוסר זמן');
  if (allText.includes('לקוחות בורחים') || allText.includes('לא עונים')) painPoints.push('אובדן לקוחות');
  if (allText.includes('מסובך') || allText.includes('לא מבין')) painPoints.push('מורכבות');
  if (painPoints.length) detectedInfo.painPoints = painPoints;
  
  // זיהוי התנגדויות
  const objections: string[] = [];
  if (lastUserMsg.includes('יקר') || lastUserMsg.includes('מחיר')) objections.push('מחיר גבוה');
  if (lastUserMsg.includes('מסובך') || lastUserMsg.includes('לא מבין')) objections.push('מורכבות');
  if (lastUserMsg.includes('לא בטוח') || lastUserMsg.includes('לא יודע')) objections.push('חוסר ביטחון');
  if (lastUserMsg.includes('יש לי כבר') || lastUserMsg.includes('משתמש ב')) objections.push('מערכת קיימת');
  if (objections.length) detectedInfo.objections = objections;
  
  // זיהוי תקציב
  const budgetMatch = lastUserMsg.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:שקל|₪)/);
  if (budgetMatch) detectedInfo.budget = budgetMatch[0];
  
  // זיהוי לוח זמנים
  if (lastUserMsg.includes('דחוף') || lastUserMsg.includes('מהר') || lastUserMsg.includes('עכשיו')) detectedInfo.timeline = 'דחוף';
  else if (lastUserMsg.includes('חודש') || lastUserMsg.includes('שבועיים')) detectedInfo.timeline = 'קצר טווח';
  
  // זיהוי סיטואציה
  let situation: SituationType = 'browsing';
  
  if (lastUserMsg.includes('כמה עולה') || lastUserMsg.includes('מחיר') || lastUserMsg.includes('עלות') || lastUserMsg.includes('תוכני')) {
    situation = 'pricing_inquiry';
  } else if (lastUserMsg.includes('רוצה לקנות') || lastUserMsg.includes('להירשם') || lastUserMsg.includes('להתחיל') || lastUserMsg.includes('בוא נתחיל')) {
    situation = 'ready_to_buy';
  } else if (objections.length > 0) {
    situation = 'objection';
  } else if (lastUserMsg.includes('לעומת') || lastUserMsg.includes('השוואה') || lastUserMsg.includes('יותר טוב') || lastUserMsg.includes('מתחרה')) {
    situation = 'comparison';
  } else if (lastUserMsg.includes('דחוף') || lastUserMsg.includes('בעיה') || lastUserMsg.includes('לא עובד')) {
    situation = 'urgent';
  } else if (lastUserMsg.includes('איך') || lastUserMsg.includes('מה זה') || lastUserMsg.includes('תסביר')) {
    situation = 'technical_support';
  }
  
  return { detectedInfo, situation };
}

function extractDynamicActions(text: string): Array<{ label: string; action: string }> {
  const match = text.match(/\[!ACTIONS\]([\s\S]+?)\[\/ACTIONS\]/);
  if (!match) return [];
  
  const actionsStr = match[1].trim();
  const pairs = actionsStr.split(';;').filter(Boolean);
  
  return pairs.map(pair => {
    const [label, action] = pair.split('|').map(s => s.trim());
    return { label: label || '', action: action || '' };
  }).filter(a => a.label && a.action);
}

function stripActionsTag(text: string): string {
  return text.replace(/\[!ACTIONS\][\s\S]+?\[\/ACTIONS\]/g, '').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isChatRole(value: unknown): value is 'user' | 'assistant' {
  return value === 'user' || value === 'assistant';
}

function parseUiMapEntries(json: unknown): UiMapEntry[] {
  if (!isRecord(json)) return [];
  const entriesRaw = (json as Record<string, unknown>).entries;
  if (!Array.isArray(entriesRaw)) return [];

  return entriesRaw
    .map((e): UiMapEntry | null => {
      if (!isRecord(e)) return null;

      const primaryActionsRaw = e.primaryActions;
      const keywordsRaw = e.keywords;

      const mapped: UiMapEntry = {
        id: String(e.id || ''),
        title: String(e.title || ''),
        pathTemplate: String(e.pathTemplate || ''),
        description: e.description == null ? undefined : String(e.description),
        primaryActions: Array.isArray(primaryActionsRaw) ? primaryActionsRaw.map((x) => String(x)) : [],
        keywords: Array.isArray(keywordsRaw) ? keywordsRaw.map((x) => String(x)) : [],
      };

      return mapped;
    })
    .filter((e): e is UiMapEntry => Boolean(e && e.id && e.title && e.pathTemplate));
}

function extractOpenAiText(payload: unknown): string {
  if (!isRecord(payload)) return '';
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const first = choices[0];
  if (!isRecord(first)) return '';
  const message = first.message;
  if (!isRecord(message)) return '';
  const content = message.content;
  return typeof content === 'string' ? content : '';
}

function streamTextResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

function streamClaudeResponse(params: {
  apiKey: string;
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  postProcess?: (text: string) => string;
  fallbackText?: string;
}): Response {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), params.timeoutMs || 20000);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const anthropic = new Anthropic({ apiKey: params.apiKey });
        
        const messageStream = await anthropic.messages.stream({
          model: 'claude-3-5-haiku-20250219',
          max_tokens: params.maxTokens ?? 400,
          temperature: params.temperature ?? 0.3,
          system: params.systemInstruction,
          messages: [{ role: 'user', content: params.prompt }],
        }, { signal: ac.signal });

        let accumulated = '';

        for await (const chunk of messageStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text;
            if (params.postProcess) {
              accumulated += text;
            } else {
              controller.enqueue(encoder.encode(text));
            }
          }
        }

        if (params.postProcess && accumulated) {
          controller.enqueue(encoder.encode(params.postProcess(accumulated)));
        }

        clearTimeout(timeout);
        controller.close();
      } catch (err: unknown) {
        clearTimeout(timeout);
        const isAbort = err instanceof Error && err.name === 'AbortError';
        const fallback =
          params.fallbackText ||
          (isAbort
            ? 'הבקשה לקחה יותר מדי זמן. אפשר לנסות שוב או לעבור למחירון, להרשמה או לטופס יצירת קשר מהתפריט הראשי.'
            : 'כרגע יש תקלה זמנית בעוזר ה-AI. בינתיים אפשר לראות את המחירון, להירשם או ליצור קשר עם צוות MISRAD AI דרך הקישורים באתר.');
        controller.enqueue(encoder.encode(fallback));
        controller.close();
      }
    },
    cancel() {
      clearTimeout(timeout);
      ac.abort();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function ensureSalesCTA(text: string): string {
  const out = String(text || '').trim();
  if (!out) return out;

  const lowered = String(text || '').toLowerCase();

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
    '',
    '**רוצה להתחיל?**',
    '- [מחירון ומידע](/pricing)',
    '- [הרשמה](/login?mode=sign-up)',
    '- [צור קשר](/contact)',
  ].join('\n');
}

function isSalesPathname(pathname: string): boolean {
  const p = String(pathname || '/').toLowerCase();
  
  // Not sales: workspace pages (require orgSlug)
  if (p.startsWith('/w/')) return false;
  
  // Not sales: admin/internal/auth pages
  if (p.startsWith('/admin')) return false;
  if (p.startsWith('/api')) return false;
  if (p.includes('sign-in') || p.includes('sign-up') || p.includes('sign-out')) return false;
  if (p.includes('invite') || p.includes('reset-password') || p.includes('sso-callback')) return false;
  
  // Everything else = sales mode (no workspace required)
  return true;
}

function inferOrgSlug(pathname: string): string | null {
  const p = String(pathname || '/');
  const m = p.match(/^\/w\/([^/]+)(\/.*)?$/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function inferModuleKey(pathname: string): string | null {
  const p = String(pathname || '/');
  const m = p.match(/^\/w\/[^/]+\/(?:\(modules\)\/)?([^/?#]+)(\/.*)?$/);
  const first = m?.[1] ? String(m[1]) : '';
  const mk = first.trim().toLowerCase();
  if (['nexus', 'system', 'social', 'finance', 'client', 'operations'].includes(mk)) return mk as OSModuleKey;
  return null;
}

type UiMapEntry = {
  id: string;
  title: string;
  pathTemplate: string;
  description?: string;
  primaryActions?: string[];
  keywords?: string[];
};

let cachedSalesDocsSnippet: string | null = null;

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

function getUiMapEntries(): UiMapEntry[] {
  return parseUiMapEntries(UI_MAP as unknown);
}

function normalizeForMatch(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[^\u0590-\u05FFA-Za-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fillPathTemplate(template: string, params: Record<string, string>): { href: string; missing: string[] } {
  const missing = new Set<string>();
  const href = String(template || '').replace(/\{([^}]+)\}/g, (_m, keyRaw) => {
    const key = String(keyRaw || '').trim();
    if (!key) return '';
    const val = params[key];
    if (typeof val === 'string' && val.length) return encodeURIComponent(val);
    missing.add(key);
    return `{${key}}`;
  });
  return { href, missing: [...missing] };
}

function isNavigationQuestion(text: string): boolean {
  const t = normalizeForMatch(text);
  if (!t) return false;
  return (
    t.includes('איפה') ||
    t.includes('איך מגיעים') ||
    t.includes('איך להגיע') ||
    t.includes('איפה מוצאים') ||
    t.includes('לא מוצא') ||
    t.includes("לא מוצאת") ||
    t.includes('איפה זה') ||
    t.includes('איפה נמצא') ||
    t.includes('איפה נמצאת')
  );
}

function scoreUiEntry(query: string, entry: UiMapEntry): number {
  const q = normalizeForMatch(query);
  if (!q) return 0;
  const title = normalizeForMatch(entry.title);
  const keywords = (entry.keywords || []).map(normalizeForMatch).filter(Boolean);

  let score = 0;
  if (title && (q === title || q.includes(title) || title.includes(q))) score += 12;

  for (const kw of keywords) {
    if (!kw) continue;
    if (q === kw) score += 10;
    else if (q.includes(kw)) score += 8;
    else if (kw.includes(q)) score += 5;
  }

  return score;
}

function findBestUiEntry(query: string): UiMapEntry | null {
  const entries = getUiMapEntries();
  let best: UiMapEntry | null = null;
  let bestScore = 0;
  for (const e of entries) {
    const s = scoreUiEntry(query, e);
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  if (!best || bestScore < 8) return null;
  return best;
}

function renderUiEntryForAnswer(params: { orgSlug: string; entry: UiMapEntry }): string {
  const { href, missing } = fillPathTemplate(String(params.entry.pathTemplate || ''), {
    orgSlug: params.orgSlug,
  });
  const title = String(params.entry.title || 'קישור');
  const desc = String(params.entry.description || '').trim();
  const actions = Array.isArray(params.entry.primaryActions) ? params.entry.primaryActions : [];

  const lines: string[] = [];
  lines.push('בבקשה:');
  if (missing.length) {
    lines.push(`- **${title}**`);
    lines.push(`- תבנית נתיב: \`${href}\``);
    lines.push(`- צריך לספק: ${missing.map((k) => `\`${k}\``).join(', ')}`);
  } else {
    lines.push(`- [${title}](${href})`);
  }
  if (desc) lines.push(`\n${desc}`);
  if (actions.length) {
    lines.push('');
    lines.push('כפתורים עיקריים במסך:');
    for (const a of actions.slice(0, 6)) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}

function buildDocsKnowledge(params: { orgSlug: string; moduleKey?: string | null }): string {
  const all = getAllDocsArticles();
  const filtered = params.moduleKey ? all.filter((a) => a.moduleKey === params.moduleKey) : all;

  const lines: string[] = [];
  for (const a of filtered) {
    const cat = getDocsCategory(a.moduleKey, a.categoryId);
    const href = `/w/${encodeURIComponent(params.orgSlug)}/support/${encodeURIComponent(a.moduleKey)}/${encodeURIComponent(a.id)}`;

    lines.push(`- [${a.moduleKey}] ${cat?.title ? `${cat.title} / ` : ''}${a.title}`);
    lines.push(`  תיאור: ${a.description}`);
    lines.push(`  קישור: ${href}`);
    if (Array.isArray(a.tags) && a.tags.length) {
      lines.push(`  תגיות: ${a.tags.join(', ')}`);
    }
  }

  return lines.join('\n').slice(0, 16000);
}

async function getHelpVideoSuggestion(params: { organizationId: string; pathname: string; moduleKey?: string | null }) {
  const pathname = String(params.pathname || '/');

  const mk = String(params.moduleKey || '').trim().toLowerCase();

  type HelpVideoRow = {
    id: string | number;
    module_key: string;
    title: string;
    video_url: string;
    order: number;
    created_at: Date;
    updated_at: Date;
    route_prefix: string | null;
    duration: string | number | null;
  };

  let rows: HelpVideoRow[] = [];
  try {
    rows = await prisma.help_videos.findMany({
      where: mk && ['nexus', 'system', 'social', 'finance', 'client', 'operations'].includes(mk) ? { module_key: mk } : undefined,
      select: { id: true, module_key: true, title: true, video_url: true, order: true, route_prefix: true, duration: true, created_at: true, updated_at: true },
      orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    });
  } catch {
    return null;
  }

  if (rows.length === 0) return null;

  let best: HelpVideoRow | null = null;
  let bestLen = -1;
  let moduleDefault: HelpVideoRow | null = null;

  const normalized = (() => {
    const match = pathname.match(/^\/w\/[^/]+(\/.*)?$/);
    return match ? match[1] || '/' : pathname || '/';
  })();

  for (const row of rows) {
    const rp = String(row.route_prefix ?? '').trim();
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

  return {
    id: String(picked.id || ''),
    title: String(picked.title || ''),
    videoUrl: String(picked.video_url || ''),
    duration: picked.duration == null ? null : String(picked.duration),
    routePrefix: String(picked.route_prefix || ''),
    moduleKey: String(picked.module_key || ''),
  };
}

async function POSTHandler(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      messages?: IncomingMessage[];
      pathname?: string;
    };

    const pathname = typeof body.pathname === 'string' ? body.pathname : '/';
    const sales = isSalesPathname(pathname);

    const safeMessages = Array.isArray(body.messages) ? body.messages : [];
    const coreMessages = safeMessages
      .filter((m) => isChatRole(m?.role))
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: extractText(m) }));

    const lastUser = [...coreMessages].reverse().find((m) => m.role === 'user')?.content || '';
    const history = coreMessages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return apiError('חסר ANTHROPIC_API_KEY', { status: 500 });
    }

    if (sales) {
      let salesDocsKnowledge = '';
      try {
        salesDocsKnowledge = await loadSalesDocsSnippet();
      } catch {
        salesDocsKnowledge = '';
      }

      const systemInstruction = [
        'אתה נציג תמיכה ישיר ומהיר של MISRAD AI.',
        '',
        'תפקידך:',
        '1. לענות על שאלות בצורה ישירה וטכנית',
        '2. להפנות לקישורים רלוונטיים (תמיד כלול קישור ישיר)',
        '3. לשאול שאלות הבהרה קצרות אם צריך פרטים נוספים',
        '',
        'איך לענות:',
        '- תשובה ישירה ב-2-4 שורות',
        '- קישור ישיר למחירון/הרשמה/תיעוד',
        '- אם מדובר על מחיר - הפנה ל-/pricing',
        '- אם רוצה להתחיל - הפנה ל-/login?mode=sign-up',
        '- אם שאלה טכנית - שאל "באיזה מסך אתה נמצא?" או "מה בדיוק אתה מנסה לעשות?"',
        '',
        'דוגמאות טובות:',
        '- "המערכת מתחילה מ-₪149 (נקסוס בלבד) ועד ₪499 (כל המודולים). [ראה מחירון מלא](/pricing)"',
        '- "כדי להוסיף לקוח: לחץ על הכפתור + בפינה השמאלית העליונה. [למדריך המלא](/w/{orgSlug}/support/client/add-client)"',
        '- "איפה בדיוק אתה רואה את השגיאה? באיזה מסך?"',
        '',
        'אסור:',
        '- לשאול "מה האתגרים בעסק שלך"',
        '- לשאול "מה היעדים שלך"',
        '- תשובות ארוכות מעל 5 שורות',
        '- תשובות בלי קישור',
        '',
        'כפתורי פעולה (פורמט):',
        '[!ACTIONS]ראה מחירון|/pricing;;התחל עכשיו|/login?mode=sign-up[/ACTIONS]',
      ].join('\n');

      const importantLinks = getLinksHub()
        .filter((l) => l.category === 'שיווק' || l.category === 'תשלומים')
        .slice(0, 40)
        .map((l) => `- ${l.title}: ${l.href}`)
        .join('\n');

      // ניתוח הקשר מההיסטוריה
      const contextAnalysis = analyzeConversationContext(coreMessages as Array<{ role: string; content: string }>);
      
      const prompt = [
        `# הקשר נוכחי`,
        `עמוד: ${pathname}`,
        ``,
        `# מידע שנאסף על המשתמש`,
        contextAnalysis.detectedInfo ? JSON.stringify(contextAnalysis.detectedInfo, null, 2) : 'אין עדיין',
        ``,
        `# היסטוריית שיחה (${coreMessages.length} הודעות)`,
        history || '(ריק)',
        ``,
        `# קישורים זמינים`,
        importantLinks || '(none)',
        ``,
        salesDocsKnowledge ? `# מסמכי מכירות ומידע על המוצר\n${salesDocsKnowledge.slice(0, 18000)}` : '',
        ``,
        `# הודעה נוכחית`,
        lastUser,
        ``,
        `# משימה`,
        `1. זהה סוג סיטואציה (browsing/pricing_inquiry/ready_to_buy/objection/comparison/urgent)`,
        `2. אם יש מידע חדש על המשתמש - קלוט אותו`,
        `3. אם יש התנגדות - טפל בה בחוכמה`,
        `4. ענה בצורה רלוונטית וישירה`,
        `5. **חובה**: בסוף התשובה, הוסף 2-4 כפתורים דינמיים בפורמט:`,
        `[!ACTIONS]כפתור1|פעולה1;;כפתור2|פעולה2[/ACTIONS]`,
        ``,
        `דוגמה לכפתורים טובים:`,
        `- אם שואל על מחיר: "ראה מחירון מלא|/pricing;;דבר עם יועץ|/contact;;התחל ניסיון חינם|/login?mode=sign-up"`,
        `- אם מתלבט: "תכנן פגישת ייעוץ|/contact;;שאל שאלה נוספת|מה עוד חשוב לדעת?;;ראה סרטון הסבר|איפה הסרטון?"`,
        `- אם מוכן: "הירשם עכשיו|/login?mode=sign-up;;דבר עם מכירות|/contact;;שאלות נוספות|יש לי עוד שאלה"`,
      ].join('\n');

      return streamClaudeResponse({
        apiKey,
        systemInstruction,
        prompt,
        temperature: 0.3,
        maxTokens: 350,
        timeoutMs: 15000,
        fallbackText:
          'כרגע יש תקלה זמנית בעוזר ה-AI. בינתיים אפשר לראות את המחירון המלא בדף [/pricing](/pricing), להירשם למערכת בדף [/login?mode=sign-up](/login?mode=sign-up) או ליצור קשר עם הצוות בעמוד [/contact](/contact).',
      });
    }

    // === Workspace (non-sales) mode - requires authentication ===
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const orgSlug = inferOrgSlug(pathname);
    if (!orgSlug) {
      return streamTextResponse(
        [
          'כדי שאוכל לעזור בצורה מדויקת, צריך לפתוח קודם Workspace.',
          'עבור/י למסך של עסק (נתיב שמתחיל ב- /w/...) ואז נסה/י שוב.',
        ].join('\n')
      );
    }

    if (isNavigationQuestion(lastUser)) {
      const best = findBestUiEntry(lastUser);
      if (best) {
        return streamTextResponse(renderUiEntryForAnswer({ orgSlug, entry: best }));
      }
    }

    const { workspace } = await getWorkspaceByOrgKeyOrThrow(orgSlug);
    const organizationId = String(workspace.id);

    // Subscription guard — block AI for suspended/past_due/cancelled orgs
    const aiAccess = checkAiAccess(workspace.subscriptionStatus);
    if (!aiAccess.allowed) {
      return apiError(aiAccess.message, { status: 403 });
    }

    const moduleKey = inferModuleKey(pathname);

    const whatsappRes = await getContentByKey('landing', 'support', 'support_whatsapp_group_url');
    const whatsappGroupUrl = typeof whatsappRes.data === 'string' ? whatsappRes.data : '';

    let salesDocsKnowledge = '';
    try {
      salesDocsKnowledge = await loadSalesDocsSnippet();
    } catch {
      salesDocsKnowledge = '';
    }

    const docsKnowledge = buildDocsKnowledge({ orgSlug, moduleKey });
    const linksKnowledge = getLinksHub()
      .filter((l) => l.category === 'תמיכה והדרכה' || l.category === 'מערכת (Workspace)')
      .slice(0, 40)
      .map((l) => `- ${l.title}: ${l.href}`)
      .join('\n');

    let helpVideoText = '';
    try {
      const hv = await getHelpVideoSuggestion({ organizationId, pathname, moduleKey });
      if (hv?.videoUrl) {
        helpVideoText = `וידאו רלוונטי למסך: ${hv.title}${hv.duration ? ` (${hv.duration})` : ''} - ${hv.videoUrl}`;
      }
    } catch {
      helpVideoText = '';
    }

    const systemInstruction = [
      'אתה נציג תמיכה טכנית מהיר וישיר של MISRAD AI.',
      '',
      'תפקידך:',
      '1. לענות על שאלות טכניות בצורה ישירה (2-5 שורות)',
      '2. להפנות לקישור ישיר למסך/מדריך/וידאו',
      '3. לשאול שאלות הבהרה קצרות אם חסר מידע',
      '',
      'פורמט תשובה:',
      '- תשובה קצרה (2-3 שורות)',
      '- קישור ישיר: [טקסט](/w/{orgSlug}/path)',
      '- אם יש וידאו - צרף אותו',
      '',
      'דוגמאות:',
      '- "כדי להוסיף לקוח חדש: לחץ על + בראש העמוד. [למדריך מלא](/w/{orgSlug}/support/client/add-client)"',
      '- "הדוח נמצא תחת דשבורד > דוחות. [לדף הדוחות](/w/{orgSlug}/nexus/reports)"',
      '- "איפה בדיוק אתה רואה את השגיאה?"',
      '',
      whatsappGroupUrl && whatsappGroupUrl.trim() ? `אם אין תשובה - הפנה לתמיכה: ${whatsappGroupUrl}` : '',
      helpVideoText ? `וידאו רלוונטי:\n${helpVideoText}` : '',
      `UI Map:\n${JSON.stringify(UI_MAP).slice(0, 12000)}`,
      `Knowledge Base:\n${docsKnowledge.slice(0, 8000) || '(empty)'}`,
      `קישורים:\n${linksKnowledge || '(empty)'}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const prompt = `עמוד נוכחי: ${pathname}\nמודול: ${moduleKey || 'unknown'}\n\nHistory:\n${history || '(empty)'}\n\nUser message:\n${lastUser}`;

    return streamClaudeResponse({
      apiKey,
      systemInstruction,
      prompt,
      temperature: 0.2,
      maxTokens: 350,
      timeoutMs: 15000,
    });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: 'Chat failed' });
  }
}

export const POST = shabbatGuard(POSTHandler);
