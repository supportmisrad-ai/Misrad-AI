import 'server-only';

import { asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';

export { asObject, getUnknownErrorMessage };

export { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError } from '@/lib/server/schema-fallbacks';

const IS_PROD = process.env.NODE_ENV === 'production';

export function logOperationsError(message: string, error: unknown) {
  if (IS_PROD) {
    console.error(message);
    return;
  }

  console.error(message, error);
}

export function isUuidLike(value: string | null | undefined): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
}

export function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function firstRowField(rows: unknown[] | null | undefined, key: string): string | null {
  const first = (rows || [])[0];
  const obj = asObject(first);
  if (!obj) return null;
  const val = obj[key];
  return val === null || val === undefined ? null : String(val);
}

export function toNumberSafe(value: unknown): number {
  if (typeof value === 'number') return value;
  const obj = asObject(value);
  const maybeToNumber = obj?.toNumber;
  if (typeof maybeToNumber === 'function') {
    const out = (maybeToNumber as (...args: never[]) => unknown).call(value);
    return typeof out === 'number' ? out : Number(out);
  }
  return Number(value);
}

export function normalizeAddress(input: string): string {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
