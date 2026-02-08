import { Prisma } from '@prisma/client';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';
export { asObject, getErrorMessage };

export function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const PRESENCE_TTL_MS = 2 * 60 * 1000;

export function parseLastSeenToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function isUserOnlineFromRow(row: Record<string, unknown>, now = new Date()): boolean {
  const lastSeenRaw = row.last_seen_at ?? row.lastSeenAt;
  const lastSeen = parseLastSeenToDate(lastSeenRaw);
  if (!lastSeen) {
    return Boolean(row.online ?? false);
  }
  return now.getTime() - lastSeen.getTime() <= PRESENCE_TTL_MS;
}

export function parseJson(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {};
  if (value === null) return {};
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) => toInputJsonValue(v));
  }

  const obj = asObject(value);
  if (!obj) return {};

  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = toInputJsonValue(v);
  }
  return out;
}

export function safeToInputJsonValue(value: unknown): Prisma.InputJsonValue {
  try {
    return toInputJsonValue(value);
  } catch {
    return {};
  }
}

export function toNumberMaybe(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  const obj = asObject(value);
  const maybeToNumber = obj?.toNumber;
  if (typeof maybeToNumber === 'function') {
    try {
      const n = (maybeToNumber as () => unknown).call(value);
      return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function toIsoStringMaybe(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'string' && value.trim()) return value;
  return undefined;
}

export function toDateOnlyStringMaybe(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && value.trim()) return value;
  return undefined;
}

export function toTimeHHmmStringMaybe(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hh = String(value.getUTCHours()).padStart(2, '0');
    const mm = String(value.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  if (typeof value === 'string' && value.trim()) {
    const s = value.trim();
    const m = s.match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : s;
  }
  return undefined;
}

export function parseDateOnlyToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
}

export function parseTimeHHmmToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = String(Math.max(0, Math.min(23, Number(m[1])))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, Number(m[2])))).padStart(2, '0');
  return new Date(`1970-01-01T${hh}:${mm}:00.000Z`);
}
