const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const repoRoot = path.resolve(__dirname, '..');
const nextDir = path.join(repoRoot, '.next');
const buildIdPath = path.join(nextDir, 'BUILD_ID');

function parseBool(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return null;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'y') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'n') return false;
  return null;
}

function runBuildIfNeeded() {
  const skipBuild = parseBool(process.env.E2E_SKIP_BUILD) === true;
  const cleanNext = parseBool(process.env.E2E_CLEAN_NEXT) === true;
  const forceBuildRaw = parseBool(process.env.E2E_FORCE_BUILD);
  const forceBuild = forceBuildRaw == null ? false : forceBuildRaw;
  const hasBuild = fs.existsSync(buildIdPath);

  if (skipBuild) {
    if (!hasBuild) {
      process.stderr.write('E2E_SKIP_BUILD=1 but no .next build found. Run npm run build first.\n');
      process.exit(1);
    }
    return;
  }

  if (hasBuild && !forceBuild && !cleanNext) return;

  if (forceBuild || cleanNext) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  const nodeOptions = String(process.env.NODE_OPTIONS || '').trim() || '--max-old-space-size=8192';

  const res = spawnSync(npmCmd, ['run', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
  });

  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

function runStart() {
  const child = spawn(npmCmd, ['run', 'start'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  const forward = (signal) => {
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  };

  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

runBuildIfNeeded();
runStart();
