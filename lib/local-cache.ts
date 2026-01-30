export type LocalCacheEnvelope<T> = {
  v: number;
  expiresAt: number;
  data: T;
};

export type LocalCacheGetOptions<T> = {
  version: number;
  fallback: T;
};

export type LocalCacheSetOptions = {
  version: number;
  ttlMs: number;
};

export function localCacheGet<T>(key: string, opts: LocalCacheGetOptions<T>): T {
  if (typeof window === 'undefined') return opts.fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return opts.fallback;

    const parsed = JSON.parse(raw) as Partial<LocalCacheEnvelope<T>>;
    if (!parsed || typeof parsed !== 'object') return opts.fallback;

    if (typeof parsed.v !== 'number' || parsed.v !== opts.version) return opts.fallback;
    if (typeof parsed.expiresAt !== 'number') return opts.fallback;

    const now = Date.now();
    if (parsed.expiresAt <= now) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return opts.fallback;
    }

    return (parsed.data as T) ?? opts.fallback;
  } catch {
    return opts.fallback;
  }
}

export function localCacheSet<T>(key: string, value: T, opts: LocalCacheSetOptions): void {
  if (typeof window === 'undefined') return;

  const env: LocalCacheEnvelope<T> = {
    v: opts.version,
    expiresAt: Date.now() + Math.max(0, opts.ttlMs),
    data: value,
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(env));
  } catch {
    // ignore
  }
}

export function localCacheRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
