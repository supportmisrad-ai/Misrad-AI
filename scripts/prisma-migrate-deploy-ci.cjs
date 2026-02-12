require('dotenv').config({ path: '.env' });
try {
  require('dotenv').config({ path: '.env.local' });
} catch {}

const cp = require('child_process');
const path = require('path');

function parseDbUrl(url) {
  try {
    if (!url) return null;
    const u = new URL(String(url));
    const port = u.port ? Number.parseInt(String(u.port), 10) : 5432;
    return { host: String(u.hostname || ''), port: Number.isFinite(port) ? port : 5432 };
  } catch {
    return null;
  }
}

function looksLikeSupabasePooler(url) {
  const info = parseDbUrl(url);
  if (!info) return false;
  if (info.port === 6543 || info.port === 6544) return true;
  if (info.host.includes('pooler.supabase.com')) return true;
  return false;
}

function envBool(name, defaultValue) {
  const raw = String(process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'n') return false;
  return defaultValue;
}

function main() {
  if (envBool('PRISMA_MIGRATE_DEPLOY_DISABLE', false)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'PRISMA_MIGRATE_DEPLOY_DISABLE' }, null, 2));
    return;
  }

  const isVercel = envBool('VERCEL', false);
  const isCi = envBool('CI', false) && !isVercel;
  const allowOnVercel = envBool('PRISMA_MIGRATE_DEPLOY_ON_VERCEL', false);
  if (!isCi && !(isVercel && allowOnVercel)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'NOT_CI_OR_VERCEL_ENABLED' }, null, 2));
    return;
  }

  const dbUrl = String(process.env.DATABASE_URL || '').trim();
  if (!dbUrl) {
    throw new Error('CI prisma migrate deploy requires DATABASE_URL');
  }

  const directUrl = String(process.env.DIRECT_URL || '').trim();
  const shouldForceDirect = Boolean(directUrl) && looksLikeSupabasePooler(dbUrl);
  if (shouldForceDirect) {
    console.log('[CI] Detected pooler DATABASE_URL; using DIRECT_URL for migrate deploy.');
  }

  const repoRoot = path.resolve(__dirname, '..');
  const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

  const prismaBin =
    process.platform === 'win32'
      ? path.join(repoRoot, 'node_modules', '.bin', 'prisma.cmd')
      : path.join(repoRoot, 'node_modules', '.bin', 'prisma');

  console.log('[CI] Running prisma migrate deploy...');
  console.log(`[CI] Schema: ${schemaPath}`);
  console.log(`[CI] DB URL exists: ${!!dbUrl}`);

  try {
    cp.execFileSync(prismaBin, ['migrate', 'deploy', '--schema', schemaPath], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: shouldForceDirect ? directUrl : process.env.DATABASE_URL,
      },
    });
    console.log('[CI] ✅ Prisma migrate deploy completed successfully');
  } catch (err) {
    console.error('[CI] ❌ Prisma migrate deploy failed');
    console.error('[CI] Error details:', {
      message: err.message,
      status: err.status,
      signal: err.signal,
      stdout: err.stdout ? err.stdout.toString() : null,
      stderr: err.stderr ? err.stderr.toString() : null,
    });
    throw err;
  }
}

main();
