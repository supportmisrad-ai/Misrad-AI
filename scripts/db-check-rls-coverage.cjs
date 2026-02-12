const fs = require('fs');
const dotenv = require('dotenv');

const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  try {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch (e) {
    console.error(`[db-check-rls-coverage] Failed to load ${envPath}:`, e);
    process.exit(1);
  }
} else {
  console.error(`[db-check-rls-coverage] ${envPath} not found; using process.env only.`);
}

const { PrismaClient, Prisma } = require('@prisma/client');
const net = require('net');

function parseDbIdentity(urlValue) {
  try {
    if (!urlValue) return null;
    const u = new URL(String(urlValue));
    const port = u.port ? Number.parseInt(String(u.port), 10) : 5432;
    const database = u.pathname ? String(u.pathname).replace(/^\//, '') : '';
    return {
      host: u.hostname || null,
      port: Number.isFinite(port) ? port : 5432,
      database: database || null,
      user: u.username ? decodeURIComponent(u.username) : null,
    };
  } catch {
    return null;
  }
}

function printDbTargetToStderr() {
  const id = parseDbIdentity(process.env.DATABASE_URL);
  if (!id) {
    console.error('[db-check-rls-coverage] DATABASE_URL -> (missing/invalid)');
    return;
  }
  console.error(
    `[db-check-rls-coverage] DATABASE_URL -> host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`
  );
}

function getHostSafe(urlValue) {
  try {
    if (!urlValue) return null;
    const u = new URL(String(urlValue));
    return u.host;
  } catch {
    return null;
  }
}

function getHostPortSafe(urlValue) {
  try {
    if (!urlValue) return null;
    const u = new URL(String(urlValue));
    return {
      host: String(u.hostname),
      port: Number(u.port || 5432),
    };
  } catch {
    return null;
  }
}

async function canReachTcp(host, port, timeoutMs) {
  return await new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      try {
        socket.removeAllListeners();
        socket.destroy();
      } catch {}
      resolve(Boolean(ok));
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
  });
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function envBool(name, defaultValue) {
  const raw = String(process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'n') return false;
  return defaultValue;
}

function envInt(name, defaultValue) {
  const raw = String(process.env[name] ?? '').trim();
  if (!raw) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : defaultValue;
}

const VERBOSE = envBool('RLS_CHECK_VERBOSE', false);

function vlog(...args) {
  if (!VERBOSE) return;
  console.log('[rls-check]', ...args);
}

function shouldEnforceRlsCheck() {
  if (envBool('RLS_CHECK_DISABLE', false)) return false;

  const explicitRequire = envBool('RLS_CHECK_REQUIRE', false);
  if (explicitRequire) return true;

  const ci = envBool('CI', false) && !envBool('VERCEL', false);
  if (ci) return true;

  return false;
}

async function loadTables(prisma) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;`
  );
  return rows.map((r) => ({
    tableName: String(r.table_name),
    rlsEnabled: Boolean(r.rls_enabled),
    rlsForced: Boolean(r.rls_forced),
  }));
}

async function loadPolicyMap(prisma) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`
  );
  const map = new Map();
  for (const r of rows) {
    const t = String(r.tablename);
    const p = String(r.policyname);
    const arr = map.get(t);
    if (arr) arr.push(p);
    else map.set(t, [p]);
  }
  return map;
}

async function loadColumnsMap(prisma) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
  );
  const map = new Map();
  for (const r of rows) {
    const t = String(r.table_name);
    const c = String(r.column_name);
    let entry = map.get(t);
    if (!entry) {
      entry = { hasOrganizationId: false, hasTenantId: false };
      map.set(t, entry);
    }
    if (c === 'organization_id') entry.hasOrganizationId = true;
    if (c === 'tenant_id') entry.hasTenantId = true;
  }
  return map;
}

async function loadExposureGrantCountMap(prisma) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT table_name, COUNT(*)::int AS cnt
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND grantee IN ('anon', 'authenticated')
        AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      GROUP BY table_name`
  );
  const map = new Map();
  for (const r of rows) {
    map.set(String(r.table_name), Number(r.cnt || 0));
  }
  return map;
}

async function runCheck(label) {
  const prisma = new PrismaClient();
  const skipTables = new Set(parseCsv(process.env.RLS_CHECK_SKIP_TABLES));
  const strictPolicies = envBool('RLS_CHECK_STRICT_POLICIES', true);
  const strictSuperAdmin = envBool('RLS_CHECK_STRICT_SUPER_ADMIN_POLICIES', true);

  const requiredPoliciesByTable = {
    organizations: ['org_self_select', 'super_admin_select_all', 'super_admin_write_all'],
    system_settings: ['system_settings_public_read', 'super_admin_select_all', 'super_admin_write_all'],
    social_system_settings: ['social_system_settings_public_read', 'super_admin_select_all', 'super_admin_write_all'],
    help_videos: ['help_videos_public_read', 'help_videos_super_admin_write'],
    partners: ['partners_owner_or_super_admin_select', 'partners_super_admin_write'],
    client_dna: ['client_dna_org_member_all'],
    business_metrics: ['business_metrics_org_member_all'],
    platform_credentials: ['platform_credentials_org_member_all'],
    platform_quotas: ['platform_quotas_org_member_all'],
    global_settings: ['global_settings_public_read', 'global_settings_super_admin_write'],
    ai_provider_keys: ['deny_all'],
    _prisma_migrations: ['deny_all'],
  };

  try {
    vlog('loading tables...');
    const tables = await loadTables(prisma);
    vlog(`loaded ${tables.length} tables`);

    vlog('loading policies...');
    const policyMap = await loadPolicyMap(prisma);
    vlog(`loaded policies for ${policyMap.size} tables`);

    vlog('loading columns...');
    const columnsMap = await loadColumnsMap(prisma);
    vlog(`loaded columns for ${columnsMap.size} tables`);

    vlog('loading grants...');
    const grantCountMap = await loadExposureGrantCountMap(prisma);
    vlog(`loaded grants for ${grantCountMap.size} tables`);

    const results = {
      label,
      databaseHost: getHostSafe(process.env.DATABASE_URL),
      totalTables: tables.length,
      strictPolicies,
      strictSuperAdmin,
      skippedTables: Array.from(skipTables),
      failures: [],
      warnings: [],
    };

    for (const t of tables) {
      if (skipTables.has(t.tableName)) continue;

      const grantCount = grantCountMap.get(t.tableName) || 0;

      if (!t.rlsEnabled || !t.rlsForced) {
        const item = {
          table: `public.${t.tableName}`,
          reason: 'RLS_NOT_ENABLED_OR_FORCED',
          rlsEnabled: t.rlsEnabled,
          rlsForced: t.rlsForced,
          grantCount,
        };

        if (grantCount > 0) {
          results.failures.push(item);
        } else {
          results.warnings.push({
            ...item,
            reason: 'RLS_NOT_ENABLED_OR_FORCED_BUT_NOT_EXPOSED_TO_ANON_OR_AUTHENTICATED',
          });
        }
        continue;
      }

      const policyNames = policyMap.get(t.tableName) || [];
      const policyCount = policyNames.length;
      if (policyCount > 0 && !strictPolicies) continue;

      if (strictPolicies) {
        const expected = requiredPoliciesByTable[t.tableName];
        if (Array.isArray(expected) && expected.length > 0) {
          const missing = expected.filter((p) => !policyNames.includes(p));
          const extras = policyNames.filter((p) => !expected.includes(p));
          if (missing.length > 0) {
            const item = {
              table: `public.${t.tableName}`,
              reason: 'MISSING_EXPECTED_POLICIES',
              expectedPolicies: expected,
              missingPolicies: missing,
              presentPolicies: policyNames,
              grantCount,
            };

            if (grantCount > 0) results.failures.push(item);
            else results.warnings.push({ ...item, reason: 'MISSING_EXPECTED_POLICIES_BUT_NOT_EXPOSED_TO_ANON_OR_AUTHENTICATED' });
            continue;
          }

          if (expected.length === 1 && expected[0] === 'deny_all' && extras.length > 0) {
            const item = {
              table: `public.${t.tableName}`,
              reason: 'UNEXPECTED_POLICIES_ON_DENY_ALL_TABLE',
              expectedPolicies: expected,
              unexpectedPolicies: extras,
              presentPolicies: policyNames,
              grantCount,
            };

            if (grantCount > 0) results.failures.push(item);
            else
              results.warnings.push({
                ...item,
                reason: 'UNEXPECTED_POLICIES_ON_DENY_ALL_TABLE_BUT_NOT_EXPOSED_TO_ANON_OR_AUTHENTICATED',
              });
            continue;
          }
        } else {
          const required = ['org_isolation_all'];
          if (strictSuperAdmin) required.push('super_admin_select_all');

          const cols = columnsMap.get(t.tableName) || { hasOrganizationId: false, hasTenantId: false };
          if (strictSuperAdmin && (cols.hasOrganizationId || cols.hasTenantId)) {
            required.push('super_admin_write_requires_org');
          }

          const missing = required.filter((p) => !policyNames.includes(p));
          if (missing.length > 0) {
            const item = {
              table: `public.${t.tableName}`,
              reason: 'MISSING_REQUIRED_POLICIES',
              requiredPolicies: required,
              missingPolicies: missing,
              presentPolicies: policyNames,
              grantCount,
            };

            if (grantCount > 0) results.failures.push(item);
            else results.warnings.push({ ...item, reason: 'MISSING_REQUIRED_POLICIES_BUT_NOT_EXPOSED_TO_ANON_OR_AUTHENTICATED' });
            continue;
          }
        }

        if (policyCount > 0) continue;
      }

      if (grantCount > 0) {
        results.failures.push({
          table: `public.${t.tableName}`,
          reason: 'NO_POLICIES_BUT_EXPOSED_TO_ANON_OR_AUTHENTICATED',
          policyCount,
          grantCount,
        });
      } else {
        results.warnings.push({
          table: `public.${t.tableName}`,
          reason: 'NO_POLICIES_BUT_NOT_EXPOSED_TO_ANON_OR_AUTHENTICATED',
          policyCount,
          grantCount,
        });
      }
    }

    console.log(JSON.stringify(results, null, 2));

    if (results.failures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  printDbTargetToStderr();
  const timeoutMs = envInt('RLS_CHECK_TIMEOUT_MS', 45_000);
  const timeout = setTimeout(() => {
    console.error(
      `db-check-rls-coverage timed out after ${timeoutMs}ms (likely DB connection issue). You can tune with RLS_CHECK_TIMEOUT_MS or disable with RLS_CHECK_DISABLE=true.`
    );
    process.exit(1);
  }, timeoutMs);

  if (envBool('VERCEL', false) && !envBool('RLS_CHECK_ON_VERCEL', false)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'VERCEL_SKIP_BY_DEFAULT' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  if (envBool('RLS_CHECK_DISABLE', false)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'RLS_CHECK_DISABLE' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  const enforce = shouldEnforceRlsCheck();
  const hasDb = Boolean(String(process.env.DATABASE_URL || '').trim());

  if (!enforce) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'NOT_ENFORCED' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  if (!hasDb && !enforce) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'NO_DATABASE_URL_AND_NOT_ENFORCED' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  if (!hasDb && enforce) {
    throw new Error('RLS coverage check is enforced but DATABASE_URL is missing');
  }

  const originalDatabaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  const checkDirectUrl = envBool('RLS_CHECK_CHECK_DIRECT_URL', envBool('CI', false));

  await runCheck('DATABASE_URL');

  if (directUrl && checkDirectUrl) {
    const requireDirect = envBool('RLS_CHECK_REQUIRE_DIRECT_URL', false) || envBool('CI', false);
    const tcpTimeoutMs = envInt('RLS_CHECK_DIRECT_URL_TCP_TIMEOUT_MS', 2500);
    const hp = getHostPortSafe(directUrl);
    const reachable = hp ? await canReachTcp(hp.host, hp.port, tcpTimeoutMs) : false;
    if (!reachable) {
      if (requireDirect) {
        throw new Error(
          `DIRECT_URL is set but unreachable (host=${hp ? hp.host : 'unknown'}). ` +
            'Fix networking/IP allowlist or set RLS_CHECK_REQUIRE_DIRECT_URL=false for local runs.'
        );
      }
      console.warn('[rls-check] Skipping DIRECT_URL check (unreachable).');
    } else {
      process.env.DATABASE_URL = directUrl;
      await runCheck('DIRECT_URL (forced via DATABASE_URL)');
    }
  }

  process.env.DATABASE_URL = originalDatabaseUrl;

  clearTimeout(timeout);
}

main().catch((e) => {
  console.error('db-check-rls-coverage failed:', e);
  process.exit(1);
});
