const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'app', 'api');
const APP_DIR = path.join(ROOT, 'app');

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function listFilesRecursive(dir) {
  let out = [];
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const it of items) {
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) {
      out = out.concat(listFilesRecursive(abs));
    } else {
      out.push(abs);
    }
  }
  return out;
}

function toRel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

function scanApiRoutesForActionsImports() {
  if (!isFile(API_DIR) && !fs.existsSync(API_DIR)) {
    return { errors: [] };
  }

  const files = listFilesRecursive(API_DIR).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'));

  const errors = [];

  const importRe = /from\s+['\"]([^'\"]+)['\"]/g;

  for (const abs of files) {
    const rel = toRel(abs);
    let src = '';
    try {
      src = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    importRe.lastIndex = 0;
    let m;
    while ((m = importRe.exec(src))) {
      const spec = String(m[1] || '');
      if (!spec) continue;

      const isForbidden = spec.includes('app/actions/') || spec.includes('@/app/actions/');
      if (!isForbidden) continue;

      const hit = `${rel}: ${spec}`;
      errors.push(hit);
    }
  }

  return { errors };
}

function scanServerForInternalApiFetch() {
  if (!isFile(APP_DIR) && !fs.existsSync(APP_DIR)) {
    return { errors: [] };
  }

  const files = listFilesRecursive(APP_DIR).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'));
  const errors = [];

  const isUseClientRe = /^\s*['"]use client['"]\s*;?/m;
  const isForbiddenFetchRe = /\bfetch\s*\(\s*([`'\"])\s*\/api(\/|\1)/g;
  const isForbiddenFetchRelativeRe = /\bfetch\s*\(\s*([`'\"])\s*api\/(\S|\1)/g;
  const isForbiddenFetchAbsoluteLocalhostRe = /\bfetch\s*\(\s*([`'\"])\s*https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?\/api(\/|\1)/g;
  const isForbiddenFetchConcatBaseUrlRe = /\bfetch\s*\(\s*getBaseUrl\s*\(\s*[^)]*\)\s*\+\s*([`'\"])\s*\/api(\/|\1)/g;
  const isForbiddenTemplateFetchRe = /\bfetch\s*\(\s*`\s*\$\{[^}]+\}\s*\/api(\/|`)/g;
  const isForbiddenFetchNewUrlRe = /\bfetch\s*\(\s*new\s+URL\s*\(\s*([`'\"])\s*\/api(\/|\1)/g;
  const isForbiddenFetchNewRequestRe = /\bfetch\s*\(\s*new\s+Request\s*\(\s*([`'\"])\s*\/api(\/|\1)/g;
  const isForbiddenAxiosMethodRe = /\baxios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*([`'\"])\s*\/api(\/|\2)/g;
  const isForbiddenAxiosMethodAbsoluteLocalhostRe = /\baxios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*([`'\"])\s*https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?\/api(\/|\2)/g;
  const isForbiddenAxiosMethodConcatBaseUrlRe = /\baxios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*getBaseUrl\s*\(\s*[^)]*\)\s*\+\s*([`'\"])\s*\/api(\/|\2)/g;
  const isForbiddenAxiosConfigRe = /\baxios\s*\(\s*\{(?![^}]*\bbaseURL\b)[^}]*\burl\s*:\s*([`'\"])\s*\/api(\/|\1)/g;

  for (const abs of files) {
    const rel = toRel(abs);
    if (rel.startsWith('app/api/')) continue;

    let src = '';
    try {
      src = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    const head = src.split(/\r?\n/).slice(0, 30).join('\n');
    if (isUseClientRe.test(head)) continue;

    const hits = [];

    isForbiddenFetchRe.lastIndex = 0;
    let m;
    while ((m = isForbiddenFetchRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenFetchRelativeRe.lastIndex = 0;
    while ((m = isForbiddenFetchRelativeRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenFetchAbsoluteLocalhostRe.lastIndex = 0;
    while ((m = isForbiddenFetchAbsoluteLocalhostRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenFetchConcatBaseUrlRe.lastIndex = 0;
    while ((m = isForbiddenFetchConcatBaseUrlRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenTemplateFetchRe.lastIndex = 0;
    while ((m = isForbiddenTemplateFetchRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenFetchNewUrlRe.lastIndex = 0;
    while ((m = isForbiddenFetchNewUrlRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenFetchNewRequestRe.lastIndex = 0;
    while ((m = isForbiddenFetchNewRequestRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenAxiosMethodRe.lastIndex = 0;
    while ((m = isForbiddenAxiosMethodRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenAxiosMethodAbsoluteLocalhostRe.lastIndex = 0;
    while ((m = isForbiddenAxiosMethodAbsoluteLocalhostRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenAxiosMethodConcatBaseUrlRe.lastIndex = 0;
    while ((m = isForbiddenAxiosMethodConcatBaseUrlRe.exec(src))) {
      hits.push(m.index);
    }

    isForbiddenAxiosConfigRe.lastIndex = 0;
    while ((m = isForbiddenAxiosConfigRe.exec(src))) {
      hits.push(m.index);
    }

    if (!hits.length) continue;

    const lines = src.split(/\r?\n/);
    for (const idx of hits) {
      const lineNo = src.slice(0, idx).split(/\r?\n/).length;
      const snippet = (lines[lineNo - 1] || '').trim();
      errors.push(`${rel}:${lineNo}: ${snippet}`);
    }
  }

  return { errors };
}

function main() {
  const importScan = scanApiRoutesForActionsImports();
  const internalFetchScan = scanServerForInternalApiFetch();

  const errors = [...importScan.errors, ...internalFetchScan.errors];

  if (errors.length) {
    if (importScan.errors.length) {
      console.error('[layer-boundaries] violations: app/api must not import from app/actions');
      for (const e of importScan.errors) console.error(`- ${e}`);
    }

    if (internalFetchScan.errors.length) {
      console.error('[layer-boundaries] violations: server code must not fetch internal /api routes');
      for (const e of internalFetchScan.errors) console.error(`- ${e}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log('[layer-boundaries] ok');
}

main();
