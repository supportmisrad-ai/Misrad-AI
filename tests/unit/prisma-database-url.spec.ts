import { test, expect } from '@playwright/test';

import { getEffectiveDatabaseUrlForPrisma } from '@/lib/prisma-database-url';

test.describe('prisma-database-url', () => {
  const origEnv: Record<string, string | undefined> = {};
  const envKeys = [
    'DATABASE_URL',
    'DIRECT_URL',
    'MISRAD_PRISMA_FORCE_POOLER_TRANSACTION',
    'MISRAD_PRISMA_POOL_CONNECTION_LIMIT',
    'MISRAD_PRISMA_CONNECTION_LIMIT',
    'MISRAD_PRISMA_POOL_TIMEOUT_SECONDS',
    'MISRAD_PRISMA_CONNECT_TIMEOUT_SECONDS',
  ];

  test.beforeEach(() => {
    for (const k of envKeys) {
      origEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  test.afterEach(() => {
    for (const k of envKeys) {
      if (origEnv[k] !== undefined) process.env[k] = origEnv[k];
      else delete process.env[k];
    }
  });

  test('returns null when no DATABASE_URL or DIRECT_URL', async () => {
    expect(getEffectiveDatabaseUrlForPrisma()).toBeNull();
  });

  test('returns direct URL as-is for non-pooler', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.com:5432/mydb';
    const result = getEffectiveDatabaseUrlForPrisma();
    expect(result).toBe('postgresql://user:pass@db.example.com:5432/mydb');
  });

  test('adds pgbouncer params for pooler URL', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.pooler.supabase.com:6543/postgres';
    const result = getEffectiveDatabaseUrlForPrisma()!;
    expect(result).toContain('pgbouncer=true');
    expect(result).toContain('statement_cache_size=0');
    expect(result).toContain('connection_limit=15');
    expect(result).toContain('pool_timeout=15');
    expect(result).toContain('connect_timeout=10');
  });

  test('env override for connection_limit', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.pooler.supabase.com:6543/postgres';
    process.env.MISRAD_PRISMA_POOL_CONNECTION_LIMIT = '25';
    const result = getEffectiveDatabaseUrlForPrisma()!;
    expect(result).toContain('connection_limit=25');
  });

  test('env override for pool_timeout', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.pooler.supabase.com:6543/postgres';
    process.env.MISRAD_PRISMA_POOL_TIMEOUT_SECONDS = '30';
    const result = getEffectiveDatabaseUrlForPrisma()!;
    expect(result).toContain('pool_timeout=30');
  });

  test('env override for connect_timeout', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.pooler.supabase.com:6543/postgres';
    process.env.MISRAD_PRISMA_CONNECT_TIMEOUT_SECONDS = '5';
    const result = getEffectiveDatabaseUrlForPrisma()!;
    expect(result).toContain('connect_timeout=5');
  });

  test('falls back to DIRECT_URL when DATABASE_URL empty', async () => {
    process.env.DIRECT_URL = 'postgresql://user:pass@direct.example.com:5432/mydb';
    const result = getEffectiveDatabaseUrlForPrisma();
    expect(result).toBe('postgresql://user:pass@direct.example.com:5432/mydb');
  });

  test('prefers DATABASE_URL over DIRECT_URL', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.com:5432/primary';
    process.env.DIRECT_URL = 'postgresql://user:pass@direct.example.com:5432/secondary';
    const result = getEffectiveDatabaseUrlForPrisma();
    expect(result).toContain('primary');
  });

  test('session pooler on port 5432 detected correctly', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.pooler.supabase.com:5432/postgres';
    const result = getEffectiveDatabaseUrlForPrisma()!;
    expect(result).toContain('pgbouncer=true');
  });

  test('force pooler transaction upgrades session to transaction port', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.pooler.supabase.com:5432/postgres';
    process.env.MISRAD_PRISMA_FORCE_POOLER_TRANSACTION = 'true';
    const result = getEffectiveDatabaseUrlForPrisma()!;
    expect(result).toContain(':6543');
  });

  test('invalid env values for limits are ignored', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.pooler.supabase.com:6543/postgres';
    process.env.MISRAD_PRISMA_POOL_CONNECTION_LIMIT = 'abc';
    const result = getEffectiveDatabaseUrlForPrisma()!;
    expect(result).toContain('connection_limit=15');
  });

  test('preserves existing connection_limit in URL', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@db.pooler.supabase.com:6543/postgres?connection_limit=50';
    const result = getEffectiveDatabaseUrlForPrisma()!;
    expect(result).toContain('connection_limit=50');
  });
});
