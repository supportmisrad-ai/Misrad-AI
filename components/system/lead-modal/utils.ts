import { Lead } from '../types';
import { STAGES } from '../constants';

export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

export function getStageLabel(status: Lead['status']): string {
  const s = STAGES.find((x) => x.id === status);
  return s?.label || String(status || '');
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDateTimeShort(date: Date): string {
  return date.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getDefaultPublicDescription(l: Lead): string {
  const stage = getStageLabel(l.status);
  const company = String(l.company || '').trim();
  const name = String(l.name || '').trim();
  const lObj = asObject(l);
  const address = String(lObj?.installationAddress || l.address || '').trim();
  const parts = [company || 'לקוח פרטי', name || 'פנייה חדשה', stage ? `סטטוס: ${stage}` : null, address ? `כתובת: ${address}` : null].filter(Boolean);
  return parts.join('\n');
}

export function orgSlugFromPathname(pathname: string | null): string | null {
  const parts = String(pathname || '').split('/').filter(Boolean);
  const wIndex = parts.indexOf('w');
  if (wIndex === -1) return null;
  return parts[wIndex + 1] || null;
}
