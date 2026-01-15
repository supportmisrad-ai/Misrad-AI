const fs = require('fs');
const path = require('path');

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function ensureImport(source) {
  if (source.includes("from '@/lib/api-shabbat-guard'")) return source;

  const importLine = "import { shabbatGuard } from '@/lib/api-shabbat-guard';\n";

  // Insert after last existing import
  const importRegex = /^import[\s\S]*?;\s*\n/mg;
  let lastMatch = null;
  let m;
  while ((m = importRegex.exec(source)) !== null) lastMatch = m;

  if (lastMatch) {
    const insertAt = lastMatch.index + lastMatch[0].length;
    return source.slice(0, insertAt) + importLine + source.slice(insertAt);
  }

  // No imports found -> add at top
  return importLine + source;
}

function makeUniqueHandlerName(source, base) {
  let name = base;
  let i = 1;
  while (new RegExp(`\\b${name}\\b`).test(source)) {
    name = `${base}_${i}`;
    i += 1;
  }
  return name;
}

function wrapMethod(source, method) {
  // Already wrapped?
  const alreadyWrapped = new RegExp(`export\\s+const\\s+${method}\\s*=\\s*shabbatGuard\\s*\\(`).test(source);
  if (alreadyWrapped) return { source, changed: false };

  const fnRegex = new RegExp(`(^\\s*)export\\s+(async\\s+)?function\\s+${method}\\s*\\(`, 'm');
  const match = source.match(fnRegex);
  if (!match) return { source, changed: false };

  const handlerName = makeUniqueHandlerName(source, `${method}Handler`);

  // Replace export function METHOD(  ->  async function METHODHandler(
  const replaced = source.replace(fnRegex, (_, indent, asyncKeyword) => {
    const asyncPart = asyncKeyword ? 'async ' : '';
    return `${indent}${asyncPart}function ${handlerName}(`;
  });

  // Append export const METHOD = shabbatGuard(METHODHandler);
  const exportLine = `\nexport const ${method} = shabbatGuard(${handlerName});\n`;

  // If there are multiple methods, we add exports in the order we process them.
  return { source: replaced + exportLine, changed: true };
}

function transformRouteFile(filePath, source) {
  // Do not guard the Shabbat status endpoint so clients can still determine status.
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.endsWith('/app/api/shabbat/status/route.ts')) {
    return { out: source, changed: false, skipped: true };
  }

  let out = source;
  let changed = false;

  // Only add import if we actually wrap something.
  let wrappedAny = false;

  for (const method of METHODS) {
    const res = wrapMethod(out, method);
    out = res.source;
    if (res.changed) {
      changed = true;
      wrappedAny = true;
    }
  }

  if (wrappedAny) {
    out = ensureImport(out);
  }

  return { out, changed, skipped: false };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const shouldWrite = args.has('--write');

  const projectRoot = path.resolve(__dirname, '..');
  const apiRoot = path.join(projectRoot, 'app', 'api');

  if (!fs.existsSync(apiRoot)) {
    console.error(`API folder not found: ${apiRoot}`);
    process.exit(1);
  }

  const allFiles = walk(apiRoot).filter((p) => p.endsWith(path.sep + 'route.ts'));

  let changedCount = 0;
  let skippedCount = 0;
  let touchedCount = 0;

  for (const filePath of allFiles) {
    const before = fs.readFileSync(filePath, 'utf8');
    const res = transformRouteFile(filePath, before);
    if (res.skipped) skippedCount += 1;

    if (res.changed) {
      changedCount += 1;
      touchedCount += 1;
      if (shouldWrite) {
        fs.writeFileSync(filePath, res.out, 'utf8');
      }
    }
  }

  console.log(`[wrap-shabbat-guard] Found route files: ${allFiles.length}`);
  console.log(`[wrap-shabbat-guard] Skipped: ${skippedCount}`);
  console.log(`[wrap-shabbat-guard] Files that would change: ${changedCount}`);

  if (!shouldWrite) {
    console.log('[wrap-shabbat-guard] Dry-run only. Re-run with --write to apply changes.');
  } else {
    console.log('[wrap-shabbat-guard] Done. Changes written to disk.');
  }
}

main();
