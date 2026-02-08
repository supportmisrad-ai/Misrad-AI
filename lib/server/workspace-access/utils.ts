import 'server-only';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';

export { asObject, getErrorMessage };

const IS_PROD = process.env.NODE_ENV === 'production';

function logWorkspaceAccessError(message: string, details?: unknown) {
  if (IS_PROD) {
    console.error(message);
    return;
  }

  if (details === undefined) {
    console.error(message);
    return;
  }

  console.error(message, details);
}

export { logWorkspaceAccessError };

export function setErrorStatus(err: Error, status: number): Error {
  (err as Error & { status?: number }).status = status;
  return err;
}

export function getErrorStatus(error: unknown): number | null {
  const obj = asObject(error);
  const s = obj?.status;
  return typeof s === 'number' && Number.isFinite(s) ? s : null;
}

export function parseEnvCsv(value: string | undefined | null): string[] {
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function hash32(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function redactId(value: unknown): { len: number; hash: string } | null {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return null;
  return { len: v.length, hash: hash32(v) };
}

export function decodeMaybeRepeatedly(value: string, maxRounds = 3): string {
  let v = String(value || '');
  for (let i = 0; i < maxRounds; i++) {
    if (!v.includes('%')) return v;
    try {
      const next = decodeURIComponent(v);
      if (next === v) return v;
      v = next;
    } catch {
      return v;
    }
  }
  return v;
}

export function decodeOnce(value: string): string {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

export function isUuidLike(value: string | null | undefined): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
}
