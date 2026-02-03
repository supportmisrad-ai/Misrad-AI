require('dotenv').config({ path: '.env' });
try {
  require('dotenv').config({ path: '.env.local' });
} catch {}

const { PrismaClient } = require('@prisma/client');

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
  if (envBool('CI', false)) return true;
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
    const existsRows = await prisma.$queryRawUnsafe(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') AS has_prisma_migrations;"
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

    const last = await prisma.$queryRawUnsafe(
      "SELECT migration_name, finished_at FROM public._prisma_migrations ORDER BY finished_at DESC NULLS LAST LIMIT 30;"
    );

    const hasInit = await prisma.$queryRawUnsafe(
      "SELECT migration_name FROM public._prisma_migrations WHERE migration_name='20260126000000_init' LIMIT 1;"
    );

    const hasOwnerAlign = await prisma.$queryRawUnsafe(
      "SELECT migration_name FROM public._prisma_migrations WHERE migration_name='20260201000000_owner_id_social_users' LIMIT 1;"
    );

    result.hasInitMigration = hasInit.length > 0;
    result.hasOwnerIdAlignMigration = hasOwnerAlign.length > 0;
    result.lastMigrations = last;

    const socialUsersIdConstraintRows = await prisma.$queryRawUnsafe(
      "SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) AS def " +
        "FROM pg_constraint c " +
        "WHERE c.conrelid = 'public.social_users'::regclass " +
        "AND c.contype IN ('p','u');"
    );

    result.socialUsersHasIdPkOrUnique = socialUsersIdConstraintRows.some((r) => {
      const def = String(r.def || '').toLowerCase();
      return def.includes('(') && def.includes('id') && (r.contype === 'p' || r.contype === 'u');
    });

    const dupeIdRows = await prisma.$queryRawUnsafe(
      "SELECT COUNT(*)::int AS dupes FROM (SELECT id FROM public.social_users GROUP BY id HAVING COUNT(*) > 1) t;"
    );
    result.socialUsersDuplicateIdCount = dupeIdRows?.[0]?.dupes ?? null;

    const fkRows = await prisma.$queryRawUnsafe(
      "SELECT conname, confrelid::regclass::text AS referenced_table FROM pg_constraint WHERE conrelid = 'public.organizations'::regclass AND contype = 'f';"
    );
    result.hasOrganizationsOwnerIdFk = fkRows.some((r) => {
      const referenced = String(r.referenced_table || '').toLowerCase();
      return (
        r.conname === 'organizations_owner_id_fkey' &&
        (referenced === 'public.social_users' || referenced === 'social_users')
      );
    });

    const invalidRows = await prisma.$queryRawUnsafe(
      "SELECT COUNT(*)::int AS invalid_count FROM public.organizations o LEFT JOIN public.social_users su ON su.id = o.owner_id WHERE o.owner_id IS NOT NULL AND su.id IS NULL;"
    );
    result.invalidOrganizationsOwnerIdCount = invalidRows?.[0]?.invalid_count ?? null;

    const failed = await prisma.$queryRawUnsafe(
      "SELECT migration_name, started_at, finished_at, rolled_back_at FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at DESC LIMIT 20;"
    );
    result.failedMigrations = failed;

    const invalidDetails = await prisma.$queryRawUnsafe(
      "SELECT\n" +
        "  o.id AS organization_id,\n" +
        "  o.name AS organization_name,\n" +
        "  o.slug AS organization_slug,\n" +
        "  o.created_at AS organization_created_at,\n" +
        "  o.owner_id,\n" +
        "  p_owner.id AS owner_profile_id,\n" +
        "  p_owner.clerk_user_id AS owner_profile_clerk_user_id,\n" +
        "  p_owner.email AS owner_profile_email,\n" +
        "  p_candidate.id AS candidate_profile_id,\n" +
        "  p_candidate.clerk_user_id AS candidate_clerk_user_id,\n" +
        "  su_candidate.id AS candidate_social_user_id,\n" +
        "  su_fallback.id AS fallback_social_user_id,\n" +
        "  su_fallback.clerk_user_id AS fallback_clerk_user_id,\n" +
        "  su_fallback.email AS fallback_email\n" +
        "FROM public.organizations o\n" +
        "LEFT JOIN public.social_users su ON su.id = o.owner_id\n" +
        "LEFT JOIN public.profiles p_owner ON p_owner.id = o.owner_id\n" +
        "LEFT JOIN LATERAL (\n" +
        "  SELECT p.*\n" +
        "  FROM public.profiles p\n" +
        "  WHERE p.organization_id = o.id\n" +
        "  ORDER BY CASE WHEN p.role = 'owner' THEN 0 ELSE 1 END, p.created_at ASC\n" +
        "  LIMIT 1\n" +
        ") p_candidate ON true\n" +
        "LEFT JOIN public.social_users su_candidate ON su_candidate.clerk_user_id = p_candidate.clerk_user_id\n" +
        "LEFT JOIN LATERAL (\n" +
        "  SELECT su2.*\n" +
        "  FROM public.social_users su2\n" +
        "  WHERE su2.organization_id = o.id\n" +
        "  ORDER BY su2.created_at ASC\n" +
        "  LIMIT 1\n" +
        ") su_fallback ON true\n" +
        "WHERE o.owner_id IS NOT NULL AND su.id IS NULL\n" +
        "ORDER BY o.id\n" +
        "LIMIT 50;"
    );
    result.invalidOrganizationsSample = invalidDetails;

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const timeoutMs = envInt('PRISMA_MIGRATIONS_TIMEOUT_MS', 45_000);
  const timeout = setTimeout(() => {
    console.error(
      `db-check-prisma-migrations timed out after ${timeoutMs}ms (likely DB connection issue). You can tune with PRISMA_MIGRATIONS_TIMEOUT_MS or disable with PRISMA_MIGRATIONS_DISABLE=true.`
    );
    process.exit(1);
  }, timeoutMs);

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
