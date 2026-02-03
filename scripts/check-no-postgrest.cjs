const fs = require('fs');
const path = require('path');

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip build output and deps
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'dist' || e.name === 'out') continue;
      // Skip allowed API paths
      const norm = full.replaceAll('\\', '/');
      if (norm.includes('/app/api/webhooks/') || norm.includes('/app/api/e2e/')) continue;
      walk(full, out);
      continue;
    }
    if (!e.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(e.name)) continue;
    out.push(full);
  }
}

function stripComments(src) {
  // Best-effort: remove block comments and line comments.
  // This is not a full parser, but reduces false positives.
  let s = String(src);
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return s;
}

function isTargetFile(filePath) {
  const p = filePath.replaceAll('\\', '/');
  if (p.includes('/app/actions/')) return true;
  if (p.endsWith('/page.tsx')) return true;
  return false;
}

function hasIllegalPostgrestUsage(src) {
  const s = stripComments(src);
  // Allow storage usage
  // NOTE: We only detect DB PostgREST patterns.
  const patterns = [
    /\bsupabase\s*\.\s*from\s*\(/i,
    /\bsupabase\s*\.\s*rpc\s*\(/i,
    /\bcreateClient\s*\(\s*\)\s*\.\s*from\s*\(/i,
    /\bcreateClient\s*\(\s*\)\s*\.\s*rpc\s*\(/i,
  ];

  return patterns.some((re) => re.test(s));
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const appDir = path.join(repoRoot, 'app');

  const all = [];
  if (fs.existsSync(appDir)) {
    walk(appDir, all);
  }

  const targets = all.filter(isTargetFile);

  const violations = [];
  for (const filePath of targets) {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (hasIllegalPostgrestUsage(raw)) {
      violations.push(filePath);
    }
  }

  if (violations.length) {
    console.error('\n[SECURITY] Illegal Supabase PostgREST usage detected in restricted locations.');
    console.error('These must be migrated to Prisma-first (DB access via Supabase PostgREST is forbidden):\n');
    for (const v of violations) {
      console.error('-', path.relative(repoRoot, v).replaceAll('\\', '/'));
    }
    console.error('\nAllowed: supabase.storage.* (Storage only) and app/api/webhooks, app/api/e2e.');
    process.exit(1);
  }

  console.log('[OK] No illegal Supabase PostgREST usage found in app/actions/** or app/**/page.tsx');
}

main();
