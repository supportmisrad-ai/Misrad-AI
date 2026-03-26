/**
 * Prisma Database URL Resolution
 *
 * Resolves the effective DATABASE_URL for Prisma Client, handling:
 * - Supabase pooler detection (session vs transaction mode)
 * - Connection pool parameters (connection_limit, pool_timeout, connect_timeout)
 * - PgBouncer compatibility flags (pgbouncer=true, statement_cache_size=0)
 * - Env-based overrides (MISRAD_PRISMA_POOL_CONNECTION_LIMIT, etc.)
 */

export function getEffectiveDatabaseUrlForPrisma(): string | null {
  const envDatabaseUrl = String(process.env.DATABASE_URL || '').trim();
  const envDirectUrl = String(process.env.DIRECT_URL || '').trim();

  const forcePoolerTransaction =
    String(process.env.MISRAD_PRISMA_FORCE_POOLER_TRANSACTION || '').trim().toLowerCase() === 'true';

  // ⚡ Prefer direct connection over pooler
  // In production, default to true to avoid Supabase RLS "Tenant or user not found" errors
  // (RLS requires JWT claims that Prisma doesn't send through the pooler)
  const preferDirectConnectionEnv = String(process.env.MISRAD_PRISMA_PREFER_DIRECT || '').trim().toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  // 🔴 CRITICAL: Detect free tier - if DIRECT_URL uses port 5432 (direct connection),
  // it's blocked on Supabase free tier. Auto-disable preferDirectConnection unless explicitly enabled.
  const isDirectUrlBlocked = ((): boolean => {
    if (!envDirectUrl) return false;
    try {
      const u = new URL(envDirectUrl);
      const port = String(u.port || '').trim();
      // Port 5432 on Supabase = direct connection, blocked on free tier
      // Port 6543/6544 = pooler, works on all tiers
      return port === '5432';
    } catch {
      return false;
    }
  })();

  const preferDirectConnection = preferDirectConnectionEnv === 'true' ||
    (preferDirectConnectionEnv !== 'false' && isProduction && !isDirectUrlBlocked);

  const readPositiveIntEnv = (name: string): number | null => {
    const raw = String(process.env[name] || '').trim();
    if (!raw) return null;
    const n = Math.floor(Number(raw));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const envPoolConnectionLimit =
    readPositiveIntEnv('MISRAD_PRISMA_POOL_CONNECTION_LIMIT') ?? readPositiveIntEnv('MISRAD_PRISMA_CONNECTION_LIMIT');
  const envPoolTimeoutSeconds = readPositiveIntEnv('MISRAD_PRISMA_POOL_TIMEOUT_SECONDS');
  const envConnectTimeoutSeconds = readPositiveIntEnv('MISRAD_PRISMA_CONNECT_TIMEOUT_SECONDS');

  const getPoolerMode = (value: string): 'transaction' | 'session' | 'none' => {
    try {
      const u = new URL(value);
      const host = String(u.hostname || '').toLowerCase();
      const port = String(u.port || '').trim();
      const isPoolerHost = host.includes('pooler');
      if (!isPoolerHost) return 'none';
      if (port === '5432' || port === '') return 'session';
      if (port === '6543' || port === '6544') return 'transaction';
      return 'session';
    } catch {
      const raw = String(value || '').toLowerCase();
      if (!raw.includes('pooler')) return 'none';
      const m = raw.match(/@[^/]+pooler[^/:]*(?::(\d+))?/);
      const port = String(m?.[1] || '').trim();
      if (port === '6543' || port === '6544') return 'transaction';
      return 'session';
    }
  };

  const upgradeSessionPoolerToTransaction = (value: string): string => {
    try {
      const u = new URL(value);
      const host = String(u.hostname || '').toLowerCase();
      const port = String(u.port || '').trim();
      if (!host.includes('pooler')) return value;
      if (port !== '5432' && port !== '') return value;
      u.port = '6543';
      return u.toString();
    } catch {
      const raw = String(value || '');
      if (!raw.toLowerCase().includes('pooler')) return value;
      return raw.replace(/@([^/]+pooler[^/:]*)(?::(\d+))?/, (_m, host: string, port?: string) => {
        const p = String(port || '').trim();
        if (p && p !== '5432') return `@${host}:${p}`;
        return `@${host}:6543`;
      });
    }
  };
  const normalizeCandidate = (rawCandidate: string): string | null => {
    const candidate = String(rawCandidate || '').trim();
    if (!candidate) return null;

    const mode = getPoolerMode(candidate);
    const upgraded = mode === 'session' && forcePoolerTransaction ? upgradeSessionPoolerToTransaction(candidate) : candidate;
    const isPooler = getPoolerMode(upgraded) !== 'none';
    if (!isPooler) return upgraded;

    try {
      const u = new URL(upgraded);
      // PgBouncer connection_limit: how many connections Prisma opens to the pooler.
      // For serverless each isolate keeps its own pool; 3 is conservative to avoid
      // exhausting Supabase pooler limits (typically 60-200 connections to PostgreSQL).
      // Override via MISRAD_PRISMA_POOL_CONNECTION_LIMIT.
      if (envPoolConnectionLimit !== null) u.searchParams.set('connection_limit', String(envPoolConnectionLimit));
      else if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '3');

      // CRITICAL: idle_timeout ensures connections close after inactivity.
      // Without this, connections accumulate forever in serverless environments.
      if (!u.searchParams.has('idle_timeout')) u.searchParams.set('idle_timeout', '10');

      if (envPoolTimeoutSeconds !== null) u.searchParams.set('pool_timeout', String(envPoolTimeoutSeconds));
      else if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '10');

      if (envConnectTimeoutSeconds !== null) u.searchParams.set('connect_timeout', String(envConnectTimeoutSeconds));
      else if (!u.searchParams.has('connect_timeout')) u.searchParams.set('connect_timeout', '10');

      u.searchParams.set('pgbouncer', 'true');
      u.searchParams.set('statement_cache_size', '0');
      return u.toString();
    } catch {
      return upgraded;
    }
  };

  // ⚡ UPDATED: Support preferDirectConnection to bypass PgBouncer/RLS issues
  // In production, default to DIRECT_URL to avoid Supabase RLS "Tenant or user not found" errors
  // (RLS requires JWT claims that Prisma doesn't send through the pooler)
  if (preferDirectConnection && envDirectUrl) {
    const directParsed = normalizeCandidate(envDirectUrl);
    const isDirectPooler = directParsed && getPoolerMode(directParsed) !== 'none';
    if (directParsed && !isDirectPooler) {
      console.log(`[Prisma] Using DIRECT_URL (non-pooler) - preferDirectConnection=${preferDirectConnection} isProduction=${isProduction}`);
      return directParsed;
    } else if (isDirectPooler) {
      console.warn('[Prisma] DIRECT_URL is a pooler URL - falling back to DATABASE_URL');
    }
  } else if (isDirectUrlBlocked) {
    console.log('[Prisma] Auto-detected blocked direct connection (port 5432) - using pooler instead. Add MISRAD_PRISMA_PREFER_DIRECT=true to force direct connection if you upgrade Supabase plan.');
  }

  // Prisma runtime should always prefer DATABASE_URL. DIRECT_URL is reserved for CLI/migrations.
  const fromDatabaseUrl = normalizeCandidate(envDatabaseUrl);
  if (fromDatabaseUrl) return fromDatabaseUrl;

  const fromDirectUrl = normalizeCandidate(envDirectUrl);
  if (fromDirectUrl) return fromDirectUrl;

  return null;
}
