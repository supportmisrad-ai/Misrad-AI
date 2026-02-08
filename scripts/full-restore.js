#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');
const { spawnSync } = require('child_process');

function loadEnvFileSilent(filePath) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
  return true;
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('-')) return null;
  return v;
}

function getArgValues(name) {
  const values = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] !== name) continue;
    const v = process.argv[i + 1];
    if (!v || v.startsWith('-')) continue;
    values.push(v);
  }
  return values;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function resolvePgRestorePath() {
  const explicit = getArgValue('--pg-restore');
  if (explicit && fs.existsSync(explicit)) return explicit;

  const candidate = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe';
  if (fs.existsSync(candidate)) return candidate;

  return 'pg_restore';
}

function parseDirectUrl() {
  const raw = String(process.env.DIRECT_URL || '').trim();
  if (!raw) throw new Error('DIRECT_URL missing');

  const u = new URL(raw);
  const host = u.hostname;
  const port = u.port ? Number(u.port) : 5432;
  const db = (u.pathname || '').replace(/^\//, '');

  const userInfo = String(u.username || '');
  const passInfo = String(u.password || '');

  if (!host || !db || !userInfo) throw new Error('DIRECT_URL missing host/db/user');

  return {
    host,
    port: Number.isFinite(port) ? port : 5432,
    db,
    user: decodeURIComponent(userInfo),
    pass: decodeURIComponent(passInfo),
    raw,
  };
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

function writePgPassFile({ host, port, db, user, pass }, ts) {
  const pgpassPath = path.join(os.tmpdir(), `pgpass-misrad-restore-${ts}.txt`);
  fs.writeFileSync(pgpassPath, `${host}:${port}:${db}:${user}:${pass}`, { encoding: 'ascii' });
  return pgpassPath;
}

function resolveBackupFile() {
  const explicit = getArgValue('--file');
  if (explicit) {
    const p = path.isAbsolute(explicit) ? explicit : path.join(process.cwd(), explicit);
    if (!fs.existsSync(p)) throw new Error(`Backup file not found: ${p}`);
    return p;
  }

  const dir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(dir)) throw new Error('backups/ directory not found');

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^full-.*\.backup$/i.test(f))
    .map((f) => ({ f, p: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) throw new Error('No full-*.backup files found in backups/');
  return files[0].p;
}

function main() {
  const explicitEnv = getArgValue('--env');
  if (explicitEnv) {
    loadEnvFileSilent(explicitEnv);
  } else {
    const loaded = loadEnvFileSilent('.env.local');
    if (!loaded) {
      console.error('[full-restore] .env.local not found; using process.env only.');
    }
  }

  const backupFile = resolveBackupFile();
  const pgRestore = resolvePgRestorePath();
  const conn = parseDirectUrl();
  const ts = safeTimestamp();
  const pgpassPath = writePgPassFile(conn, ts);

  const env = {
    ...process.env,
    PGPASSFILE: pgpassPath,
    PGSSLMODE: 'require',
  };

  try {
    console.log(`[full-restore] Target: ${conn.host}:${conn.port}/${conn.db}`);
    console.log(`[full-restore] Input: ${backupFile}`);

    const isNexusTenants = hasFlag('--nexus-tenants');
    const tables = isNexusTenants ? ['nexus_tenants'] : getArgValues('--table');
    const isDataOnly = isNexusTenants ? true : hasFlag('--data-only');
    const isSchemaOnly = hasFlag('--schema-only');

    const useClean = !isDataOnly && !isSchemaOnly;

    const args = [
      '--verbose',
      '--no-owner',
      '--no-privileges',
      '-h',
      conn.host,
      '-p',
      String(conn.port),
      '-U',
      conn.user,
      '-d',
      conn.db,
    ];

    if (useClean) {
      args.splice(1, 0, '--clean', '--if-exists');
    }

    if (isDataOnly && isSchemaOnly) {
      throw new Error('Use only one of: --data-only, --schema-only');
    }

    if (isDataOnly) args.push('--data-only');
    if (isSchemaOnly) args.push('--schema-only');

    for (const t of tables) {
      args.push('--table');
      args.push(t);
    }

    args.push(backupFile);

    const res = spawnSync(pgRestore, args, {
      stdio: 'inherit',
      env,
      shell: false,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });

    if (res.error) throw res.error;

    const exitCode = typeof res.status === 'number' ? res.status : null;
    if (exitCode !== 0) {
      throw new Error(`pg_restore exited with code ${exitCode}`);
    }
  } finally {
    try {
      fs.unlinkSync(pgpassPath);
    } catch {}
  }
}

main();
