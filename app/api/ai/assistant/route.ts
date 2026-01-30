import { apiError } from '@/lib/server/api-response';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';
import { createClient } from '@/lib/supabase';
import { getContentByKey } from '@/app/actions/site-content';
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

function extractText(msg: IncomingMessage): string {
  if (typeof msg.content === 'string') return String(msg.content);
  if (typeof msg.text === 'string') return String(msg.text);
  const parts = Array.isArray(msg.parts) ? msg.parts : [];
  return parts
    .filter((p) => p && p.type === 'text')
    .map((p) => String(p.text || ''))
    .join('');
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

function ensureSalesCTA(text: string): string {
  const out = String(text || '').trim();
  if (!out) return out;

  const lowered = out.toLowerCase();
  const hasCta =
    lowered.includes('/pricing') ||
    lowered.includes('/subscribe') ||
    lowered.includes('/sign-up') ||
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

function isSalesPathname(pathname: string): boolean {
  const p = String(pathname || '/').toLowerCase();
  if (p.startsWith('/w/')) return false;
  if (p.includes('pricing')) return true;
  if (p.includes('landing')) return true;
  if (p.includes('subscribe')) return true;
  if (p.includes('solo')) return true;
  if (p.includes('the-operator')) return true;
  return false;
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

  const supabase = createClient();
  let q = supabase
    .from('help_videos')
    .select('id, module_key, title, video_url, order, route_prefix, duration')
    .order('order', { ascending: true })
    .order('created_at', { ascending: true });

  const mk = String(params.moduleKey || '').trim().toLowerCase();
  if (mk && ['nexus', 'system', 'social', 'finance', 'client', 'operations'].includes(mk)) {
    q = q.eq('module_key', mk);
  }

  const { data, error } = await q;
  if (error) return null;

  const rows: any[] = Array.isArray(data) ? data : [];
  if (rows.length === 0) return null;

  let best: any | null = null;
  let bestLen = -1;
  let moduleDefault: any | null = null;

  const normalized = (() => {
    const match = pathname.match(/^\/w\/[^/]+(\/.*)?$/);
    return match ? match[1] || '/' : pathname || '/';
  })();

  for (const row of rows) {
    const rp = String((row as any)?.route_prefix ?? '').trim();
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
    id: String((picked as any)?.id || ''),
    title: String((picked as any)?.title || ''),
    videoUrl: String((picked as any)?.video_url || ''),
    duration: (picked as any)?.duration == null ? null : String((picked as any)?.duration),
    routePrefix: String((picked as any)?.route_prefix || ''),
    moduleKey: String((picked as any)?.module_key || ''),
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
      .map((m) => ({ role: m.role, content: extractText(m) }));

    const lastUser = [...coreMessages].reverse().find((m) => m.role === 'user')?.content || '';
    const history = coreMessages
      .slice(-18)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return apiError('חסר OPENAI_API_KEY', { status: 500 });
    }

    if (sales) {
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

      const importantLinks = getLinksHub()
        .filter((l) => l.category === 'שיווק' || l.category === 'תשלומים')
        .slice(0, 40)
        .map((l) => `- ${l.title}: ${l.href}`)
        .join('\n');

      const prompt = `עמוד נוכחי: ${pathname}\n\nLinks:\n${importantLinks || '(none)'}\n\nHistory:\n${history || '(empty)'}\n\nUser message:\n${lastUser}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return apiError(`OpenAI error (${res.status}): ${txt}`, { status: 502 });
      }

      const json: unknown = await res.json();
      const text = extractOpenAiText(json);
      return streamTextResponse(ensureSalesCTA(text));
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

    const moduleKey = inferModuleKey(pathname);

    const whatsappRes = await getContentByKey('landing', 'support', 'support_whatsapp_group_url');
    const whatsappGroupUrl = typeof whatsappRes.data === 'string' ? whatsappRes.data : '';

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
      'התבסס אך ורק על המידע שסיפקתי לך תחת "Knowledge Base" ו-"Links" ו-"Video". אל תמציא פיצ׳רים.',
      'ענה קצר, ב-3-7 שורות.',
      'תמיד צרף בסוף לינק למאמר מלא (אם יש), או לינק לוידאו הרלוונטי (אם יש).',
      'אם אין תשובה מתוך ה-Knowledge Base: כתוב שאין לך תשובה ודחוף לוואטסאפ.',
      whatsappGroupUrl && whatsappGroupUrl.trim() ? `וואטסאפ לתמיכה: ${whatsappGroupUrl}` : '',
      helpVideoText ? `Video:\n${helpVideoText}` : '',
      `UI Map (מסכים, נתיבים וכפתורים עיקריים):\n${JSON.stringify(UI_MAP).slice(0, 16000)}`,
      `Knowledge Base:\n${docsKnowledge || '(empty)'}`,
      `Links:\n${linksKnowledge || '(empty)'}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const prompt = `עמוד נוכחי: ${pathname}\nמודול: ${moduleKey || 'unknown'}\n\nHistory:\n${history || '(empty)'}\n\nUser message:\n${lastUser}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return apiError(`OpenAI error (${res.status}): ${txt}`, { status: 502 });
    }

    const json: unknown = await res.json();
    const text = extractOpenAiText(json);

    return streamTextResponse(text);
  } catch (e: unknown) {
    return apiError(e, { status: 500, message: 'Chat failed' });
  }
}

export const POST = shabbatGuard(POSTHandler);
