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

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('-')) return null;
  return v;
}

function resolvePgDumpPath() {
  const explicit = getArgValue('--pg-dump');
  if (explicit && fs.existsSync(explicit)) return explicit;

  const candidate = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe';
  if (fs.existsSync(candidate)) return candidate;

  // Fallback: rely on PATH
  return 'pg_dump';
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
  };
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writePgPassFile({ host, port, db, user, pass }, ts) {
  const pgpassPath = path.join(os.tmpdir(), `pgpass-misrad-${ts}.txt`);
  // Format: hostname:port:database:username:password
  fs.writeFileSync(pgpassPath, `${host}:${port}:${db}:${user}:${pass}`, { encoding: 'ascii' });
  return pgpassPath;
}

function main() {
  const explicitEnv = getArgValue('--env');
  if (explicitEnv) {
    loadEnvFileSilent(explicitEnv);
  } else {
    const loaded = loadEnvFileSilent('.env.local');
    if (!loaded) {
      console.error('[full-backup] .env.local not found; using process.env only.');
    }
  }

  const tag = (process.argv[2] && !process.argv[2].startsWith('-')) ? String(process.argv[2]) : 'V1.0.0-ready';
  const ts = safeTimestamp();

  const backupDir = path.join(process.cwd(), 'backups');
  ensureDir(backupDir);

  const fileSafeTag = tag.trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
  const outFile = path.join(backupDir, `full-${ts}-${fileSafeTag}.backup`);

  const pgDump = resolvePgDumpPath();
  const conn = parseDirectUrl();

  if (/\.pooler\.supabase\.com$/i.test(conn.host)) {
    console.warn(
      `[full-backup] WARNING: DIRECT_URL host looks like a Supabase pooler (${conn.host}). ` +
        'For full backups, Supabase recommends using the direct DB host (not pooler).'
    );
  }

  const pgpassPath = writePgPassFile(conn, ts);

  const env = {
    ...process.env,
    PGPASSFILE: pgpassPath,
    PGSSLMODE: 'require',
  };

  try {
    console.log(`[full-backup] Target: ${conn.host}:${conn.port}/${conn.db}`);
    console.log(`[full-backup] Output: ${outFile}`);

    const args = [
      '-h', conn.host,
      '-p', String(conn.port),
      '-U', conn.user,
      '-d', conn.db,
      '-F', 'c',
      '-Z', '9',
      '-b',
      '--no-owner',
      '--no-privileges',
      '--verbose',
      '--schema=public',
      '-f', outFile,
    ];

    const res = spawnSync(pgDump, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      shell: false,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });

    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);

    if (res.error) throw res.error;

    const fileExists = fs.existsSync(outFile);
    const exitCode = typeof res.status === 'number' ? res.status : null;

    if (exitCode !== 0) {
      if (fileExists) {
        const sizeMB = Math.round((fs.statSync(outFile).size / (1024 * 1024)) * 100) / 100;
        console.error(`[full-backup] ERROR: pg_dump exited with code ${exitCode}, but a file was created.`);
        console.error(`[full-backup] File may be PARTIAL: ${outFile} (${sizeMB} MB)`);
        process.exitCode = 1;
        return;
      }
      throw new Error(`pg_dump exited with code ${exitCode}`);
    }

    if (!fileExists) throw new Error('Backup file was not created');

    const sizeMB = Math.round((fs.statSync(outFile).size / (1024 * 1024)) * 100) / 100;
    console.log(`[full-backup] Done: ${outFile} (${sizeMB} MB)`);
  } finally {
    try {
      fs.unlinkSync(pgpassPath);
    } catch {}
  }
}

main();
