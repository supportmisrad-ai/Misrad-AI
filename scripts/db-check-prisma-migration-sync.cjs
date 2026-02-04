const fs = require('fs');
const dotenv = require('dotenv');

const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  try {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
  } catch (e) {
    console.error(`[db-check-prisma-migration-sync] Failed to load ${envPath}:`, e);
    process.exit(1);
  }
} else {
  console.error(`[db-check-prisma-migration-sync] ${envPath} not found; using process.env only.`);
}

const path = require('path');
const net = require('net');
const { PrismaClient } = require('@prisma/client');

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
    console.error('[db-check-prisma-migration-sync] DATABASE_URL -> (missing/invalid)');
    return;
  }
  console.error(
    `[db-check-prisma-migration-sync] DATABASE_URL -> host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`
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
  return Number.isFinite(n) ? Math.trunc(n) : defaultValue;
}

function shouldEnforceMigrationSync() {
  if (envBool('PRISMA_MIGRATION_SYNC_DISABLE', false)) return false;
  if (envBool('PRISMA_MIGRATION_SYNC_REQUIRE', false)) return true;
  if (envBool('CI', false) && !envBool('VERCEL', false)) return true;
  return false;
}

function loadLocalMigrationNames() {
  const migrationsDir = path.resolve(__dirname, '..', 'prisma', 'migrations');
  if (!fs.existsSync(migrationsDir)) return [];

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => Boolean(name) && !name.startsWith('.'))
    .sort();
}

async function getHasPrismaMigrationsTable(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') AS has_prisma_migrations;"
  );
  return Boolean(rows?.[0]?.has_prisma_migrations);
}

async function loadDbMigrations(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT migration_name, started_at, finished_at, rolled_back_at FROM public._prisma_migrations ORDER BY started_at ASC'
  );
  return Array.isArray(rows) ? rows : [];
}

function asStringSet(arr) {
  return new Set((Array.isArray(arr) ? arr : []).map((v) => String(v)));
}

async function runCheck(label) {
  const prisma = new PrismaClient();
  try {
    const localMigrations = loadLocalMigrationNames();
    const localSet = asStringSet(localMigrations);

    const hasTable = await getHasPrismaMigrationsTable(prisma);

    const results = {
      label,
      databaseHost: getHostSafe(process.env.DATABASE_URL),
      enforced: shouldEnforceMigrationSync(),
      hasPrismaMigrationsTable: hasTable,
      localMigrationsCount: localMigrations.length,
      dbMigrationsCount: null,
      failures: [],
      details: {
        missingInDb: [],
        unknownInRepo: [],
        failedMigrations: [],
        rolledBackMigrations: [],
      },
    };

    if (!hasTable) {
      results.failures.push({
        reason: 'MISSING__PRISMA_MIGRATIONS_TABLE',
      });
      console.log(JSON.stringify(results, null, 2));
      process.exitCode = 1;
      return;
    }

    const dbRows = await loadDbMigrations(prisma);
    results.dbMigrationsCount = dbRows.length;

    const applied = dbRows
      .filter((r) => r && r.finished_at && !r.rolled_back_at)
      .map((r) => String(r.migration_name));
    const appliedSet = asStringSet(applied);

    const failed = dbRows
      .filter((r) => r && !r.finished_at && !r.rolled_back_at)
      .map((r) => ({
        migration_name: String(r.migration_name),
        started_at: r.started_at ?? null,
      }));

    const rolledBack = dbRows
      .filter((r) => r && r.rolled_back_at)
      .map((r) => ({
        migration_name: String(r.migration_name),
        rolled_back_at: r.rolled_back_at ?? null,
      }));

    const missingInDb = localMigrations.filter((m) => !appliedSet.has(m));
    const unknownInRepo = applied.filter((m) => !localSet.has(m));

    const unknownInRepoDetails = dbRows
      .filter((r) => r && r.finished_at && !r.rolled_back_at && unknownInRepo.includes(String(r.migration_name)))
      .map((r) => ({
        migration_name: String(r.migration_name),
        finished_at: r.finished_at ?? null,
        checksum: r.checksum ? String(r.checksum) : null,
      }));

    results.details.missingInDb = missingInDb;
    results.details.unknownInRepo = unknownInRepo;
    results.details.unknownInRepoDetails = unknownInRepoDetails;
    results.details.failedMigrations = failed;
    results.details.rolledBackMigrations = rolledBack;

    if (failed.length > 0) {
      results.failures.push({
        reason: 'FAILED_MIGRATIONS_PRESENT',
        count: failed.length,
      });
    }

    if (missingInDb.length > 0) {
      results.failures.push({
        reason: 'LOCAL_MIGRATIONS_NOT_APPLIED_IN_DB',
        count: missingInDb.length,
        sample: missingInDb.slice(0, 20),
      });
    }

    if (unknownInRepo.length > 0) {
      results.failures.push({
        reason: 'DB_HAS_MIGRATIONS_NOT_PRESENT_IN_REPO',
        count: unknownInRepo.length,
        sample: unknownInRepo.slice(0, 20),
      });
    }

    console.log(JSON.stringify(results, null, 2));

    if (results.failures.length > 0) {
      if (results.enforced) {
        process.exitCode = 1;
      } else {
        console.warn('[prisma-migration-sync] Issues found but not enforced (set PRISMA_MIGRATION_SYNC_REQUIRE=true or run in CI to fail).');
      }
    }

  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  printDbTargetToStderr();
  const timeoutMs = envInt('PRISMA_MIGRATION_SYNC_TIMEOUT_MS', 45_000);
  const timeout = setTimeout(() => {
    console.error(
      `db-check-prisma-migration-sync timed out after ${timeoutMs}ms (likely DB connection issue). You can tune with PRISMA_MIGRATION_SYNC_TIMEOUT_MS or disable with PRISMA_MIGRATION_SYNC_DISABLE=true.`
    );
    process.exit(1);
  }, timeoutMs);

  if (envBool('VERCEL', false) && !envBool('PRISMA_MIGRATION_SYNC_ON_VERCEL', false)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'VERCEL_SKIP_BY_DEFAULT' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  if (envBool('PRISMA_MIGRATION_SYNC_DISABLE', false)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'PRISMA_MIGRATION_SYNC_DISABLE' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  const enforce = shouldEnforceMigrationSync();
  const hasDb = Boolean(String(process.env.DATABASE_URL || '').trim());
  if (!hasDb && !enforce) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'NO_DATABASE_URL_AND_NOT_ENFORCED' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  if (!hasDb && enforce) {
    throw new Error('Prisma migration sync check is enforced but DATABASE_URL is missing');
  }

  const originalDatabaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  const checkDirectUrl = envBool('PRISMA_MIGRATION_SYNC_CHECK_DIRECT_URL', envBool('CI', false));

  await runCheck('DATABASE_URL');

  if (directUrl && checkDirectUrl) {
    const requireDirect = envBool('PRISMA_MIGRATION_SYNC_REQUIRE_DIRECT_URL', false) || envBool('CI', false);
    const tcpTimeoutMs = envInt('PRISMA_MIGRATION_SYNC_DIRECT_URL_TCP_TIMEOUT_MS', 2500);
    const hp = getHostPortSafe(directUrl);
    const reachable = hp ? await canReachTcp(hp.host, hp.port, tcpTimeoutMs) : false;
    if (!reachable) {
      if (requireDirect) {
        throw new Error(
          `DIRECT_URL is set but unreachable (host=${hp ? hp.host : 'unknown'}). ` +
            'Fix networking/IP allowlist or set PRISMA_MIGRATION_SYNC_REQUIRE_DIRECT_URL=false for local runs.'
        );
      }
      console.warn('[prisma-migration-sync] Skipping DIRECT_URL check (unreachable).');
    } else {
      process.env.DATABASE_URL = directUrl;
      await runCheck('DIRECT_URL (forced via DATABASE_URL)');
    }
  }

  process.env.DATABASE_URL = originalDatabaseUrl;

  clearTimeout(timeout);
}

main().catch((e) => {
  console.error('db-check-prisma-migration-sync failed:', e);
  process.exit(1);
});
