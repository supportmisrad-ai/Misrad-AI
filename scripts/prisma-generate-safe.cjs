const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const dotenv = require('dotenv');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  try {
    const parsed = dotenv.parse(fs.readFileSync(filePath));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch (e) {
    console.error(`[prisma-generate-safe] Failed to load ${filePath}:`, e);
    process.exit(1);
  }
}

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanupClientTmpFiles(clientDir) {
  if (!fs.existsSync(clientDir)) return;
  for (const name of fs.readdirSync(clientDir)) {
    if (!name) continue;

    const full = path.join(clientDir, name);

    const isQueryEngineTmp = /^query_engine.*\.tmp/i.test(name) || /^query_engine.*\.tmp\d+$/i.test(name);
    if (isQueryEngineTmp) {
      try {
        fs.rmSync(full, { force: true });
      } catch {}
    }
  }
}

function bestEffortRemoveWindowsQueryEngine(clientDir) {
  if (process.platform !== 'win32') return;
  try {
    fs.rmSync(path.join(clientDir, 'query_engine-windows.dll.node'), { force: true });
  } catch {}
}

function bestEffortCleanupFromRenameError(message) {
  const normalized = String(message || '').replace(/\r?\n/g, ' ');

  const matchSingle = normalized.match(/rename '([^']+)' -> '([^']+)'/i);
  const matchDouble = normalized.match(/rename "([^"]+)" -> "([^"]+)"/i);
  const match = matchSingle || matchDouble;
  if (!match) return;

  const src = match[1];
  const dest = match[2];

  try {
    if (dest && typeof dest === 'string') fs.rmSync(dest, { force: true });
  } catch {}

  try {
    if (src && typeof src === 'string') fs.rmSync(src, { force: true });
  } catch {}
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');

  loadEnvFile(path.join(repoRoot, '.env'));
  loadEnvFile(path.join(repoRoot, '.env.local'));

  const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

  const prismaBin =
    process.platform === 'win32'
      ? path.join(repoRoot, 'node_modules', '.bin', 'prisma.cmd')
      : path.join(repoRoot, 'node_modules', '.bin', 'prisma');

  const clientDir = path.join(repoRoot, 'node_modules', '.prisma', 'client');

  const maxAttempts = Math.max(1, envInt('PRISMA_GENERATE_MAX_ATTEMPTS', 8));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    cleanupClientTmpFiles(clientDir);
    bestEffortRemoveWindowsQueryEngine(clientDir);

    try {
      const cmd = `"${prismaBin}" generate --schema "${schemaPath}"`;
      cp.execSync(cmd, { cwd: repoRoot, stdio: 'inherit', env: process.env });
      return;
    } catch (e) {
      const message = String(e && (e.message || e.stderr || e.stdout || e));

      const retryable =
        /EPERM|EBUSY|operation not permitted/i.test(message) &&
        /query_engine-windows\.dll\.node/i.test(message);

      if (!retryable || attempt === maxAttempts) {
        console.error('[prisma-generate-safe] prisma generate failed:', e);
        process.exit(1);
      }

      bestEffortCleanupFromRenameError(message);

      const waitMs = Math.min(250 * attempt * attempt, 5000);
      await sleep(waitMs);
    }
  }
}

main();
