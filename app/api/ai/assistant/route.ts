import { apiError } from '@/lib/server/api-response';
import { promises as fs } from 'fs';
import path from 'path';

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

function streamOpenAIResponse(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  postProcess?: (text: string) => string;
}): Response {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), params.timeoutMs || 25000);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: params.model,
            messages: [
              { role: 'system', content: params.systemInstruction },
              { role: 'user', content: params.prompt },
            ],
            temperature: params.temperature ?? 0.3,
            max_tokens: params.maxTokens ?? 600,
            stream: true,
          }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const txt = await res.text().catch(() => '');
          controller.enqueue(encoder.encode(`שגיאה בשרת AI (${res.status}). נסה שוב.`));
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        const reader = res.body.getReader();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  if (params.postProcess) {
                    accumulated += content;
                  } else {
                    controller.enqueue(encoder.encode(content));
                  }
                }
              } catch {
                // skip malformed
              }
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
        controller.enqueue(encoder.encode(isAbort ? 'הבקשה לקחה יותר מדי זמן. נסה שוב.' : 'שגיאה בשרת AI. נסה שוב.'));
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return apiError('חסר OPENAI_API_KEY', { status: 500 });
    }

    if (sales) {
      let salesDocsKnowledge = '';
      try {
        salesDocsKnowledge = await loadSalesDocsSnippet();
      } catch {
        salesDocsKnowledge = '';
      }

      const systemInstruction = [
        '# תפקיד',
        'אתה יועץ מכירות מומחה וחכם של MISRAD AI. אתה מאמן מכירות ברמה עולמית.',
        '',
        '# יכולות מרכזיות',
        '1. **קליטת מידע** - זכור כל פרט שהמשתמש משתף (שם, חברה, תחום, בעיות, תקציב, לוח זמנים)',
        '2. **זיהוי סיטואציות** - הבן במה המשתמש נמצא:',
        '   - browsing: רק מסתכל, לא מוכן',
        '   - pricing_inquiry: שואל על מחיר',
        '   - ready_to_buy: מוכן לקנות עכשיו',
        '   - technical_support: שאלה טכנית',
        '   - objection: מעלה התנגדות',
        '   - comparison: משווה עם מתחרים',
        '   - urgent: צריך פתרון דחוף',
        '3. **טיפול בהתנגדויות** - כשיש התנגדות ("יקר מדי", "לא בטוח", "מסובך"), השב בצורה חכמה:',
        '   - הכר בחששות',
        '   - הצג ערך/ROI',
        '   - תן דוגמה/סיפור הצלחה',
        '   - הצע פעולה קלה',
        '4. **כפתורים דינמיים** - בסוף כל תשובה, החזר 2-4 כפתורים רלוונטיים להקשר:',
        '   פורמט: `[!ACTIONS]label1|action1;;label2|action2[/ACTIONS]`',
        '   דוגמאות:',
        '   - browsing: "מה זה עושה?", "כמה עולה?", "יש דמו?"',
        '   - pricing_inquiry: "ראה מחירון", "דבר עם מכירות", "התחל ניסיון"',
        '   - objection (יקר): "חשב ROI", "השווה תכניות", "ניסיון חינם 7 ימים"',
        '   - ready_to_buy: "הירשם עכשיו", "צור קשר מיידי", "ראה מדריך"',
        '',
        '# הנחיות תוכן',
        '- עברית טבעית וזורמת בלבד',
        '- שמות עבריים: "עוזר קולי", "חיבור לידים", "קיוסק", "ניהול לקוחות"',
        '- התמקד ב-ROI מדיד: "חוסך X שעות בשבוע", "מגדיל המרה ב-Y%"',
        '- דבר ישיר, ללא שיווק זול',
        '- אם לא יודע - אל תמציא',
        '',
        '# התנגדויות נפוצות וטיפול',
        '**"יקר מדי"** → "אני מבין את החשש. בואו נחשב ביחד: אם המערכת חוסכת לך 10 שעות בשבוע, זה כמה שווה לך? רוב הלקוחות שלנו מדווחים על החזר השקעה תוך 2-3 חודשים. [רוצה לראות דוגמה קונקרטית?]"',
        '**"לא בטוח שזה בשבילי"** → "בואו נבדוק ביחד. ספר לי קצת על העסק שלך - מה התחום? כמה לקוחות? מה הכאב הכי גדול? על פי זה אוכל להגיד לך בדיוק איך זה יכול לעזור או אם באמת זה לא מתאים."',
        '**"מסובך מדי"** → "זה בדיוק מה שלא רצינו! המערכת בנויה להיות פשוטה - תתחיל עם הבסיס (5 דקות הקמה) ותוסיף תכונות בהדרגה. יש לך וידאו של 3 דקות שמראה בדיוק איך להתחיל. רוצה?"',
        '**"יש לי כבר מערכת"** → "מעולה! רוב הלקוחות שלנו גם הגיעו ממערכות אחרות. מה החסרונות שאתה מרגיש במערכת הנוכחית? MISRAD בנויה בדיוק כדי לפתור את הבעיות הנפוצות - יכול להיות שזה בדיוק מה שחסר לך."',
        '',
        '# חשוב',
        '- זכור מידע מהשיחה (אם אמר שמו, השתמש בו)',
        '- התאם את הטון לרמת המוכנות',
        '- **תמיד** החזר כפתורי פעולה רלוונטיים',
        '- Markdown נקי וקריא',
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

      return streamOpenAIResponse({
        apiKey,
        model: 'gpt-4o-mini',
        systemInstruction,
        prompt,
        temperature: 0.7,
        maxTokens: 500,
        timeoutMs: 25000,
        postProcess: (raw) => {
          const actions = extractDynamicActions(raw);
          let cleaned = stripActionsTag(raw);
          if (actions.length === 0) {
            cleaned = ensureSalesCTA(cleaned);
          } else {
            cleaned = cleaned + '\n\n' + JSON.stringify({ quickActions: actions.map(a => a.label) });
          }
          return cleaned;
        },
      });
    }

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
      'אתה מומחה תמיכה טכנית למערכת MISRAD.',
      'בנוסף לתמיכה, אתה משמש גם כ"נווט" בתוך המערכת: כששואלים איפה נמצא מסך/פיצ׳ר או איך להגיע אליו — תן תשובה קצרה עם לינק Markdown לחיץ לנתיב המדויק בתוך ה-Workspace (תמיד תחת /w/{orgSlug}/...).',
      'אם יש התאמה מתוך UI Map (מפת המסכים) — העדף אותה על פני ניחוש. אם לא בטוח — שאל שאלת הבהרה אחת קצרה.',
      'התבסס אך ורק על המידע שסיפקתי לך תחת "Knowledge Base" ו-"Links" ו-"Video" ו-"מסמכי מוצר". אל תמציא פיצ׳רים.',
      'ענה קצר, ב-3-7 שורות.',
      'תמיד צרף בסוף לינק למאמר מלא (אם יש), או לינק לוידאו הרלוונטי (אם יש).',
      'אם אין תשובה מתוך ה-Knowledge Base: כתוב שאין לך תשובה ודחוף לוואטסאפ.',
      whatsappGroupUrl && whatsappGroupUrl.trim() ? `וואטסאפ לתמיכה: ${whatsappGroupUrl}` : '',
      helpVideoText ? `Video:\n${helpVideoText}` : '',
      `UI Map (מסכים, נתיבים וכפתורים עיקריים):\n${JSON.stringify(UI_MAP).slice(0, 16000)}`,
      `Knowledge Base:\n${docsKnowledge || '(empty)'}`,
      `Links:\n${linksKnowledge || '(empty)'}`,
      salesDocsKnowledge ? `מסמכי מוצר ומודולים (לשאלות על יכולות המערכת):\n${salesDocsKnowledge.slice(0, 12000)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const prompt = `עמוד נוכחי: ${pathname}\nמודול: ${moduleKey || 'unknown'}\n\nHistory:\n${history || '(empty)'}\n\nUser message:\n${lastUser}`;

    return streamOpenAIResponse({
      apiKey,
      model: 'gpt-4o-mini',
      systemInstruction,
      prompt,
      temperature: 0.2,
      maxTokens: 600,
      timeoutMs: 25000,
    });
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: 'Chat failed' });
  }
}

export const POST = shabbatGuard(POSTHandler);
