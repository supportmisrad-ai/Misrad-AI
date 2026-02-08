import { asObjectLoose as asObject } from '@/lib/shared/unknown';

export type SystemLeadsCursor = {
  createdAt: string;
  id: string;
};

export function encodeSystemLeadsCursor(cursor: SystemLeadsCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');
}

export function decodeSystemLeadsCursor(raw?: string | null): SystemLeadsCursor | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(v, 'base64').toString('utf8'));
    const obj = asObject(parsed);
    const createdAt = String(obj?.createdAt || '').trim();
    const id = String(obj?.id || '').trim();
    if (!createdAt || !id) return null;
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return { createdAt: d.toISOString(), id };
  } catch {
    return null;
  }
}

export function parseFollowUpDateFromHebrew(text: string, now: Date): { date: Date; rationale: string } | null {
  const content = String(text || '').trim();
  if (!content) return null;

  const normalized = content.replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();

  if (lower.includes('מחר')) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(10, 0, 0, 0);
    return { date: d, rationale: 'זוהתה בקשה ל-follow-up מחר; הוצעה שעה 10:00 כברירת מחדל.' };
  }

  if (lower.includes('היום')) {
    const d = new Date(now);
    d.setUTCHours(16, 0, 0, 0);
    return { date: d, rationale: 'זוהתה בקשה ל-follow-up היום; הוצעה שעה 16:00 כברירת מחדל.' };
  }

  const days: Array<{ key: string; idx: number }> = [
    { key: 'ראשון', idx: 0 },
    { key: 'שני', idx: 1 },
    { key: 'שלישי', idx: 2 },
    { key: 'רביעי', idx: 3 },
    { key: 'חמישי', idx: 4 },
    { key: 'שישי', idx: 5 },
    { key: 'שבת', idx: 6 },
  ];

  const hasTalkToMe = normalized.includes('דבר איתי') || normalized.includes('תדבר איתי') || normalized.includes('תחזור אליי');
  if (!hasTalkToMe) return null;

  const found = days.find((d) => normalized.includes(`יום ${d.key}`) || normalized.includes(`ביום ${d.key}`));
  if (!found) return null;

  const target = new Date(now);
  target.setUTCHours(10, 0, 0, 0);
  const currentDow = target.getUTCDay();
  let diff = (found.idx - currentDow + 7) % 7;
  if (diff === 0) diff = 7;
  target.setUTCDate(target.getUTCDate() + diff);
  return { date: target, rationale: `זוהתה בקשה ל-follow-up ביום ${found.key}; הוצעה שעה 10:00 כברירת מחדל.` };
}
