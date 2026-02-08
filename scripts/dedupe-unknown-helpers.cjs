const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      const name = e.name;
      if (name === 'node_modules' || name === '.next' || name === 'dist' || name === 'out' || name === '.git') continue;
      if (name === 'android') continue;
      if (name === 'prisma' && full.endsWith(path.join('prisma', 'migrations'))) continue;
      walk(full, out);
      continue;
    }

    if (!e.isFile()) continue;
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) continue;

    out.push(full);
  }
}

function findFunctionRange(src, matchIndex) {
  const braceStart = src.indexOf('{', matchIndex);
  if (braceStart < 0) return null;

  let i = braceStart;
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (; i < src.length; i++) {
    const ch = src[i];
    const next = i + 1 < src.length ? src[i + 1] : '';

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '/' && next === '/') {
        inLineComment = true;
        i++;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
    }

    if (!inDouble && !inTemplate && ch === "'" && src[i - 1] !== '\\') {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inTemplate && ch === '"' && src[i - 1] !== '\\') {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && ch === '`' && src[i - 1] !== '\\') {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingle || inDouble || inTemplate) continue;

    if (ch === '{') {
      depth++;
      continue;
    }
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        const end = i + 1;
        return { start: matchIndex, end };
      }
    }
  }

  return null;
}

function stripLeadingWhitespaceLines(s) {
  return s.replace(/^\s*(\r?\n)+/, '');
}

function detectEol(src) {
  return src.includes('\r\n') ? '\r\n' : '\n';
}

function computeImportInsertionIndex(src) {
  const lines = src.split(/\r?\n/);
  let idx = 0;

  while (idx < lines.length) {
    const line = lines[idx].trim();
    if (line === "'use server';" || line === '"use server";' || line === "'use client';" || line === '"use client";') {
      idx++;
      continue;
    }
    if (line === '') {
      idx++;
      continue;
    }
    break;
  }

  while (idx < lines.length) {
    const line = lines[idx].trim();
    if (line.startsWith('import ')) {
      idx++;
      continue;
    }
    if (line === '') {
      idx++;
      continue;
    }
    break;
  }

  let pos = 0;
  for (let i = 0; i < idx; i++) {
    const nl = src.indexOf('\n', pos);
    if (nl === -1) return src.length;
    pos = nl + 1;
  }
  return pos;
}

function parseSharedUnknownImport(line) {
  const m = line.match(/import\s*\{([^}]*)\}\s*from\s*['\"]@\/lib\/shared\/unknown['\"];?/);
  if (!m) return null;
  const inner = m[1].trim();
  const parts = inner
    ? inner
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
  return { parts };
}

function buildSharedUnknownImport(parts, quote) {
  const q = quote || "'";
  return `import { ${parts.join(', ')} } from ${q}@/lib/shared/unknown${q};`;
}

function ensureSharedUnknownImport(src, requiredParts) {
  if (!requiredParts.length) return src;

  const eol = detectEol(src);
  const lines = src.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('@/lib/shared/unknown')) continue;

    const parsed = parseSharedUnknownImport(line);
    if (!parsed) continue;

    const existing = new Set(parsed.parts);
    let changed = false;
    for (const p of requiredParts) {
      if (!existing.has(p)) {
        existing.add(p);
        changed = true;
      }
    }

    if (!changed) return src;

    const quote = line.includes('"@/lib/shared/unknown"') ? '"' : "'";
    const nextParts = Array.from(existing);
    nextParts.sort();
    lines[i] = buildSharedUnknownImport(nextParts, quote);
    return lines.join(eol);
  }

  const insertAt = computeImportInsertionIndex(src);
  const parts = Array.from(new Set(requiredParts));
  parts.sort();
  const importLine = buildSharedUnknownImport(parts, "'");

  return src.slice(0, insertAt) + importLine + eol + src.slice(insertAt);
}

function normalizeSharedUnknownImports(src) {
  const importRe = /import\s*\{([^}]*)\}\s*from\s*['\"]@\/lib\/shared\/unknown['\"];?/g;
  const partsSet = new Set();
  const embeddedRanges = [];

  let m;
  while ((m = importRe.exec(src))) {
    const start = m.index;
    const end = importRe.lastIndex;

    const parts = m[1]
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of parts) partsSet.add(p);

    const prevNl = src.lastIndexOf('\n', start - 1);
    const lineStart = prevNl === -1 ? 0 : prevNl + 1;
    const prefix = src.slice(lineStart, start);
    const atLineStart = prefix.trim() === '';
    if (!atLineStart) embeddedRanges.push({ start, end });
  }

  if (!embeddedRanges.length) {
    if (!partsSet.size) return src;
    return ensureSharedUnknownImport(src, Array.from(partsSet));
  }

  let out = src;
  for (let i = embeddedRanges.length - 1; i >= 0; i--) {
    const r = embeddedRanges[i];
    let cutEnd = r.end;
    if (out.slice(cutEnd, cutEnd + 2) === '\r\n') cutEnd += 2;
    else if (out[cutEnd] === '\n') cutEnd += 1;
    out = out.slice(0, r.start) + out.slice(cutEnd);
  }

  return ensureSharedUnknownImport(out, Array.from(partsSet));
}

function repairBrokenImportContinuations(src) {
  const eol = detectEol(src);
  const lines = src.split(/\r?\n/);

  function isImportStart(line) {
    const t = line.trimStart();
    return t.startsWith('import ') || t.startsWith('import type ');
  }

  function looksLikeImportUnterminated(line) {
    const t = line.trimEnd();
    if (!t.includes(' from ')) return false;
    if (t.endsWith("';") || t.endsWith('";')) return false;
    // Common broken forms: ends with a partial module path or a stray quote.
    return true;
  }

  function looksLikeImportTail(line) {
    const t = line.trim();
    if (!t) return false;
    if (t.startsWith('import ')) return false;
    if (t.startsWith('export ')) return false;
    return t.endsWith("';") || t.endsWith('";');
  }

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const cur = lines[i];

    if (!isImportStart(prev)) continue;
    if (!looksLikeImportUnterminated(prev)) continue;
    if (!looksLikeImportTail(cur)) continue;

    lines[i - 1] = prev + cur.trimStart();
    lines.splice(i, 1);
    i--;
  }

  return lines.join(eol);
}

function removeFunctionByName(src, name, opts) {
  const re = new RegExp(`(^|\\n)\\s*(export\\s+)?function\\s+${name}\\s*\\(`, 'm');
  const m = src.match(re);
  if (!m || m.index == null) return { src, removed: false };

  const start = m.index + (m[1] ? m[1].length : 0);
  const range = findFunctionRange(src, start);
  if (!range) return { src, removed: false };

  const fnText = src.slice(range.start, range.end);
  if (opts && typeof opts.predicate === 'function' && !opts.predicate(fnText)) {
    return { src, removed: false };
  }

  const isExported = /^\s*export\s+function\b/.test(fnText);
  let next = src.slice(0, range.start) + src.slice(range.end);
  next = stripLeadingWhitespaceLines(next.slice(0, range.start) + next.slice(range.start));

  return { src: next, removed: true, isExported, fnText };
}

function transformSource(originalSrc, filePath) {
  let src = originalSrc;
  if (filePath.endsWith(path.join('lib', 'shared', 'unknown.ts'))) {
    return { src: originalSrc, changed: false };
  }
  src = normalizeSharedUnknownImports(src);
  src = repairBrokenImportContinuations(src);
  const requiredImports = new Set();
  const requiredExports = new Set();

  // asObject
  {
    const m = src.match(/(^|\n)\s*(export\s+)?function\s+asObject\s*\(/m);
    if (m && m.index != null) {
      const start = m.index + (m[1] ? m[1].length : 0);
      const range = findFunctionRange(src, start);
      if (range) {
        const fnText = src.slice(range.start, range.end);
        const isLoose = !/Array\.isArray\s*\(/.test(fnText) && /typeof\s+value\s*===\s*['\"]object['\"]/.test(fnText) && !/!value\s*\|\|\s*typeof\s+value\s*!==/.test(fnText);

        const isExported = /^\s*export\s+function\b/.test(fnText);

        src = src.slice(0, range.start) + src.slice(range.end);
        src = stripLeadingWhitespaceLines(src);

        if (isLoose) requiredImports.add('asObjectLoose as asObject');
        else requiredImports.add('asObject');

        if (isExported) requiredExports.add('asObject');
      }
    }
  }

  // getErrorMessage(error: unknown): string
  {
    const res = removeFunctionByName(src, 'getErrorMessage', {
      predicate: (fnText) => {
        // Only match the 1-arg signature variant.
        if (/getErrorMessage\s*\(\s*error\s*:\s*unknown\s*,/.test(fnText)) return false;
        return true;
      },
    });

    if (res.removed) {
      src = res.src;
      requiredImports.add('getErrorMessage');
      if (res.isExported) requiredExports.add('getErrorMessage');
    }
  }

  // getErrorMessage(error: unknown, fallback: string): string
  {
    const m = src.match(/(^|\n)\s*(export\s+)?function\s+getErrorMessage\s*\(\s*error\s*:\s*unknown\s*,\s*fallback\s*:\s*string\s*\)\s*:\s*string\s*\{/m);
    if (m && m.index != null) {
      const start = m.index + (m[1] ? m[1].length : 0);
      const range = findFunctionRange(src, start);
      if (range) {
        const fnText = src.slice(range.start, range.end);
        const isSimpleFallback = /return\s+error\s+instanceof\s+Error\s*&&\s*error\.message\s*\?\s*error\.message\s*:\s*fallback\s*;/.test(
          fnText.replace(/\s+/g, ' ')
        );

        if (isSimpleFallback) {
          const isExported = /^\s*export\s+function\b/.test(fnText);
          src = src.slice(0, range.start) + src.slice(range.end);
          src = stripLeadingWhitespaceLines(src);

          requiredImports.add('getErrorMessageFromErrorOr as getErrorMessage');
          if (isExported) requiredExports.add('getErrorMessage');
        }
      }
    }
  }

  // getUnknownErrorMessage
  {
    const resString = removeFunctionByName(src, 'getUnknownErrorMessage', {
      predicate: (fnText) => {
        if (!/\)\s*:\s*string\s*\{/.test(fnText)) return false;
        if (/\|\s*null/.test(fnText)) return false;
        return true;
      },
    });
    if (resString.removed) {
      src = resString.src;
      if (/שגיאה לא צפויה/.test(resString.fnText)) {
        requiredImports.add('getUnknownErrorMessageOrUnexpected as getUnknownErrorMessage');
      } else {
        requiredImports.add('getErrorMessage as getUnknownErrorMessage');
      }
      if (resString.isExported) requiredExports.add('getUnknownErrorMessage');
    }

    const m = src.match(/(^|\n)\s*(export\s+)?function\s+getUnknownErrorMessage\s*\(/m);
    if (m && m.index != null) {
      const start = m.index + (m[1] ? m[1].length : 0);
      const range = findFunctionRange(src, start);
      if (range) {
        const fnText = src.slice(range.start, range.end);
        const normalized = fnText.replace(/\s+/g, ' ');
        const looksStandard =
          normalized.includes('if (!error) return null;') &&
          (normalized.includes('error instanceof Error') || normalized.includes('if (error instanceof Error)'));

        if (looksStandard) {
          const isExported = /^\s*export\s+function\b/.test(fnText);
          src = src.slice(0, range.start) + src.slice(range.end);
          src = stripLeadingWhitespaceLines(src);

          requiredImports.add('getUnknownErrorMessage');
          if (isExported) requiredExports.add('getUnknownErrorMessage');
        }
      }
    }
  }

  // Inject imports/exports
  const importParts = Array.from(requiredImports);
  src = ensureSharedUnknownImport(src, importParts);

  if (requiredExports.size) {
    const exports = Array.from(requiredExports);
    exports.sort();

    // Ensure `export { ... };` exists.
    const exportLine = `export { ${exports.join(', ')} };`;
    if (!src.includes(exportLine)) {
      const insertAt = computeImportInsertionIndex(src);
      src = src.slice(0, insertAt) + exportLine + '\n' + src.slice(insertAt);
    }
  }

  return { src, changed: src !== originalSrc };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');

  const files = [];
  walk(REPO_ROOT, files);

  const results = {
    changedFiles: 0,
    errors: 0,
    candidates: 0,
  };

  for (const filePath of files) {
    const rel = path.relative(REPO_ROOT, filePath).replaceAll('\\', '/');

    // Skip generated/irrelevant areas
    if (rel.startsWith('prisma/migrations/')) continue;

    const raw = fs.readFileSync(filePath, 'utf8');
    if (!/\bfunction\s+(asObject|getErrorMessage|getUnknownErrorMessage)\b/.test(raw) && !raw.includes('@/lib/shared/unknown')) continue;

    results.candidates++;

    try {
      const { src, changed } = transformSource(raw, filePath);
      if (!changed) continue;

      results.changedFiles++;
      if (!checkOnly) {
        fs.writeFileSync(filePath, src, 'utf8');
      }
    } catch (e) {
      results.errors++;
      console.error('[dedupe-unknown-helpers] Error processing', rel, e);
    }
  }

  const mode = checkOnly ? 'CHECK' : 'WRITE';
  console.log(`[dedupe-unknown-helpers] Mode=${mode}`);
  console.log(`[dedupe-unknown-helpers] Candidates=${results.candidates} Changed=${results.changedFiles} Errors=${results.errors}`);

  if (results.errors) process.exit(1);
}

main();
