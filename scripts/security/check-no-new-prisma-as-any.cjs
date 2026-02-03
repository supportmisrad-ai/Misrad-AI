const fs = require('fs');
const path = require('path');

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'dist' || e.name === 'out') continue;
      walk(full, out);
      continue;
    }
    if (!e.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(e.name)) continue;
    out.push(full);
  }
}

function stripComments(src) {
  let s = String(src);
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return s;
}

function rel(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).replace(/\\/g, '/');
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const targets = [];

  const appDir = path.join(repoRoot, 'app');
  const libDir = path.join(repoRoot, 'lib');

  if (fs.existsSync(appDir)) walk(appDir, targets);
  if (fs.existsSync(libDir)) walk(libDir, targets);

  const allowlist = new Set([
    'app/api/integrations/green-invoice/create/route.ts',
    'app/api/invitations/token/[token]/route.ts',
    'app/api/employees/invitations/route.ts',
    'app/api/employees/invite/[token]/route.ts',
    'app/api/employees/invitations/[id]/deactivate/route.ts',
    'app/api/ai/analyze/route.ts',
  ]);

  const violations = [];

  for (const abs of targets) {
    const raw = fs.readFileSync(abs, 'utf8');
    const s = stripComments(raw);

    if (!/\bprisma\s+as\s+any\b/.test(s)) continue;

    const p = rel(repoRoot, abs);
    if (!allowlist.has(p)) {
      violations.push(p);
    }
  }

  if (violations.length) {
    console.error('\n[SECURITY] New prisma as any usage detected (not allowlisted):\n');
    for (const v of violations) console.error('-', v);
    console.error(
      '\nFix: replace prisma as any with typed Prisma delegate usage, or explicitly add an allowlist entry only if justified.'
    );
    process.exit(1);
  }

  console.log('[OK] No new prisma as any usage outside allowlist');
}

main();
