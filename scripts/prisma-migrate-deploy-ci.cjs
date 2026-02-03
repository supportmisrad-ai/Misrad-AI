require('dotenv').config({ path: '.env' });
try {
  require('dotenv').config({ path: '.env.local' });
} catch {}

const cp = require('child_process');
const path = require('path');

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

  const isCiLike = envBool('CI', false) || envBool('VERCEL', false);
  if (!isCiLike) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'NOT_CI_OR_VERCEL' }, null, 2));
    return;
  }

  const dbUrl = String(process.env.DATABASE_URL || '').trim();
  if (!dbUrl) {
    throw new Error('CI prisma migrate deploy requires DATABASE_URL');
  }

  const repoRoot = path.resolve(__dirname, '..');
  const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

  const prismaBin =
    process.platform === 'win32'
      ? path.join(repoRoot, 'node_modules', '.bin', 'prisma.cmd')
      : path.join(repoRoot, 'node_modules', '.bin', 'prisma');

  cp.execFileSync(prismaBin, ['migrate', 'deploy', '--schema', schemaPath], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

main();
