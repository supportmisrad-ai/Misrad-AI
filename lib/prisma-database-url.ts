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
      // For serverless each isolate keeps its own pool; 15 balances latency vs saturation.
      // Override via MISRAD_PRISMA_POOL_CONNECTION_LIMIT.
      if (envPoolConnectionLimit !== null) u.searchParams.set('connection_limit', String(envPoolConnectionLimit));
      else if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '15');

      if (envPoolTimeoutSeconds !== null) u.searchParams.set('pool_timeout', String(envPoolTimeoutSeconds));
      else if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '15');

      if (envConnectTimeoutSeconds !== null) u.searchParams.set('connect_timeout', String(envConnectTimeoutSeconds));
      else if (!u.searchParams.has('connect_timeout')) u.searchParams.set('connect_timeout', '10');

      u.searchParams.set('pgbouncer', 'true');
      u.searchParams.set('statement_cache_size', '0');
      return u.toString();
    } catch {
      return upgraded;
    }
  };

  // Prisma runtime should always prefer DATABASE_URL. DIRECT_URL is reserved for CLI/migrations.
  const fromDatabaseUrl = normalizeCandidate(envDatabaseUrl);
  if (fromDatabaseUrl) return fromDatabaseUrl;

  const fromDirectUrl = normalizeCandidate(envDirectUrl);
  if (fromDirectUrl) return fromDirectUrl;

  return null;
}
