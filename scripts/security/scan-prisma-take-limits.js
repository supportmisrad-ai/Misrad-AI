const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

try {
  // Load local env files if present (without overriding existing process.env).
  const dotenv = require('dotenv');
  const envLocalPath = path.join(repoRoot, '.env.local');
  const envPath = path.join(repoRoot, '.env');
  if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: false });
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false });
} catch {
  // best effort
}

const MAX_TAKE = Number.isFinite(Number(process.env.MISRAD_MAX_PRISMA_TAKE))
  ? Number(process.env.MISRAD_MAX_PRISMA_TAKE)
  : 200;

const OVERFETCH_ALLOWANCE = Number.isFinite(Number(process.env.MISRAD_PRISMA_TAKE_OVERFETCH_ALLOWANCE))
  ? Number(process.env.MISRAD_PRISMA_TAKE_OVERFETCH_ALLOWANCE)
  : 5;

const UNKNOWN_TAKE_MODE_RAW = String(process.env.MISRAD_PRISMA_TAKE_UNKNOWN_MODE || 'warn').toLowerCase();
const UNKNOWN_TAKE_MODE =
  UNKNOWN_TAKE_MODE_RAW === 'off' || UNKNOWN_TAKE_MODE_RAW === 'warn' || UNKNOWN_TAKE_MODE_RAW === 'error'
    ? UNKNOWN_TAKE_MODE_RAW
    : 'warn';

const APPROVED = new Set([
  // Add explicit exceptions here when a larger take is accepted by design.
]);

function rel(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

function stripComments(src) {
  let s = String(src);
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return s;
}

function stripTypeNoise(expr) {
  let e = String(expr || '').trim();
  // Remove trailing TS assertions: `as X`, `satisfies X`
  e = e.replace(/\s+as\s+[\w\s<>\[\].,|&?:]+$/g, '').trim();
  e = e.replace(/\s+satisfies\s+[\w\s<>\[\].,|&?:]+$/g, '').trim();
  // Remove trailing non-null assertions
  e = e.replace(/!+$/g, '').trim();
  return e;
}

function unwrapParens(expr) {
  let e = stripTypeNoise(expr);
  for (;;) {
    if (e.startsWith('(') && e.endsWith(')')) {
      // Ensure parens are balanced.
      let depth = 0;
      let ok = true;
      for (let i = 0; i < e.length; i++) {
        const ch = e[i];
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth === 0 && i < e.length - 1) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
      e = stripTypeNoise(e.slice(1, -1));
      continue;
    }
    break;
  }
  return e;
}

function splitArgs(argsStr) {
  const s = String(argsStr || '');
  const out = [];
  let cur = '';
  let p = 0;
  let b = 0;
  let c = 0;
  let inS = false;
  let inD = false;
  let inT = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const prev = i > 0 ? s[i - 1] : '';
    if (!inD && !inT && ch === "'" && prev !== '\\') inS = !inS;
    if (!inS && !inT && ch === '"' && prev !== '\\') inD = !inD;
    if (!inS && !inD && ch === '`' && prev !== '\\') inT = !inT;
    if (inS || inD || inT) {
      cur += ch;
      continue;
    }
    if (ch === '(') p++;
    else if (ch === ')') p--;
    else if (ch === '[') b++;
    else if (ch === ']') b--;
    else if (ch === '{') c++;
    else if (ch === '}') c--;

    if (ch === ',' && p === 0 && b === 0 && c === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function upperBoundOfExpr(expr, bounds) {
  const e0 = unwrapParens(expr);
  const e = stripTypeNoise(e0);
  if (!e) return null;

  if (/^\d+$/.test(e)) return Number(e);

  if (/^[A-Za-z_$][\w$]*$/.test(e)) {
    return Object.prototype.hasOwnProperty.call(bounds, e) ? bounds[e] : null;
  }

  // x + 1 / 1 + x
  let m = e.match(/^([A-Za-z_$][\w$]*)\s*\+\s*(\d+)$/);
  if (m) {
    const ub = Object.prototype.hasOwnProperty.call(bounds, m[1]) ? bounds[m[1]] : null;
    return ub == null ? null : ub + Number(m[2]);
  }
  m = e.match(/^(\d+)\s*\+\s*([A-Za-z_$][\w$]*)$/);
  if (m) {
    const ub = Object.prototype.hasOwnProperty.call(bounds, m[2]) ? bounds[m[2]] : null;
    return ub == null ? null : ub + Number(m[1]);
  }
  m = e.match(/^([A-Za-z_$][\w$]*)\s*-\s*(\d+)$/);
  if (m) {
    const ub = Object.prototype.hasOwnProperty.call(bounds, m[1]) ? bounds[m[1]] : null;
    return ub == null ? null : ub - Number(m[2]);
  }

  // Math.floor/ceil/round/trunc
  m = e.match(/^Math\.(?:floor|ceil|round|trunc)\((.*)\)$/);
  if (m) return upperBoundOfExpr(m[1], bounds);

  // Number(x)
  m = e.match(/^Number\((.*)\)$/);
  if (m) return upperBoundOfExpr(m[1], bounds);

  // Math.min/max
  m = e.match(/^Math\.(min|max)\((.*)\)$/);
  if (m) {
    const fn = m[1];
    const args = splitArgs(m[2]);
    if (!args.length) return null;
    const ubs = args.map((a) => upperBoundOfExpr(a, bounds));
    if (fn === 'min') {
      // unknown treated as +inf because min(x, 200) <= 200
      let best = Infinity;
      for (const ub of ubs) {
        const v = ub == null ? Infinity : ub;
        if (v < best) best = v;
      }
      return Number.isFinite(best) ? best : null;
    }
    // max: unknown makes overall upper bound unknown
    if (ubs.some((x) => x == null)) return null;
    let best = -Infinity;
    for (const ub of ubs) {
      if (ub > best) best = ub;
    }
    return Number.isFinite(best) ? best : null;
  }

  // x ?? 200 (upper bound unknown; rely on surrounding min clamps)
  if (e.includes('??')) return null;

  return null;
}

function extractTakeExpression(src, takeIndex) {
  // takeIndex points to the start of 'take' token.
  const colon = src.indexOf(':', takeIndex);
  if (colon < 0) return null;
  let i = colon + 1;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (i >= src.length) return null;

  let p = 0;
  let b = 0;
  let c = 0;
  let inS = false;
  let inD = false;
  let inT = false;
  let out = '';

  for (; i < src.length; i++) {
    const ch = src[i];
    const prev = i > 0 ? src[i - 1] : '';
    if (!inD && !inT && ch === "'" && prev !== '\\') inS = !inS;
    if (!inS && !inT && ch === '"' && prev !== '\\') inD = !inD;
    if (!inS && !inD && ch === '`' && prev !== '\\') inT = !inT;

    if (!(inS || inD || inT)) {
      if (ch === '(') p++;
      else if (ch === ')') p--;
      else if (ch === '[') b++;
      else if (ch === ']') b--;
      else if (ch === '{') c++;
      else if (ch === '}') {
        if (p === 0 && b === 0 && c === 0) break;
        c--;
      }

      if (p === 0 && b === 0 && c === 0) {
        if (ch === ',' || ch === '\n' || ch === '\r') break;
      }
    }

    out += ch;
  }

  return out.trim();
}

function isLikelyPrismaContext(src, takeIndex) {
  const before = src.slice(Math.max(0, takeIndex - 350), takeIndex);
  // Reduce false positives: only check takes that appear inside a prisma-style call.
  return /\.findMany\(|\.findFirst\(|\.findUnique\(|\.groupBy\(|\.aggregate\(/.test(before);
}

function shouldSkipDir(name) {
  return (
    name === 'node_modules' ||
    name === '.next' ||
    name === 'dist' ||
    name === 'out' ||
    name === 'build'
  );
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (shouldSkipDir(e.name)) continue;
      walk(full, out);
      continue;
    }
    if (!e.isFile()) continue;
    if (!/\.(ts|tsx|mts)$/.test(e.name)) continue;
    out.push(full);
  }
}

function main() {
  const files = [];
  for (const root of ['app', 'lib', 'hooks', 'components', 'views']) {
    walk(path.join(repoRoot, root), files);
  }

  const reTake = /\btake\b\s*:/g;
  const reVar = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+);/g;
  const violations = [];
  const unknowns = [];

  for (const abs of files) {
    const fileRel = rel(abs);
    if (APPROVED.has(fileRel)) continue;

    const raw = fs.readFileSync(abs, 'utf8');
    const src = stripComments(raw);

    // Build simple upper-bound table for locally declared vars.
    const bounds = Object.create(null);
    let vm;
    while ((vm = reVar.exec(src))) {
      const name = String(vm[1] || '').trim();
      const expr = String(vm[2] || '').trim();
      if (!name || !expr) continue;
      const ub = upperBoundOfExpr(expr, bounds);
      if (ub == null) continue;
      bounds[name] = ub;
    }

    let m;
    while ((m = reTake.exec(src))) {
      const takeIndex = m.index;
      if (!isLikelyPrismaContext(src, takeIndex)) continue;

      const expr = extractTakeExpression(src, takeIndex);
      if (!expr) continue;

      const ub = upperBoundOfExpr(expr, bounds);
      if (ub == null) {
        if (UNKNOWN_TAKE_MODE !== 'off') {
          const line = src.slice(0, m.index).split('\n').length;
          const start = Math.max(0, m.index - 80);
          const end = Math.min(src.length, m.index + 120);
          const snippet = src.slice(start, end).replace(/\s+/g, ' ').trim();
          unknowns.push({ fileRel, line, expr, snippet });
        }
        continue;
      }

      if (ub <= MAX_TAKE + OVERFETCH_ALLOWANCE) continue;

      const line = src.slice(0, m.index).split('\n').length;
      const start = Math.max(0, m.index - 80);
      const end = Math.min(src.length, m.index + 120);
      const snippet = src.slice(start, end).replace(/\s+/g, ' ').trim();

      violations.push({ fileRel, line, value: ub, expr, snippet });
    }
  }

  if (violations.length) {
    console.error(`\n[SECURITY] Prisma take upper-bound exceeds limit (MAX_TAKE=${MAX_TAKE}, OVERFETCH_ALLOWANCE=${OVERFETCH_ALLOWANCE}).`);
    console.error('Use cursor pagination or clamp inputs (Math.min). If truly required, add an explicit exception in the scanner.\n');

    for (const v of violations) {
      console.error(`- ${v.fileRel}:${v.line} take_ub=${v.value} expr=${String(v.expr).slice(0, 120)}`);
      console.error(`  ${v.snippet}`);
    }

    process.exit(1);
  }

  if (unknowns.length && UNKNOWN_TAKE_MODE !== 'off') {
    const header =
      `\n[SECURITY] Prisma take bound is unknown for some calls. ` +
      `MODE=${UNKNOWN_TAKE_MODE} (set MISRAD_PRISMA_TAKE_UNKNOWN_MODE=off|warn|error)`;
    if (UNKNOWN_TAKE_MODE === 'error') {
      console.error(header);
    } else {
      console.warn(header);
    }

    const maxPrint = 25;
    const list = unknowns.slice(0, maxPrint);
    for (const u of list) {
      const lineExpr = String(u.expr || '').replace(/\s+/g, ' ').trim().slice(0, 140);
      const snippet = String(u.snippet || '').slice(0, 220);
      const msg = `- ${u.fileRel}:${u.line} expr=${lineExpr}`;
      if (UNKNOWN_TAKE_MODE === 'error') {
        console.error(msg);
        console.error(`  ${snippet}`);
      } else {
        console.warn(msg);
        console.warn(`  ${snippet}`);
      }
    }

    if (unknowns.length > maxPrint) {
      const more = unknowns.length - maxPrint;
      const msg = `... and ${more} more.`;
      if (UNKNOWN_TAKE_MODE === 'error') console.error(msg);
      else console.warn(msg);
    }

    if (UNKNOWN_TAKE_MODE === 'error') {
      process.exit(1);
    }
  }

  console.log(
    `[OK] Prisma take scan passed (MAX_TAKE=${MAX_TAKE}, OVERFETCH_ALLOWANCE=${OVERFETCH_ALLOWANCE}, UNKNOWN_TAKE_MODE=${UNKNOWN_TAKE_MODE}).`
  );
}

main();
