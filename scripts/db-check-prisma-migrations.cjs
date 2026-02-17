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
    console.error(`[db-check-prisma-migrations] Failed to load ${envPath}:`, e);
    process.exit(1);
  }
} else {
  console.error(`[db-check-prisma-migrations] ${envPath} not found; using process.env only.`);
}

const { PrismaClient, Prisma } = require('@prisma/client');

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
    console.error('[db-check-prisma-migrations] DATABASE_URL -> (missing/invalid)');
    return;
  }
  console.error(
    `[db-check-prisma-migrations] DATABASE_URL -> host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`
  );
}

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const v = String(raw).trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'y') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'n') return false;
  return fallback;
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

function shouldEnforceMigrationsCheck() {
  if (envBool('PRISMA_MIGRATIONS_DISABLE', false) || envBool('PRISMA_MIGRATIONS_CHECK_DISABLE', false)) return false;
  if (envBool('PRISMA_MIGRATIONS_REQUIRE', false) || envBool('PRISMA_MIGRATIONS_CHECK_REQUIRE', false)) return true;
  if (envBool('CI', false) && !envBool('VERCEL', false)) return true;
  return false;
}

function getHostPortSafe(urlValue) {
  try {
    if (!urlValue) return null;
    const u = new URL(String(urlValue));
    if (!u.hostname) return null;
    const port = u.port ? Number.parseInt(String(u.port), 10) : 5432;
    return { host: u.hostname, port: Number.isFinite(port) ? port : 5432 };
  } catch {
    return null;
  }
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

async function canReachTcp(host, port, timeoutMs) {
  const net = require('net');
  return await new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {}
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

async function runCheck(label) {
  const prisma = new PrismaClient();
  try {
    const existsRows = await prisma.$queryRaw(
      Prisma.sql`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') AS has_prisma_migrations;`
    );

    const hasPrismaMigrations = Boolean(existsRows?.[0]?.has_prisma_migrations);

    const result = {
      label,
      databaseHost: getHostSafe(process.env.DATABASE_URL),
      hasPrismaMigrations,
      hasInitMigration: null,
      hasOwnerIdAlignMigration: null,
      socialUsersHasIdPkOrUnique: null,
      socialUsersDuplicateIdCount: null,
      hasOrganizationsOwnerIdFk: null,
      invalidOrganizationsOwnerIdCount: null,
      failedMigrations: null,
      invalidOrganizationsSample: null,
      lastMigrations: null,
    };

    if (!hasPrismaMigrations) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const last = await prisma.$queryRaw(
      Prisma.sql`SELECT migration_name, finished_at FROM public._prisma_migrations ORDER BY finished_at DESC NULLS LAST LIMIT 30;`
    );

    const hasInit = await prisma.$queryRaw(
      Prisma.sql`SELECT migration_name FROM public._prisma_migrations WHERE migration_name='20260126000000_init' LIMIT 1;`
    );

    const hasOwnerAlign = await prisma.$queryRaw(
      Prisma.sql`SELECT migration_name FROM public._prisma_migrations WHERE migration_name='20260201000000_owner_id_social_users' LIMIT 1;`
    );

    result.hasInitMigration = hasInit.length > 0;
    result.hasOwnerIdAlignMigration = hasOwnerAlign.length > 0;
    result.lastMigrations = last;

    try {
      const socialUsersIdConstraintRows = await prisma.$queryRaw(
        Prisma.sql`SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) AS def
          FROM pg_constraint c
          WHERE c.conrelid = 'public.organization_users'::regclass
          AND c.contype IN ('p','u');`
      );

      result.socialUsersHasIdPkOrUnique = socialUsersIdConstraintRows.some((r) => {
        const def = String(r.def || '').toLowerCase();
        return def.includes('(') && def.includes('id') && (r.contype === 'p' || r.contype === 'u');
      });

      const dupeIdRows = await prisma.$queryRaw(
        Prisma.sql`SELECT COUNT(*)::int AS dupes FROM (SELECT id FROM public.organization_users GROUP BY id HAVING COUNT(*) > 1) t;`
      );
      result.socialUsersDuplicateIdCount = dupeIdRows?.[0]?.dupes ?? null;
    } catch (e) {
      if (e.code === 'P2010' || (e.meta && e.meta.code === '42P01')) {
        console.error('[db-check-prisma-migrations] organization_users table not found - OK in Clean Slate mode');
      } else {
        throw e;
      }
    }

    try {
      const fkRows = await prisma.$queryRaw(
        Prisma.sql`SELECT conname, confrelid::regclass::text AS referenced_table FROM pg_constraint WHERE conrelid = 'public.organizations'::regclass AND contype = 'f';`
      );
      result.hasOrganizationsOwnerIdFk = fkRows.some((r) => {
        const referenced = String(r.referenced_table || '').toLowerCase();
        return (
          r.conname === 'organizations_owner_id_fkey' &&
          (referenced === 'public.organization_users' || referenced === 'organization_users')
        );
      });

      const invalidRows = await prisma.$queryRaw(
        Prisma.sql`SELECT COUNT(*)::int AS invalid_count FROM public.organizations o LEFT JOIN public.organization_users su ON su.id = o.owner_id WHERE o.owner_id IS NOT NULL AND su.id IS NULL;`
      );
      result.invalidOrganizationsOwnerIdCount = invalidRows?.[0]?.invalid_count ?? null;
    } catch (e) {
      if (e.code === 'P2010' || (e.meta && e.meta.code === '42P01')) {
        console.error('[db-check-prisma-migrations] organizations table not found - OK in Clean Slate mode');
      } else {
        throw e;
      }
    }

    try {
      const failed = await prisma.$queryRaw(
        Prisma.sql`SELECT migration_name, started_at, finished_at, rolled_back_at FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at DESC LIMIT 20;`
      );
      result.failedMigrations = failed;
    } catch (e) {
      if (e.code === 'P2010' || (e.meta && e.meta.code === '42P01')) {
        console.error('[db-check-prisma-migrations] _prisma_migrations table not found - OK');
      } else {
        throw e;
      }
    }

    try {
      const invalidDetails = await prisma.$queryRaw(
      Prisma.sql`SELECT
        o.id AS organization_id,
        o.name AS organization_name,
        o.slug AS organization_slug,
        o.created_at AS organization_created_at,
        o.owner_id,
        p_owner.id AS owner_profile_id,
        p_owner.clerk_user_id AS owner_profile_clerk_user_id,
        p_owner.email AS owner_profile_email,
        p_candidate.id AS candidate_profile_id,
        p_candidate.clerk_user_id AS candidate_clerk_user_id,
        su_candidate.id AS candidate_social_user_id,
        su_fallback.id AS fallback_social_user_id,
        su_fallback.clerk_user_id AS fallback_clerk_user_id,
        su_fallback.email AS fallback_email
      FROM public.organizations o
      LEFT JOIN public.organization_users su ON su.id = o.owner_id
      LEFT JOIN public.profiles p_owner ON p_owner.id = o.owner_id
      LEFT JOIN LATERAL (
        SELECT p.*
        FROM public.profiles p
        WHERE p.organization_id = o.id
        ORDER BY CASE WHEN p.role = 'owner' THEN 0 ELSE 1 END, p.created_at ASC
        LIMIT 1
      ) p_candidate ON true
      LEFT JOIN public.organization_users su_candidate ON su_candidate.clerk_user_id = p_candidate.clerk_user_id
      LEFT JOIN LATERAL (
        SELECT su2.*
        FROM public.organization_users su2
        WHERE su2.organization_id = o.id
        ORDER BY su2.created_at ASC
        LIMIT 1
      ) su_fallback ON true
      WHERE o.owner_id IS NOT NULL AND su.id IS NULL
      ORDER BY o.id
      LIMIT 50;`
      );
      result.invalidOrganizationsSample = invalidDetails;
    } catch (e) {
      if (e.code === 'P2010' || (e.meta && e.meta.code === '42P01')) {
        console.error('[db-check-prisma-migrations] Cannot query invalidOrganizationsSample - OK in Clean Slate mode');
      } else {
        throw e;
      }
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  printDbTargetToStderr();
  const timeoutMs = envInt('PRISMA_MIGRATIONS_TIMEOUT_MS', 45_000);
  const timeout = setTimeout(() => {
    console.error(
      `db-check-prisma-migrations timed out after ${timeoutMs}ms (likely DB connection issue). You can tune with PRISMA_MIGRATIONS_TIMEOUT_MS or disable with PRISMA_MIGRATIONS_DISABLE=true.`
    );
    process.exit(1);
  }, timeoutMs);

  if (envBool('VERCEL', false) && !envBool('PRISMA_MIGRATIONS_CHECK_ON_VERCEL', false)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'VERCEL_SKIP_BY_DEFAULT' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  if (envBool('PRISMA_MIGRATIONS_DISABLE', false) || envBool('PRISMA_MIGRATIONS_CHECK_DISABLE', false)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'PRISMA_MIGRATIONS_DISABLE' }, null, 2));
    clearTimeout(timeout);
    return;
  }

  const enforce = shouldEnforceMigrationsCheck();
  const hasDb = Boolean(String(process.env.DATABASE_URL || '').trim());
  if (!hasDb && !enforce) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'NO_DATABASE_URL_AND_NOT_ENFORCED' }, null, 2));
    clearTimeout(timeout);
    return;
  }
  if (!hasDb && enforce) {
    throw new Error('Prisma migrations health check is enforced but DATABASE_URL is missing');
  }

  const originalDatabaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  await runCheck('DATABASE_URL');

  const checkDirectUrl = envBool('PRISMA_MIGRATIONS_CHECK_DIRECT_URL', envBool('CI', false));
  if (directUrl && checkDirectUrl) {
    const requireDirect = envBool('PRISMA_MIGRATIONS_REQUIRE_DIRECT_URL', envBool('CI', false));
    const tcpTimeoutMs = envInt('PRISMA_MIGRATIONS_DIRECT_URL_TCP_TIMEOUT_MS', 2500);
    const hp = getHostPortSafe(directUrl);
    const reachable = hp ? await canReachTcp(hp.host, hp.port, tcpTimeoutMs) : false;
    if (!reachable) {
      if (requireDirect) {
        throw new Error(
          `DIRECT_URL is set but unreachable (host=${hp ? hp.host : 'unknown'}). ` +
            'Fix networking/IP allowlist or set PRISMA_MIGRATIONS_REQUIRE_DIRECT_URL=false for local runs.'
        );
      }
      console.warn('[prisma-migrations-check] Skipping DIRECT_URL check (unreachable).');
    } else {
      process.env.DATABASE_URL = directUrl;
      await runCheck('DIRECT_URL (forced via DATABASE_URL)');
    }
  }

  process.env.DATABASE_URL = originalDatabaseUrl;

  clearTimeout(timeout);
}

main().catch((e) => {
  console.error('db-check-prisma-migrations failed:', e);
  process.exit(1);
});
